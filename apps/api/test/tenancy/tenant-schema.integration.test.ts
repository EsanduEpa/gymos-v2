import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConflictException, ForbiddenException, ServiceUnavailableException, type ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { GymsController } from '../../src/gyms.controller.js';
import { GymAccessGuard, type GymRequest } from '../../src/gym-access.guard.js';
import { OperationConflictError } from '../../src/operations/primitives.js';
import type { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { TenantRegistryService } from '../../src/tenancy/tenant-registry.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../../src/tenancy/tenant-schema-gate.service.js';
import { TenantSchemaIntegrityError, TenantSchemaVerifier, verifyInstalledTenant } from '../../src/tenancy/tenant-schema-verifier.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest } from '../../src/tenancy/tenant-template-manifest.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let master: MasterClient;
let tenants: TenantClient[] = [];
const databaseNames: string[] = [];
const databaseUrls: string[] = [];
let actorId = '';
const gymIds: string[] = [];
const operationIds: string[] = [];
const digest = tenantManifestDigest();
const guardJwtSecret = 'task018-test-secret-at-least-32-bytes-long';
let previousJwtSecret: string | undefined;

function tenantClient(url: string): TenantClient {
  return new TenantClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) });
}

async function createVerifiedGym(index: number) {
  const slug = `schema-${index}-${run.runId}`;
  const gym = await master.gym.create({
    data: { name: `Schema ${index}`, slug, databaseName: databaseNames[index], status: 'ACTIVE' },
  });
  const operationId = `schema_op_${index}_${run.runId}`;
  await master.operation.create({
    data: {
      id: operationId,
      kind: 'PROVISION_GYM',
      actorIdentityId: actorId,
      scopeKey: `provision-gym:${slug}`,
      idempotencyKey: `schema-${index}-${randomUUID()}`,
      requestDigest: `d1:${'a'.repeat(64)}`,
      requestedSlug: slug,
      gymId: gym.id,
      databaseName: databaseNames[index],
      intendedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version,
      intendedTenantManifestDigest: digest,
      appliedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version,
      appliedTenantManifestDigest: digest,
      tenantSchemaVerifiedAt: new Date(),
      state: 'COMPLETE',
      step: 'MASTER_ACTIVATED',
      safeResult: { operationId, state: 'COMPLETE' },
    },
  });
  const evidence = await new TenantSchemaVerifier(tenants[index]).verifyAndAttest({
    masterGymId: gym.id,
    operationId,
  });
  const registry = new TenantRegistryService({ master } as DatabaseService);
  await registry.observeVerifiedTenant({
    gymId: gym.id,
    operationId,
    expectedGymVersion: 0,
    actorIdentityId: actorId,
    evidence,
  });
  gymIds[index] = gym.id;
  operationIds[index] = operationId;
}

async function context(index: number): Promise<TenantGateContext> {
  const gym = await master.gym.findUniqueOrThrow({
    where: { id: gymIds[index] },
    include: { expectedTenantOperation: true },
  });
  return {
    gymId: gym.id,
    databaseName: gym.databaseName,
    expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    expectedTenantManifestDigest: gym.expectedTenantManifestDigest,
    expectedTenantOperationId: gym.expectedTenantOperationId,
    expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null,
    observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
    observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null,
  };
}

function gateFor(entries = new Map(databaseNames.map((name, index) => [name, tenants[index]]))) {
  const database = {
    withDatabase: async <Result>(name: string, work: (client: TenantClient) => Promise<Result>) => {
      const client = entries.get(name);
      if (!client) throw new Error('Unavailable fixture target');
      return work(client);
    },
  } as TenantDatabaseService;
  return new TenantSchemaGateService(database);
}

