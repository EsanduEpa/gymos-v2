import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConflictException, ForbiddenException, ServiceUnavailableException, UnprocessableEntityException, type ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { GymsController } from '../../src/gyms.controller.js';
import { AccountProfileController, GymProfileController } from '../../src/profiles.controller.js';
import { MemberEnrollmentService } from '../../src/member-enrollment.service.js';
import { TrainerEnrollmentService } from '../../src/trainer-enrollment.service.js';
import { isOperationalActor } from '../../src/identity/publication-policy.js';
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
  expect((Date.parse(`${first.term.endDateExclusive}T00:00:00Z`) - Date.parse(`${first.term.startDate}T00:00:00Z`)) / 86_400_000).toBe(30);
  const [memberCount, termCount, operation, link] = await Promise.all([
    tenants[0].member.count({ where: { email: input.email } }),
    tenants[0].membershipTerm.count({ where: { memberId: first.memberId } }),
    master.operation.findUniqueOrThrow({ where: { id: first.operationId } }),
    master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: (await master.user.findUniqueOrThrow({ where: { email: input.email } })).id, gymId: gymIds[0] } } }),
  ]);
  expect([memberCount, termCount, operation.state, link.linkStatus, link.tenantActorId]).toEqual([1, 1, 'COMPLETE', 'ACTIVE', first.memberId]);
  const operationEvidence = await master.operation.findUniqueOrThrow({ where: { id: first.operationId } });
  const tenantReceipt = await tenants[0].commandReceipt.findUniqueOrThrow({ where: { sourceMasterOperationId: first.operationId } });
  const memberAudit = await tenants[0].auditLog.findMany({ where: { resourceId: first.memberId } });
  const masterAudit = await master.platformAuditLog.findMany({ where: { operationId: first.operationId } });
  const durableEvidence = JSON.stringify({ operationEvidence, tenantReceipt, memberAudit, masterAudit });
  expect(durableEvidence).not.toContain('Synthetic private note');
  expect(durableEvidence).not.toContain(first.temporaryPassword);
  expect(JSON.stringify(operationEvidence.safeResult)).not.toContain('temporaryPassword');
  expect(JSON.stringify(tenantReceipt.safeResult)).not.toContain('temporaryPassword');
  expect(operationEvidence.requestDigest).not.toContain('Synthetic private note');
  expect(await tenants[1].member.count()).toBe(otherGymCount);
  const controller = new GymsController({ master } as DatabaseService, gateFor());
  const profile = await controller.memberDetail({ gymAccess: access } as GymRequest, first.memberId);
  expect(profile.healthNotes).toBe('Synthetic private note');
  await tenants[0].membershipTerm.createMany({ data: Array.from({ length: 124 }, (_, index) => ({
    memberId: first.memberId, planId: plan.id, startDate: new Date(Date.UTC(2020, 0, 1 + index)),
    endDateExclusive: new Date(Date.UTC(2020, 0, 2 + index)), agreedPrice: '1234.50', currency: 'LKR',
    planNameSnapshot: `Historical plan ${index + 1}`, configurationVersion: 1, actorIdentityId: actorId,
    idempotencyKey: `history-2026-${String(index + 1).padStart(4, '0')}`, requestDigest: `synthetic-history-${index + 1}`,
  })) });
  const firstTerms = await controller.memberDetail({ gymAccess: access } as GymRequest, first.memberId, { page: '1', pageSize: '25' });
  const lastTerms = await controller.memberDetail({ gymAccess: access } as GymRequest, first.memberId, { page: '6', pageSize: '25' });
  expect(firstTerms).toMatchObject({ membershipPage: 1, membershipPageSize: 25, membershipTotalCount: 125, membershipTotalPages: 5 });
  expect(lastTerms).toMatchObject({ membershipPage: 5, membershipTotalCount: 125, membershipTotalPages: 5 });
  expect(firstTerms.memberships).toHaveLength(25);
  expect(lastTerms.memberships).toHaveLength(25);
  expect(new Set([...firstTerms.memberships, ...lastTerms.memberships].map(term => term.id)).size).toBe(50);
  expect(firstTerms.memberships[0].startDate > firstTerms.memberships.at(-1)!.startDate).toBe(true);
  const directory = await controller.members({ gymAccess: access } as GymRequest, { q: 'Synthetic Enrolled' });
  expect(JSON.stringify(directory)).not.toContain('healthNotes');
  await expect(controller.memberDetail({ gymAccess: { ...access, role: 'TRAINER' } } as GymRequest, first.memberId))
    .rejects.toBeInstanceOf(ForbiddenException);
  const replay = await service.enroll(access as never, input);
  if (replay.status !== 'COMPLETE') throw new Error('Expected enrollment replay to remain complete');
  expect(replay.replayed).toBe(true);
  expect(replay.temporaryPassword).toBeUndefined();
  expect(await tenants[0].membershipTerm.count({ where: { actorIdentityId: actorId, idempotencyKey: first.operationId } })).toBe(1);
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

