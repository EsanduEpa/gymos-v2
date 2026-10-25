import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { OperationFoundationService, type Lease } from '../../src/operations/operation.service.js';
import { CommandReceiptFoundationService } from '../../src/operations/receipt.service.js';
import { appendMasterVersionAudit, appendTenantAudit } from '../../src/operations/transaction-audit.js';
import { OperationConflictError, OperationIntegrityError, tenantAuditKey } from '../../src/operations/primitives.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let master: MasterClient;
let tenants: TenantClient[] = [];
let operations: OperationFoundationService;
let actorId: string;
let gymId: string;
const hash = 'a'.repeat(64);
const key = () => `task004-${randomUUID()}`;
const claimProvision = (slug: string, idempotencyKey = key()) => operations.claim({ actorIdentityId: actorId,
  kind: 'PROVISION_GYM', requestedSlug: slug, idempotencyKey, intent: { name: slug },
  intendedTenantTemplateVersion: 'task004', intendedTenantManifestDigest: hash });

beforeAll(async () => {
  run = await createDisposablePostgresRun();
  await run.migrate(run.masterName, 'master');
  for (const name of run.tenantNames) await run.migrate(name, 'tenant');
  master = new MasterClient({ adapter: new PrismaPg({ connectionString: run.masterUrl, max: 4 }) });
  tenants = run.tenantUrls.map(url => new TenantClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) }));
  const actor = await master.user.create({ data: { email: 'operations@example.test', passwordHash: 'fixture-not-a-login-hash' } });
  actorId = actor.id;
  const gym = await master.gym.create({ data: { name: 'Task004 isolated', slug: `task004-${run.runId}`, databaseName: run.tenantNames[0], status: 'ACTIVE' } });
  gymId = gym.id;
  operations = new OperationFoundationService(master);
}, 120_000);

afterAll(async () => {
  const migrationEvidence = [];
  try {
    if (master) for (const name of [run.masterName, ...run.tenantNames]) {
      const client = await run.connect(name);
      try { migrationEvidence.push({ database: name, migrations: (await client.query('SELECT migration_name, checksum, finished_at IS NOT NULL AND rolled_back_at IS NULL AS completed FROM "_prisma_migrations" ORDER BY started_at')).rows }); }
      finally { await client.end(); }
    }
  } finally {
    await Promise.all([master?.$disconnect(), ...tenants.map(client => client.$disconnect())]);
    if (run) console.info('[task004-owned-run-evidence]', JSON.stringify({ runId: run.runId, migrationEvidence, cleanup: await run.cleanup() }));
  }
}, 120_000);

it('applies all additive migrations and installs complete columns, indexes and same-Master audit FKs', async () => {
  const client = await run.connect(run.masterName);
  try {
    const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Operation'")).rows.map(row => row.column_name);
    for (const column of ['completedSteps', 'state', 'step', 'version', 'attemptCount', 'leaseToken', 'leaseExpiresAt', 'leaseRequiresReconciliation', 'safeResult', 'errorCode', 'createdAt', 'updatedAt', 'lastAttemptAt']) expect(columns).toContain(column);
    const indexes = (await client.query('SELECT indexname FROM pg_indexes WHERE tablename=$1', ['Operation'])).rows.map(row => row.indexname);
    expect(indexes).toContain('Operation_actorIdentityId_scopeKey_kind_idempotencyKey_key');
    expect(indexes).toContain('Operation_provision_request_key_claim');
    const fks = (await client.query("SELECT conname FROM pg_constraint WHERE contype='f' AND conrelid='\"PlatformAuditLog\"'::regclass")).rows.map(row => row.conname);
    expect(fks).toContain('PlatformAuditLog_gymId_fkey');
    expect(fks).toContain('PlatformAuditLog_originalActorIdentityId_fkey');
  } finally { await client.end(); }
});

it('concurrent same intent claims one operation and rejects same key with another slug/body before duplicate checks', async () => {
  const requestKey = key();
  const results = await Promise.all(Array.from({ length: 5 }, () => claimProvision('claimed-gym', requestKey)));
  expect(new Set(results.map(result => result.operation.id)).size).toBe(1);
  expect(results.filter(result => !result.replayed)).toHaveLength(1);
  expect(new Set(results.map(result => result.operation.databaseName)).size).toBe(1);
  await expect(claimProvision('different-gym', requestKey)).rejects.toBeInstanceOf(OperationConflictError);
  await expect(operations.claim({ actorIdentityId: actorId, kind: 'PROVISION_GYM', requestedSlug: 'claimed-gym', idempotencyKey: requestKey,
    intent: { name: 'changed' }, intendedTenantTemplateVersion: 'task004', intendedTenantManifestDigest: hash })).rejects.toBeInstanceOf(OperationConflictError);
  await expect(operations.claim({ actorIdentityId: actorId, kind: 'PROVISION_GYM', requestedSlug: 'private-gym', idempotencyKey: key(),
    intent: { password: 'fixture-sensitive' }, intendedTenantTemplateVersion: 'task004', intendedTenantManifestDigest: hash })).rejects.toThrow('Sensitive request fields');
});

