import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ConflictException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { IdentityFoundationService } from '../../src/identity/identity.service.js';
import { CredentialService } from '../../src/identity/credential.service.js';
import { normalizeIdentityEmail } from '../../src/identity/email.js';
import { isOperationalActor } from '../../src/identity/publication-policy.js';
import { GymAccessGuard, type GymRequest } from '../../src/gym-access.guard.js';
import type { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { AuthController } from '../../src/auth.controller.js';
import { AuthSessionService } from '../../src/identity/auth-session.service.js';
import { AuthSessionGuard } from '../../src/identity/auth-session.guard.js';
import { SuperAdminGuard, type PlatformRequest } from '../../src/super-admin.guard.js';
import { EmailCorrectionController, AdminEmailCorrectionController } from '../../src/email-correction.controller.js';
import type { DatabaseService } from '../../src/database.service.js';
import { assertOwnedTarget, createDisposablePostgresRun } from '../support/disposable-postgres.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let master: MasterClient;
let tenants: TenantClient[] = [];
let identities: IdentityFoundationService;
let passwordHash: string;
const password = randomBytes(24).toString('base64url');
const tokenSecret = randomBytes(32).toString('hex');

beforeAll(async () => {
  run = await createDisposablePostgresRun();
  await run.migrate(run.masterName, 'master');
  for (const name of run.tenantNames) await run.migrate(name, 'tenant');
  master = new MasterClient({ adapter: new PrismaPg({ connectionString: run.masterUrl, max: 4 }) });
  tenants = run.tenantUrls.map((url) => new TenantClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) }));
  identities = new IdentityFoundationService(master);
  passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  vi.stubEnv('JWT_SECRET', tokenSecret);
}, 120_000);

afterAll(async () => {
  const migrationEvidence = [];
  try {
    if (master) {
      for (const name of [run.masterName, ...run.tenantNames]) {
        const client = await run.connect(name);
        try {
          const rows = (await client.query('SELECT migration_name, checksum, finished_at IS NOT NULL AND rolled_back_at IS NULL AS completed FROM "_prisma_migrations" ORDER BY started_at')).rows;
          migrationEvidence.push({ database: name, migrations: rows });
        } finally { await client.end(); }
      }
    }
  } finally {
    await Promise.all([master?.$disconnect(), ...tenants.map((client) => client.$disconnect())]);
    if (run) {
      const cleanup = await run.cleanup();
      console.info('[task003-owned-run-evidence]', JSON.stringify({ runId: run.runId, migrationEvidence, cleanup }));
    }
    vi.unstubAllEnvs();
  }
}, 120_000);

const fixtureIdentity = (email: string) => identities.createIdentity({ email: normalizeIdentityEmail(email), passwordHash });
const fixtureGym = (suffix: string, index = 0) => master.gym.create({ data: {
  name: `Synthetic ${suffix}`, slug: `${suffix}-${run.runId}`, databaseName: run.tenantNames[index], status: 'ACTIVE',
} });

it('refuses external host, wrong prefix/name, wrong port and missing ownership marker without deleting a target', async () => {
  const names = [run.masterName, ...run.tenantNames];
  expect(() => assertOwnedTarget(run.masterUrl.replace('127.0.0.1', 'db.example.test'), run.runId, names, run.port)).toThrow();
  expect(() => assertOwnedTarget(run.masterUrl.replace(run.masterName, 'gymos_master'), run.runId, names, run.port)).toThrow();
  expect(() => assertOwnedTarget(run.masterUrl, run.runId, names, String(Number(run.port) + 1))).toThrow();
  const client = await run.connect(run.preflightName);
  try {
    const existing = (await client.query<{ run_id: string; marker: string }>('SELECT * FROM "__gymos_test"."Ownership"')).rows[0];
    await client.query('DELETE FROM "__gymos_test"."Ownership"');
    await expect(run.dropOwnedDatabase(run.preflightName)).rejects.toThrow('ownership marker');
    expect((await client.query('SELECT current_database() AS name')).rows[0].name).toBe(run.preflightName);
    await client.query('INSERT INTO "__gymos_test"."Ownership" VALUES ($1,$2)', [existing.run_id, existing.marker]);
  } finally { await client.end(); }
});

