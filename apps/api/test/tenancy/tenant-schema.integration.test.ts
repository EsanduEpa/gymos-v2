import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConflictException, ForbiddenException, ServiceUnavailableException, type ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { GymsController } from '../../src/gyms.controller.js';
import { MemberEnrollmentService } from '../../src/member-enrollment.service.js';
import { TrainerEnrollmentService } from '../../src/trainer-enrollment.service.js';
import type { CredentialService } from '../../src/identity/credential.service.js';
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
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo' } });
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER',
    identityId: actorId, identityVersion: 0, accessVersion: ownerAccess.version, actor: null };
  const request = { gymAccess: access } as GymRequest;
  const controller = new GymsController({ master } as DatabaseService, gateFor());
  const rows = await controller.members(request, {});
  // A COMPLETE tenant actor is visible only after its Master operation is published.
  expect(rows.items).toHaveLength(2);
  expect(rows.totalCount).toBe(2);
  await expect(controller.createMember(request, { fullName: 'Duplicate member', email: 'a@example.test' }))
    .rejects.toBeInstanceOf(ConflictException);
  expect(await tenants[0].member.count()).toBe(3);
  const fixed = new Date();
  await tenants[0].member.createMany({ data: Array.from({ length: 125 }, (_, index) => ({
    fullName: `Paged Member ${String(index + 1).padStart(3, '0')}`, email: `paged-member-${index + 1}@example.test`,
    createdAt: fixed, updatedAt: fixed,
  })) });
  const deepPage = await controller.members(request, { page: '5', pageSize: '25', q: 'Paged Member', status: 'ACTIVE' });
  expect(deepPage.page).toBe(5);
  expect(deepPage.totalCount).toBe(125);
  expect(deepPage.items).toHaveLength(25);
  const clampedPage = await controller.members(request, { page: '999', pageSize: '25', q: 'Paged Member' });
  expect(clampedPage.page).toBe(5);
  expect(clampedPage.totalPages).toBe(5);
  await expect(controller.members({ gymAccess: { ...access, role: 'TRAINER' } } as GymRequest, {}))
    .rejects.toBeInstanceOf(ForbiddenException);
});