it('binds an application offer to applicant-authenticated enrollment consent without changing credentials', async () => {
  await master.gymAccess.createMany({ data: [{ userId: actorId, gymId: gymIds[0], role: 'OWNER', linkStatus: 'ACTIVE' }], skipDuplicates: true });
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo', currency: 'LKR' } });
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Application Plan', price: '999.00', currency: 'LKR', durationDays: 30 } });
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  const currentPassword = `application-consent-${run.runId}`;
  const passwordHash = await argon2.hash(currentPassword, { type: argon2.argon2id });
  const applicant = await master.user.create({ data: { email: `application-${run.runId}@example.test`, passwordHash } });
  const application = await master.memberApplication.create({ data: { gymId: gymIds[0], identityId: applicant.id,
    fullName: 'Application Applicant', phone: '+94115556666', consentedAt: new Date(), state: 'PROCESSING',
    membershipPlanId: plan.id, dateOfBirth: '1995-06-15', membershipPlanName: plan.name, membershipPrice: plan.price.toString(),
    membershipCurrency: plan.currency, membershipDurationDays: plan.durationDays, membershipPlanVersion: plan.version } });
  const credential = { issueTemporaryCredential: async () => { throw new Error('Applicant enrollment must not issue a temporary password'); } } as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: application.fullName, email: applicant.email, phone: application.phone, dateOfBirth: application.dateOfBirth!,
    membershipPlanId: plan.id, idempotencyKey: `member-application:${application.id}` };
  const pending = await service.enroll(access as never, input, application.id);
  expect(pending).toMatchObject({ status: 'PENDING', consentRequired: true });
  expect(await master.gymAccess.findUnique({ where: { userId_gymId: { userId: applicant.id, gymId: gymIds[0] } } })).toBeNull();
  expect(await tenants[0].member.count({ where: { email: applicant.email } })).toBe(0);
  const token = await new SignJWT({ authVersion: applicant.authVersion }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(applicant.id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m')
    .sign(new TextEncoder().encode(guardJwtSecret));
  const controller = new GymsController({ master } as DatabaseService, gateFor(), service);
  await expect(controller.memberEnrollmentConsent({ headers: { authorization: `Bearer ${token}` } } as never,
    access.slug, pending.operationId, { decision: 'ACCEPT', currentPassword: 'incorrect-password' })).rejects.toThrow('Identity verification failed');
  const consent = await controller.memberEnrollmentConsent({ headers: { authorization: `Bearer ${token}` } } as never,
    access.slug, pending.operationId, { decision: 'ACCEPT', currentPassword });
  expect(consent.status).toBe('CONSENT_RECORDED');
  const completed = await service.enroll(access as never, input, application.id);
  expect(completed).toMatchObject({ status: 'COMPLETE' });
  expect(await master.user.findUniqueOrThrow({ where: { id: applicant.id } })).toMatchObject({ passwordHash });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: applicant.id, gymId: gymIds[0] } } }))
    .toMatchObject({ role: 'MEMBER', linkStatus: 'ACTIVE' });
  expect(await tenants[0].member.count({ where: { email: applicant.email } })).toBe(1);
});