it('fails canonical migration preflight atomically without modifying conflicting rows; backfills only active-gym legacy owners', async () => {
  const client = await run.connect(run.preflightName);
  try {
    await client.query(await readFile(`${root}packages/database-master/prisma/migrations/20261021100256_init_master/migration.sql`, 'utf8'));
    await client.query(`INSERT INTO "User" (id,email,"passwordHash","updatedAt") VALUES ('conflict','UPPER@example.test','synthetic',now())`);
    const migration = await readFile(`${root}packages/database-master/prisma/migrations/20261023090000_identity_foundation/migration.sql`, 'utf8');
    await expect(client.query(migration)).rejects.toThrow('preflight failed');
    await client.query('ROLLBACK');
    expect((await client.query('SELECT email FROM "User" WHERE id=$1', ['conflict'])).rows[0].email).toBe('UPPER@example.test');
    expect((await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='authVersion'`)).rowCount).toBe(0);
    await client.query('UPDATE "User" SET email=$1 WHERE id=$2', ['upper@example.test', 'conflict']);
    await client.query(`INSERT INTO "Gym"(id,slug,name,"databaseName",status,"updatedAt") VALUES
      ('old-active','old-active','Legacy active','legacy_active','ACTIVE',now()),
      ('old-suspended','old-suspended','Legacy suspended','legacy_suspended','SUSPENDED',now())`);
    await client.query(`INSERT INTO "User"(id,email,"passwordHash","updatedAt") VALUES
      ('legacy-member','legacy-member@example.test','synthetic',now()),
      ('legacy-trainer','legacy-trainer@example.test','synthetic',now())`);
    await client.query(`INSERT INTO "GymAccess"("userId","gymId",role) VALUES
      ('conflict','old-active','OWNER'),('conflict','old-suspended','OWNER'),
      ('legacy-member','old-active','MEMBER'),('legacy-trainer','old-active','TRAINER')`);
    await client.query(migration);
    const states = (await client.query('SELECT "userId","gymId","linkStatus" FROM "GymAccess"')).rows;
    expect(states.find((row) => row.userId === 'conflict' && row.gymId === 'old-active').linkStatus).toBe('ACTIVE');
    expect(states.filter((row) => !(row.userId === 'conflict' && row.gymId === 'old-active')).every((row) => row.linkStatus === 'PENDING')).toBe(true);
  } finally { await client.end(); }
});

it('concurrent canonical variants commit one identity and safe conflicts; direct bypass writers fail database constraints', async () => {
  const results = await Promise.allSettled(['Race@Example.TEST', ' race@example.test ', 'RACE@example.test', 'race@EXAMPLE.test']
    .map((email) => identities.createIdentity({ email, passwordHash })));
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  for (const result of results) if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(ConflictException);
  expect(await master.user.count({ where: { email: 'race@example.test' } })).toBe(1);
  const client = await run.connect(run.masterName);
  try {
    for (const email of ['Upper@example.test', ' lower@example.test ', 'é@example.test', 'space @example.test']) {
      await expect(client.query('INSERT INTO "User"(id,email,"passwordHash","updatedAt") VALUES ($1,$2,$3,now())',
        [randomBytes(8).toString('hex'), email, 'synthetic'])).rejects.toMatchObject({ code: '23514' });
    }
    await expect(client.query('INSERT INTO "User"(id,email,"passwordHash","updatedAt") VALUES ($1,$2,$3,now())',
      ['duplicate', 'race@example.test', 'synthetic'])).rejects.toMatchObject({ code: '23505' });
    const indexes = (await client.query(`SELECT indexdef FROM pg_indexes WHERE tablename='User'`)).rows.map((row) => row.indexdef);
    expect(indexes.some((value: string) => value.includes('User_email_normalized_key') && value.includes('COLLATE "C"'))).toBe(true);
  } finally { await client.end(); }
});

it('reuses one self-verified identity with distinct roles/actor IDs across gyms and never changes its password', async () => {
  const user = await fixtureIdentity('MULTI@example.test');
  const a = await fixtureGym('multi-a', 0);
  const b = await fixtureGym('multi-b', 1);
  const bindings = [{ gymId: a.id, role: 'MEMBER' as const, enrollmentOperationId: 'operation-a' },
    { gymId: b.id, role: 'TRAINER' as const, enrollmentOperationId: 'operation-b' }];
  const proofs = [];
  for (const binding of bindings) {
    const proof = await identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id,
      authenticatedAuthVersion: user.authVersion, currentPassword: password });
    proofs.push(proof);
    const [first, repeat] = await Promise.all([
      identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token }),
      identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token }),
    ]);
    expect(first).toEqual(repeat);
    expect(first.linkStatus).toBe('PENDING');
  }
  const member = await tenants[0].member.create({ data: { fullName: 'Synthetic Member', identityId: user.id,
    registrationState: 'COMPLETE', enrollmentOperationId: bindings[0].enrollmentOperationId } });
  const trainer = await tenants[1].trainer.create({ data: { fullName: 'Synthetic Trainer', email: user.email, phone: '+94110000002', level: 'LEVEL_1', identityId: user.id,
    registrationState: 'COMPLETE', enrollmentOperationId: bindings[1].enrollmentOperationId } });
  expect(new Set([user.id, member.id, trainer.id]).size).toBe(3);
  const access = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: user.id, gymId: a.id } } });
  const context = { identityId: user.id, gymId: a.id, gymStatus: 'ACTIVE', bindingVerified: true,
    operationComplete: true, access, actor: { ...member, kind: 'MEMBER' as const } };
  expect(isOperationalActor(context)).toBe(false); // Tenant COMPLETE cannot publish pending Master.
  const active = await master.gymAccess.update({ where: { userId_gymId: { userId: user.id, gymId: a.id } },
    data: { linkStatus: 'ACTIVE', actorKind: 'MEMBER', tenantActorId: member.id } });
  expect(isOperationalActor({ ...context, access: active })).toBe(true);
  for (const changes of [
    { operationComplete: false }, { bindingVerified: false }, { gymId: b.id }, { identityId: 'foreign' },
    { actor: { ...context.actor, identityId: 'foreign' } }, { actor: { ...context.actor, kind: 'TRAINER' as const } },
    { actor: { ...context.actor, enrollmentOperationId: 'other-op' } }, { actor: { ...context.actor, status: 'SUSPENDED' } },
  ]) expect(isOperationalActor({ ...context, access: active, ...changes })).toBe(false);
  const stored = await master.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(stored.passwordHash).toBe(passwordHash);
  expect(stored.authVersion).toBe(0);
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(2);
  expect(await master.enrollmentProof.count({ where: { identityId: user.id, consumedAt: { not: null } } })).toBe(2);
  const rows = await master.enrollmentProof.findMany({ where: { identityId: user.id } });
  expect(JSON.stringify(rows)).not.toContain(proofs[0].token);
  expect(await tenants[1].member.count()).toBe(0);
  expect(await tenants[0].trainer.count()).toBe(0);
});

it('rejects incorrect proof bindings, wrong secret, expiry, changed security version and same-gym role conflicts without extra effects', async () => {
  const user = await fixtureIdentity('proof@example.test');
  const gym = await master.gym.findFirstOrThrow();
  const binding = { gymId: gym.id, role: 'MEMBER' as const, enrollmentOperationId: 'proof-operation' };
  await expect(identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id,
    authenticatedAuthVersion: user.authVersion, currentPassword: 'wrong' })).rejects.toThrow('verification failed');
  const proof = await identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id,
    authenticatedAuthVersion: user.authVersion, currentPassword: password });
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token, role: 'TRAINER' })).rejects.toThrow('proof invalid');
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token, gymId: 'foreign' })).rejects.toThrow('proof invalid');
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token, enrollmentOperationId: 'other' })).rejects.toThrow('proof invalid');
  await master.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
  const rotatedUser = await master.user.findUniqueOrThrow({ where: { id: user.id }, select: { authVersion: true } });
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token })).rejects.toThrow('proof invalid');
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(0);
  const client = await run.connect(run.masterName);
  try {
    await client.query('UPDATE "EnrollmentProof" SET "authVersion"=1,"issuedAt"=clock_timestamp()-interval \'11 minutes\',"expiresAt"=clock_timestamp() WHERE "identityId"=$1', [user.id]);
  } finally { await client.end(); }
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token })).rejects.toThrow('proof invalid');
  const acceptedBinding = { ...binding, enrollmentOperationId: 'accepted-op' };
  const accepted = await identities.issueEnrollmentProof({ ...acceptedBinding, authenticatedIdentityId: user.id,
    authenticatedAuthVersion: rotatedUser.authVersion, currentPassword: password });
  await identities.consumeProofAndPrepareAccess({ ...acceptedBinding, token: accepted.token });
  const conflictBinding = { ...binding, role: 'TRAINER' as const, enrollmentOperationId: 'conflict-op' };
  const conflict = await identities.issueEnrollmentProof({ ...conflictBinding, authenticatedIdentityId: user.id,
    authenticatedAuthVersion: rotatedUser.authVersion, currentPassword: password });
  await expect(identities.consumeProofAndPrepareAccess({ ...conflictBinding, token: conflict.token })).rejects.toBeInstanceOf(ConflictException);
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(1);
  expect((await master.enrollmentProof.findFirstOrThrow({ where: { enrollmentOperationId: 'conflict-op' } })).consumedAt).toBeNull();
  expect((await master.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(passwordHash);
});

it('denies restricted/expired identities internal consent before future public auth endpoints exist', async () => {
  const user = await fixtureIdentity('restricted@example.test');
  const gym = await master.gym.findFirstOrThrow();
  const binding = { gymId: gym.id, role: 'MEMBER' as const, enrollmentOperationId: 'restricted-op' };
  const liveProof = await identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id,
    authenticatedAuthVersion: user.authVersion, currentPassword: password });
  await master.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
  await expect(identities.issueEnrollmentProof({ ...binding, enrollmentOperationId: 'another', authenticatedIdentityId: user.id,
    authenticatedAuthVersion: user.authVersion, currentPassword: password })).rejects.toThrow('verification failed');
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: liveProof.token })).rejects.toThrow('proof invalid');
  await master.user.update({ where: { id: user.id }, data: { mustChangePassword: false, credentialExpiresAt: new Date(0) } });
  await expect(identities.issueEnrollmentProof({ ...binding, enrollmentOperationId: 'expired', authenticatedIdentityId: user.id,
    authenticatedAuthVersion: user.authVersion, currentPassword: password })).rejects.toThrow('verification failed');
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(0);
});

it('retains login response compatibility and safe owner access while pending/unverified linked roles fail closed', async () => {
  const user = await fixtureIdentity('login@example.test');
  const gym = await master.gym.findFirstOrThrow();
  await master.gymAccess.create({ data: { userId: user.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const database = { master } as DatabaseService;
  const result = await new AuthController(database).login({ email: ' LOGIN@Example.TEST ', password });
  expect(Object.keys(result).sort()).toEqual(['accessToken', 'tokenType', 'expiresIn', 'sessionId', 'refreshToken', 'refreshExpiresAt',
    'absoluteExpiresAt', 'deviceClass', 'deviceLabel', 'globalRole', 'mustChangePassword', 'gyms'].sort());
  expect(result.expiresIn).toBe(900);
  expect(result.mustChangePassword).toBe(false);
  expect(result.gyms).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain(passwordHash);
  await expect(new AuthController(database).login({ email: 'login@example.test', password: 'wrong' })).rejects.toThrow('Invalid email or password');
  const guard = new GymAccessGuard(database, {} as TenantSchemaGateService);
  const requestFor = async (identityId: string, slug: string, authVersion = 0) => {
    const token = await new SignJWT({ authVersion }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
      .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(tokenSecret));
    const request = { headers: { authorization: `Bearer ${token}` }, params: { slug } } as unknown as GymRequest;
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
    return guard.canActivate(context);
  };
  await expect(requestFor(user.id, gym.slug)).resolves.toBe(true);
  await master.gymAccess.update({ where: { userId_gymId: { userId: user.id, gymId: gym.id } }, data: { linkStatus: 'PENDING' } });
  await expect(requestFor(user.id, gym.slug)).rejects.toThrow('Gym access denied');
  await expect(requestFor(user.id, 'foreign-gym')).rejects.toThrow('Gym access denied');
  expect((await new AuthController(database).login({ email: 'login@example.test', password })).gyms).toHaveLength(0);

  const forced = await fixtureIdentity('forced-login@example.test');
  await master.user.update({ where: { id: forced.id }, data: {
    mustChangePassword: true,
    credentialExpiresAt: new Date(Date.now() + 60 * 60_000),
  } });
  await master.gymAccess.create({ data: { userId: forced.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const restricted = await new AuthController(database).login({ email: 'forced-login@example.test', password });
  expect(restricted.mustChangePassword).toBe(true);
  await expect(requestFor(forced.id, gym.slug)).rejects.toThrow('Password change required');
  const adminRequest = { headers: { authorization: `Bearer ${restricted.accessToken}` } };
  const adminContext = { switchToHttp: () => ({ getRequest: () => adminRequest }) } as ExecutionContext;
  await expect(new SuperAdminGuard(database).canActivate(adminContext)).rejects.toThrow('Password change required');
  await master.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
  await expect(requestFor(user.id, gym.slug, 0)).rejects.toThrow('Invalid or revoked token');

  const expired = await fixtureIdentity('expired-login@example.test');
  await master.user.update({ where: { id: expired.id }, data: { credentialExpiresAt: new Date(0) } });
  await expect(new AuthController(database).login({ email: 'expired-login@example.test', password }))
    .rejects.toThrow('Invalid email or password');
  const missingExpiry = await fixtureIdentity('missing-expiry@example.test');
  await master.user.update({ where: { id: missingExpiry.id }, data: { mustChangePassword: true } });
  await expect(new AuthController(database).login({ email: 'missing-expiry@example.test', password }))
    .rejects.toThrow('Invalid email or password');
});

it('records authenticated email correction requests without changing credentials or gym contact snapshots', async () => {
  const subject = await fixtureIdentity('correction-subject@example.test');
  const admin = await fixtureIdentity('correction-admin@example.test');
  await master.user.update({ where: { id: admin.id }, data: { globalRole: 'SUPER_ADMIN' } });
  const member = await tenants[0].member.create({ data: { fullName: 'Synthetic Applicant', identityId: subject.id,
    email: 'contact-snapshot@example.test', registrationState: 'COMPLETE', enrollmentOperationId: 'contact-snapshot-op' } });
  const database = { master } as DatabaseService;
  const sessions = new AuthSessionService(database);
  const subjectSession = await sessions.create(subject.id, subject.authVersion, 'PERSONAL', 'Synthetic test device');
  const controller = new EmailCorrectionController(database);
  const token = subjectSession.accessToken;
  const request = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
  const sessionContext = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
  await expect(new AuthSessionGuard(sessions).canActivate(sessionContext)).resolves.toBe(true);
  await expect(controller.submit(request, 'correction-key-0001', { requestedEmail: 'correction-target@example.test', currentPassword: 'wrong' }))
    .rejects.toThrow('Current password was not accepted');
  const subjectPasswordHash = (await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash;
  const command = () => controller.submit(request, 'correction-key-0002', { requestedEmail: ' Correction-Target@Example.test ', currentPassword: password });
  const [first, retry] = await Promise.all([command(), command()]);
  expect(first).toMatchObject({ requestedEmail: 'correction-target@example.test', state: 'PENDING' });
  expect(retry.id).toBe(first.id);
  expect(await master.identityEmailCorrectionRequest.count({ where: { identityId: subject.id } })).toBe(1);
  await expect(controller.submit(request, 'correction-key-0003', { requestedEmail: 'correction-target@example.test', currentPassword: password }))
    .rejects.toThrow('pending request');
  await expect(controller.submit(request, 'correction-key-0004', { requestedEmail: admin.email, currentPassword: password }))
    .rejects.toThrow('cannot be requested');
  const persistedRequest = await master.identityEmailCorrectionRequest.findUniqueOrThrow({ where: { id: first.id } });
  expect(JSON.stringify(persistedRequest)).not.toContain(password);
  expect((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).email).toBe('correction-subject@example.test');
  expect(await argon2.verify((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash, password)).toBe(true);
  expect((await tenants[0].member.findUniqueOrThrow({ where: { id: member.id } })).email).toBe('contact-snapshot@example.test');
  const own = await controller.own(request);
  expect(own).toHaveLength(1);
  await controller.withdraw(request, first.id);
  expect((await controller.own(request))[0].state).toBe('WITHDRAWN');
  const adminController = new AdminEmailCorrectionController(database);
  const ordinaryContext = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${token}` }, method: 'GET', path: '/admin/email-correction-requests' }) }) } as unknown as ExecutionContext;
  await expect(new SuperAdminGuard(database).canActivate(ordinaryContext)).rejects.toThrow('Super Admin access required');
  const adminSession = await sessions.create(admin.id, admin.authVersion, 'PERSONAL', 'Synthetic reviewer');
  const second = await controller.submit(request, 'correction-key-0005', { requestedEmail: 'second-correction@example.test', currentPassword: password });
  const reviewer = { headers: { authorization: `Bearer ${adminSession.accessToken}` }, method: 'POST', path: `/admin/email-correction-requests/${second.id}/close` } as PlatformRequest;
  const reviewerContext = { switchToHttp: () => ({ getRequest: () => reviewer }) } as ExecutionContext;
  await expect(new AuthSessionGuard(sessions).canActivate(reviewerContext)).resolves.toBe(true);
  await expect(new SuperAdminGuard(database).canActivate(reviewerContext)).resolves.toBe(true);
  expect(await adminController.list()).toHaveLength(1);
  const decisions = await Promise.allSettled([
    adminController.close(reviewer, second.id, { expectedVersion: 0, resolution: 'FOLLOW_UP_RECORDED' }),
    adminController.close(reviewer, second.id, { expectedVersion: 0, resolution: 'CLOSED_NO_CHANGE' }),
  ]);
  expect(decisions.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(decisions.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect(['FOLLOW_UP_RECORDED', 'CLOSED_NO_CHANGE']).toContain((await controller.own(request)).find(row => row.id === second.id)?.resolution);
  const audit = await master.platformAuditLog.findMany({ where: { resourceType: 'EMAIL_CORRECTION_REQUEST', resourceId: first.id } });
  expect(audit.map(event => event.eventCode)).toContain('IDENTITY_EMAIL_CORRECTION_WITHDRAWN');
  expect(JSON.stringify(audit)).not.toContain('correction-target@example.test');
  expect(subjectPasswordHash).toBe((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash);
});


it('CLI identity writers share canonicalization and preserve explicit ACTIVE owner access', async () => {
  const execute = promisify(execFile);
  const environment = { ...process.env, DOTENV_CONFIG_PATH: '/dev/null', MASTER_DATABASE_URL: run.masterUrl };
  await execute(process.execPath, [`${root}apps/api/scripts/create-super-admin.mjs`, ' CLI.Admin@Example.TEST '], {
    cwd: root, env: { ...environment, SUPER_ADMIN_PASSWORD: password }, timeout: 15_000,
  });
  const gym = await master.gym.findFirstOrThrow();
  await execute(process.execPath, [`${root}apps/api/scripts/create-owner.mjs`, ' CLI.Owner@Example.TEST ', gym.slug], {
    cwd: root, env: { ...environment, OWNER_PASSWORD: password }, timeout: 15_000,
  });
  const admin = await master.user.findUniqueOrThrow({ where: { email: 'cli.admin@example.test' } });
  const owner = await master.user.findUniqueOrThrow({ where: { email: 'cli.owner@example.test' }, include: { gymAccesses: true } });
  expect(admin.globalRole).toBe('SUPER_ADMIN');
  expect(owner.gymAccesses[0].linkStatus).toBe('ACTIVE');
  expect(await argon2.verify(owner.passwordHash, password)).toBe(true);
  const client = await run.connect(run.masterName);
  try {
    await expect(client.query('INSERT INTO "GymAccess"("userId","gymId",role,"linkStatus","tenantActorId","enrollmentOperationId") VALUES ($1,$2,$3,$4,$5,$6)',
      [admin.id, gym.id, 'MEMBER', 'ACTIVE', 'actor', 'operation'])).rejects.toMatchObject({ code: '23514' });
  } finally { await client.end(); }
});

it('issues a one-time credential, rotates it once, and atomically changes it without storing plaintext', async () => {
  const owner = await fixtureIdentity('credential-owner@example.test');
  const subject = await fixtureIdentity('credential-new-member@example.test');
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const operationId = `register_${randomBytes(8).toString('hex')}`;
  const member = await tenants[0].member.create({ data: {
    fullName: 'Synthetic New Member', identityId: subject.id, registrationState: 'COMPLETE', enrollmentOperationId: operationId,
  } });
  await master.operation.create({ data: {
    id: operationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id, scopeKey: `gym:${gym.id}`,
    idempotencyKey: `credential-${randomBytes(8).toString('hex')}`, requestDigest: `d1:${'a'.repeat(64)}`,
    gymId: gym.id, subjectIdentityId: subject.id, tenantActorId: member.id, state: 'COMPLETE',
    step: 'MASTER_ACTIVATED', safeResult: { operationId, identityId: subject.id, memberId: member.id },
  } });
  await master.gymAccess.create({ data: {
    userId: subject.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE', actorKind: 'MEMBER',
    tenantActorId: member.id, enrollmentOperationId: operationId,
  } });

  const database = { master } as DatabaseService;
  const credentials = new CredentialService(database);
  const secondOwner = await fixtureIdentity('credential-second-owner@example.test');
  await master.gymAccess.create({ data: { userId: secondOwner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const otherGym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[1], status: 'ACTIVE' } });
  await expect(credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: otherGym.id, operationId }))
    .rejects.toThrow('Credential operation unavailable');
  const first = await credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId });
  expect(first.status).toBe('ISSUED');
  if (!first.temporaryPassword) throw new Error('Expected one-time temporary credential');
  const firstSecret = first.temporaryPassword;
  expect((await credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId })))
    .toEqual({ status: 'ALREADY_ISSUED', deliveryVersion: 0 });
  const issuedHash = (await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash;
  expect(await argon2.verify(issuedHash, firstSecret)).toBe(true);
  await expect(new AuthController(database).login({ email: 'credential-new-member@example.test', password: firstSecret }))
    .resolves.toMatchObject({ mustChangePassword: true });
  expect((await master.credentialDelivery.findUniqueOrThrow({ where: { operationId } })).authVersion).toBe(1);
  expect(JSON.stringify(await master.operation.findUniqueOrThrow({ where: { id: operationId } }))).not.toContain(firstSecret);
  expect(JSON.stringify(await master.platformAuditLog.findMany({ where: { operationId } }))).not.toContain(firstSecret);

  const reissueInput = { actorIdentityId: secondOwner.id, gymId: gym.id, operationId, expectedVersion: 0,
    idempotencyKey: 'lost-handoff-request-01', reason: 'LOST_HANDOFF' as const };
  await expect(credentials.reissueForOperation({ ...reissueInput, reason: 'EXPIRED_CREDENTIAL', idempotencyKey: 'incorrect-reason-01' }))
    .rejects.toThrow('Credential state does not match the requested reissue reason');
  const reissued = await credentials.reissueForOperation(reissueInput);
  expect(reissued.status).toBe('ISSUED');
  if (!reissued.temporaryPassword) throw new Error('Expected rotated temporary credential');
  const secondSecret = reissued.temporaryPassword;
  expect(reissued.deliveryVersion).toBe(1);
  expect(await argon2.verify((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash, firstSecret)).toBe(false);
  expect(await argon2.verify((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash, secondSecret)).toBe(true);
  await expect(new AuthController(database).login({ email: 'credential-new-member@example.test', password: firstSecret }))
    .rejects.toThrow('Invalid email or password');
  await expect(new AuthController(database).login({ email: 'credential-new-member@example.test', password: secondSecret }))
    .resolves.toMatchObject({ mustChangePassword: true });
  expect(await credentials.reissueForOperation(reissueInput)).toEqual({ status: 'ALREADY_ISSUED', deliveryVersion: 1 });
  await expect(credentials.reissueForOperation({ ...reissueInput, idempotencyKey: 'another-reissue-key-02' }))
    .rejects.toThrow('Credential delivery version changed');

  // Simulate the owner losing the response after the replacement committed.
  const lostResponseInput = { ...reissueInput, expectedVersion: 1, idempotencyKey: 'lost-response-reissue-03' };
  const committedWithoutResponse = await credentials.reissueForOperation(lostResponseInput);
  expect(committedWithoutResponse).toMatchObject({ status: 'ISSUED', deliveryVersion: 2 });
  const recoveredVersion = await credentials.reissueForOperation(lostResponseInput);
  expect(recoveredVersion).toEqual({ status: 'ALREADY_ISSUED', deliveryVersion: 2 });
  // A secret is never replayed. Use the recovered version to revoke the unseen
  // credential and obtain a new one-time value under a fresh request key.
  const recoveredHandoff = await credentials.reissueForOperation({ ...reissueInput,
    expectedVersion: recoveredVersion.deliveryVersion, idempotencyKey: 'recovered-handoff-04' });
  expect(recoveredHandoff).toMatchObject({ status: 'ISSUED', deliveryVersion: 3 });
  if (!recoveredHandoff.temporaryPassword) throw new Error('Expected replacement after lost response recovery');
  const finalTemporaryPassword = recoveredHandoff.temporaryPassword;
  await expect(new AuthController(database).login({ email: 'credential-new-member@example.test', password: secondSecret }))
    .rejects.toThrow('Invalid email or password');
  await expect(new AuthController(database).login({ email: 'credential-new-member@example.test', password: finalTemporaryPassword }))
    .resolves.toMatchObject({ mustChangePassword: true });

  await credentials.acknowledgeTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId, deliveryVersion: 3 });
  await expect(credentials.reissueForOperation({ ...reissueInput, expectedVersion: 3, idempotencyKey: 'after-ack-request-05' }))
    .rejects.toThrow('Credential handoff was already acknowledged');
  await expect(credentials.changePassword({ identityId: subject.id, authVersion: 1, currentPassword: secondSecret,
    newPassword: 'New-member-password-42' })).rejects.toThrow('Invalid or revoked token');
  await credentials.changePassword({ identityId: subject.id, authVersion: 4, currentPassword: finalTemporaryPassword,
    newPassword: 'New-member-password-42' });
  const changed = await master.user.findUniqueOrThrow({ where: { id: subject.id } });
  expect(changed.mustChangePassword).toBe(false);
  expect(changed.credentialExpiresAt).toBeNull();
  expect(changed.authVersion).toBe(5);
  expect(changed.passwordChangedAt).toBeInstanceOf(Date);
  expect(await argon2.verify(changed.passwordHash, secondSecret)).toBe(false);
  expect(await argon2.verify(changed.passwordHash, finalTemporaryPassword)).toBe(false);
  expect(await argon2.verify(changed.passwordHash, 'New-member-password-42')).toBe(true);
  expect((await master.identitySession.findMany({ where: { identityId: subject.id } })).every(session => session.revokedAt !== null)).toBe(true);

  const reused = await master.user.findUniqueOrThrow({ where: { email: 'multi@example.test' } });
  const reusedHash = reused.passwordHash;
  const reusedOperationId = `reused_${randomBytes(8).toString('hex')}`;
  await master.operation.create({ data: {
    id: reusedOperationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id, scopeKey: `gym:${gym.id}`,
    idempotencyKey: `reused-${randomBytes(8).toString('hex')}`, requestDigest: `d1:${'b'.repeat(64)}`,
    gymId: gym.id, subjectIdentityId: reused.id, state: 'COMPLETE', step: 'MASTER_ACTIVATED',
    safeResult: { operationId: reusedOperationId, identityId: reused.id },
  } });
  await expect(credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId: reusedOperationId }))
    .rejects.toThrow('Credential issue is limited to a new identity for this operation');
  expect((await master.user.findUniqueOrThrow({ where: { id: reused.id } })).passwordHash).toBe(reusedHash);

  const expiredSubject = await fixtureIdentity('credential-expired-member@example.test');
  const expiredOperationId = `expired_${randomBytes(8).toString('hex')}`;
  const expiredMember = await tenants[0].member.create({ data: {
    fullName: 'Synthetic Expired Member', identityId: expiredSubject.id,
    registrationState: 'COMPLETE', enrollmentOperationId: expiredOperationId,
  } });
  await master.operation.create({ data: {
    id: expiredOperationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id, scopeKey: `gym:${gym.id}`,
    idempotencyKey: `expired-${randomBytes(8).toString('hex')}`, requestDigest: `d1:${'c'.repeat(64)}`,
    gymId: gym.id, subjectIdentityId: expiredSubject.id, tenantActorId: expiredMember.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId: expiredOperationId, memberId: expiredMember.id },
  } });
  await master.gymAccess.create({ data: {
    userId: expiredSubject.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE', actorKind: 'MEMBER',
    tenantActorId: expiredMember.id, enrollmentOperationId: expiredOperationId,
  } });
  const oldExpiry = new Date(Date.now() - 60 * 60_000);
  await master.user.update({ where: { id: expiredSubject.id }, data: {
    mustChangePassword: true, authVersion: 1, credentialExpiresAt: oldExpiry,
  } });
  await master.credentialDelivery.create({ data: {
    operationId: expiredOperationId, identityId: expiredSubject.id, issuedByIdentityId: owner.id,
    gymId: gym.id, authVersion: 1, issuedAt: new Date(oldExpiry.getTime() - 24 * 60 * 60_000), expiresAt: oldExpiry,
  } });
  const expiredRotation = await credentials.reissueForOperation({ actorIdentityId: owner.id, gymId: gym.id,
    operationId: expiredOperationId, expectedVersion: 0, idempotencyKey: 'expired-credential-reissue-01', reason: 'EXPIRED_CREDENTIAL' });
  expect(expiredRotation.status).toBe('ISSUED');
  expect(expiredRotation.deliveryVersion).toBe(1);
  expect(await argon2.verify((await master.user.findUniqueOrThrow({ where: { id: expiredSubject.id } })).passwordHash, password)).toBe(false);
});