it('commits a full owner enrollment once and requires authenticated explicit consent for existing identities', async () => {
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo', currency: 'LKR' } });
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Enrollment Plan', price: '1234.50', currency: 'LKR', durationDays: 30 } });
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  let deliveries = 0;
  const credential = { issueTemporaryCredential: async () => {
    deliveries++;
    return deliveries === 1 ? { status: 'ISSUED' as const, temporaryPassword: 'Synthetic-one-time', deliveryVersion: 0,
      expiresAt: new Date(Date.now() + 86_400_000) } : { status: 'ALREADY_ISSUED' as const, deliveryVersion: 0 };
  } } as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Synthetic Enrolled Member', email: `enrolled-${run.runId}@example.test`, phone: '+94112223344',
    dateOfBirth: '1995-06-15', emergencyContact: 'Synthetic Contact · +94110000000', healthNotes: 'Synthetic private note',
    membershipPlanId: plan.id, idempotencyKey: 'member-enrollment-0001' };
  const otherGymCount = await tenants[1].member.count();
  const first = await service.enroll(access as never, input);
  if (first.status !== 'COMPLETE') throw new Error('Expected new identity enrollment to complete');
  expect(first.status).toBe('COMPLETE');
  expect(first.temporaryPassword).toBe('Synthetic-one-time');
  expect(first.term.agreedPrice).toBe('1234.5');
  expect(first.term.endDateExclusive).toBe('2026-12-02');
  const [memberCount, termCount, operation, link] = await Promise.all([
    tenants[0].member.count({ where: { email: input.email } }),
    tenants[0].membershipTerm.count({ where: { memberId: first.memberId } }),
    master.operation.findUniqueOrThrow({ where: { id: first.operationId } }),
    master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: (await master.user.findUniqueOrThrow({ where: { email: input.email } })).id, gymId: gymIds[0] } } }),
  ]);
  expect([memberCount, termCount, operation.state, link.linkStatus, link.tenantActorId]).toEqual([1, 1, 'COMPLETE', 'ACTIVE', first.memberId]);
  expect(await tenants[1].member.count()).toBe(otherGymCount);
  const controller = new GymsController({ master } as DatabaseService, gateFor());
  const profile = await controller.memberDetail({ gymAccess: access } as GymRequest, first.memberId);
  expect(profile.healthNotes).toBe('Synthetic private note');
  const directory = await controller.members({ gymAccess: access } as GymRequest, { q: 'Synthetic Enrolled' });
  expect(JSON.stringify(directory)).not.toContain('healthNotes');
  await expect(controller.memberDetail({ gymAccess: { ...access, role: 'TRAINER' } } as GymRequest, first.memberId))
    .rejects.toBeInstanceOf(ForbiddenException);
  const replay = await service.enroll(access as never, input);
  if (replay.status !== 'COMPLETE') throw new Error('Expected enrollment replay to remain complete');
  expect(replay.replayed).toBe(true);
  expect(replay.temporaryPassword).toBeUndefined();
  expect(await tenants[0].membershipTerm.count({ where: { memberId: first.memberId } })).toBe(1);
  expect(deliveries).toBe(2);
  await expect(service.enroll(access as never, { ...input, idempotencyKey: 'member-enrollment-0002' }))
    .rejects.toBeInstanceOf(ConflictException);
  await expect(service.enroll(access as never, { ...input, email: `different-${run.runId}@example.test`, idempotencyKey: 'member-enrollment-0001' }))
    .rejects.toBeInstanceOf(ConflictException);
  expect(await tenants[0].member.count({ where: { email: { startsWith: 'different-' } } })).toBe(0);

  const existingPassword = `synthetic-consent-${run.runId}`;
  const existingHash = await argon2.hash(existingPassword, { type: argon2.argon2id });
  const existingIdentity = await master.user.create({ data: {
    email: `existing-${run.runId}@example.test`, passwordHash: existingHash,
  } });
  const otherGymLink = await master.gymAccess.create({ data: {
    userId: existingIdentity.id, gymId: gymIds[1], role: 'OWNER', linkStatus: 'ACTIVE',
  } });
  const reusedInput = { ...input, fullName: 'Existing Identity Member', email: existingIdentity.email,
    idempotencyKey: 'member-consent-enrollment-01' };
  const pending = await service.enroll(access as never, reusedInput);
  expect(pending).toMatchObject({ status: 'PENDING', consentRequired: true });
  if (pending.status !== 'PENDING') throw new Error('Expected consent to be pending');
  expect(await tenants[0].member.count({ where: { email: existingIdentity.email } })).toBe(0);
  expect(await master.gymAccess.findUnique({ where: { userId_gymId: { userId: existingIdentity.id, gymId: gymIds[0] } } })).toBeNull();

  const memberToken = await new SignJWT({ authVersion: existingIdentity.authVersion }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(existingIdentity.id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m')
    .sign(new TextEncoder().encode(guardJwtSecret));
  const consentRequest = { headers: { authorization: `Bearer ${memberToken}` } } as never;
  const controllerWithEnrollment = new GymsController({ master } as DatabaseService, gateFor(), service);
  await expect(controllerWithEnrollment.memberEnrollmentConsent(consentRequest, access.slug, pending.operationId,
    { decision: 'ACCEPT', currentPassword: 'wrong-current-password' })).rejects.toThrow('Identity verification failed');
  await expect(controllerWithEnrollment.memberEnrollmentConsent(consentRequest, 'foreign-gym', pending.operationId,
    { decision: 'ACCEPT', currentPassword: existingPassword })).rejects.toThrow('consent is unavailable');
  const decisions = await Promise.all([
    controllerWithEnrollment.memberEnrollmentConsent(consentRequest, access.slug, pending.operationId,
      { decision: 'ACCEPT', currentPassword: existingPassword }),
    controllerWithEnrollment.memberEnrollmentConsent(consentRequest, access.slug, pending.operationId,
      { decision: 'ACCEPT', currentPassword: existingPassword }),
  ]);
  expect(decisions.map(row => row.status)).toEqual(['CONSENT_RECORDED', 'CONSENT_RECORDED']);
  expect(decisions.filter(row => row.replayed)).toHaveLength(1);
  expect((await master.user.findUniqueOrThrow({ where: { id: existingIdentity.id } })).passwordHash).toBe(existingHash);
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: existingIdentity.id, gymId: gymIds[1] } } }))
    .toMatchObject({ role: 'OWNER', linkStatus: 'ACTIVE', version: otherGymLink.version });
  const proof = await master.enrollmentProof.findUniqueOrThrow({ where: {
    identityId_gymId_role_enrollmentOperationId: { identityId: existingIdentity.id, gymId: gymIds[0], role: 'MEMBER', enrollmentOperationId: pending.operationId },
  } });
  expect(proof.consumedAt).toBeInstanceOf(Date);
  expect(JSON.stringify(proof)).not.toContain(existingPassword);
  const joined = await service.enroll(access as never, reusedInput);
  expect(joined).toMatchObject({ status: 'COMPLETE', memberId: expect.any(String) });
  if (joined.status !== 'COMPLETE') throw new Error('Expected completed existing-identity enrollment');
  expect(joined.temporaryPassword).toBeUndefined();
  expect(joined.credentialDeliveryVersion).toBeUndefined();
  expect(await master.credentialDelivery.count({ where: { operationId: pending.operationId } })).toBe(0);
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: existingIdentity.id, gymId: gymIds[0] } } }))
    .toMatchObject({ role: 'MEMBER', linkStatus: 'ACTIVE', actorKind: 'MEMBER', tenantActorId: joined.memberId });
  expect(await tenants[0].member.count({ where: { email: existingIdentity.email } })).toBe(1);
  expect(await tenants[1].member.count()).toBe(otherGymCount);

  const declineIdentity = await master.user.create({ data: {
    email: `declined-${run.runId}@example.test`, passwordHash: await argon2.hash(existingPassword, { type: argon2.argon2id }),
  } });
  const declinedInput = { ...reusedInput, email: declineIdentity.email, idempotencyKey: 'member-consent-enrollment-02' };
  const declinedPending = await service.enroll(access as never, declinedInput);
  if (declinedPending.status !== 'PENDING') throw new Error('Expected second consent to be pending');
  const declineToken = await new SignJWT({ authVersion: declineIdentity.authVersion }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(declineIdentity.id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m')
    .sign(new TextEncoder().encode(guardJwtSecret));
  const declined = await controllerWithEnrollment.memberEnrollmentConsent(
    { headers: { authorization: `Bearer ${declineToken}` } } as never, access.slug, declinedPending.operationId,
    { decision: 'DECLINE', currentPassword: existingPassword },
  );
  expect(declined.status).toBe('CONSENT_DECLINED');
  expect(await master.operation.findUniqueOrThrow({ where: { id: declinedPending.operationId } }))
    .toMatchObject({ state: 'FAILED_FINAL', errorCode: 'CONSENT_DECLINED' });
  expect(await tenants[0].member.count({ where: { email: declineIdentity.email } })).toBe(0);
  expect(await master.gymAccess.findUnique({ where: { userId_gymId: { userId: declineIdentity.id, gymId: gymIds[0] } } })).toBeNull();
});