beforeAll(async () => {
  previousJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = guardJwtSecret;
  run = await createDisposablePostgresRun();
  await run.migrate(run.masterName, 'master');
  for (let index = 0; index < 2; index++) {
    const owned = await run.createOwnedDatabase();
    databaseNames.push(owned.name);
    databaseUrls.push(owned.url);
    await run.migrate(owned.name, 'tenant');
  }
  master = new MasterClient({ adapter: new PrismaPg({ connectionString: run.masterUrl, max: 4 }) });
  tenants = databaseUrls.map(tenantClient);
  actorId = (await master.user.create({
    data: { email: 'schema-owner@example.test', passwordHash: 'fixture-not-a-login-hash' },
  })).id;
  await createVerifiedGym(0);
  await createVerifiedGym(1);
}, 120_000);

afterAll(async () => {
  await Promise.all([master?.$disconnect(), ...tenants.map((client) => client.$disconnect())]);
  if (run) console.info('[task005-owned-run-cleanup]', JSON.stringify(await run.cleanup()));
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousJwtSecret;
}, 120_000);

it('verifies two distinct physical bindings and permits domain work only for the matching tenant', async () => {
  expect((await tenants[0].gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).masterGymId).toBe(gymIds[0]);
  expect((await tenants[1].gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).masterGymId).toBe(gymIds[1]);
  await expect(tenants[0].gymConfiguration.update({
    where: { id: 'current' }, data: { masterGymId: gymIds[1], version: { increment: 1 } },
  })).rejects.toThrow();

  const result = await gateFor().withVerifiedTenant(await context(0), async (tenant) => {
    const member = await tenant.member.create({ data: { fullName: 'Tenant A member', email: 'a@example.test' } });
    return member.id;
  });
  expect(result).toEqual(expect.any(String));
  expect(await tenants[0].member.count()).toBe(1);
  expect(await tenants[1].member.count()).toBe(0);
});

it('rejects swapped targets and invalid Master expectations before any domain callback', async () => {
  const valid = await context(0);
  let callbacks = 0;
  const work = async () => { callbacks++; return 'unexpected'; };
  await expect(gateFor().withVerifiedTenant({ ...valid, databaseName: databaseNames[1] }, work))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  await expect(gateFor().withVerifiedTenant({ ...valid, expectedTenantManifestDigest: 'b'.repeat(64) }, work))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  await expect(gateFor().withVerifiedTenant({ ...valid, expectedTenantOperationState: 'PENDING' }, work))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  await expect(gateFor(new Map()).withVerifiedTenant(valid, work))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(callbacks).toBe(0);
});