it('rejects invalid future dates, foreign plans and strict DTO fields before any enrollment effect', async () => {
  const ownerAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Validation Plan', price: '1.00', currency: 'LKR', durationDays: 7 } });
  const credential = { issueTemporaryCredential: async () => ({ status: 'ISSUED' as const,
    temporaryPassword: 'Synthetic-validation-password', deliveryVersion: 0, expiresAt: new Date(Date.now() + 86_400_000) }) } as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const controller = new GymsController({ master } as DatabaseService, gateFor(), service);
  const base = { fullName: 'Validation Member', email: `validation-${run.runId}@example.test`, phone: '+94112223344',
    dateOfBirth: '1995-06-15', membershipPlanId: plan.id, idempotencyKey: 'member-validation-0001' };
  const before = {
    users: await master.user.count(), operations: await master.operation.count({ where: { kind: 'REGISTER_MEMBER' } }),
    membersA: await tenants[0].member.count(), termsA: await tenants[0].membershipTerm.count(), membersB: await tenants[1].member.count(),
  };
  await expect(controller.registerMember({ gymAccess: access } as GymRequest, { ...base, email: 'not-an-email' }))
    .rejects.toBeInstanceOf(UnprocessableEntityException);
  await expect(controller.registerMember({ gymAccess: access } as GymRequest, { ...base, passwordHash: 'must-not-be-accepted' }))
    .rejects.toBeInstanceOf(UnprocessableEntityException);
  await expect(service.enroll(access as never, { ...base, idempotencyKey: 'member-future-date-0001', dateOfBirth: '2999-01-01' }))
    .rejects.toBeInstanceOf(UnprocessableEntityException);
  await expect(service.enroll(access as never, { ...base, idempotencyKey: 'member-foreign-plan-001', membershipPlanId: 'foreign_plan_123' }))
    .rejects.toBeInstanceOf(UnprocessableEntityException);
  expect({
    users: await master.user.count(), operations: await master.operation.count({ where: { kind: 'REGISTER_MEMBER' } }),
    membersA: await tenants[0].member.count(), termsA: await tenants[0].membershipTerm.count(), membersB: await tenants[1].member.count(),
  }).toEqual(before);
});