it('recovers member enrollment when Master activation is lost after the tenant receipt commits', async () => {
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo', currency: 'LKR' } });
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Recovery Plan', price: '0.01', currency: 'LKR', durationDays: 1 } });
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  let deliveries = 0;
  const credential = { issueTemporaryCredential: async () => {
    deliveries++;
    return { status: 'ISSUED' as const, temporaryPassword: 'Synthetic-recovery-password', deliveryVersion: 0,
      expiresAt: new Date(Date.now() + 86_400_000) };
  } } as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Recovery Member', email: `recovery-${run.runId}@example.test`, phone: '+94112223344',
    dateOfBirth: '1995-06-15', membershipPlanId: plan.id, idempotencyKey: 'member-recovery-0001' };
  await master.$executeRawUnsafe(`CREATE FUNCTION fail_member_activation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'MEMBER_ACCESS_ACTIVATED' THEN RAISE EXCEPTION 'injected activation response loss'; END IF; RETURN NEW; END $$`);
  await master.$executeRawUnsafe(`CREATE TRIGGER fail_member_activation_audit BEFORE INSERT ON "PlatformAuditLog"
    FOR EACH ROW EXECUTE FUNCTION fail_member_activation_audit()`);
  try {
    await expect(service.enroll(access as never, input)).rejects.toThrow();
    const incomplete = await master.operation.findFirstOrThrow({ where: { actorIdentityId: actorId,
      kind: 'REGISTER_MEMBER', idempotencyKey: input.idempotencyKey } });
    expect(incomplete).toMatchObject({ state: 'TENANT_COMMITTED', step: 'TENANT_REGISTRATION_COMMITTED' });
    const receipt = await tenants[0].commandReceipt.findUnique({ where: { sourceMasterOperationId: incomplete.id } });
    expect(receipt).toMatchObject({ state: 'COMMITTED', resourceType: 'MEMBER' });
    expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(1);
    await master.$executeRawUnsafe('DROP TRIGGER fail_member_activation_audit ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION fail_member_activation_audit()');
    const recovered = await service.enroll(access as never, input);
    expect(recovered).toMatchObject({ status: 'COMPLETE', replayed: true, temporaryPassword: 'Synthetic-recovery-password' });
    expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(1);
    expect(await master.operation.findUniqueOrThrow({ where: { id: incomplete.id } })).toMatchObject({ state: 'COMPLETE' });
    expect(deliveries).toBe(1);
  } finally {
    await master.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_member_activation_audit ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_member_activation_audit()');
  }
});