it('leases have one CAS winner, database-clock30second expiry and stale heartbeat denial', async () => {
  const { operation } = await claimProvision('lease-gym');
  const results = await Promise.allSettled([operations.acquireLease(operation.id, operation.version), operations.acquireLease(operation.id, operation.version)]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const lease = (results.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<Lease>).value;
  const row = await master.operation.findUniqueOrThrow({ where: { id: operation.id } });
  expect(row.leaseExpiresAt!.getTime() - row.lastAttemptAt!.getTime()).toBe(30_000);
  const renewed = await operations.heartbeat(lease);
  expect(renewed.version).toBe(lease.version + 1);
  await expect(operations.heartbeat(lease)).rejects.toThrow('stale');
});

async function expiredTakeover(slug: string) {
  const { operation } = await claimProvision(slug);
  const lease = await operations.acquireLease(operation.id, operation.version);
  const client = await run.connect(run.masterName);
  try { await client.query('UPDATE "Operation" SET "leaseExpiresAt"=clock_timestamp()-interval \'1 second\',version=version+1 WHERE id=$1', [operation.id]); }
  finally { await client.end(); }
  await expect(operations.heartbeat(lease)).rejects.toThrow('stale');
  const row = await master.operation.findUniqueOrThrow({ where: { id: operation.id } });
  return { operation: row, lease: await operations.acquireLease(operation.id, row.version) };
}

it('expired takeover requires verified reconciliation and rejects a verifier/version race without holding Master locks', async () => {
  const { operation, lease } = await expiredTakeover('takeover-gym');
  const target = await master.gym.create({ data: { name: 'Takeover target', slug: operation.requestedSlug!, databaseName: operation.databaseName! } });
  const evidence = { gymId: target.id, databaseName: operation.databaseName! };
  expect(lease.requiresReconciliation).toBe(true);
  await expect(operations.checkpoint(lease, { step: 'GYM_RESERVED', evidence })).rejects.toThrow('Reconcile');
  let current = lease;
  await expect(operations.reconcileLease(lease, async snapshot => {
    expect(snapshot.databaseName).toBe(operation.databaseName);
    // This would block/deadlock if reconciliation held the Master row lock.
    current = await operations.heartbeat(lease);
  })).rejects.toThrow('stale');
  expect((await master.operation.findUniqueOrThrow({ where: { id: operation.id } })).leaseRequiresReconciliation).toBe(true);
  current = await operations.reconcileLease(current, async snapshot => { expect(snapshot.id).toBe(operation.id); });
  expect(current.requiresReconciliation).toBe(false);
  const checkpoint = await operations.checkpoint(current, { step: 'GYM_RESERVED', evidence });
  expect(checkpoint.state).toBe('MASTER_PREPARED');
  const direct = await run.connect(run.masterName);
  try {
    await expect(direct.query(`UPDATE "Operation" SET "completedSteps"=jsonb_set("completedSteps",'{GYM_RESERVED,evidence,extra}','"changed"'::jsonb),version=version+1 WHERE id=$1`, [operation.id])).rejects.toMatchObject({ code: '23514' });
    await expect(direct.query('DELETE FROM "Operation" WHERE id=$1', [operation.id])).rejects.toMatchObject({ code: '23514' });
  } finally { await direct.end(); }
  await expect(operations.checkpoint(checkpoint.lease, { step: 'TENANT_BOUND', evidence: { gymId } })).rejects.toThrow('prerequisite');
});

it('ordered checkpoints keep scope/target immutable, commit local effects+audit and replay safe COMPLETE result after response loss', async () => {
  const requestKey = key();
  const { operation } = await claimProvision('complete-gym', requestKey);
  let lease = await operations.acquireLease(operation.id, operation.version);
  await expect(operations.checkpoint(lease, { step: 'GYM_RESERVED', evidence: { gymId, databaseName: operation.databaseName! } })).rejects.toThrow('target binding mismatch');
  const target = await master.gym.create({ data: { name: 'Complete target', slug: operation.requestedSlug!, databaseName: operation.databaseName! } });
  const steps = [
    ['GYM_RESERVED', { gymId: target.id, databaseName: operation.databaseName! }],
    ['DATABASE_CREATED', { databaseName: operation.databaseName! }],
    ['TENANT_TEMPLATE_VERIFIED', { appliedTenantTemplateVersion: 'task004', appliedTenantManifestDigest: hash }],
    ['TENANT_BOUND', { gymId: target.id }],
  ] as const;
  for (const [step, evidence] of steps) lease = (await operations.checkpoint(lease, { step, evidence })).lease;
  const final = await operations.checkpoint(lease, { step: 'MASTER_ACTIVATED', evidence: { gymId: target.id },
    finalResult: { operationId: operation.id, state: 'COMPLETE', resourceIds: [gymId], publicationState: 'ACTIVE', retryable: false },
    localEffects: async tx => { await tx.user.update({ where: { id: actorId }, data: { displayName: 'checkpoint committed' } }); } });
  expect(final.state).toBe('COMPLETE');
  const replay = await claimProvision('complete-gym', requestKey);
  expect(replay.result).toEqual(final.result);
  expect(replay.operation.scopeKey).toBe('provision-gym:complete-gym');
  expect(replay.operation.databaseName).toBe(operation.databaseName);
  expect(await master.platformAuditLog.count({ where: { operationId: operation.id } })).toBe(5);
  expect(JSON.stringify(replay.result)).not.toMatch(/databaseName|password|token|credential/i);
  await expect(master.operation.update({ where: { id: operation.id }, data: { scopeKey: `gym:${gymId}`, version: { increment: 1 } } })).rejects.toThrow('Immutable operation intent');
});

it('Master audit insertion failure rolls back checkpoint and local effects together', async () => {
  const { operation } = await claimProvision('master-failure-gym');
  const lease = await operations.acquireLease(operation.id, operation.version);
  const target = await master.gym.create({ data: { name: 'Failure target', slug: operation.requestedSlug!, databaseName: operation.databaseName! } });
  const before = await master.user.findUniqueOrThrow({ where: { id: actorId } });
  const client = await run.connect(run.masterName);
  try {
    await client.query(`CREATE FUNCTION task004_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected required audit failure'; END $$;
      CREATE TRIGGER task004_fail_audit BEFORE INSERT ON "PlatformAuditLog" FOR EACH ROW EXECUTE FUNCTION task004_fail_audit();`);
    await expect(operations.checkpoint(lease, { step: 'GYM_RESERVED', evidence: { gymId: target.id, databaseName: operation.databaseName! },
      localEffects: async tx => { await tx.user.update({ where: { id: actorId }, data: { displayName: 'must rollback' } }); } })).rejects.toThrow('injected required audit failure');
  } finally {
    await client.query('DROP TRIGGER IF EXISTS task004_fail_audit ON "PlatformAuditLog"; DROP FUNCTION IF EXISTS task004_fail_audit();');
    await client.end();
  }
  expect((await master.operation.findUniqueOrThrow({ where: { id: operation.id } })).completedSteps).toEqual({});
  expect((await master.user.findUniqueOrThrow({ where: { id: actorId } })).displayName).toBe(before.displayName);
  expect(await master.platformAuditLog.count({ where: { operationId: operation.id } })).toBe(0);
});

const command = (idempotencyKey = key()) => ({ masterGymId: gymId, actorIdentityId: actorId,
  commandKind: 'SYNTHETIC_MEMBER_CREATE', idempotencyKey, normalizedIntent: { fullName: 'Synthetic Receipt Member' } });

it('tenant receipt races commit one business effect+audit and same source operation recovers with another key', async () => {
  const service = new CommandReceiptFoundationService(tenants[0]);
  const input = { ...command(), sourceMasterOperationId: `master-operation-${randomUUID()}` };
  let invoked = 0;
  const effects = async (tx: Parameters<Parameters<typeof service.execute>[1]>[0]) => {
    invoked++;
    const member = await tx.member.create({ data: { fullName: 'Receipt race', email: `receipt-${randomUUID()}@example.test` } });
    return { result: { resourceIds: [member.id] }, resourceType: 'MEMBER', resourceId: member.id,
      audits: [{ actorIdentityId: actorId, eventCode: 'MEMBER_CREATED', resourceType: 'MEMBER', resourceId: member.id, transition: { to: 'BASIC' } }] };
  };
  const results = await Promise.all(Array.from({ length: 5 }, () => service.execute(input, effects)));
  expect(invoked).toBe(1);
  expect(new Set(results.map(result => result.receiptId)).size).toBe(1);
  expect(await tenants[0].auditLog.count({ where: { receiptId: results[0].receiptId } })).toBe(1);
  expect((await service.execute({ ...input, idempotencyKey: key() }, effects)).replayed).toBe(true);
  expect(invoked).toBe(1);
  await expect(service.execute({ ...input, normalizedIntent: { fullName: 'changed' } }, effects)).rejects.toBeInstanceOf(OperationConflictError);
});

it('missing/failed tenant audit rolls back member+receipt; foreign source actor cannot replay and tenantB remains isolated', async () => {
  const service = new CommandReceiptFoundationService(tenants[0]);
  const input = command();
  const before = await tenants[0].member.count();
  await expect(service.execute(input, async tx => {
    await tx.member.create({ data: { fullName: 'must rollback' } }); return { result: {}, audits: [] };
  })).rejects.toThrow('audit is missing');
  expect(await tenants[0].member.count()).toBe(before);
  expect(await tenants[0].commandReceipt.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(0);
  const success = await service.execute(input, async tx => {
    const member = await tx.member.create({ data: { fullName: 'Own tenant only' } });
    return { result: { resourceIds: [member.id] }, audits: [{ actorIdentityId: actorId, eventCode: 'MEMBER_CREATED', resourceType: 'MEMBER', resourceId: member.id, transition: { to: 'BASIC' } }] };
  });
  expect(await tenants[1].commandReceipt.count()).toBe(0);
  expect(await tenants[1].auditLog.count()).toBe(0);
  await expect(tenants[0].commandReceipt.delete({ where: { id: success.receiptId } })).rejects.toThrow('retention');
  const receipt = await tenants[0].commandReceipt.findUniqueOrThrow({ where: { id: success.receiptId } });
  const audit = await tenants[0].auditLog.findFirstOrThrow({ where: { receiptId: receipt.id } });
  expect(audit.eventKey).toBe(tenantAuditKey({ masterGymId: gymId, receiptId: receipt.id, eventCode: audit.eventCode, resourceType: audit.resourceType, resourceId: audit.resourceId }));
  await expect(tenants[0].$transaction(tx => appendTenantAudit(tx, { actorIdentityId: actorId, masterGymId: gymId, receiptId: receipt.id,
    eventCode: audit.eventCode, resourceType: audit.resourceType, resourceId: audit.resourceId, transition: { to: 'DIFFERENT' } }))).rejects.toBeInstanceOf(OperationIntegrityError);
  await expect(tenants[0].auditLog.update({ where: { id: audit.id }, data: { eventCode: 'REWRITTEN' } })).rejects.toThrow('append-only');
});

it('versioned Master audit replays same event and rejects content mismatch while local aggregate change rolls back', async () => {
  const event = { actorIdentityId: actorId, gymId, eventCode: 'SYNTHETIC_VERSION_CHANGED', resourceType: 'USER', resourceId: actorId,
    committedVersion: 1, transition: { version: 1 } };
  const first = await master.$transaction(async tx => {
    const changed = await tx.user.updateMany({ where: { id: actorId, version: 0 }, data: { version: 1 } });
    expect(changed.count).toBe(1); return appendMasterVersionAudit(tx, event);
  });
  expect((await master.$transaction(tx => appendMasterVersionAudit(tx, event))).id).toBe(first.id);
  await expect(master.$transaction(async tx => {
    await tx.user.update({ where: { id: actorId }, data: { version: 2 } });
    return appendMasterVersionAudit(tx, { ...event, transition: { version: 2 } });
  })).rejects.toBeInstanceOf(OperationIntegrityError);
  expect((await master.user.findUniqueOrThrow({ where: { id: actorId } })).version).toBe(1);
});

it('tenant required audit INSERT failure rolls back business effects and receipt in the same database', async () => {
  const service = new CommandReceiptFoundationService(tenants[0]);
  const input = command();
  const before = await tenants[0].member.count();
  const client = await run.connect(run.tenantNames[0]);
  try {
    await client.query(`CREATE FUNCTION task004_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected tenant audit failure'; END $$;
      CREATE TRIGGER task004_fail_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION task004_fail_audit();`);
    await expect(service.execute(input, async tx => {
      const member = await tx.member.create({ data: { fullName: 'must rollback audit failure' } });
      return { result: { resourceIds: [member.id] }, audits: [{ actorIdentityId: actorId, eventCode: 'MEMBER_CREATED', resourceType: 'MEMBER', resourceId: member.id, transition: { to: 'BASIC' } }] };
    })).rejects.toThrow('injected tenant audit failure');
  } finally {
    await client.query('DROP TRIGGER IF EXISTS task004_fail_audit ON "AuditLog"; DROP FUNCTION IF EXISTS task004_fail_audit();');
    await client.end();
  }
  expect(await tenants[0].member.count()).toBe(before);
  expect(await tenants[0].commandReceipt.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(0);
});
