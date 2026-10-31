// Controlled local runner. Provider/environment approval remains task 087.
// No dotenv loading, direct CREATE DATABASE, or independent activation path.

import { assertOwnedLocalRun } from './owned-local-run.mjs';

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