it('retries the same durable enrollment after the tenant transaction fails before commit', async () => {
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo', currency: 'LKR' } });
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Tenant Retry Plan', price: '10.25', currency: 'LKR', durationDays: 7 } });
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  const credential = ({ issueTemporaryCredential: async () => ({ status: 'ISSUED' as const,
    temporaryPassword: 'Synthetic-tenant-retry-password', deliveryVersion: 0, expiresAt: new Date(Date.now() + 86_400_000) }) }
  ) as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Tenant Retry Member', email: `tenant-retry-${run.runId}@example.test`, phone: '+94112223344',
    dateOfBirth: '1995-06-15', membershipPlanId: plan.id, idempotencyKey: 'member-tenant-retry-0001' };
  await tenants[0].$executeRawUnsafe(`CREATE FUNCTION fail_member_term_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'injected tenant enrollment failure'; END $$`);
  await tenants[0].$executeRawUnsafe(`CREATE TRIGGER fail_member_term_insert BEFORE INSERT ON "MembershipTerm"
    FOR EACH ROW EXECUTE FUNCTION fail_member_term_insert()`);
  try {
    await expect(service.enroll(access as never, input)).rejects.toThrow();
    const incomplete = await master.operation.findFirstOrThrow({ where: { actorIdentityId: actorId,
      kind: 'REGISTER_MEMBER', idempotencyKey: input.idempotencyKey } });
    expect(['MASTER_PREPARED', 'FAILED_RETRYABLE']).toContain(incomplete.state);
    expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(0);
    expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(0);
    expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: incomplete.subjectIdentityId!, gymId: gymIds[0] } } }))
      .toMatchObject({ role: 'MEMBER', linkStatus: 'PENDING', enrollmentOperationId: incomplete.id });
    await tenants[0].$executeRawUnsafe('DROP TRIGGER fail_member_term_insert ON "MembershipTerm"');
    await tenants[0].$executeRawUnsafe('DROP FUNCTION fail_member_term_insert()');
    const recovered = await service.enroll(access as never, input);
    expect(recovered).toMatchObject({ status: 'COMPLETE', replayed: true, operationId: incomplete.id });
    expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(1);
    expect(await master.operation.findUniqueOrThrow({ where: { id: incomplete.id } })).toMatchObject({ state: 'COMPLETE' });
  } finally {
    await tenants[0].$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_member_term_insert ON "MembershipTerm"');
    await tenants[0].$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_member_term_insert()');
  }
});