it('issues one-use staff recovery to an ordinary member, serializes redemption and confirms retries safely', async () => {
  const owner = await fixtureIdentity('staff-recovery-owner@example.test');
  const subject = await fixtureIdentity('staff-recovery-member@example.test');
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const operationId = `recovery_member_${randomBytes(8).toString('hex')}`;
  const member = await tenants[0].member.create({ data: { fullName: 'Recovery Member', identityId: subject.id,
    registrationState: 'COMPLETE', enrollmentOperationId: operationId } });
  await master.operation.create({ data: { id: operationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: `recovery-${randomBytes(8).toString('hex')}`,
    requestDigest: `d1:${'f'.repeat(64)}`, gymId: gym.id, subjectIdentityId: subject.id, tenantActorId: member.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId, memberId: member.id } } });
  await master.gymAccess.create({ data: { userId: subject.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE',
    actorKind: 'MEMBER', tenantActorId: member.id, enrollmentOperationId: operationId } });
  const credentials = new CredentialService({ master } as DatabaseService);
  const controller = new AuthController({ master } as DatabaseService);
  const firstSession = await controller.login({ email: subject.email, password });
  const secondSession = await controller.login({ email: subject.email, password });
  expect((await credentials.recoveryCandidates(gym.id)).items).toContainEqual(expect.objectContaining({ identityId: subject.id, relationship: 'MEMBER' }));
  await expect(credentials.issueRecovery({ actorIdentityId: owner.id, gymId: gym.id, identityId: owner.id,
    verificationMethod: 'IN_PERSON', reason: 'Owner identity verified in person.', currentPassword: password })).rejects.toThrow('not eligible');
  const input = { actorIdentityId: owner.id, gymId: gym.id, identityId: subject.id,
    verificationMethod: 'KNOWN_CONTACT' as const, reason: 'Known contact confirmed against the enrollment record.', currentPassword: password };
  const issued = await credentials.issueRecovery(input);
  const firstRow = await master.recoveryCredential.findUniqueOrThrow({ where: { id: issued.credentialId } });
  expect(firstRow.secretHash).not.toContain(issued.secret);
  expect(JSON.stringify(await master.platformAuditLog.findMany({ where: { resourceId: issued.credentialId } }))).not.toContain(issued.secret);
  const revokedIssuer = await fixtureIdentity('staff-recovery-revoked-issuer@example.test');
  await master.gymAccess.create({ data: { userId: revokedIssuer.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const revokedAuthority = await credentials.issueRecovery({ ...input, actorIdentityId: revokedIssuer.id });
  await master.gymAccess.update({ where: { userId_gymId: { userId: revokedIssuer.id, gymId: gym.id } }, data: { linkStatus: 'REVOKED' } });
  await expect(credentials.completeRecovery({ credentialId: revokedAuthority.credentialId, secret: revokedAuthority.secret,
    newPassword: 'Recovery-password-44' })).rejects.toThrow('invalid');
  expect(await master.recoveryCredential.findUniqueOrThrow({ where: { id: revokedAuthority.credentialId } })).toMatchObject({ revokedAt: expect.any(Date) });
  const replacement = await credentials.issueRecovery(input);
  await expect(credentials.completeRecovery({ credentialId: issued.credentialId, secret: issued.secret,
    newPassword: 'Recovery-password-44' })).rejects.toThrow('invalid');
  const redeemInput = { credentialId: replacement.credentialId, secret: replacement.secret, newPassword: 'Recovery-password-44' };
  expect(await Promise.all([credentials.completeRecovery(redeemInput), credentials.completeRecovery(redeemInput)])).toEqual([{ success: true }, { success: true }]);
  expect((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).authVersion).toBe(subject.authVersion + 1);
  expect(await master.identitySecurityEvent.count({ where: { identityId: subject.id, event: 'PASSWORD_RECOVERED' } })).toBe(1);
  expect(await master.identitySession.count({ where: { identityId: subject.id, revokedAt: null } })).toBe(0);
  const auth = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
  await expect(controller.session(auth(firstSession.accessToken))).rejects.toThrow('Session revoked or expired');
  await expect(controller.session(auth(secondSession.accessToken))).rejects.toThrow('Session revoked or expired');
  await expect(controller.login({ email: subject.email, password })).rejects.toThrow('Invalid email or password');
  await expect(controller.login({ email: subject.email, password: 'Recovery-password-44' })).resolves.toMatchObject({ mustChangePassword: false });
  expect(await credentials.securityEvents(subject.id)).toMatchObject({ items: [{ event: 'PASSWORD_RECOVERED' }] });
});

it('permits pending-applicant recovery without activating access and caps failed credential attempts', async () => {
  const owner = await fixtureIdentity('pending-recovery-owner@example.test');
  const applicant = await fixtureIdentity('pending-recovery-applicant@example.test');
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  await master.memberApplication.create({ data: { gymId: gym.id, identityId: applicant.id, fullName: 'Pending Recovery',
    phone: '+15550000005', consentedAt: new Date() } });
  const credentials = new CredentialService({ master } as DatabaseService);
  expect((await credentials.recoveryCandidates(gym.id)).items).toContainEqual(expect.objectContaining({ identityId: applicant.id, relationship: 'PENDING_APPLICANT' }));
  const input = { actorIdentityId: owner.id, gymId: gym.id, identityId: applicant.id,
    verificationMethod: 'IN_PERSON' as const, reason: 'Applicant matched in person to the pending application.', currentPassword: password };
  const issued = await credentials.issueRecovery(input);
  for (let attempt = 0; attempt < 5; attempt++) await expect(credentials.completeRecovery({ credentialId: issued.credentialId,
    secret: 'A'.repeat(43), newPassword: 'Recovery-password-45' })).rejects.toThrow('invalid');
  expect(await master.recoveryCredential.findUniqueOrThrow({ where: { id: issued.credentialId } })).toMatchObject({ attempts: 5, revokedAt: expect.any(Date) });
  const replacement = await credentials.issueRecovery(input);
  await credentials.completeRecovery({ credentialId: replacement.credentialId, secret: replacement.secret, newPassword: 'Recovery-password-45' });
  expect(await master.gymAccess.count({ where: { userId: applicant.id } })).toBe(0);
  expect(await master.memberApplication.findFirstOrThrow({ where: { identityId: applicant.id } })).toMatchObject({ state: 'PENDING' });
});

it('uses a separately reauthenticated Super Admin path for owner accounts and blocks revoked operator authority', async () => {
  const operator = await fixtureIdentity('operator-recovery-admin@example.test');
  const owner = await fixtureIdentity('operator-recovery-owner@example.test');
  const targetAdmin = await fixtureIdentity('operator-recovery-admin-target@example.test');
  await master.user.update({ where: { id: operator.id }, data: { globalRole: 'SUPER_ADMIN' } });
  await master.user.update({ where: { id: targetAdmin.id }, data: { globalRole: 'SUPER_ADMIN' } });
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const credentials = new CredentialService({ master } as DatabaseService);
  await expect(credentials.issueOperatorRecovery({ actorIdentityId: operator.id, email: owner.email, currentPassword: 'wrong',
    verificationMethod: 'IN_PERSON', reason: 'Owner verified in person by the platform operator.' })).rejects.toThrow('Independent operator verification');
  await expect(credentials.issueOperatorRecovery({ actorIdentityId: operator.id, email: operator.email, currentPassword: password,
    verificationMethod: 'IN_PERSON', reason: 'Self reset is explicitly disallowed.' })).rejects.toThrow('not eligible');
  const ownerIssue = await credentials.issueOperatorRecovery({ actorIdentityId: operator.id, email: owner.email, currentPassword: password,
    verificationMethod: 'KNOWN_CONTACT', reason: 'Owner verified through the established platform contact.' });
  const ownerRecovery = await master.recoveryCredential.findUniqueOrThrow({ where: { id: ownerIssue.credentialId } });
  expect(ownerRecovery).toMatchObject({ scope: 'OPERATOR', gymId: null, issuerAuthVersion: operator.authVersion });
  expect(ownerRecovery.secretHash).not.toContain(ownerIssue.secret);
  await credentials.completeRecovery({ credentialId: ownerIssue.credentialId, secret: ownerIssue.secret, newPassword: 'Owner-recovered-password-51' });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } } }))
    .toMatchObject({ role: 'OWNER', linkStatus: 'ACTIVE' });
  await expect(new AuthController({ master } as DatabaseService).login({ email: owner.email, password: 'Owner-recovered-password-51' }))
    .resolves.toMatchObject({ globalRole: 'USER' });

  const pendingAuthority = await credentials.issueOperatorRecovery({ actorIdentityId: operator.id, email: targetAdmin.email, currentPassword: password,
    verificationMethod: 'IN_PERSON', reason: 'Administrator verified in person by the platform operator.' });
  await master.user.update({ where: { id: operator.id }, data: { globalRole: 'USER' } });
  await expect(credentials.completeRecovery({ credentialId: pendingAuthority.credentialId, secret: pendingAuthority.secret,
    newPassword: 'Admin-recovered-password-52' })).rejects.toThrow('invalid');
  expect((await master.user.findUniqueOrThrow({ where: { id: targetAdmin.id } })).passwordChangedAt).toBeNull();
});