it.each(['APPLYING', 'FAILED', 'REPAIR_REQUIRED'] as const)(
  'rejects %s state without executing domain work',
  async (state) => {
    await tenants[0].schemaState.update({ where: { id: 'current' }, data: { state, version: { increment: 1 } } });
    let callbacks = 0;
    await expect(gateFor().withVerifiedTenant(await context(0), async () => { callbacks++; }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(callbacks).toBe(0);
    await new TenantSchemaVerifier(tenants[0]).verifyAndAttest({ masterGymId: gymIds[0], operationId: operationIds[0] });
  },
);

it('rejects missing binding and missing state before domain work', async () => {
  const owned = await run.createOwnedDatabase();
  await run.migrate(owned.name, 'tenant');
  const empty = tenantClient(owned.url);
  try {
    let callbacks = 0;
    await expect(gateFor(new Map([[owned.name, empty]])).withVerifiedTenant({
      ...(await context(0)), databaseName: owned.name,
    }, async () => { callbacks++; })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(callbacks).toBe(0);
  } finally { await empty.$disconnect(); }
});

it('rejects independently missing binding, missing state and tenant metadata mismatches', async () => {
  const valid = await context(0);
  let callbacks = 0;
  // Simulate a missing configuration row inside this owned disposable tenant.
  // The production history table intentionally blocks ordinary parent deletes.
  await tenants[0].$executeRaw`TRUNCATE TABLE "GymConfiguration" CASCADE`;
  await expect(gateFor().withVerifiedTenant(valid, async () => { callbacks++; }))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  await new TenantSchemaVerifier(tenants[0]).verifyAndAttest({ masterGymId: gymIds[0], operationId: operationIds[0] });

  await tenants[0].schemaState.delete({ where: { id: 'current' } });
  await expect(gateFor().withVerifiedTenant(valid, async () => { callbacks++; }))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  await new TenantSchemaVerifier(tenants[0]).verifyAndAttest({ masterGymId: gymIds[0], operationId: operationIds[0] });

  await tenants[0].schemaState.update({ where: { id: 'current' }, data: {
    appliedTemplateVersion: 'wrong-version', version: { increment: 1 },
  } });
  await expect(gateFor().withVerifiedTenant(valid, async () => { callbacks++; }))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(callbacks).toBe(0);
  await new TenantSchemaVerifier(tenants[0]).verifyAndAttest({ masterGymId: gymIds[0], operationId: operationIds[0] });
});

it('detects migration history changes and unsupported API compatibility', async () => {
  await tenants[0].$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2',
      '0'.repeat(64), TENANT_TEMPLATE_MANIFEST.migrations[0].name);
    await expect(verifyInstalledTenant(tx)).rejects.toBeInstanceOf(TenantSchemaIntegrityError);
    throw new Error('ROLLBACK_DRIFT');
  }).catch((error: Error) => { expect(error.message).toBe('ROLLBACK_DRIFT'); });
  const incompatible = {
    ...TENANT_TEMPLATE_MANIFEST,
    apiCompatibility: { min: 2, max: 2 },
  } as unknown as typeof TENANT_TEMPLATE_MANIFEST;
  await expect(verifyInstalledTenant(tenants[0], incompatible)).rejects.toThrow('incompatible');
});

it('detects unfinished and extra migration history', async () => {
  await tenants[0].$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "_prisma_migrations" SET finished_at = NULL WHERE migration_name = $1',
      TENANT_TEMPLATE_MANIFEST.migrations[0].name);
    await expect(verifyInstalledTenant(tx)).rejects.toBeInstanceOf(TenantSchemaIntegrityError);
    throw new Error('ROLLBACK_DRIFT');
  }).catch((error: Error) => { expect(error.message).toBe('ROLLBACK_DRIFT'); });
  await tenants[0].$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`INSERT INTO "_prisma_migrations"
      (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
      VALUES ($1, $2, $3, clock_timestamp(), clock_timestamp(), 1)`,
    randomUUID(), 'e'.repeat(64), '20990101000000_unreviewed');
    await expect(verifyInstalledTenant(tx)).rejects.toBeInstanceOf(TenantSchemaIntegrityError);
    throw new Error('ROLLBACK_DRIFT');
  }).catch((error: Error) => { expect(error.message).toBe('ROLLBACK_DRIFT'); });
});

it.each([
  ['table', 'ALTER TABLE "Trainer" RENAME TO "Trainer_drift"'],
  ['column', 'ALTER TABLE "Member" RENAME COLUMN "fullName" TO "fullName_drift"'],
  ['enum', 'ALTER TYPE "TrainerStatus" RENAME TO "TrainerStatus_drift"'],
  ['index', 'DROP INDEX "Member_email_key"'],
  ['constraint', 'ALTER TABLE "Member" DROP CONSTRAINT "Member_registration_check"'],
  ['trigger', 'DROP TRIGGER "GymConfiguration_immutable_binding" ON "GymConfiguration"'],
] as const)('detects a missing or changed %s postcondition', async (_kind, sql) => {
  await tenants[0].$transaction(async (tx) => {
    await tx.$executeRawUnsafe(sql);
    await expect(verifyInstalledTenant(tx)).rejects.toBeInstanceOf(TenantSchemaIntegrityError);
    throw new Error('ROLLBACK_DRIFT');
  }).catch((error: Error) => { expect(error.message).toBe('ROLLBACK_DRIFT'); });
});

