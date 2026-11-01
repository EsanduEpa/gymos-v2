import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/master/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { GymProvisioningService } from '../../src/gym-provisioning.service.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { OperationFoundationService } from '../../src/operations/operation.service.js';
import { OperationConflictError } from '../../src/operations/primitives.js';
import { TenantSchemaVerifier } from '../../src/tenancy/tenant-schema-verifier.js';
import {
  TENANT_TEMPLATE_MANIFEST,
  TENANT_TEMPLATE_V1,
  tenantManifestDigest,
} from '../../src/tenancy/tenant-template-manifest.js';
import {
  MASTER_TEMPLATE_MANIFEST,
  masterManifestDigest,
} from '../../src/tenancy/master-template-manifest.js';
import { deployMasterSchema } from '../../src/tenancy/master-schema-deploy.js';
import { verifyPinnedSources } from '../../src/tenancy/pinned-deploy.js';
import { SchemaRolloutService } from '../../src/platform/schema-rollout.service.js';
import { GymLifecycleService } from '../../src/platform/gym-lifecycle.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';
let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let master: PrismaClient;
let database: DatabaseService;
let physical: GymProvisioningService;
let tenants: TenantDatabaseService;
let actor: string;
const service = (fault?: (point: string, id: string) => Promise<void>) =>
  new SchemaRolloutService(database, physical, tenants, fault);