it('registers a typed trainer once and reuses an existing identity only after verified consent', async () => {
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  let deliveries = 0;
  const credential = { issueTemporaryCredential: async () => {
    deliveries++;
    return deliveries === 1 ? { status: 'ISSUED' as const, temporaryPassword: 'Synthetic-trainer-password', deliveryVersion: 0,
      expiresAt: new Date(Date.now() + 86_400_000) } : { status: 'ALREADY_ISSUED' as const, deliveryVersion: 0 };
  } } as unknown as CredentialService;
  const service = new TrainerEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Synthetic Trainer', email: `trainer-${run.runId}@example.test`, phone: '+94112223345', level: 'LEVEL_2' as const,
    yearsExperience: 8, specialisations: ['Strength', 'Mobility'], shiftStart: '09:00', shiftEnd: '18:00', bio: 'Synthetic profile',
    idempotencyKey: 'trainer-registration-0001' };
  const beforeBeta = await tenants[1].trainer.count();
  const created = await service.enroll(access as never, input);
  if (created.status !== 'COMPLETE') throw new Error('Expected trainer registration to complete');
  expect(created.temporaryPassword).toBe('Synthetic-trainer-password');
  const identity = await master.user.findUniqueOrThrow({ where: { email: input.email } });
  const link = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: identity.id, gymId: gymIds[0] } } });
  const [trainer, receipt, operation] = await Promise.all([
    tenants[0].trainer.findUniqueOrThrow({ where: { id: created.trainerId } }),
    tenants[0].commandReceipt.findUniqueOrThrow({ where: { sourceMasterOperationId: created.operationId } }),
    master.operation.findUniqueOrThrow({ where: { id: created.operationId } }),
  ]);
  expect(trainer).toMatchObject({ fullName: input.fullName, email: input.email, phone: input.phone, level: 'LEVEL_2',
    yearsExperience: 8, specialisations: ['Strength', 'Mobility'], shiftStart: '09:00', shiftEnd: '18:00', bio: input.bio,
    identityId: identity.id, registrationState: 'COMPLETE', enrollmentOperationId: created.operationId, status: 'ACTIVE' });
  expect([link.role, link.linkStatus, link.actorKind, link.tenantActorId, operation.state, receipt.state, receipt.resourceType, receipt.resourceId])
    .toEqual(['TRAINER', 'ACTIVE', 'TRAINER', created.trainerId, 'COMPLETE', 'COMMITTED', 'TRAINER', created.trainerId]);
  expect(await tenants[1].trainer.count()).toBe(beforeBeta);
  const replay = await service.enroll(access as never, input);
  if (replay.status !== 'COMPLETE') throw new Error('Expected trainer replay to remain complete');
  expect(replay.temporaryPassword).toBeUndefined();
  expect(await tenants[0].trainer.count({ where: { identityId: identity.id } })).toBe(1);
  expect(deliveries).toBe(2);

  const existingPassword = `trainer-consent-${run.runId}`;
  const existing = await master.user.create({ data: { email: `reused-trainer-${run.runId}@example.test`,
    passwordHash: await argon2.hash(existingPassword, { type: argon2.argon2id }) } });
  const otherGymOwner = await master.gymAccess.create({ data: { userId: existing.id, gymId: gymIds[1], role: 'OWNER', linkStatus: 'ACTIVE' } });
  const reusedInput = { ...input, email: existing.email, idempotencyKey: 'trainer-registration-0002' };
  const pending = await service.enroll(access as never, reusedInput);
  expect(pending).toMatchObject({ status: 'PENDING', consentRequired: true });
  if (pending.status !== 'PENDING') throw new Error('Expected trainer consent to remain pending');
  await expect(service.consent(access.slug, pending.operationId, { identityId: existing.id, authVersion: existing.authVersion,
    currentPassword: 'wrong', decision: 'ACCEPT' })).rejects.toThrow('Identity verification failed');
  await service.consent(access.slug, pending.operationId, { identityId: existing.id, authVersion: existing.authVersion,
    currentPassword: existingPassword, decision: 'ACCEPT' });
  const reused = await service.enroll(access as never, reusedInput);
  if (reused.status !== 'COMPLETE') throw new Error('Expected consented trainer enrollment to complete');
  expect(reused.temporaryPassword).toBeUndefined();
  expect(reused.credentialDeliveryVersion).toBeUndefined();
  expect((await master.user.findUniqueOrThrow({ where: { id: existing.id } })).passwordHash).toBe(existing.passwordHash);
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: existing.id, gymId: gymIds[1] } } }))
    .toMatchObject({ role: 'OWNER', linkStatus: 'ACTIVE', version: otherGymOwner.version });
  expect(await tenants[0].trainer.count({ where: { identityId: existing.id } })).toBe(1);

  const roleConflict = await master.user.create({ data: { email: `member-role-${run.runId}@example.test`, passwordHash: 'fixture-not-a-login-hash' } });
  await master.gymAccess.create({ data: { userId: roleConflict.id, gymId: gymIds[0], role: 'MEMBER', linkStatus: 'PENDING' } });
  await expect(service.enroll(access as never, { ...input, email: roleConflict.email, idempotencyKey: 'trainer-registration-0003' }))
    .rejects.toThrow('already has a role');
  expect(await tenants[0].trainer.count({ where: { identityId: roleConflict.id } })).toBe(0);

  const decliningIdentity = await master.user.create({ data: { email: `declined-trainer-${run.runId}@example.test`,
    passwordHash: await argon2.hash(existingPassword, { type: argon2.argon2id }) } });
  const declineInput = { ...input, email: decliningIdentity.email, idempotencyKey: 'trainer-registration-0004' };
  const declinePending = await service.enroll(access as never, declineInput);
  if (declinePending.status !== 'PENDING') throw new Error('Expected trainer consent to remain pending');
  expect(await service.consent(access.slug, declinePending.operationId, { identityId: decliningIdentity.id,
    authVersion: decliningIdentity.authVersion, currentPassword: existingPassword, decision: 'DECLINE' }))
    .toMatchObject({ status: 'CONSENT_DECLINED' });
  expect(await master.operation.findUniqueOrThrow({ where: { id: declinePending.operationId } }))
    .toMatchObject({ state: 'FAILED_FINAL', errorCode: 'CONSENT_DECLINED' });
  expect(await master.gymAccess.findUnique({ where: { userId_gymId: { userId: decliningIdentity.id, gymId: gymIds[0] } } })).toBeNull();
  expect(await tenants[0].trainer.count({ where: { email: decliningIdentity.email } })).toBe(0);
});

