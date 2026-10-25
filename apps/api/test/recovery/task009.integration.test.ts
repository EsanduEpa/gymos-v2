import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { appendMasterVersionAudit } from '../../src/operations/transaction-audit.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { tenantManifestDigest } from '../../src/tenancy/tenant-template-manifest.js';
import { verifyInstalledTenant } from '../../src/tenancy/tenant-schema-verifier.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { createEncryptedBackup, withVerifiedArchive, type BackupMetadata } from '../../../../infrastructure/recovery/crypto-artifact.mjs';
import { reconcileMasterReferences, restoreIntoNewOwnedTarget, switchTenantRegistry } from '../../../../infrastructure/recovery/recovery.mjs';

const root = new URL('../../../../', import.meta.url);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;

async function masterMigrationSources() {
  const directory = new URL('packages/database-master/prisma/migrations/', root);
  const names = (await readdir(directory)).filter((name) => name !== 'migration_lock.toml').sort();
  const result = [];
  for (const name of names) {
    const sql = await readFile(new URL(`${name}/migration.sql`, directory));
    result.push({ name, checksum: hash(sql.toString('utf8')) });
  }
  return result;
}

async function readEvidence(client: pg.Client) {
  const migrationRows = (await client.query(`
    SELECT migration_name, checksum, finished_at IS NOT NULL AND rolled_back_at IS NULL AS complete
    FROM "_prisma_migrations" ORDER BY started_at, id
  `)).rows as Array<{ migration_name: string; checksum: string; complete: boolean }>;
  if (migrationRows.some((row) => !row.complete)) throw new Error('Unresolved migration history');

  const catalog = {
    tables: (await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).rows,
    columns: (await client.query(`SELECT table_name,column_name,data_type,is_nullable,COALESCE(column_default,'') AS column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows,
    enums: (await client.query(`SELECT t.typname AS name,e.enumlabel AS value,e.enumsortorder AS position FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`)).rows,
    indexes: (await client.query(`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY indexname`)).rows,
    constraints: (await client.query(`SELECT c.conname,pg_get_constraintdef(c.oid,true) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' ORDER BY c.conname`)).rows,
    triggers: (await client.query(`SELECT t.tgname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY t.tgname`)).rows,
  };
  const tableNames = catalog.tables.map((row: { table_name: string }) => row.table_name).filter((name) => name !== '_prisma_migrations');
  if (tableNames.length > 64) throw new Error('Recovery fixture table count exceeds evidence bound');
  const counts: Record<string, number> = {};
  const data = createHash('sha256');
  for (const table of tableNames) {
    const rows = (await client.query(`SELECT to_jsonb(t)::text AS value FROM public.${quote(table)} AS t ORDER BY to_jsonb(t)::text`)).rows as Array<{ value: string }>;
    counts[table] = rows.length;
    data.update(`${table}\0`);
    for (const row of rows) data.update(`${row.value}\n`);
  }
  return {
    migrations: migrationRows.map(({ migration_name, checksum }) => ({ name: migration_name, checksum })),
    catalog,
    schemaDigest: hash(JSON.stringify(catalog)),
    counts,
    dataDigest: data.digest('hex'),
  };
}

async function evidenceForRun(run: Awaited<ReturnType<typeof createDisposableEnvironment>>, name: string) {
  const client = await run.connect(name);
  try { return await readEvidence(client); }
  finally { await client.end(); }
}

async function verifyMaster(client: pg.Client, evidence: Awaited<ReturnType<typeof readEvidence>>) {
  const sources = await masterMigrationSources();
  if (JSON.stringify(evidence.migrations) !== JSON.stringify(sources)) throw new Error('Master migration history does not match source migrations');
  return hash(JSON.stringify({ migrations: sources, schemaDigest: evidence.schemaDigest }));
}

async function snapshot(run: Awaited<ReturnType<typeof createDisposableEnvironment>>, name: string, connectionString: string, kind: 'MASTER' | 'TENANT', gymId: string | null, keyFile: string, directory: string, tempRoot: string) {
  await run.verifyContainer();
  await run.verifyOwnership(name);
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const [{ snapshot_id: snapshotId }] = (await client.query('SELECT pg_export_snapshot() AS snapshot_id')).rows;
    const snapshotAt = new Date().toISOString();
    const observed = await readEvidence(client);
    let manifestDigest = tenantManifestDigest();
    if (kind === 'TENANT') {
      const tenant = new TenantClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
      try {
        const installed = await verifyInstalledTenant(tenant);
        if (installed.manifestDigest !== manifestDigest) throw new Error('Tenant manifest mismatch');
      } finally { await tenant.$disconnect(); }
    } else manifestDigest = await verifyMaster(client, observed);
    const toolVersion = await run.pgDumpVersion();
    const metadata: BackupMetadata = {
      scope: 'DISPOSABLE_DEVELOPMENT',
      sourceRunId: run.runId,
      kind,
      gymId,
      manifestDigest,
      snapshotAt,
      observedOperationsAt: new Date().toISOString(),
      toolVersion,
      format: 'postgres-custom',
      counts: observed.counts,
      dataDigest: observed.dataDigest,
    };
    const backup = await createEncryptedBackup({
      directory,
      tempRoot,
      keyFile,
      metadata,
      verifySource: async (expected) => {
        await run.verifyContainer();
        await run.verifyOwnership(name);
        const current = await readEvidence(client);
        if (current.dataDigest !== expected.dataDigest || JSON.stringify(current.counts) !== JSON.stringify(expected.counts)) throw new Error('Source snapshot evidence changed');
        if (kind === 'TENANT') {
          const tenant = new TenantClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
          try { if ((await verifyInstalledTenant(tenant)).manifestDigest !== expected.manifestDigest) throw new Error('Tenant schema manifest changed'); }
          finally { await tenant.$disconnect(); }
        }
        if (kind === 'MASTER' && await verifyMaster(client, current) !== expected.manifestDigest) throw new Error('Master schema manifest changed');
      },
      producer: () => run.pgDump(name, snapshotId),
    });
    await client.query('ROLLBACK');
    await client.end();
    return { ...backup, metadata, observed };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
    throw error;
  }
}

let run: Awaited<ReturnType<typeof createDisposableEnvironment>> | undefined;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>> | undefined;
let workspace: string | undefined;
let originalTenantUrl: string | undefined;
let tenantPools: TenantDatabaseService | undefined;

beforeAll(async () => {
  originalTenantUrl = process.env.TENANT_DATABASE_URL;
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
  process.env.TENANT_DATABASE_URL = run.tenantUrls[0];
  tenantPools = new TenantDatabaseService();
  workspace = await mkdtemp(join(await realpath(tmpdir()), 'gymos-recovery-drill-'));
  await mkdir(join(workspace, 'artifacts'), { mode: 0o700 });
  await mkdir(join(workspace, 'plaintext'), { mode: 0o700 });
  await mkdir(join(workspace, 'keys'), { mode: 0o700 });
  await writeFile(join(workspace, 'keys', 'backup.key'), randomBytes(32), { mode: 0o600 });
}, 120_000);

afterAll(async () => {
  if (originalTenantUrl === undefined) delete process.env.TENANT_DATABASE_URL;
  else process.env.TENANT_DATABASE_URL = originalTenantUrl;
  try { await tenantPools?.onModuleDestroy(); }
  finally {
    try { await fixture?.close(); }
    finally {
      try { if (run) console.info('[task009-owned-run-cleanup]', JSON.stringify(await run.cleanup())); }
      finally { if (workspace) await rm(workspace, { recursive: true, force: true }); }
    }
  }
}, 120_000);

it('backs up Master and tenant A, restores to new owned databases, switches and rolls back with B unchanged', async () => {
  if (!run || !fixture || !workspace) throw new Error('Owned recovery fixture was not initialized');
  const started = performance.now();
  let reconciliationState = 'REPAIR_REQUIRED';
  let stagedMasterSnapshot: { identities: any[]; gyms: any[]; accesses: any[]; operations: any[] } | undefined;
  const alpha = fixture.gyms[0];
  const beta = fixture.gyms[1];
  const tenantAName = fixture.tenantDatabases[0].name;
  const tenantBName = fixture.tenantDatabases[1].name;
  const masterClient = fixture.master;
  const tenantA = fixture.tenants[0];
  if (!tenantPools) throw new Error('Tenant pool service was not initialized');
  const pools = tenantPools;
  const keyFile = join(workspace, 'keys', 'backup.key');
  const backupDirectory = join(workspace, 'artifacts');
  const plaintextRoot = join(workspace, 'plaintext');
  const aBefore = await evidenceForRun(run, tenantAName);
  const bBefore = await evidenceForRun(run, tenantBName);
  const masterBackup = await snapshot(run, run.masterName, run.masterUrl, 'MASTER', null, keyFile, backupDirectory, plaintextRoot);
  const tenantBackup = await snapshot(run, tenantAName, fixture.tenantDatabases[0].url, 'TENANT', alpha.id, keyFile, backupDirectory, plaintextRoot);

  const tenantMutationAt = new Date();
  await tenantA.member.create({ data: { fullName: 'Post snapshot synthetic member', email: `post-snapshot-${run.runId}@example.test` } });
  expect(await tenantA.member.count()).toBe(aBefore.counts.Member + 1);
  const bAfterMutation = await evidenceForRun(run, tenantBName);
  expect(bAfterMutation).toMatchObject({ dataDigest: bBefore.dataDigest, counts: bBefore.counts });

  const restoredA = await run.createOwnedDatabase();
  const recoveryStarted = performance.now();
  const restoreAResult = await restoreIntoNewOwnedTarget({
    manifestPath: tenantBackup.manifestPath,
    keyFile,
    tempRoot: plaintextRoot,
    expected: { sourceRunId: run.runId, kind: 'TENANT', gymId: alpha.id, manifestDigest: tenantBackup.metadata.manifestDigest },
  }, {
    guardCurrentRun: async (metadata: typeof tenantBackup.metadata) => {
      await run!.verifyContainer();
      await run!.verifyOwnership(tenantAName);
      if (metadata.gymId !== alpha.id) throw new Error('Wrong tenant binding');
    },
    createNewOwnedTarget: async () => restoredA,
    restoreArchive: async ({ target, archive, clean }) => {
      expect(clean).toBe(false);
      await run!.pgRestore(target.name, archive);
    },
    verifyActualRestore: async ({ target, metadata }: { target: typeof restoredA; metadata: typeof tenantBackup.metadata }) => {
      await run!.verifyOwnership(target.name);
      const client = new TenantClient({ adapter: new PrismaPg({ connectionString: target.url, max: 1 }) });
      try {
        const installed = await verifyInstalledTenant(client);
        const configuration = await client.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
        const state = await client.schemaState.findUniqueOrThrow({ where: { id: 'current' } });
        const targetDb = new pg.Client({ connectionString: target.url });
        await targetDb.connect();
        let restored;
        try { restored = await readEvidence(targetDb); }
        finally { await targetDb.end(); }
        const bindingVerified = configuration.masterGymId === alpha.id && metadata.gymId === alpha.id;
        const dataVerified = restored.dataDigest === metadata.dataDigest && JSON.stringify(restored.counts) === JSON.stringify(metadata.counts);
        return { schemaVerified: installed.manifestDigest === metadata.manifestDigest && state.state === 'VERIFIED', bindingVerified, dataVerified, evidence: { counts: restored.counts, dataDigest: restored.dataDigest } };
      } finally { await client.$disconnect(); }
    },
    markOwnedTargetFailed: async () => {},
  });
  expect(restoreAResult.state).toBe('RESTORED_UNSELECTED');
  expect(restoreAResult.verification).toMatchObject({ schemaVerified: true, bindingVerified: true, dataVerified: true });
  const backupAgeMs = tenantMutationAt.getTime() - Date.parse(tenantBackup.metadata.snapshotAt);

  // The staged Master archive is restored to a separate new target and never activated.
  const restoredMaster = await run.createOwnedDatabase();
  const masterRestore = await restoreIntoNewOwnedTarget({
    manifestPath: masterBackup.manifestPath,
    keyFile,
    tempRoot: plaintextRoot,
    expected: { sourceRunId: run.runId, kind: 'MASTER', gymId: null, manifestDigest: masterBackup.metadata.manifestDigest },
  }, {
    guardCurrentRun: async () => { await run!.verifyContainer(); await run!.verifyOwnership(run!.masterName); },
    createNewOwnedTarget: async () => restoredMaster,
    restoreArchive: async ({ target, archive }: { target: typeof restoredMaster; archive: string }) => run!.pgRestore(target.name, archive),
    verifyActualRestore: async ({ target, metadata }: { target: typeof restoredMaster; metadata: typeof masterBackup.metadata }) => {
      const client = new pg.Client({ connectionString: target.url });
      await client.connect();
      try {
        const evidence = await readEvidence(client);
        const verified = await verifyMaster(client, evidence);
        return { schemaVerified: verified === metadata.manifestDigest, bindingVerified: true, dataVerified: evidence.dataDigest === metadata.dataDigest && JSON.stringify(evidence.counts) === JSON.stringify(metadata.counts) };
      } finally { await client.end(); }
    },
    markOwnedTargetFailed: async () => {},
  });
  expect(masterRestore.state).toBe('RESTORED_UNSELECTED');
  expect(masterRestore.verification).toMatchObject({ schemaVerified: true, bindingVerified: true, dataVerified: true });

  const aTargetClient = new TenantClient({ adapter: new PrismaPg({ connectionString: restoredA.url, max: 1 }) });
  const targetEvidence = await verifyInstalledTenant(aTargetClient);
  await aTargetClient.$disconnect();
  const masterTenant = new TenantClient({ adapter: new PrismaPg({ connectionString: run.tenantUrls[1], max: 1 }) });
  const registry = await masterClient.gym.findUniqueOrThrow({ where: { id: alpha.id } });
  const betaRegistry = await masterClient.gym.findUniqueOrThrow({ where: { id: beta.id } });
  const currentTargets = [
    { gymId: alpha.id, databaseName: registry.databaseName, schemaVerified: true, bindingGymId: alpha.id, manifestDigest: targetEvidence.manifestDigest },
    { gymId: beta.id, databaseName: betaRegistry.databaseName, schemaVerified: true, bindingGymId: beta.id, manifestDigest: tenantManifestDigest() },
  ];
  await masterTenant.$disconnect();
  const originalMaster = await run.connect(restoredMaster.name);
  try {
    const restoredIdentities = (await originalMaster.query('SELECT id, "authVersion" FROM "User" ORDER BY id')).rows;
    const restoredGyms = (await originalMaster.query('SELECT id, "databaseName", "expectedTenantManifestDigest" FROM "Gym" ORDER BY id')).rows;
    const restoredAccesses = (await originalMaster.query('SELECT "userId", "gymId", role, "tenantActorId", "linkStatus", "enrollmentOperationId" FROM "GymAccess" ORDER BY "userId", "gymId"')).rows.map((x) => ({ userId: x.userId, gymId: x.gymId, role: x.role, tenantActorId: x.tenantActorId, linkStatus: x.linkStatus, enrollmentOperationId: x.enrollmentOperationId }));
    const restoredOperations = (await originalMaster.query('SELECT id, state FROM "Operation" ORDER BY id')).rows.map((x) => ({ ...x, receiptId: null }));
    stagedMasterSnapshot = {
      identities: restoredIdentities,
      gyms: restoredGyms.map((x: any) => ({ id: x.id, databaseName: x.databaseName, expectedManifestDigest: x.expectedTenantManifestDigest })),
      accesses: restoredAccesses,
      operations: restoredOperations,
    };
    const currentIdentities = await masterClient.user.findMany({ select: { id: true, authVersion: true } });
    const currentAccesses = await masterClient.gymAccess.findMany({ select: { userId: true, gymId: true, role: true, tenantActorId: true, linkStatus: true, enrollmentOperationId: true } });
    const currentOperations = (await masterClient.operation.findMany({ select: { id: true, state: true } })).map((x) => ({ ...x, receiptId: null }));
    const reconciliation = reconcileMasterReferences({
      identities: restoredIdentities,
      gyms: restoredGyms.map((x: any) => ({ id: x.id, databaseName: x.databaseName, expectedManifestDigest: x.expectedTenantManifestDigest })),
      accesses: restoredAccesses,
      operations: restoredOperations,
    }, {
      identities: currentIdentities,
      tenants: currentTargets,
      accesses: currentAccesses,
      operations: currentOperations,
      actorEvidence: [],
    });
    reconciliationState = reconciliation.state;
    expect(reconciliation.automaticActivationAllowed).toBe(false);
    expect(['REVIEW_REQUIRED', 'REPAIR_REQUIRED']).toContain(reconciliation.state);
  } finally { await originalMaster.end(); }

  const staleVersion = registry.version;
  const compareAndSet = async (input: any) => {
    if (input.event === 'RECOVERY_ACTIVATED') pools.resumeDatabase(input.nextTarget);
    try { return await masterClient.$transaction(async (tx) => {
    const updated = await tx.gym.updateMany({
      where: { id: input.gymId, version: input.expectedVersion, databaseName: input.expectedTarget, status: input.expectedStatus },
      data: { databaseName: input.nextTarget, status: input.nextStatus, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new Error('Stale recovery registry version');
    const committedVersion = input.expectedVersion + 1;
    await appendMasterVersionAudit(tx, {
      actorIdentityId: fixture!.users.admin.id,
      gymId: input.gymId,
      eventCode: input.event,
      resourceType: 'GYM',
      resourceId: input.gymId,
      committedVersion,
      transition: { from: input.expectedStatus, to: input.nextStatus, version: committedVersion },
    });
    return { version: committedVersion };
    }); } catch (error) {
      if (input.event === 'RECOVERY_ACTIVATED') await pools.suspendAndDrain(input.nextTarget).catch(() => undefined);
      throw error;
    }
  };
  const transitionEvents: string[] = [];
  let signalDrain!: () => void;
  const drainStarted = new Promise<void>((resolve) => { signalDrain = resolve; });
  let releaseActive!: () => void;
  let signalActive!: () => void;
  const activeRelease = new Promise<void>((resolve) => { releaseActive = resolve; });
  const activeEntered = new Promise<void>((resolve) => { signalActive = resolve; });
  const switchAdapter = {
    guardTargets: async (input: any) => {
      await run!.verifyContainer(); await run!.verifyOwnership(input.oldTarget); await run!.verifyOwnership(input.newTarget);
    },
    verifyTarget: async (name: string, gymId: string) => {
      const target = name === restoredA.name ? restoredA : fixture!.tenantDatabases[0];
      const client = new TenantClient({ adapter: new PrismaPg({ connectionString: target.url, max: 1 }) });
      try {
        const installed = await verifyInstalledTenant(client);
        const binding = await client.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
        if (binding.masterGymId !== gymId || installed.manifestDigest !== tenantManifestDigest()) throw new Error('Recovery target verification failed');
      } finally { await client.$disconnect(); }
    },
    compareAndSet,
    drainTarget: async (name: string) => {
      transitionEvents.push(`drain:${name}`);
      signalDrain();
      await pools.suspendAndDrain(name);
    },
    invalidateTarget: async (name: string) => { transitionEvents.push(`invalidate:${name}`); },
  };
  let current = await masterClient.gym.findUniqueOrThrow({ where: { id: alpha.id } });
  const heldLease = pools.withDatabase(tenantAName, async (client) => {
    await client.$queryRaw`SELECT 1`;
    signalActive();
    await activeRelease;
    return true;
  });
  await activeEntered;
  const switching = switchTenantRegistry({ scope: 'DISPOSABLE_DEVELOPMENT', operationId: `recovery_${run.runId}`, gymId: alpha.id, expectedVersion: current.version, oldTarget: tenantAName, newTarget: restoredA.name }, switchAdapter);
  await drainStarted;
  const suspended = await masterClient.gym.findUniqueOrThrow({ where: { id: alpha.id } });
  expect(suspended.status).toBe('SUSPENDED');
  await expect(pools.withDatabase(tenantAName, async () => 'must-not-run')).rejects.toMatchObject({ status: 503 });
  expect(pools.capacity().activeLeases).toBe(1);
  releaseActive();
  expect(await heldLease).toBe(true);
  const activated = await switching;
  expect(activated.version).toBe(current.version + 3);
  current = await masterClient.gym.findUniqueOrThrow({ where: { id: alpha.id } });
  expect(current).toMatchObject({ databaseName: restoredA.name, status: 'ACTIVE', version: activated.version });
  expect(transitionEvents).toEqual([`drain:${tenantAName}`, `invalidate:${tenantAName}`]);
  await expect(switchTenantRegistry({ scope: 'DISPOSABLE_DEVELOPMENT', operationId: `stale_${run.runId}`, gymId: alpha.id, expectedVersion: staleVersion, oldTarget: tenantAName, newTarget: restoredA.name }, switchAdapter)).rejects.toThrow('Stale recovery registry version');

  const apiRead = await pools.withDatabase(restoredA.name, async (client) => ({ count: await client.member.count(), binding: await client.gymConfiguration.findUnique({ where: { id: 'current' } }) }));
  expect(apiRead.count).toBe(aBefore.counts.Member);
  expect(apiRead.binding?.masterGymId).toBe(alpha.id);
  const rtoMs = performance.now() - recoveryStarted;
  expect(rtoMs).toBeLessThan(60 * 60 * 1000);
  currentTargets[0] = { ...currentTargets[0], databaseName: restoredA.name };
  if (!stagedMasterSnapshot) throw new Error('Staged Master evidence was not captured');
  const switchedReconciliation = reconcileMasterReferences(stagedMasterSnapshot, {
    identities: await masterClient.user.findMany({ select: { id: true, authVersion: true } }),
    tenants: currentTargets,
    accesses: await masterClient.gymAccess.findMany({ select: { userId: true, gymId: true, role: true, tenantActorId: true, linkStatus: true, enrollmentOperationId: true } }),
    operations: (await masterClient.operation.findMany({ select: { id: true, state: true } })).map((x) => ({ ...x, receiptId: null })),
    actorEvidence: [],
  });
  expect(switchedReconciliation.automaticActivationAllowed).toBe(false);
  expect(switchedReconciliation.proposals).toContainEqual({ gymId: alpha.id, fromTarget: tenantAName, toTarget: restoredA.name });
  const bAfterSwitch = await evidenceForRun(run, tenantBName);
  expect(bAfterSwitch).toMatchObject({ dataDigest: bBefore.dataDigest, counts: bBefore.counts });

  current = await masterClient.gym.findUniqueOrThrow({ where: { id: alpha.id } });
  const rollback = await switchTenantRegistry({ scope: 'DISPOSABLE_DEVELOPMENT', operationId: `rollback_${run.runId}`, gymId: alpha.id, expectedVersion: current.version, oldTarget: restoredA.name, newTarget: tenantAName }, switchAdapter);
  expect(rollback.version).toBe(current.version + 3);
  current = await masterClient.gym.findUniqueOrThrow({ where: { id: alpha.id } });
  expect(current).toMatchObject({ databaseName: tenantAName, status: 'ACTIVE', version: rollback.version });
  currentTargets[0] = { ...currentTargets[0], databaseName: tenantAName };
  const bAfterRollback = await evidenceForRun(run, tenantBName);
  expect(bAfterRollback).toMatchObject({ dataDigest: bBefore.dataDigest, counts: bBefore.counts });

  // Reject a checksum-corrupted archive before the restore adapter is entered.
  const manifest = JSON.parse(await readFile(tenantBackup.manifestPath, 'utf8'));
  const artifactPath = join(backupDirectory, `${manifest.artifactId}.gbackup`);
  const damaged = await readFile(artifactPath);
  damaged[damaged.length - 1] ^= 0xff;
  await writeFile(artifactPath, damaged);
  let restoreInvocations = 0;
  await expect(withVerifiedArchive({ manifestPath: tenantBackup.manifestPath, keyFile, tempRoot: plaintextRoot, expected: { sourceRunId: run.runId, kind: 'TENANT', gymId: alpha.id, manifestDigest: tenantBackup.metadata.manifestDigest } }, async () => { restoreInvocations++; })).rejects.toThrow('Backup verification failed before restore');
  expect(restoreInvocations).toBe(0);
  const elapsedMs = performance.now() - started;
  console.info('[task009-drill]', JSON.stringify({ master: 'authenticated-restored-unselected', tenantA: 'restored-verified-switched-rolled-back', tenantB: 'unchanged', masterRows: Object.values(masterBackup.metadata.counts).reduce<number>((sum, count) => sum + count, 0), countsA: aBefore.counts.Member, countsB: bBefore.counts.Member, backupAgeMs, rtoMs, elapsedMs, masterReconciliation: reconciliationState, switchedMasterReconciliation: switchedReconciliation.state, automaticMasterActivationAllowed: false }));
});