it('uses Gym version CAS and commits the registry observation with its audit', async () => {
  const owned = await run.createOwnedDatabase();
  await run.migrate(owned.name, 'tenant');
  const tenant = tenantClient(owned.url);
  try {
    const slug = `cas-${run.runId}`;
    const gym = await master.gym.create({ data: { name: 'CAS gym', slug, databaseName: owned.name, status: 'ACTIVE' } });
    const operationId = `cas_op_${run.runId}`;
    await master.operation.create({ data: {
      id: operationId, kind: 'PROVISION_GYM', actorIdentityId: actorId,
      scopeKey: `provision-gym:${slug}`, idempotencyKey: `cas-${randomUUID()}`,
      requestDigest: `d1:${'c'.repeat(64)}`, requestedSlug: slug, gymId: gym.id, databaseName: owned.name,
      intendedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version, intendedTenantManifestDigest: digest,
      appliedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version, appliedTenantManifestDigest: digest,
      tenantSchemaVerifiedAt: new Date(), state: 'COMPLETE', step: 'MASTER_ACTIVATED',
      safeResult: { operationId, state: 'COMPLETE' },
    } });
    const evidence = await new TenantSchemaVerifier(tenant).verifyAndAttest({ masterGymId: gym.id, operationId });
    const registry = new TenantRegistryService({ master } as DatabaseService);
    await expect(registry.observeVerifiedTenant({ gymId: gym.id, operationId, expectedGymVersion: 1, actorIdentityId: actorId, evidence }))
      .rejects.toBeInstanceOf(OperationConflictError);
    expect(await master.platformAuditLog.count({ where: { gymId: gym.id } })).toBe(0);
    await master.$executeRawUnsafe(`CREATE FUNCTION gymos_test_fail_schema_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW."gymId" = '${gym.id}' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`);
    await master.$executeRawUnsafe(`CREATE TRIGGER "Task005_fail_schema_audit" BEFORE INSERT ON "PlatformAuditLog"
      FOR EACH ROW EXECUTE FUNCTION gymos_test_fail_schema_audit()`);
    await expect(registry.observeVerifiedTenant({ gymId: gym.id, operationId, expectedGymVersion: 0, actorIdentityId: actorId, evidence }))
      .rejects.toThrow();
    expect(await master.gym.findUniqueOrThrow({ where: { id: gym.id } })).toMatchObject({
      version: 0, expectedTenantOperationId: null, expectedTenantSchemaVersion: null,
    });
    await master.$executeRawUnsafe('DROP TRIGGER "Task005_fail_schema_audit" ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION gymos_test_fail_schema_audit()');
    expect(await registry.observeVerifiedTenant({ gymId: gym.id, operationId, expectedGymVersion: 0, actorIdentityId: actorId, evidence })).toBe(1);
    expect(await master.platformAuditLog.count({ where: { gymId: gym.id, eventCode: 'TENANT_SCHEMA_OBSERVED' } })).toBe(1);
  } finally { await tenant.$disconnect(); }
});

it('preserves domain errors after metadata verification', async () => {
  const domainError = new Error('domain conflict');
  await expect(gateFor().withVerifiedTenant(await context(0), async () => { throw domainError; })).rejects.toBe(domainError);
});