const input = (gymIds: string[], idempotencyKey = randomUUID()) => ({
  gymIds,
  idempotencyKey,
  targetVersion: TENANT_TEMPLATE_MANIFEST.version,
  targetDigest: tenantManifestDigest(),
  batchSize: 1,
});
async function legacy(slug: string) {
  const foundation = new OperationFoundationService(master);
  const ownerId = randomUUID();
  const themeId = randomUUID();
  const claimed = await foundation.claim({
    actorIdentityId: actor,
    kind: 'PROVISION_GYM',
    requestedSlug: slug,
    idempotencyKey: randomUUID(),
    intent: { fixture: 'OWNED_LEGACY_V1', slug },
    intendedTenantTemplateVersion: TENANT_TEMPLATE_V1.version,
    intendedTenantManifestDigest: tenantManifestDigest(TENANT_TEMPLATE_V1),
    prepare: async (tx, operation) => {
      const gym = await tx.gym.create({
        data: {
          slug,
          name: 'Synthetic legacy gym',
          databaseName: operation.databaseName!,
          status: 'PROVISIONING',
        },
      });
      await tx.operation.update({
        where: { id: operation.id },
        data: { gymId: gym.id, version: { increment: 1 } },
      });
    },
  });
  const operation = claimed.operation;
  let lease = await foundation.acquireLease(operation.id, operation.version);
  const checkpoint = async (
    step: Parameters<typeof foundation.checkpoint>[1],
  ) => {
    lease = (await foundation.checkpoint(lease, step)).lease;
  };
  await checkpoint({
    step: 'GYM_RESERVED',
    evidence: {
      gymId: operation.gymId!,
      databaseName: operation.databaseName!,
    },
  });
  await physical.withReservedTarget(operation, async (target) => {
    await target.ensureDatabase();
    await checkpoint({
      step: 'DATABASE_CREATED',
      evidence: { databaseName: operation.databaseName! },
    });
    await target.deploy(TENANT_TEMPLATE_V1);
    const evidence = await tenants.withMaintenanceDatabase(
      operation.databaseName!,
      (tenant) =>
        new TenantSchemaVerifier(tenant).verifyAndAttest(
          { masterGymId: operation.gymId!, operationId: operation.id },
          TENANT_TEMPLATE_V1,
        ),
    );
    await checkpoint({
      step: 'TENANT_TEMPLATE_VERIFIED',
      evidence: {
        appliedTenantTemplateVersion: evidence.templateVersion,
        appliedTenantManifestDigest: evidence.manifestDigest,
      },
    });
    await checkpoint({
      step: 'TENANT_BOUND',
      evidence: { gymId: operation.gymId! },
      localEffects: async (tx) => {
        await tx.gym.update({
          where: { id: operation.gymId! },
          data: {
            expectedTenantSchemaVersion: evidence.templateVersion,
            expectedTenantManifestDigest: evidence.manifestDigest,
            expectedTenantOperationId: operation.id,
            version: { increment: 1 },
          },
        });
      },
    });
    await checkpoint({
      step: 'MASTER_ACTIVATED',
      evidence: {
        gymId: operation.gymId!,
        subjectIdentityId: ownerId,
        ownerThemeId: themeId,
      },
      finalResult: {
        operationId: operation.id,
        state: 'COMPLETE',
        resourceIds: [operation.gymId!],
        publicationState: 'ACTIVE',
      },
      localEffects: async (tx) => {
        await tx.user.create({
          data: {
            id: ownerId,
            email: `${slug}@example.test`,
            passwordHash: 'not-a-login-hash',
          },
        });
        await tx.gymAccess.create({
          data: {
            userId: ownerId,
            gymId: operation.gymId!,
            role: 'OWNER',
            linkStatus: 'ACTIVE',
            enrollmentOperationId: operation.id,
          },
        });
        await tx.theme.create({
          data: { id: themeId, gymId: operation.gymId! },
        });
        await tx.gym.update({
          where: { id: operation.gymId! },
          data: { status: 'ACTIVE', version: { increment: 1 } },
        });
      },
    });
  });
  await run.registerProvisionedDatabase(operation);
  await tenants.withDatabase(operation.databaseName!, (tenant) =>
    tenant.member.create({
      data: { fullName: 'Retained synthetic legacy member' },
    }),
  );
  return master.gym.findUniqueOrThrow({ where: { id: operation.gymId! } });
}
async function countThroughGate(gymId: string) {
  const gym = await master.gym.findUniqueOrThrow({
    where: { id: gymId },
    include: { expectedTenantOperation: true },
  });
  return new TenantSchemaGateService(tenants).withVerifiedTenant(
    {
      gymId: gym.id,
      databaseName: gym.databaseName,
      expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
      expectedTenantManifestDigest: gym.expectedTenantManifestDigest,
      expectedTenantOperationId: gym.expectedTenantOperationId,
      expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null,
      observedTenantSchemaVersion:
        gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
      observedTenantManifestDigest:
        gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null,
    },
    (tenant) => tenant.member.count(),
  );
}
async function migrationCount(name: string) {
  const client = await run.connect(name);
  try {
    return (
      await client.query(
        'SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
      )
    ).rows[0].count;
  } finally {
    await client.end();
  }
}
beforeAll(async () => {
  run = await createDisposablePostgresRun();
  await run.migrate(run.masterName, 'master');
  vi.stubEnv('PROVISION_DATABASE_URL', run.masterUrl);
  vi.stubEnv('TENANT_DATABASE_URL', run.masterUrl);
  master = new PrismaClient({
    adapter: new PrismaPg({ connectionString: run.masterUrl, max: 4 }),
  });
  database = { master } as DatabaseService;
  physical = new GymProvisioningService(database);
  tenants = new TenantDatabaseService();
  actor = (
    await master.user.create({
      data: {
        email: 'rollout-admin@example.test',
        passwordHash: 'not-a-login-hash',
        globalRole: 'SUPER_ADMIN',
      },
    })
  ).id;
});
afterAll(async () => {
  await tenants?.onModuleDestroy();
  await physical?.onApplicationShutdown();
  await master?.$disconnect();
  if (run)
    console.info(
      '[rollout-owned-cleanup]',
      JSON.stringify(await run.cleanup()),
    );
  vi.unstubAllEnvs();
});
it('deploys/verifies the immutable Master chain only through the owned runner and refuses missing ownership', async () => {
  const execute = promisify(execFile);
  const script = fileURLToPath(
    new URL('../../scripts/schema-rollout.mjs', import.meta.url),
  );
  const env = {
    ...process.env,
    GYMOS_OWNED_RUN_ID: run.runId,
    MASTER_DATABASE_URL: run.masterUrl,
    PROVISION_DATABASE_URL: run.masterUrl,
    TENANT_DATABASE_URL: run.masterUrl,
  };
  for (let index = 0; index < 2; index++) {
    const result = await execute(process.execPath, [script, 'deploy-master'], {
      env,
      timeout: 30_000,
    });
    expect(JSON.parse(result.stdout).verified).toBe(true);
  }
  expect(
    (
      await master.masterSchemaState.findUniqueOrThrow({
        where: { id: 'current' },
      })
    ).manifestDigest === masterManifestDigest(),
  ).toBe(true);
  expect(await master.masterSchemaDeployment.count()).toBe(1);
  expect(await migrationCount(run.masterName)).toBe(
    MASTER_TEMPLATE_MANIFEST.migrations.length,
  );
  const refused = await execute(process.execPath, [script, 'deploy-master'], {
    env: { ...env, GYMOS_OWNED_RUN_ID: '' },
  }).catch((error) => ({
    code: error.code,
    stdout: error.stdout,
    stderr: error.stderr,
  }));
  expect(refused).toMatchObject({ code: 1, stdout: '' });
  expect(refused.stderr.includes(run.masterUrl)).toBe(false);
  const fresh = await run.createOwnedDatabase();
  expect((await deployMasterSchema(fresh.url)).verified).toBe(true);
  expect(await migrationCount(fresh.name)).toBe(
    MASTER_TEMPLATE_MANIFEST.migrations.length,
  );
  const client = await run.connect(fresh.name);
  try {
    await client.query(
      'INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,applied_steps_count) VALUES ($1,$2,$3,clock_timestamp(),0)',
      [randomUUID(), 'c'.repeat(64), '20261031000001_synthetic_master_failure'],
    );
  } finally {
    await client.end();
  }
  await expect(deployMasterSchema(fresh.url)).rejects.toThrow(
    'prefix needs evidence review',
  );
});
it('keeps supported mixed versions available, stops after the canary, and advances only an explicitly reviewed bounded batch', async () => {
  const a = await legacy('canary-a');
  const b = await legacy('canary-b');
  const beforeUsers = await master.user.count();
  const body = input([a.id, b.id]);
  const reserved = await service().reserve(actor, body);
  expect((await service().reserve(actor, body)).rolloutId).toBe(
    reserved.rolloutId,
  );
  await expect(
    service().reserve(actor, { ...body, batchSize: 2 }),
  ).rejects.toThrow('conflicts');
  expect(await countThroughGate(a.id)).toBe(1);
  expect(await countThroughGate(b.id)).toBe(1);
  const canary = await service().runNext(actor, reserved.rolloutId);
  expect(canary.state).toBe('CANARY_READY');
  expect(await migrationCount(a.databaseName)).toBe(5);
  expect(await migrationCount(b.databaseName)).toBe(4);
  expect(await countThroughGate(a.id)).toBe(1);
  expect(await countThroughGate(b.id)).toBe(1);
  expect((await service().runNext(actor, reserved.rolloutId)).state).toBe(
    'CANARY_READY',
  );
  expect(await migrationCount(b.databaseName)).toBe(4);
  await expect(
    service().approveCanary(
      actor,
      reserved.rolloutId,
      canary.version - 1,
      'Synthetic reviewed canary',
    ),
  ).rejects.toThrow('stale');
  // An old COMPLETE checkpoint cannot substitute for fresh canary health.
  await tenants.withDatabase(a.databaseName, (tenant) =>
    tenant.schemaState.update({
      where: { id: 'current' },
      data: {
        appliedTemplateVersion: 'unreviewed-marker',
        version: { increment: 1 },
      },
    }),
  );
  await expect(
    service().approveCanary(
      actor,
      reserved.rolloutId,
      canary.version,
      'Synthetic inconsistent canary version',
    ),
  ).rejects.toThrow('marker');
  await tenants.withDatabase(a.databaseName, (tenant) =>
    tenant.schemaState.delete({ where: { id: 'current' } }),
  );
  await expect(
    service().approveCanary(
      actor,
      reserved.rolloutId,
      canary.version,
      'Synthetic canary with missing marker',
    ),
  ).rejects.toThrow('marker');
  expect(await migrationCount(b.databaseName)).toBe(4);
  const repair = await service().reserve(actor, input([a.id]));
  const stopped = await service().runNext(actor, repair.rolloutId);
  await service().reviewTarget(
    actor,
    stopped.targets[0].operationId,
    stopped.targets[0].version,
    'Synthetic actual v2 canary marker review',
  );
  expect((await service().runNext(actor, repair.rolloutId)).state).toBe(
    'COMPLETE',
  );
  await service().approveCanary(
    actor,
    reserved.rolloutId,
    canary.version,
    'Synthetic reviewed canary',
  );
  const complete = await service().runNext(actor, reserved.rolloutId);
  expect(complete.state).toBe('COMPLETE');
  expect(await migrationCount(b.databaseName)).toBe(5);
  expect(await countThroughGate(b.id)).toBe(1);
  expect(await master.user.count()).toBe(beforeUsers);
  expect(
    /databaseName|ownershipOperation|reason|requestDigest|password|token|email/.test(
      JSON.stringify(complete),
    ),
  ).toBe(false);
});
it('requires evidence review after every interrupted schema boundary and never duplicates installed migrations', async () => {
  for (const [index, point] of [
    'AFTER_SCHEMA_BLOCK',
    'AFTER_SCHEMA_APPLY',
    'AFTER_SCHEMA_ATTESTATION',
    'AFTER_SCHEMA_BOUND',
  ].entries()) {
    const gym = await legacy(`schema-fault-${index}`);
    const reserved = await service().reserve(actor, input([gym.id]));
    let fired = false;
    const failed = await service(async (current) => {
      if (current === point && !fired) {
        fired = true;
        throw new Error('Synthetic schema interruption');
      }
    }).runNext(actor, reserved.rolloutId);
    expect(failed.state).toBe('STOPPED_REPAIR');
    expect(failed.targets[0].state).toBe('REPAIR_REQUIRED');
    await expect(countThroughGate(gym.id)).rejects.toThrow(
      'temporarily unavailable',
    );
    expect((await service().runNext(actor, reserved.rolloutId)).state).toBe(
      'STOPPED_REPAIR',
    );
    await service().reviewTarget(
      actor,
      failed.targets[0].operationId,
      failed.targets[0].version,
      'Synthetic inspected history and binding',
    );
    const repaired = await service().runNext(actor, reserved.rolloutId);
    expect(repaired.state).toBe('COMPLETE');
    expect(await migrationCount(gym.databaseName)).toBe(5);
    expect(await countThroughGate(gym.id)).toBe(1);
    expect(
      await master.schemaRepairReview.count({
        where: { operationId: failed.targets[0].operationId },
      }),
    ).toBe(1);
  }
}, 120_000);
it('reconciles a lost parent checkpoint and explicitly repairs a lost SchemaState observation from actual history', async () => {
  const gym = await legacy('lost-parent');
  const reserved = await service().reserve(actor, input([gym.id]));
  let fired = false;
  await expect(
    service(async (point) => {
      if (point === 'AFTER_TARGET_COMMIT' && !fired) {
        fired = true;
        throw new Error('Synthetic lost parent response');
      }
    }).runNext(actor, reserved.rolloutId),
  ).rejects.toThrow('lost parent');
  expect((await service().runNext(actor, reserved.rolloutId)).state).toBe(
    'COMPLETE',
  );
  expect(await migrationCount(gym.databaseName)).toBe(5);
  const missing = await legacy('lost-marker');
  await tenants.withDatabase(missing.databaseName, (tenant) =>
    tenant.schemaState.delete({ where: { id: 'current' } }),
  );
  await expect(countThroughGate(missing.id)).rejects.toThrow(
    'temporarily unavailable',
  );
  const rollout = await service().reserve(actor, input([missing.id]));
  const failed = await service().runNext(actor, rollout.rolloutId);
  expect(failed.state).toBe('STOPPED_REPAIR');
  await service().reviewTarget(
    actor,
    failed.targets[0].operationId,
    failed.targets[0].version,
    'Synthetic full catalog and binding review',
  );
  expect((await service().runNext(actor, rollout.rolloutId)).state).toBe(
    'COMPLETE',
  );
  expect(await countThroughGate(missing.id)).toBe(1);
});
it('leaves unresolved migration history gated, stops the canary, and never changes a healthy tenant or auto-resolves history', async () => {
  const failed = await legacy('unresolved-history');
  const healthy = await legacy('healthy-unaffected');
  const client = await run.connect(failed.databaseName);
  try {
    await client.query(
      'INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,applied_steps_count,logs) VALUES ($1,$2,$3,clock_timestamp(),0,$4)',
      [
        randomUUID(),
        'b'.repeat(64),
        '20261031000000_synthetic_failure',
        'Synthetic owned fixture failure',
      ],
    );
  } finally {
    await client.end();
  }
  const reserved = await service().reserve(
    actor,
    input([failed.id, healthy.id]),
  );
  const result = await service().runNext(actor, reserved.rolloutId);
  expect(result.state).toBe('STOPPED_REPAIR');
  await expect(countThroughGate(failed.id)).rejects.toThrow(
    'temporarily unavailable',
  );
  expect(await countThroughGate(healthy.id)).toBe(1);
  expect(await migrationCount(healthy.databaseName)).toBe(4);
  await expect(
    service().reviewTarget(
      actor,
      result.targets[0].operationId,
      result.targets[0].version,
      'Synthetic attempt to review failed history',
    ),
  ).rejects.toThrow('isolated restore');
  const check = await run.connect(failed.databaseName);
  try {
    const row = (
      await check.query(
        'SELECT finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1',
        ['20261031000000_synthetic_failure'],
      )
    ).rows[0];
    expect(row.finished_at === null && row.rolled_back_at === null).toBe(true);
  } finally {
    await check.end();
  }
  await expect(
    verifyPinnedSources('tenant', [
      { ...TENANT_TEMPLATE_MANIFEST.migrations[0], checksum: 'f'.repeat(64) },
    ]),
  ).rejects.toThrow('checksum mismatch');
  await expect(
    service().reserve(actor, {
      ...input([healthy.id]),
      targetDigest: 'f'.repeat(64),
    }),
  ).rejects.toThrow('manifest unavailable');
  expect(await migrationCount(healthy.databaseName)).toBe(4);
});
it('rolls a suspended tenant forward without granting operational admission', async () => {
  const gym = await legacy('suspended-rollout');
  await new GymLifecycleService(database, tenants).execute(
    actor,
    0,
    randomUUID(),
    gym.id,
    {
      target: 'SUSPENDED',
      expectedVersion: gym.version,
      reason: 'Synthetic controlled suspended repair',
    },
  );
  const reserved = await service().reserve(actor, input([gym.id]));
  expect((await service().runNext(actor, reserved.rolloutId)).state).toBe(
    'COMPLETE',
  );
  expect(
    (await master.gym.findUniqueOrThrow({ where: { id: gym.id } })).status,
  ).toBe('SUSPENDED');
  await expect(
    tenants.withDatabase(gym.databaseName, async () => true),
  ).rejects.toThrow();
  expect(
    await tenants.withAdministrativeRead(gym.databaseName, (tx) =>
      tx.member.count(),
    ),
  ).toBe(1);
});
it('fences a lost migration lease and requires review of its actual installed result before resuming', async () => {
  const gym = await legacy('expired-schema-lease');
  const reserved = await service().reserve(actor, input([gym.id]));
  let fired = false;
  await expect(
    service(async (point, id) => {
      if (point === 'AFTER_SCHEMA_APPLY' && !fired) {
        fired = true;
        await master.operation.update({
          where: { id },
          data: { leaseExpiresAt: new Date(0), version: { increment: 1 } },
        });
      }
    }).runNext(actor, reserved.rolloutId),
  ).rejects.toThrow('lease');
  await expect(countThroughGate(gym.id)).rejects.toThrow(
    'temporarily unavailable',
  );
  const stopped = await service().runNext(actor, reserved.rolloutId);
  expect(stopped.state).toBe('STOPPED_REPAIR');
  await service().reviewTarget(
    actor,
    stopped.targets[0].operationId,
    stopped.targets[0].version,
    'Synthetic expired-lease installation review',
  );
  expect((await service().runNext(actor, reserved.rolloutId)).state).toBe(
    'COMPLETE',
  );
  expect(await migrationCount(gym.databaseName)).toBe(5);
  expect(await countThroughGate(gym.id)).toBe(1);
});
it('serializes concurrent rollout workers and rejects non-platform reservation without additional effects', async () => {
  const gym = await legacy('concurrent-schema');
  const reserved = await service().reserve(actor, input([gym.id]));
  const results = await Promise.allSettled([
    service().runNext(actor, reserved.rolloutId),
    service().runNext(actor, reserved.rolloutId),
  ]);
  expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
  expect(
    results.every(
      (result) =>
        result.status === 'fulfilled' ||
        result.reason instanceof OperationConflictError,
    ),
  ).toBe(true);
  expect((await service().status(actor, reserved.rolloutId)).state).toBe(
    'COMPLETE',
  );
  expect(await migrationCount(gym.databaseName)).toBe(5);
  expect(
    await master.schemaRolloutTarget.count({
      where: { rolloutId: reserved.rolloutId },
    }),
  ).toBe(1);
  const ordinary = await master.user.create({
    data: {
      email: 'rollout-ordinary@example.test',
      passwordHash: 'not-a-login-hash',
    },
  });
  const before = await master.schemaRollout.count();
  await expect(service().reserve(ordinary.id, input([gym.id]))).rejects.toThrow(
    'actor unavailable',
  );
  expect(await master.schemaRollout.count()).toBe(before);
});