it('does not resume a prepared enrollment after its owner access is revoked', async () => {
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo', currency: 'LKR' } });
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Revocation Plan', price: '2.00', currency: 'LKR', durationDays: 7 } });
  const revokedOwner = await master.user.create({ data: { email: `revoked-owner-${run.runId}@example.test`, passwordHash: 'synthetic-revoked-owner' } });
  const ownerAccess = await master.gymAccess.create({ data: { userId: revokedOwner.id, gymId: gymIds[0], role: 'OWNER', linkStatus: 'ACTIVE' } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: revokedOwner.id,
    identityVersion: revokedOwner.authVersion, accessVersion: ownerAccess.version, actor: null } as const;
  const actualGate = gateFor();
  let calls = 0;
  const failingGate = { withVerifiedTenant: async <Result>(target: TenantGateContext, work: (client: TenantClient) => Promise<Result>) => {
    calls++;
    // Preflight succeeds; the failure occurs after MASTER_PREPARED and before
    // any tenant registration effect.
    if (calls === 2) throw new ServiceUnavailableException('injected tenant outage');
    return actualGate.withVerifiedTenant(target, work);
  } } as TenantSchemaGateService;
  const credential = { issueTemporaryCredential: async () => ({ status: 'ISSUED' as const,
    temporaryPassword: 'Synthetic-revoked-owner-password', deliveryVersion: 0, expiresAt: new Date(Date.now() + 86_400_000) }) } as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, failingGate, credential);
  const input = { fullName: 'Revocation Member', email: `revocation-${run.runId}@example.test`, phone: '+94112223344',
    dateOfBirth: '1995-06-15', membershipPlanId: plan.id, idempotencyKey: 'member-revocation-0001' };
  const gymBMembers = await tenants[1].member.count();
  await expect(service.enroll(access as never, input)).rejects.toBeInstanceOf(ServiceUnavailableException);
  const operation = await master.operation.findFirstOrThrow({ where: { actorIdentityId: revokedOwner.id, kind: 'REGISTER_MEMBER', idempotencyKey: input.idempotencyKey } });
  expect(operation.state).toBe('MASTER_PREPARED');
  expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(0);
  expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(0);
  const pending = await master.gymAccess.findFirstOrThrow({ where: { gymId: gymIds[0], enrollmentOperationId: operation.id } });
  expect(pending.linkStatus).toBe('PENDING');
  expect(pending.tenantActorId).toBeNull();

  await master.gymAccess.update({ where: { userId_gymId: { userId: revokedOwner.id, gymId: gymIds[0] } },
    data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
  await expect(service.enroll(access as never, input)).rejects.toBeInstanceOf(ForbiddenException);
  expect(await master.operation.findUniqueOrThrow({ where: { id: operation.id } })).toMatchObject({ state: 'MASTER_PREPARED', subjectIdentityId: operation.subjectIdentityId });
  expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(0);
  expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(0);
  expect(await tenants[1].member.count()).toBe(gymBMembers);
});

it('rolls back failed Master preparation and resumes after tenant commit before Master checkpoint', async () => {
  await tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo', currency: 'LKR' } });
  const plan = await tenants[0].membershipPlan.create({ data: { name: 'Checkpoint Recovery Plan', price: '3.25', currency: 'LKR', durationDays: 14 } });
  const ownerAccess = await master.gymAccess.upsert({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } },
    create: { userId: actorId, gymId: gymIds[0], role: 'OWNER', linkStatus: 'ACTIVE' }, update: { linkStatus: 'ACTIVE' } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  const credential = { issueTemporaryCredential: async () => ({ status: 'ISSUED' as const,
    temporaryPassword: 'Synthetic-checkpoint-password', deliveryVersion: 0, expiresAt: new Date(Date.now() + 86_400_000) }) } as unknown as CredentialService;
  const service = new MemberEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const prepareInput = { fullName: 'Prepare Failure Member', email: `prepare-failure-${run.runId}@example.test`, phone: '+94112223344',
    dateOfBirth: '1995-06-15', membershipPlanId: plan.id, idempotencyKey: 'member-prepare-failure-01' };
  const userCount = await master.user.count();
  await master.$executeRawUnsafe(`CREATE FUNCTION fail_member_prepare_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'MEMBER_ENROLLMENT_PREPARED' THEN RAISE EXCEPTION 'injected Master prepare failure'; END IF; RETURN NEW; END $$`);
  await master.$executeRawUnsafe(`CREATE TRIGGER fail_member_prepare_audit BEFORE INSERT ON "PlatformAuditLog"
    FOR EACH ROW EXECUTE FUNCTION fail_member_prepare_audit()`);
  try {
    await expect(service.enroll(access as never, prepareInput)).rejects.toThrow();
    expect(await master.operation.count({ where: { kind: 'REGISTER_MEMBER', idempotencyKey: prepareInput.idempotencyKey } })).toBe(0);
    expect(await master.user.count()).toBe(userCount);
    expect(await tenants[0].member.count({ where: { email: prepareInput.email } })).toBe(0);
  } finally {
    await master.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_member_prepare_audit ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_member_prepare_audit()');
  }

  const input = { ...prepareInput, fullName: 'Checkpoint Recovery Member', email: `checkpoint-recovery-${run.runId}@example.test`,
    idempotencyKey: 'member-receipt-checkpoint-01' };
  await master.$executeRawUnsafe(`CREATE FUNCTION fail_member_tenant_checkpoint() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'OPERATION_CHECKPOINT' AND NEW."transition"->>'to' = 'TENANT_COMMITTED'
      THEN RAISE EXCEPTION 'injected lost Master checkpoint'; END IF; RETURN NEW; END $$`);
  await master.$executeRawUnsafe(`CREATE TRIGGER fail_member_tenant_checkpoint BEFORE INSERT ON "PlatformAuditLog"
    FOR EACH ROW EXECUTE FUNCTION fail_member_tenant_checkpoint()`);
  try {
    await expect(service.enroll(access as never, input)).rejects.toThrow();
    const operation = await master.operation.findFirstOrThrow({ where: { actorIdentityId: actorId, kind: 'REGISTER_MEMBER', idempotencyKey: input.idempotencyKey } });
    expect(operation.state).toBe('MASTER_PREPARED');
    expect(operation.tenantActorId).toBeNull();
    expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: operation.id, state: 'COMMITTED' } })).toBe(1);
    expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(1);
  } finally {
    await master.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_member_tenant_checkpoint ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_member_tenant_checkpoint()');
  }
  const recovered = await service.enroll(access as never, input);
  expect(recovered).toMatchObject({ status: 'COMPLETE', replayed: true, operationId: expect.any(String) });
  if (recovered.status !== 'COMPLETE') throw new Error('Expected recovered member enrollment');
  expect(await tenants[0].member.count({ where: { email: input.email } })).toBe(1);
  expect(await tenants[0].membershipTerm.count({ where: { member: { email: input.email } } })).toBe(1);
  expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: recovered.operationId, state: 'COMMITTED' } })).toBe(1);
  expect(await master.operation.findUniqueOrThrow({ where: { id: recovered.operationId } })).toMatchObject({ state: 'COMPLETE' });
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