it('logout atomically revokes every current identity session including restricted credentials', async () => {
  const user = await fixtureIdentity('logout@example.test');
  const database = { master } as DatabaseService;
  const controller = new AuthController(database);
  const first = await controller.login({ email: user.email, password });
  const second = await controller.login({ email: user.email, password });
  const auth = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
  const before = await master.$transaction([master.user.count(), master.gymAccess.count(), master.operation.count()]);
  const results = await Promise.allSettled([controller.logout(auth(first.accessToken)), controller.logout(auth(second.accessToken))]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect((await master.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(user.authVersion + 1);
  await expect(controller.session(auth(first.accessToken))).rejects.toThrow('Session revoked or expired');
  await expect(controller.session(auth(second.accessToken))).rejects.toThrow('Session revoked or expired');
  const fresh = await controller.login({ email: user.email, password });
  await expect(controller.logout(auth(first.accessToken))).rejects.toThrow('Invalid or expired session');
  await expect(controller.session(auth(fresh.accessToken))).resolves.toMatchObject({ identityId: user.id, displayName: null });
  await master.user.update({ where: { id: user.id }, data: { mustChangePassword: true, credentialExpiresAt: new Date(Date.now() + 60_000) } });
  const restricted = await controller.login({ email: user.email, password });
  await expect(controller.logout(auth(restricted.accessToken))).resolves.toEqual({ revoked: true });
  expect((await master.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(user.authVersion + 2);
  expect(await master.$transaction([master.user.count(), master.gymAccess.count(), master.operation.count()])).toEqual(before);
});

it('rotates a device refresh token once across concurrent tabs, detects replay, and isolates current-device logout', async () => {
  const user = await fixtureIdentity('device-sessions@example.test');
  const controller = new AuthController({ master } as DatabaseService);
  const auth = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
  const personal = await controller.login({ email: user.email, password, deviceClass: 'PERSONAL' });
  const shared = await controller.login({ email: user.email, password });
  expect(personal.deviceClass).toBe('PERSONAL');
  expect(personal.deviceLabel).toBe('Web browser');
  expect(shared.deviceClass).toBe('SHARED');
  const rows = await controller.sessionsList(auth(personal.accessToken));
  expect(rows.items).toHaveLength(2);
  expect(rows.items.filter((row: { current: boolean }) => row.current)).toHaveLength(1);
  const sessionBeforeRenewal = await master.identitySession.findUniqueOrThrow({ where: { id: personal.sessionId } });
  const concurrent = await Promise.all([
    controller.refresh({ refreshToken: personal.refreshToken }),
    controller.refresh({ refreshToken: personal.refreshToken }),
  ]);
  expect(concurrent[0].refreshToken).toBe(concurrent[1].refreshToken);
  expect(concurrent[0].refreshToken).not.toBe(personal.refreshToken);
  const passiveRenewal = await master.identitySession.findUniqueOrThrow({ where: { id: personal.sessionId } });
  expect(passiveRenewal.lastActivityAt).toEqual(sessionBeforeRenewal.lastActivityAt);
  expect(passiveRenewal.idleExpiresAt).toEqual(sessionBeforeRenewal.idleExpiresAt);
  const activityRenewal = await controller.refresh({ refreshToken: concurrent[0].refreshToken, activity: true });
  const activeRenewal = await master.identitySession.findUniqueOrThrow({ where: { id: personal.sessionId } });
  expect(activeRenewal.lastActivityAt.getTime()).toBeGreaterThan(sessionBeforeRenewal.lastActivityAt.getTime());
  expect(activeRenewal.idleExpiresAt.getTime()).toBeGreaterThanOrEqual(passiveRenewal.idleExpiresAt.getTime());
  await expect(controller.session(auth(personal.accessToken))).resolves.toMatchObject({ identityId: user.id });
  await expect(controller.session(auth(activityRenewal.accessToken))).resolves.toMatchObject({ identityId: user.id, deviceClass: 'PERSONAL' });

  const oldHash = createHash('sha256').update(concurrent[0].refreshToken).digest('hex');
  await master.identitySession.updateMany({ where: { identityId: user.id, previousRefreshTokenHash: oldHash },
    data: { previousRefreshValidUntil: new Date(0) } });
  await expect(controller.refresh({ refreshToken: concurrent[0].refreshToken })).rejects.toThrow('replay detected');
  await expect(controller.session(auth(activityRenewal.accessToken))).rejects.toThrow('Session revoked or expired');
  await expect(controller.session(auth(shared.accessToken))).resolves.toMatchObject({ identityId: user.id });

  await expect(controller.logout(auth(shared.accessToken), { scope: 'CURRENT' })).resolves.toEqual({ revoked: true });
  await expect(controller.session(auth(shared.accessToken))).rejects.toThrow('Session revoked or expired');
  await expect(controller.session(auth(activityRenewal.accessToken))).rejects.toThrow('Session revoked or expired');
});

it('serializes the owner acknowledgement and credential-reissue race to one delivery outcome', async () => {
  const owner = await fixtureIdentity('credential-race-owner@example.test');
  const subject = await fixtureIdentity('credential-race-member@example.test');
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const operationId = `race_${randomBytes(8).toString('hex')}`;
  const member = await tenants[0].member.create({ data: { fullName: 'Credential Race Member', identityId: subject.id,
    registrationState: 'COMPLETE', enrollmentOperationId: operationId } });
  await master.operation.create({ data: { id: operationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: `credential-race-${randomBytes(8).toString('hex')}`,
    requestDigest: `d1:${'d'.repeat(64)}`, gymId: gym.id, subjectIdentityId: subject.id, tenantActorId: member.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId, memberId: member.id } } });
  await master.gymAccess.create({ data: { userId: subject.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE',
    actorKind: 'MEMBER', tenantActorId: member.id, enrollmentOperationId: operationId } });
  const credentials = new CredentialService({ master } as DatabaseService);
  const issued = await credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId });
  expect(issued.status).toBe('ISSUED');
  const attempts = await Promise.allSettled([
    credentials.acknowledgeTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId, deliveryVersion: 0 }),
    credentials.reissueForOperation({ actorIdentityId: owner.id, gymId: gym.id, operationId, expectedVersion: 0,
      idempotencyKey: 'credential-race-reissue-01', reason: 'LOST_HANDOFF' }),
  ]);
  expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const delivery = await master.credentialDelivery.findUniqueOrThrow({ where: { operationId } });
  const subjectAfter = await master.user.findUniqueOrThrow({ where: { id: subject.id } });
  if (delivery.acknowledgedAt) {
    expect(delivery.version).toBe(0);
    expect(subjectAfter.authVersion).toBe(1);
  } else {
    expect(delivery.version).toBe(1);
    expect(delivery.lastReissueKey).toBe('credential-race-reissue-01');
    expect(subjectAfter.authVersion).toBe(2);
  }
  expect(await master.platformAuditLog.count({ where: { operationId,
    eventCode: { in: ['TEMPORARY_CREDENTIAL_ISSUED', 'TEMPORARY_CREDENTIAL_REISSUED'] } } })).toBe(delivery.version + 1);
});