it('uses the controlled CLI for reserve, canary approval and bounded batch execution', async () => {
  const a = await legacy('cli-schema-a');
  const b = await legacy('cli-schema-b');
  const execute = promisify(execFile);
  const script = fileURLToPath(
    new URL('../../scripts/schema-rollout.mjs', import.meta.url),
  );
  const env = {
    ...process.env,
    GYMOS_OWNED_RUN_ID: run.runId,
    MASTER_DATABASE_URL: run.masterUrl,
    PROVISION_DATABASE_URL: run.masterUrl,
    TENANT_DATABASE_URL: run.masterUrl,
  };
  const command = async (args: string[]) =>
    JSON.parse(
      (
        await execute(process.execPath, [script, ...args], {
          env,
          timeout: 30_000,
        })
      ).stdout,
    );
  const reserved = await command([
    'reserve',
    actor,
    randomUUID(),
    TENANT_TEMPLATE_MANIFEST.version,
    tenantManifestDigest(),
    '1',
    a.id,
    b.id,
  ]);
  const canary = await command(['run', actor, reserved.rolloutId]);
  expect(canary.state).toBe('CANARY_READY');
  expect(await migrationCount(b.databaseName)).toBe(4);
  await command([
    'approve-canary',
    actor,
    reserved.rolloutId,
    String(canary.version),
    'Synthetic CLI canary review',
  ]);
  expect((await command(['run', actor, reserved.rolloutId])).state).toBe(
    'COMPLETE',
  );
  expect(await migrationCount(b.databaseName)).toBe(5);
  expect(await countThroughGate(a.id)).toBe(1);
  expect(await countThroughGate(b.id)).toBe(1);
});