it('publishes only active actors with matching completed Master operation, tenant receipt, and reciprocal tuple', async () => {
  const owner = await master.user.findUniqueOrThrow({ where: { id: actorId } });
  const gym = await master.gym.findUniqueOrThrow({ where: { id: gymIds[0] } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });

  const memberIdentity = await master.user.create({ data: {
    email: `guard-member-${run.runId}@example.test`, passwordHash: 'fixture-not-a-login-hash',
  } });
  const registrationOperationId = `register_member_${run.runId}`;
  const member = await tenants[0].member.create({ data: {
    fullName: 'Verified Tenant Member', identityId: memberIdentity.id,
    registrationState: 'COMPLETE', enrollmentOperationId: registrationOperationId,
  } });
  const receiptId = `receipt_member_${run.runId}`;
  await tenants[0].commandReceipt.create({ data: {
    id: receiptId, actorIdentityId: owner.id, commandKind: 'REGISTER_MEMBER',
    idempotencyKey: `register-${randomUUID()}`, requestDigest: `d1:${'d'.repeat(64)}`,
    resourceType: 'MEMBER', resourceId: member.id, sourceMasterOperationId: registrationOperationId,
    state: 'COMMITTED', safeResult: { memberId: member.id }, committedAt: new Date(),
  } });
  await master.operation.create({ data: {
    id: registrationOperationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: `register-${randomUUID()}`,
    requestDigest: `d1:${'e'.repeat(64)}`, gymId: gym.id, subjectIdentityId: memberIdentity.id,
    tenantActorId: member.id, tenantCommandReceiptId: receiptId,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId: registrationOperationId, memberId: member.id },
  } });
  const access = await master.gymAccess.create({ data: {
    userId: memberIdentity.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE',
    actorKind: 'MEMBER', tenantActorId: member.id, enrollmentOperationId: registrationOperationId,
  } });

  const guard = new GymAccessGuard({ master } as DatabaseService, gateFor());
  async function requestFor(identityId: string, slug = gym.slug) {
    const token = await new SignJWT({ authVersion: 0 }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(identityId).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m')
      .sign(new TextEncoder().encode(guardJwtSecret));
    const request = { headers: { authorization: `Bearer ${token}` }, params: { slug } } as unknown as GymRequest;
    const execution = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
    await guard.canActivate(execution);
    return request;
  }

  const authorized = await requestFor(memberIdentity.id);
  expect(authorized.gymAccess).toMatchObject({
    identityId: memberIdentity.id, gymId: gym.id, role: 'MEMBER',
    accessVersion: access.version, actor: { kind: 'MEMBER', id: member.id, registrationOperationId },
  });
  await expect(requestFor(memberIdentity.id, `foreign-${gym.slug}`)).rejects.toThrow('Gym access denied');

  await master.gymAccess.update({ where: { userId_gymId: { userId: memberIdentity.id, gymId: gym.id } }, data: {
    tenantActorId: `unrelated-${member.id}`,
  } });
  await expect(requestFor(memberIdentity.id)).rejects.toThrow('Gym access denied');
  await master.gymAccess.update({ where: { userId_gymId: { userId: memberIdentity.id, gymId: gym.id } }, data: {
    tenantActorId: member.id,
  } });

  const pendingIdentity = await master.user.create({ data: {
    email: `guard-pending-${run.runId}@example.test`, passwordHash: 'fixture-not-a-login-hash',
  } });
  const pendingOperationId = `pending_member_${run.runId}`;
  const pendingMember = await tenants[0].member.create({ data: {
    fullName: 'Tenant Complete but Master Pending', identityId: pendingIdentity.id,
    registrationState: 'COMPLETE', enrollmentOperationId: pendingOperationId,
  } });
  const pendingReceiptId = `receipt_pending_${run.runId}`;
  await tenants[0].commandReceipt.create({ data: {
    id: pendingReceiptId, actorIdentityId: owner.id, commandKind: 'REGISTER_MEMBER',
    idempotencyKey: `pending-${randomUUID()}`, requestDigest: `d1:${'f'.repeat(64)}`,
    resourceType: 'MEMBER', resourceId: pendingMember.id, sourceMasterOperationId: pendingOperationId,
    state: 'COMMITTED', safeResult: { memberId: pendingMember.id }, committedAt: new Date(),
  } });
  await master.operation.create({ data: {
    id: pendingOperationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: `pending-${randomUUID()}`,
    requestDigest: `d1:${'1'.repeat(64)}`, gymId: gym.id, subjectIdentityId: pendingIdentity.id,
    tenantActorId: pendingMember.id, tenantCommandReceiptId: pendingReceiptId,
    state: 'TENANT_COMMITTED', step: 'TENANT_REGISTRATION_COMMITTED',
  } });
  await master.gymAccess.create({ data: {
    userId: pendingIdentity.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE',
    actorKind: 'MEMBER', tenantActorId: pendingMember.id, enrollmentOperationId: pendingOperationId,
  } });
  await expect(requestFor(pendingIdentity.id)).rejects.toThrow('Gym access denied');

  const ownerRequest = await requestFor(owner.id);
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } } });
  const countBeforeRevocation = await tenants[0].member.count();
  await master.gymAccess.update({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } }, data: {
    linkStatus: 'REVOKED', version: { increment: 1 },
  } });
  const memberController = new GymsController({ master } as DatabaseService, gateFor());
  await expect(memberController.createMember({ gymAccess: ownerRequest.gymAccess } as GymRequest, {
    fullName: 'Must not commit after revocation', email: `revoked-${run.runId}@example.test`,
  })).rejects.toThrow('Gym access changed');
  expect(await tenants[0].member.count()).toBe(countBeforeRevocation);
  await master.gymAccess.update({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } }, data: {
    linkStatus: 'ACTIVE', version: { increment: 1 },
  } });
  expect(ownerAccess.linkStatus).toBe('ACTIVE');

  const superAdmin = await master.user.create({ data: {
    email: `guard-platform-admin-${run.runId}@example.test`, passwordHash: 'fixture-not-a-login-hash', globalRole: 'SUPER_ADMIN',
  } });
  await expect(requestFor(superAdmin.id)).rejects.toThrow('Gym access denied');
});