it('rejects credential reissue after the issuing owner is revoked without rotating the member secret', async () => {
  const owner = await fixtureIdentity('credential-revoked-owner@example.test');
  const subject = await fixtureIdentity('credential-revoked-member@example.test');
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  const ownerLink = await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const operationId = `revoked_credential_${randomBytes(8).toString('hex')}`;
  const member = await tenants[0].member.create({ data: { fullName: 'Revoked Owner Member', identityId: subject.id,
    registrationState: 'COMPLETE', enrollmentOperationId: operationId } });
  await master.operation.create({ data: { id: operationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: `credential-revoked-${randomBytes(8).toString('hex')}`,
    requestDigest: `d1:${'e'.repeat(64)}`, gymId: gym.id, subjectIdentityId: subject.id, tenantActorId: member.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId, memberId: member.id } } });
  await master.gymAccess.create({ data: { userId: subject.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE',
    actorKind: 'MEMBER', tenantActorId: member.id, enrollmentOperationId: operationId } });
  const credentials = new CredentialService({ master } as DatabaseService);
  const issued = await credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId });
  expect(issued.status).toBe('ISSUED');
  const before = await master.user.findUniqueOrThrow({ where: { id: subject.id } });
  await master.gymAccess.update({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } },
    data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
  await expect(credentials.reissueForOperation({ actorIdentityId: owner.id, gymId: gym.id, operationId,
    expectedVersion: 0, idempotencyKey: 'revoked-owner-reissue-01', reason: 'LOST_HANDOFF' })).rejects.toThrow('Owner access required');
  expect(await master.credentialDelivery.findUniqueOrThrow({ where: { operationId } })).toMatchObject({ version: 0, acknowledgedAt: null });
  expect((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).passwordHash).toBe(before.passwordHash);
  expect((await master.user.findUniqueOrThrow({ where: { id: subject.id } })).authVersion).toBe(before.authVersion);
  expect((await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } } })).version)
    .toBe(ownerLink.version + 1);
});