it('serializes concurrent identical trainer registrations to one actor, receipt and activation audit', async () => {
  const ownerAccess = await master.gymAccess.upsert({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } },
    create: { userId: actorId, gymId: gymIds[0], role: 'OWNER', linkStatus: 'ACTIVE' }, update: {} });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerAccess.version, actor: null } as const;
  const credential = ({ issueTemporaryCredential: async () => ({ status: 'ALREADY_ISSUED' as const, deliveryVersion: 0 }) }) as unknown as CredentialService;
  const service = new TrainerEnrollmentService({ master } as DatabaseService, gateFor(), credential);
  const input = { fullName: 'Concurrent Trainer', email: `trainer-concurrent-${run.runId}@example.test`, phone: '+94112223349', level: 'LEVEL_1' as const,
    yearsExperience: 3, specialisations: [' Strength ', 'Mobility'], shiftStart: null, shiftEnd: null, bio: null,
    idempotencyKey: 'trainer-concurrent-command-01' };
  const concurrent = await Promise.allSettled([service.enroll(access as never, input), service.enroll(access as never, input)]);
  expect(concurrent.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(concurrent.filter(result => result.status === 'rejected')).toHaveLength(1);
  const first = concurrent.find(result => result.status === 'fulfilled');
  if (!first || first.status !== 'fulfilled' || first.value.status !== 'COMPLETE') throw new Error('Expected one concurrent trainer registration to complete');
  const recovered = await service.enroll(access as never, input);
  expect(recovered).toMatchObject({ status: 'COMPLETE', trainerId: first.value.trainerId, operationId: first.value.operationId, replayed: true });
  const [actors, receipts, audits, operations, links] = await Promise.all([
    tenants[0].trainer.count({ where: { email: input.email } }),
    tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: first.value.operationId } }),
    tenants[0].auditLog.count({ where: { receipt: { sourceMasterOperationId: first.value.operationId }, eventCode: 'TRAINER_REGISTERED' } }),
    master.operation.count({ where: { id: first.value.operationId, kind: 'REGISTER_TRAINER', state: 'COMPLETE' } }),
    master.gymAccess.count({ where: { gymId: gymIds[0], tenantActorId: first.value.trainerId, role: 'TRAINER', linkStatus: 'ACTIVE' } }),
  ]);
  expect([actors, receipts, audits, operations, links]).toEqual([1, 1, 1, 1, 1]);
  expect(await tenants[1].trainer.count({ where: { email: input.email } })).toBe(0);
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
    const pendingActor = await tenants[0].trainer.findUniqueOrThrow({ where: { email: input.email } });
    const pendingGym = await master.gym.findUniqueOrThrow({ where: { id: gymIds[0] } });
    const pendingAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: incomplete.subjectIdentityId!, gymId: gymIds[0] } } });
    expect(isOperationalActor({ identityId: incomplete.subjectIdentityId!, gymId: gymIds[0], gymStatus: pendingGym.status,
      bindingVerified: true, operationComplete: incomplete.state === 'COMPLETE', access: pendingAccess,
      actor: { ...pendingActor, kind: 'TRAINER' } })).toBe(false);
    await master.$executeRawUnsafe('DROP TRIGGER fail_trainer_activation_audit ON "PlatformAuditLog"');
    await master.$executeRawUnsafe('DROP FUNCTION fail_trainer_activation_audit()');
    const recovered = await service.enroll(access as never, input);
    if (recovered.status !== 'COMPLETE') throw new Error('Expected trainer activation recovery to complete');
    expect(recovered).toMatchObject({ status: 'COMPLETE', replayed: true, operationId: incomplete.id });
    expect(recovered.temporaryPassword).toBe('Trainer-activation-password');
    expect(await tenants[0].trainer.count({ where: { email: input.email } })).toBe(1);
    expect(await tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: incomplete.id } })).toBe(1);
    expect(await master.operation.findUniqueOrThrow({ where: { id: incomplete.id } })).toMatchObject({ state: 'COMPLETE' });
    expect(deliveries).toBe(1);
    const activeAccess = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: incomplete.subjectIdentityId!, gymId: gymIds[0] } } });
    const activeOperation = await master.operation.findUniqueOrThrow({ where: { id: incomplete.id } });
    expect(isOperationalActor({ identityId: incomplete.subjectIdentityId!, gymId: gymIds[0], gymStatus: pendingGym.status,
      bindingVerified: true, operationComplete: activeOperation.state === 'COMPLETE', access: activeAccess,
      actor: { ...pendingActor, kind: 'TRAINER' } })).toBe(true);
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