it('recovers trainer enrollment after its tenant actor transaction rolls back', async () => {
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  const credential = ({ issueTemporaryCredential: async () => ({ status: 'ISSUED' as const, temporaryPassword: 'Trainer-retry-password',
    deliveryVersion: 0, expiresAt: new Date(Date.now() + 86_400_000) }) }) as unknown as CredentialService;
  const service = new TrainerEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Retry Trainer', email: `trainer-retry-${run.runId}@example.test`, phone: '+94112223346', level: 'LEVEL_1' as const,
    yearsExperience: null, specialisations: [], shiftStart: null, shiftEnd: null, bio: null, idempotencyKey: 'trainer-tenant-retry-01' };
  await tenants[0].$executeRawUnsafe(`CREATE FUNCTION fail_trainer_actor_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'injected trainer insert rollback'; END $$`);
  await tenants[0].$executeRawUnsafe(`CREATE TRIGGER fail_trainer_actor_insert BEFORE INSERT ON "Trainer"
    FOR EACH ROW EXECUTE FUNCTION fail_trainer_actor_insert()`);
  try {
    await expect(service.enroll(access as never, input)).rejects.toThrow();
    const incomplete = await master.operation.findFirstOrThrow({ where: { actorIdentityId: actorId, kind: 'REGISTER_TRAINER', idempotencyKey: input.idempotencyKey } });
    expect(['MASTER_PREPARED', 'FAILED_RETRYABLE']).toContain(incomplete.state);
    expect(await tenants[0].trainer.count({ where: { email: input.email } })).toBe(0);
    expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: incomplete.id } })).toBe(0);
    expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: incomplete.subjectIdentityId!, gymId: gymIds[0] } } }))
      .toMatchObject({ role: 'TRAINER', linkStatus: 'PENDING', enrollmentOperationId: incomplete.id });
    await tenants[0].$executeRawUnsafe('DROP TRIGGER fail_trainer_actor_insert ON "Trainer"');
    await tenants[0].$executeRawUnsafe('DROP FUNCTION fail_trainer_actor_insert()');
    const recovered = await service.enroll(access as never, input);
    expect(recovered).toMatchObject({ status: 'COMPLETE', replayed: true, operationId: incomplete.id, temporaryPassword: 'Trainer-retry-password' });
    expect(await tenants[0].trainer.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: incomplete.id } })).toBe(1);
    expect(await master.operation.findUniqueOrThrow({ where: { id: incomplete.id } })).toMatchObject({ state: 'COMPLETE' });
  } finally {
    await tenants[0].$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_trainer_actor_insert ON "Trainer"');
    await tenants[0].$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_trainer_actor_insert()');
  }
});