it('orders an in-flight credential reissue before a concurrent owner revocation', async () => {
  const owner = await fixtureIdentity('credential-owner-race@example.test');
  const subject = await fixtureIdentity('credential-member-race@example.test');
  const gym = await master.gym.findFirstOrThrow({ where: { databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const operationId = `owner_revoke_race_${randomBytes(8).toString('hex')}`;
  const member = await tenants[0].member.create({ data: { fullName: 'Owner Revocation Race Member', identityId: subject.id,
    registrationState: 'COMPLETE', enrollmentOperationId: operationId } });
  await master.operation.create({ data: { id: operationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: `owner-revoke-race-${randomBytes(8).toString('hex')}`,
    requestDigest: `d1:${'f'.repeat(64)}`, gymId: gym.id, subjectIdentityId: subject.id, tenantActorId: member.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId, memberId: member.id } } });
  await master.gymAccess.create({ data: { userId: subject.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE',
    actorKind: 'MEMBER', tenantActorId: member.id, enrollmentOperationId: operationId } });
  const credentials = new CredentialService({ master } as DatabaseService);
  expect((await credentials.issueTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId })).status).toBe('ISSUED');

  const advisoryKey = 99531101;
  const gate = await run.connect(run.masterName);
  await gate.query('SELECT pg_advisory_lock($1)', [advisoryKey]);
  await master.$executeRawUnsafe(`CREATE FUNCTION wait_member_credential_reissue() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'TEMPORARY_CREDENTIAL_REISSUED' THEN PERFORM pg_advisory_xact_lock(${advisoryKey}); END IF; RETURN NEW; END $$`);
  await master.$executeRawUnsafe(`CREATE TRIGGER wait_member_credential_reissue BEFORE INSERT ON "PlatformAuditLog"
    FOR EACH ROW EXECUTE FUNCTION wait_member_credential_reissue()`);
  let revocationFinished = false;
  try {
    const reissue = credentials.reissueForOperation({ actorIdentityId: owner.id, gymId: gym.id, operationId,
      expectedVersion: 0, idempotencyKey: 'owner-revoke-race-reissue', reason: 'LOST_HANDOFF' });
    const deadline = Date.now() + 5_000;
    let reissueBlocked = false;
    while (Date.now() < deadline) {
      const waiting = await gate.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock' AND wait_event = 'advisory'
          AND pid <> pg_backend_pid()`);
      if (waiting.rows[0]?.count > 0) { reissueBlocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    expect(reissueBlocked).toBe(true);
    const revocation = master.gymAccess.update({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } },
      data: { linkStatus: 'REVOKED', version: { increment: 1 } } }).finally(() => { revocationFinished = true; });
    let revocationBlocked = false;
    const revokeDeadline = Date.now() + 5_000;
    while (Date.now() < revokeDeadline) {
      const waiting = await gate.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%UPDATE%GymAccess%'`);
      if (waiting.rows[0]?.count > 0) { revocationBlocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    expect(revocationBlocked).toBe(true);
    expect(revocationFinished).toBe(false);
    await gate.query('SELECT pg_advisory_unlock($1)', [advisoryKey]);
    const reissued = await reissue;
    expect(reissued).toMatchObject({ status: 'ISSUED', deliveryVersion: 1 });
    const revoked = await revocation;
    expect(revoked).toMatchObject({ linkStatus: 'REVOKED', version: 1 });
    expect(await master.credentialDelivery.findUniqueOrThrow({ where: { operationId } })).toMatchObject({ version: 1, authVersion: 2 });
  } finally {
    await gate.query('SELECT pg_advisory_unlock($1)', [advisoryKey]).catch(() => undefined);
    await master.$executeRawUnsafe('DROP TRIGGER IF EXISTS wait_member_credential_reissue ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION IF EXISTS wait_member_credential_reissue()');
    await gate.end();
  }
});
