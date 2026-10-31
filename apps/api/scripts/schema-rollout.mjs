import { assertOwnedLocalRun } from './owned-local-run.mjs';
let database, physical, tenants;
try {
  await assertOwnedLocalRun();
  const [command, ...args] = process.argv.slice(2);
  if (command === 'deploy-master' && args.length === 0) {
    const { deployMasterSchema } =
      await import('../dist/tenancy/master-schema-deploy.js');
    console.log(
      JSON.stringify(await deployMasterSchema(process.env.MASTER_DATABASE_URL)),
    );
  } else {
    const [
      { DatabaseService },
      { GymProvisioningService },
      { TenantDatabaseService },
      { SchemaRolloutService },
    ] = await Promise.all([
      import('../dist/database.service.js'),
      import('../dist/gym-provisioning.service.js'),
      import('../dist/tenant-database.service.js'),
      import('../dist/platform/schema-rollout.service.js'),
    ]);
    database = new DatabaseService();
    physical = new GymProvisioningService(database);
    tenants = new TenantDatabaseService();
    const service = new SchemaRolloutService(database, physical, tenants);
    let result;
    if (command === 'reserve' && args.length >= 6) {
      const [actor, key, targetVersion, targetDigest, batchSize, ...gymIds] =
        args;
      result = await service.reserve(actor, {
        idempotencyKey: key,
        targetVersion,
        targetDigest,
        batchSize: Number(batchSize),
        gymIds,
      });
    } else if (command === 'run' && args.length === 2)
      result = await service.runNext(args[0], args[1]);
    else if (command === 'status' && args.length === 2)
      result = await service.status(args[0], args[1]);
    else if (command === 'approve-canary' && args.length === 4)
      result = await service.approveCanary(
        args[0],
        args[1],
        Number(args[2]),
        args[3],
      );
    else if (command === 'review-target' && args.length === 4)
      result = await service.reviewTarget(
        args[0],
        args[1],
        Number(args[2]),
        args[3],
      );
    else throw new Error('Unsupported controlled schema command');
    console.log(JSON.stringify(result));
    if (result.state === 'STOPPED_REPAIR') process.exitCode = 1;
  }
} catch {
  console.error(
    'Controlled schema work stopped. Inspect safe rollout status and installed evidence; no migration history was automatically resolved.',
  );
  process.exitCode = 1;
} finally {
  await tenants?.onModuleDestroy();
  await physical?.onApplicationShutdown();
  await database?.onApplicationShutdown();
}