it('recovers trainer enrollment when Master activation fails after the tenant receipt commits', async () => {
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  let deliveries = 0;
  const credential = ({ issueTemporaryCredential: async () => {
    deliveries++;
    return { status: 'ISSUED' as const, temporaryPassword: 'Trainer-activation-password', deliveryVersion: 0,
      expiresAt: new Date(Date.now() + 86_400_000) };
  } }) as unknown as CredentialService;
  const service = new TrainerEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Activation Retry Trainer', email: `trainer-activation-${run.runId}@example.test`, phone: '+94112223347', level: 'LEVEL_2' as const,
    yearsExperience: 4, specialisations: ['Rehab'], shiftStart: null, shiftEnd: null, bio: null, idempotencyKey: 'trainer-activation-retry-01' };
  await master.$executeRawUnsafe(`CREATE FUNCTION fail_trainer_activation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'TRAINER_ACCESS_ACTIVATED' THEN RAISE EXCEPTION 'injected trainer activation failure'; END IF; RETURN NEW; END $$`);
  await master.$executeRawUnsafe(`CREATE TRIGGER fail_trainer_activation_audit BEFORE INSERT ON "PlatformAuditLog"
    FOR EACH ROW EXECUTE FUNCTION fail_trainer_activation_audit()`);
  try {
    await expect(service.enroll(access as never, input)).rejects.toThrow();
    const incomplete = await master.operation.findFirstOrThrow({ where: { actorIdentityId: actorId, kind: 'REGISTER_TRAINER', idempotencyKey: input.idempotencyKey } });
    expect(incomplete).toMatchObject({ state: 'TENANT_COMMITTED', step: 'TENANT_REGISTRATION_COMMITTED' });
    expect(await tenants[0].trainer.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: incomplete.id } })).toBe(1);
    expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: incomplete.subjectIdentityId!, gymId: gymIds[0] } } }))
      .toMatchObject({ role: 'TRAINER', linkStatus: 'PENDING', enrollmentOperationId: incomplete.id });
    await master.$executeRawUnsafe('DROP TRIGGER fail_trainer_activation_audit ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION fail_trainer_activation_audit()');
    const recovered = await service.enroll(access as never, input);
    expect(recovered).toMatchObject({ status: 'COMPLETE', replayed: true, operationId: incomplete.id });
    expect(recovered.temporaryPassword).toBe('Trainer-activation-password');
    expect(await tenants[0].trainer.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: incomplete.id } })).toBe(1);
    expect(await master.operation.findUniqueOrThrow({ where: { id: incomplete.id } })).toMatchObject({ state: 'COMPLETE' });
    expect(deliveries).toBe(1);
  } finally {
    await master.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_trainer_activation_audit ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_trainer_activation_audit()');
  }
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