it('projects only published members with filtered totals and denies foreign or non-owner reads without writes', async () => {
  const ownerLink = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const access = { ...(await context(0)), slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerLink.version, actor: null } as const;
  const controller = new GymsController({ master } as DatabaseService, gateFor());
  const request = { gymAccess: access } as GymRequest;
  const enrolled = await tenants[0].member.findFirstOrThrow({ where: { fullName: 'Synthetic Enrolled Member' } });
  const phoneContact = await tenants[0].member.create({ data: { fullName: 'Phone Search Contact', phone: '+94119999888' } });
  const foreign = await tenants[1].member.create({ data: { fullName: 'Foreign profile', email: `foreign-profile-${run.runId}@example.test` } });
  const unpublished = await tenants[0].member.findFirstOrThrow({ where: { fullName: 'Tenant Complete but Master Pending' } });
  const before = await Promise.all([
    master.platformAuditLog.count(), master.operation.count(), tenants[0].auditLog.count(),
    tenants[0].membershipTerm.count(), tenants[0].commandReceipt.count(), tenants[1].auditLog.count(),
  ]);

  const phone = await controller.members(request, { q: '+94119999888' });
  expect(phone.items).toHaveLength(1);
  expect(phone.items[0]).toMatchObject({ id: phoneContact.id, accountState: 'BASIC' });
  expect(phone.summary).toMatchObject({ basic: 1, operational: 0, historical: 0 });
  expect(phone.summary.pendingEnrollments).toBeGreaterThanOrEqual(1);
  expect(phone.summary.statuses.ACTIVE).toBe(1);
  expect((await controller.members(request, { q: enrolled.email! })).summary).toMatchObject({ basic: 0, operational: 1, historical: 0 });
  const filtered = await controller.members(request, { q: 'Paged Member', status: 'ACTIVE', page: '3', pageSize: '25' });
  expect(filtered).toMatchObject({ totalCount: 125, page: 3, totalPages: 5 });
  expect(filtered.summary).toMatchObject({ basic: 125, operational: 0, historical: 0 });
  expect(filtered.summary.statuses).toEqual({ ACTIVE: 125, INACTIVE: 0, SUSPENDED: 0 });
  expect(filtered.items).toHaveLength(25);
  expect(filtered.items.every(member => member.accountState === 'BASIC')).toBe(true);
  const none = await controller.members(request, { q: 'no-match-012345', status: 'SUSPENDED' });
  expect(none.items).toEqual([]);
  expect(none.totalCount).toBe(0);
  expect(none.summary).toMatchObject({ basic: 0, operational: 0, historical: 0 });
  expect((await controller.memberDetail(request, enrolled.id)).accountState).toBe('OPERATIONAL');

  await master.gymAccess.update({ where: { userId_gymId: { userId: enrolled.identityId!, gymId: gymIds[0] } }, data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
  try {
    expect((await controller.memberDetail(request, enrolled.id)).accountState).toBe('HISTORICAL');
    expect((await controller.members(request, { q: enrolled.email! })).summary).toMatchObject({ operational: 0, historical: 1 });
  } finally {
    await master.gymAccess.update({ where: { userId_gymId: { userId: enrolled.identityId!, gymId: gymIds[0] } }, data: { linkStatus: 'ACTIVE', version: { increment: 1 } } });
  }

  for (const role of ['MEMBER', 'TRAINER', 'SUPPORT'] as const) {
    const denied = { gymAccess: { ...access, role } } as GymRequest;
    await expect(controller.members(denied, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.memberDetail(denied, enrolled.id)).rejects.toBeInstanceOf(ForbiddenException);
  }
  for (const id of [foreign.id, unpublished.id, 'missing-member-id']) {
    await expect(controller.memberDetail(request, id)).rejects.toMatchObject({ status: 404, message: 'Member not found' });
  }
  await expect(controller.members(request, { page: '-1' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  await expect(controller.memberDetail(request, enrolled.id, { pageSize: '1000' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  const ownerDetail = await controller.memberDetail(request, enrolled.id);
  expect(ownerDetail.healthNotes).toBe('Synthetic private note');
  expect(JSON.stringify(await controller.members(request, {}))).not.toContain('Synthetic private note');
  const after = await Promise.all([
    master.platformAuditLog.count(), master.operation.count(), tenants[0].auditLog.count(),
    tenants[0].membershipTerm.count(), tenants[0].commandReceipt.count(), tenants[1].auditLog.count(),
  ]);
  expect(after).toEqual(before);
});

it('keeps global and gym profiles separate, fences self edits, versions and replays saves, and audits owner correction without field values', async () => {
  const memberLink = await master.gymAccess.findFirstOrThrow({ where: { gymId: gymIds[0], role: 'MEMBER', actorKind: 'MEMBER',
    linkStatus: 'ACTIVE', tenantActorId: { not: null }, enrollmentOperationId: { not: null } } });
  const tenant = tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { id: memberLink.tenantActorId! } });
  const user = await master.user.update({ where: { id: memberLink.userId }, data: { mustChangePassword: false, credentialExpiresAt: null } });
  const jwt = await new SignJWT({ authVersion: user.authVersion, sid: `profile-${randomUUID()}` }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m').sign(new TextEncoder().encode(guardJwtSecret));
  const database = { master } as DatabaseService;
  const profileController = new GymProfileController(database, gateFor());
  const context0 = await context(0);
  const memberAccess = { ...context0, slug: `schema-0-${run.runId}`, role: 'MEMBER', identityId: user.id,
    identityVersion: user.authVersion, accessVersion: memberLink.version,
    actor: { kind: 'MEMBER', id: memberLink.tenantActorId!, registrationOperationId: memberLink.enrollmentOperationId! } } as const;
  const memberRequest = { gymAccess: memberAccess } as GymRequest;
  const beforeGlobalName = member.fullName;
  const accountController = new AccountProfileController(database);
  const authRequest = { headers: { authorization: `Bearer ${jwt}` } } as never;
  const accountSave = { displayName: 'Synthetic Global Display', expectedVersion: user.version };
  const accountResult = await accountController.update(authRequest, 'profile-account-save-0001', accountSave);
  expect(accountResult).toMatchObject({ version: user.version + 1, replayed: false });
  expect(await accountController.update(authRequest, 'profile-account-save-0001', accountSave)).toMatchObject({ version: user.version + 1, replayed: true });
  expect((await master.user.findUniqueOrThrow({ where: { id: user.id } })).displayName).toBe('Synthetic Global Display');
  expect((await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).fullName).toBe(beforeGlobalName);

  const self = await profileController.getMine(memberRequest) as { memberId: string; version: number; phone: string | null };
  expect(self).toMatchObject({ memberId: member.id, version: member.version });
  const selfBody = { phone: '+94770001122', emergencyContact: 'Synthetic Contact · 0710000000', expectedVersion: self.version };
  const selfResult = await profileController.updateMine(memberRequest, 'profile-member-save-0001', selfBody);
  expect(selfResult).toMatchObject({ version: self.version + 1, replayed: false });
  expect(await profileController.updateMine(memberRequest, 'profile-member-save-0001', selfBody)).toMatchObject({ version: self.version + 1, replayed: true });
  expect(await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ phone: selfBody.phone, emergencyContact: selfBody.emergencyContact, fullName: beforeGlobalName });
  await expect(profileController.updateMine(memberRequest, 'profile-member-save-0002', { ...selfBody, expectedVersion: self.version, healthNotes: 'forged' }))
    .rejects.toBeInstanceOf(UnprocessableEntityException);
  await expect(profileController.updateMine({ gymAccess: { ...memberAccess, identityId: actorId } } as GymRequest, 'profile-member-save-0003',
    { ...selfBody, expectedVersion: self.version + 1 })).rejects.toBeInstanceOf(ForbiddenException);

  const competing = await Promise.allSettled([
    profileController.updateMine(memberRequest, 'profile-member-race-0001', { ...selfBody, phone: '+94771110001', expectedVersion: self.version + 1 }),
    profileController.updateMine(memberRequest, 'profile-member-race-0002', { ...selfBody, phone: '+94772220002', expectedVersion: self.version + 1 }),
  ]);
  expect(competing.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(competing.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect((competing.find(result => result.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

  const ownerLink = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: actorId, gymId: gymIds[0] } } });
  const owner = { ...context0, slug: `schema-0-${run.runId}`, role: 'OWNER', identityId: actorId,
    identityVersion: 0, accessVersion: ownerLink.version, actor: null } as const;
  const correctionBody = { fullName: 'Synthetic Corrected Official Name', dateOfBirth: '1992-03-04', phone: '+94770002233',
    emergencyContact: 'Synthetic Correction Contact', expectedVersion: self.version + 2, reason: 'MEMBER_REQUEST' };
  const correction = await profileController.correctMember({ gymAccess: owner } as GymRequest, member.id, 'profile-owner-correct-0001', correctionBody);
  expect(correction).toMatchObject({ version: self.version + 3, replayed: false });
  expect(await profileController.correctMember({ gymAccess: owner } as GymRequest, member.id, 'profile-owner-correct-0001', correctionBody))
    .toMatchObject({ version: self.version + 3, replayed: true });
  const changedMember = await tenant.member.findUniqueOrThrow({ where: { id: member.id } });
  expect(changedMember).toMatchObject({ fullName: correctionBody.fullName, phone: correctionBody.phone, emergencyContact: correctionBody.emergencyContact });
  expect(changedMember.dateOfBirth?.toISOString().slice(0, 10)).toBe(correctionBody.dateOfBirth);
  const ownerAudit = await tenant.auditLog.findFirstOrThrow({ where: { eventCode: 'OWNER_MEMBER_PROFILE_CORRECTED', resourceId: member.id } });
  expect(ownerAudit.transition).toEqual({ from: String(self.version + 2), to: String(self.version + 3), version: self.version + 3, reasonCode: 'MEMBER_REQUEST' });
  const profileNotice = await tenant.notification.findFirstOrThrow({ where: { recipientIdentityId: member.identityId!, eventCode: 'MEMBER_PROFILE_CORRECTED' } });
  expect(profileNotice).toMatchObject({ title: 'Membership profile updated', message: 'A gym owner updated your membership profile. Review your profile details.', linkKind: 'MEMBER_PROFILE', resourceId: member.id });
  expect(profileNotice.message).not.toMatch(/Synthetic|1992|9477|MEMBER_REQUEST/);
  await expect(profileController.correctMember({ gymAccess: owner } as GymRequest, member.id, 'profile-owner-correct-0002',
    { ...correctionBody, expectedVersion: self.version + 3, status: 'SUSPENDED' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  expect((await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).status).toBe(member.status);

  const trainerLink = await master.gymAccess.findFirstOrThrow({ where: { gymId: gymIds[0], role: 'TRAINER', actorKind: 'TRAINER',
    linkStatus: 'ACTIVE', tenantActorId: { not: null }, enrollmentOperationId: { not: null } } });
  const trainerUser = await master.user.update({ where: { id: trainerLink.userId }, data: { mustChangePassword: false, credentialExpiresAt: null } });
  const trainerAccess = { ...context0, slug: `schema-0-${run.runId}`, role: 'TRAINER', identityId: trainerUser.id,
    identityVersion: trainerUser.authVersion, accessVersion: trainerLink.version,
    actor: { kind: 'TRAINER', id: trainerLink.tenantActorId!, registrationOperationId: trainerLink.enrollmentOperationId! } } as const;
  const trainerRequest = { gymAccess: trainerAccess } as GymRequest;
  const trainerProfile = await profileController.getMine(trainerRequest) as { trainerId: string; version: number };
  const trainerSave = { phone: '+94773334444', biography: 'Synthetic updated trainer biography', specialisations: ['Strength', 'Mobility'],
    yearsExperience: 9, expectedVersion: trainerProfile.version };
  expect(await profileController.updateMine(trainerRequest, 'profile-trainer-save-0001', trainerSave)).toMatchObject({ version: trainerProfile.version + 1, replayed: false });
  expect(await profileController.updateMine(trainerRequest, 'profile-trainer-save-0001', trainerSave)).toMatchObject({ version: trainerProfile.version + 1, replayed: true });
  expect(await tenant.trainer.findUniqueOrThrow({ where: { id: trainerProfile.trainerId } })).toMatchObject({ phone: trainerSave.phone,
    bio: trainerSave.biography, specialisations: trainerSave.specialisations, yearsExperience: trainerSave.yearsExperience });
  await expect(profileController.updateMine(trainerRequest, 'profile-trainer-save-0002', { ...trainerSave, level: 'LEVEL_2' }))
    .rejects.toBeInstanceOf(UnprocessableEntityException);
});