it('preserves member list/create behavior and maps duplicate email to a safe conflict', async () => {
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER',
    identityId: actorId, identityVersion: 0, accessVersion: ownerAccess.version, actor: null };
  const request = { gymAccess: access } as GymRequest;
  const controller = new GymsController({ master } as DatabaseService, gateFor());
  const rows = await controller.members(request);
  expect(rows).toHaveLength(3);
  await expect(controller.createMember(request, { fullName: 'Duplicate member', email: 'a@example.test' }))
    .rejects.toBeInstanceOf(ConflictException);
  expect(await tenants[0].member.count()).toBe(3);
  expect(() => controller.members({ gymAccess: { ...access, role: 'TRAINER' } } as GymRequest))
    .toThrow(ForbiddenException);
});

it('recovers a lost Master observation by rereading actual tenant evidence', async () => {
  const before = await master.gym.findUniqueOrThrow({ where: { id: gymIds[0] } });
  await master.gym.update({ where: { id: gymIds[0] }, data: {
    expectedTenantSchemaVersion: null,
    expectedTenantManifestDigest: null,
    expectedTenantOperationId: null,
    version: { increment: 1 },
  } });
  let callbacks = 0;
  await expect(gateFor().withVerifiedTenant(await context(0), async () => { callbacks++; }))
    .rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(callbacks).toBe(0);
  const evidence = await new TenantSchemaVerifier(tenants[0]).verifyAndAttest({
    masterGymId: gymIds[0], operationId: operationIds[0],
  });
  const registry = new TenantRegistryService({ master } as DatabaseService);
  const cleared = await master.gym.findUniqueOrThrow({ where: { id: gymIds[0] } });
  expect(await registry.observeVerifiedTenant({
    gymId: gymIds[0], operationId: operationIds[0], expectedGymVersion: cleared.version,
    actorIdentityId: actorId, evidence,
  })).toBe(cleared.version + 1);
  expect((await master.gym.findUniqueOrThrow({ where: { id: gymIds[0] } })).expectedTenantOperationId)
    .toBe(operationIds[0]);
  expect(cleared.version).toBe(before.version + 1);
});
