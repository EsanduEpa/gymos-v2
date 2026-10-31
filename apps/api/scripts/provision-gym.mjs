// Controlled local runner. Provider/environment approval remains task 087.
// No dotenv loading, direct CREATE DATABASE, or independent activation path.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';

const execute = promisify(execFile);
async function assertOwnedLocalRun() {
  const runId = process.env.GYMOS_OWNED_RUN_ID;
  if (!/^[a-f0-9]{16}$/.test(runId ?? '')) throw new Error('Owned disposable run is required');
  const urls = ['MASTER_DATABASE_URL', 'PROVISION_DATABASE_URL', 'TENANT_DATABASE_URL'].map(key => new URL(process.env[key] ?? ''));
  if (urls.some(url => url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || !url.port || url.search || url.hash || url.pathname !== `/gymos_test_${runId}_master` || url.origin !== urls[0].origin)) throw new Error('Refusing nonlocal or mismatched worker configuration');
  const context = await execute('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { timeout: 3000 });
  if (!context.stdout.trim().startsWith('unix://')) throw new Error('Local Docker is required');
  const inspected = JSON.parse((await execute('docker', ['inspect', `gymos-mig-test-${runId}`], { timeout: 3000 })).stdout)[0];
  const binding = inspected.NetworkSettings.Ports?.['5432/tcp']?.[0];
  if (inspected.Config.Labels?.['gymos.test.run'] !== runId || inspected.Config.Image !== 'postgres:17' || binding?.HostIp !== '127.0.0.1' || binding.HostPort !== urls[0].port) throw new Error('Disposable container ownership conflicts');
  const client = new pg.Client({ connectionString: urls[0].toString(), connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    const rows = (await client.query('SELECT run_id, marker FROM "__gymos_test"."Ownership"')).rows;
    if (rows.length !== 1 || rows[0].run_id !== runId || !/^[a-f0-9]{64}$/.test(rows[0].marker)) throw new Error('Master ownership conflicts');
  } finally { await client.end(); }
}
let database, physical, tenants;
try {
  await assertOwnedLocalRun();
  const [{ DatabaseService }, { GymProvisioningService }, { TenantDatabaseService }, { ProvisioningWorker }, { ProvisioningReservationService }, { provisioningInputSchema }] = await Promise.all([
    import('../dist/database.service.js'), import('../dist/gym-provisioning.service.js'), import('../dist/tenant-database.service.js'),
    import('../dist/platform/provisioning-worker.js'), import('../dist/platform/provisioning-reservation.service.js'), import('@gymos/contracts/platform'),
  ]);
  database = new DatabaseService(); physical = new GymProvisioningService(database); tenants = new TenantDatabaseService();
  const [command, ...args] = process.argv.slice(2);
  if (command === 'refresh-summary' && args.length === 2) {
    const { PlatformRegistryService } = await import('../dist/platform/platform-registry.service.js');
    await new PlatformRegistryService(database, tenants).refreshOne(args[0], args[1]);
    console.log(JSON.stringify({ summary: 'OBSERVED' }));
  } else {
  let operationId;
  if (command === 'reserve' && args.length === 7) {
    const [actorIdentityId, key, name, slug, ownerEmail, currency, timezone] = args;
    const actor = await database.master.user.findUniqueOrThrow({ where: { id: actorIdentityId }, select: { authVersion: true } });
    const reserved = await new ProvisioningReservationService(database).reserve(actorIdentityId, actor.authVersion, key, provisioningInputSchema.parse({ name, slug, ownerEmail, currency, timezone }));
    operationId = reserved.operationId;
  } else if (command === 'resume' && args.length === 1) { operationId = args[0]; }
  else throw new Error('Usage: provision-gym.mjs reserve ACTOR KEY NAME SLUG OWNER_EMAIL CURRENCY TIMEZONE | resume OPERATION_ID');
  const result = await new ProvisioningWorker(database, physical, tenants).runOnce(operationId);
  console.log(JSON.stringify(result));
  if (result.state === 'REPAIR_REQUIRED' || result.state === 'FAILED_RETRYABLE') process.exitCode = 1;
  }
} catch {
  // Dependency errors can contain connection strings or migration output.
  console.error('Controlled provisioning did not complete. Inspect the sanitized durable operation status and owned-run configuration.');
  process.exitCode = 1;
} finally {
  await tenants?.onModuleDestroy(); await physical?.onApplicationShutdown(); await database?.onApplicationShutdown();
}
