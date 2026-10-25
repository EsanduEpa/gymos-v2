import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ConflictException, type ExecutionContext } from '@nestjs/common';
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
import { SuperAdminGuard } from '../../src/super-admin.guard.js';
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
    const proof = await identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id, currentPassword: password });
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
  const trainer = await tenants[1].trainer.create({ data: { fullName: 'Synthetic Trainer', identityId: user.id,
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
  await expect(identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id, currentPassword: 'wrong' })).rejects.toThrow('verification failed');
  const proof = await identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id, currentPassword: password });
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token, role: 'TRAINER' })).rejects.toThrow('proof invalid');
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token, gymId: 'foreign' })).rejects.toThrow('proof invalid');
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token, enrollmentOperationId: 'other' })).rejects.toThrow('proof invalid');
  await master.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token })).rejects.toThrow('proof invalid');
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(0);
  const client = await run.connect(run.masterName);
  try {
    await client.query('UPDATE "EnrollmentProof" SET "authVersion"=1,"issuedAt"=clock_timestamp()-interval \'11 minutes\',"expiresAt"=clock_timestamp() WHERE "identityId"=$1', [user.id]);
  } finally { await client.end(); }
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: proof.token })).rejects.toThrow('proof invalid');
  const acceptedBinding = { ...binding, enrollmentOperationId: 'accepted-op' };
  const accepted = await identities.issueEnrollmentProof({ ...acceptedBinding, authenticatedIdentityId: user.id, currentPassword: password });
  await identities.consumeProofAndPrepareAccess({ ...acceptedBinding, token: accepted.token });
  const conflictBinding = { ...binding, role: 'TRAINER' as const, enrollmentOperationId: 'conflict-op' };
  const conflict = await identities.issueEnrollmentProof({ ...conflictBinding, authenticatedIdentityId: user.id, currentPassword: password });
  await expect(identities.consumeProofAndPrepareAccess({ ...conflictBinding, token: conflict.token })).rejects.toBeInstanceOf(ConflictException);
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(1);
  expect((await master.enrollmentProof.findFirstOrThrow({ where: { enrollmentOperationId: 'conflict-op' } })).consumedAt).toBeNull();
  expect((await master.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(passwordHash);
});

it('denies restricted/expired identities internal consent before future public auth endpoints exist', async () => {
  const user = await fixtureIdentity('restricted@example.test');
  const gym = await master.gym.findFirstOrThrow();
  const binding = { gymId: gym.id, role: 'MEMBER' as const, enrollmentOperationId: 'restricted-op' };
  const liveProof = await identities.issueEnrollmentProof({ ...binding, authenticatedIdentityId: user.id, currentPassword: password });
  await master.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
  await expect(identities.issueEnrollmentProof({ ...binding, enrollmentOperationId: 'another', authenticatedIdentityId: user.id, currentPassword: password })).rejects.toThrow('verification failed');
  await expect(identities.consumeProofAndPrepareAccess({ ...binding, token: liveProof.token })).rejects.toThrow('proof invalid');
  await master.user.update({ where: { id: user.id }, data: { mustChangePassword: false, credentialExpiresAt: new Date(0) } });
  await expect(identities.issueEnrollmentProof({ ...binding, enrollmentOperationId: 'expired', authenticatedIdentityId: user.id, currentPassword: password })).rejects.toThrow('verification failed');
  expect(await master.gymAccess.count({ where: { userId: user.id } })).toBe(0);
});

it('retains login response compatibility and safe owner access while pending/unverified linked roles fail closed', async () => {
  const user = await fixtureIdentity('login@example.test');
  const gym = await master.gym.findFirstOrThrow();
  await master.gymAccess.create({ data: { userId: user.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const database = { master } as DatabaseService;
  const result = await new AuthController(database).login({ email: ' LOGIN@Example.TEST ', password });
  expect(Object.keys(result).sort()).toEqual(['accessToken', 'tokenType', 'expiresIn', 'globalRole', 'mustChangePassword', 'gyms'].sort());
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

  await credentials.acknowledgeTemporaryCredential({ actorIdentityId: owner.id, gymId: gym.id, operationId, deliveryVersion: 1 });
  await expect(credentials.reissueForOperation({ ...reissueInput, expectedVersion: 1, idempotencyKey: 'after-ack-request-03' }))
    .rejects.toThrow('Credential handoff was already acknowledged');
  await expect(credentials.changePassword({ identityId: subject.id, authVersion: 1, currentPassword: secondSecret,
    newPassword: 'New-member-password-42' })).rejects.toThrow('Invalid or revoked token');
  await credentials.changePassword({ identityId: subject.id, authVersion: 2, currentPassword: secondSecret,
    newPassword: 'New-member-password-42' });
  const changed = await master.user.findUniqueOrThrow({ where: { id: subject.id } });
  expect(changed.mustChangePassword).toBe(false);
  expect(changed.credentialExpiresAt).toBeNull();
  expect(changed.authVersion).toBe(3);
  expect(changed.passwordChangedAt).toBeInstanceOf(Date);
  expect(await argon2.verify(changed.passwordHash, secondSecret)).toBe(false);
  expect(await argon2.verify(changed.passwordHash, 'New-member-password-42')).toBe(true);

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
