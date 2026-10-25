import { ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../src/database.service.js';
import { GymProvisioningService } from '../../src/gym-provisioning.service.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let previousUrl: string | undefined;
let previousMasterUrl: string | undefined;
let previousProvisionUrl: string | undefined;
const names: string[] = [];

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeAll(async () => {
  run = await createDisposablePostgresRun();
  previousUrl = process.env.TENANT_DATABASE_URL;
  previousMasterUrl = process.env.MASTER_DATABASE_URL;
  previousProvisionUrl = process.env.PROVISION_DATABASE_URL;
  process.env.TENANT_DATABASE_URL = run.masterUrl;
  process.env.MASTER_DATABASE_URL = run.masterUrl;
  process.env.PROVISION_DATABASE_URL = run.masterUrl;
  for (let index = 0; index < 9; index++) names.push((await run.createOwnedDatabase()).name);
}, 120_000);

afterAll(async () => {
  if (previousUrl === undefined) delete process.env.TENANT_DATABASE_URL;
  else process.env.TENANT_DATABASE_URL = previousUrl;
  if (previousMasterUrl === undefined) delete process.env.MASTER_DATABASE_URL;
  else process.env.MASTER_DATABASE_URL = previousMasterUrl;
  if (previousProvisionUrl === undefined) delete process.env.PROVISION_DATABASE_URL;
  else process.env.PROVISION_DATABASE_URL = previousProvisionUrl;
  if (run) console.info('[task006-owned-run-cleanup]', JSON.stringify(await run.cleanup()));
}, 120_000);

it('admits eight active tenant clients and rejects the ninth without overflow', async () => {
  const service = new TenantDatabaseService();
  const hold = deferred();
  try {
    const active = names.slice(0, 8).map((name) => service.withDatabase(name, async (tenant) => {
      await tenant.$queryRaw`SELECT 1`;
      await hold.promise;
      return name;
    }));
    await vi.waitFor(() => expect(service.capacity()).toMatchObject({ resident: 8, activeLeases: 8 }), { timeout: 10_000 });
    const ninth = service.withDatabase(names[8], async () => 'unexpected');
    await expect(ninth).rejects.toMatchObject({
      response: { statusCode: 503, message: 'Tenant database is temporarily unavailable', retryable: true },
    });
    expect(service.capacity().resident).toBe(8);
    const observer = await run.connect(run.masterName);
    try {
      const result = await observer.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM pg_stat_activity WHERE application_name='gymos-api-tenant'",
      );
      const observedConnections = Number(result.rows[0].count);
      console.info('[task006-tenant-connections]', observedConnections);
      expect(observedConnections).toBeLessThanOrEqual(16);
      expect(observedConnections).toBeGreaterThan(0);
    } finally { await observer.end(); }
    hold.resolve();
    await Promise.all(active);
  } finally {
    hold.resolve();
    await service.onModuleDestroy();
  }
});

it('enforces actual Master four, tenant two and provisioning one pool capacities', async () => {
  const database = new DatabaseService();
  const tenantService = new TenantDatabaseService();
  const provisioning = new GymProvisioningService(database);
  try {
    const masterPool = (database as unknown as { pool: { options: { max: number }; totalCount: number } }).pool;
    const provisioningPool = (provisioning as unknown as { provisioningPool: () => { options: { max: number } } }).provisioningPool();
    expect(masterPool.options.max).toBe(4);
    expect(provisioningPool.options.max).toBe(1);
    const masterWork = Promise.all(Array.from({ length: 8 }, () => database.master.$queryRaw`SELECT 1::int AS value FROM pg_sleep(0.3)`));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(masterPool.totalCount).toBeLessThanOrEqual(4);
    expect(masterPool.totalCount).toBeGreaterThan(0);
    await masterWork;

    await tenantService.withDatabase(names[0], async (tenant) => {
      const work = Promise.all(Array.from({ length: 4 }, () => tenant.$queryRaw`SELECT 1::int AS value FROM pg_sleep(0.3)`));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(tenantService.capacity().connections).toBeLessThanOrEqual(2);
      expect(tenantService.capacity().connections).toBeGreaterThan(0);
      await work;
    });
  } finally {
    await tenantService.onModuleDestroy();
    await provisioning.onApplicationShutdown();
    await database.onApplicationShutdown();
  }
});

it('converts the five-second PostgreSQL statement timeout to a sanitized retryable 503', async () => {
  const service = new TenantDatabaseService();
  const started = Date.now();
  try {
    const error = await service.withDatabase(names[0], async (tenant) => {
      await tenant.$queryRaw`SELECT pg_sleep(6)`;
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error).toMatchObject({
      response: { statusCode: 503, message: 'Tenant database is temporarily unavailable', retryable: true },
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(4_500);
    expect(JSON.stringify(error)).not.toContain(names[0]);
  } finally { await service.onModuleDestroy(); }
});

it('does not close active work during shutdown and closes it after release', async () => {
  const service = new TenantDatabaseService();
  const hold = deferred();
  const active = service.withDatabase(names[0], async (tenant) => {
    await tenant.$queryRaw`SELECT 1`;
    await hold.promise;
    return 'completed';
  });
  await vi.waitFor(() => expect(service.capacity().activeLeases).toBe(1));
  const drain = service.onModuleDestroy();
  let drained = false;
  void drain.then(() => { drained = true; });
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(drained).toBe(false);
  await expect(service.withDatabase(names[1], async () => 'unexpected')).rejects.toBeInstanceOf(ServiceUnavailableException);
  hold.resolve();
  await expect(active).resolves.toBe('completed');
  await drain;
  expect(service.capacity()).toMatchObject({ resident: 0, activeLeases: 0, draining: true });
});

it('evicts a real idle tenant client after sixty seconds', async () => {
  const service = new TenantDatabaseService();
  await service.withDatabase(names[0], async (tenant) => tenant.$queryRaw`SELECT 1`);
  expect(service.capacity().resident).toBe(1);
  await vi.waitFor(() => expect(service.capacity().resident).toBe(0), { timeout: 65_000, interval: 500 });
  await service.onModuleDestroy();
});
