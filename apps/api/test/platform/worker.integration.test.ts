import { ProvisioningRunner } from '../../src/platform/provisioning-runner.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/master/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { GymProvisioningService } from '../../src/gym-provisioning.service.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { ProvisioningWorker } from '../../src/platform/provisioning-worker.js';
import { ProvisioningReservationService } from '../../src/platform/provisioning-reservation.service.js';
import { TENANT_TEMPLATE_MANIFEST } from '../../src/tenancy/tenant-template-manifest.js';
import { OperationFoundationService } from '../../src/operations/operation.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run:Awaited<ReturnType<typeof createDisposablePostgresRun>>;let master:PrismaClient;let database:DatabaseService;
let physical:GymProvisioningService;let tenants:TenantDatabaseService;let actor:string;let reservations:ProvisioningReservationService;
beforeAll(async()=>{
 run=await createDisposablePostgresRun();await run.migrate(run.masterName,'master');
 vi.stubEnv('PROVISION_DATABASE_URL',run.masterUrl);vi.stubEnv('TENANT_DATABASE_URL',run.masterUrl);
 master=new PrismaClient({adapter:new PrismaPg({connectionString:run.masterUrl,max:4})});database={master} as DatabaseService;
 actor=(await master.user.create({data:{email:'worker@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id;
 physical=new GymProvisioningService(database);tenants=new TenantDatabaseService();reservations=new ProvisioningReservationService(database);
});
afterAll(async()=>{await tenants?.onModuleDestroy();await physical?.onApplicationShutdown();await master?.$disconnect();if(run)console.info('[worker-owned-cleanup]',JSON.stringify(await run.cleanup()));vi.unstubAllEnvs();});
const reserve=(slug:string)=>reservations.reserve(actor,0,randomUUID(),{name:'Synthetic worker gym',slug,ownerEmail:`${slug}@example.test`,currency:'USD',timezone:'America/New_York'});
const worker=(fault?:(point:string)=>Promise<void>)=>new ProvisioningWorker(database,physical,tenants,fault);
async function recordOwned(id:string){const operation=await master.operation.findUniqueOrThrow({where:{id}});await run.registerProvisionedDatabase(operation);return operation;}
it('recovers every external success/checkpoint boundary using the original physical target',async()=>{
 const before=await master.user.count();
 for(const [index,point] of ['AFTER_RESERVATION','AFTER_DATABASE_CREATE','AFTER_MIGRATION','AFTER_TENANT_VERIFICATION','AFTER_TENANT_BOUND'].entries()){
  const reserved=await reserve(`fault-${index}`);let fired=false;
  const failed=await worker(async current=>{if(current===point && !fired){fired=true;throw new Error('Synthetic interruption');}}).runOnce(reserved.operationId);
  expect(failed.state).toBe('FAILED_RETRYABLE');expect(failed.gym.status).toBe('PROVISIONING');
  const original=await recordOwned(reserved.operationId);
  const recovered=await worker().runOnce(reserved.operationId);expect(recovered.state).toBe('COMPLETE');
  const final=await recordOwned(reserved.operationId);expect(final.databaseName===original.databaseName).toBe(true);
  const tenant=await run.connect(final.databaseName!);
  try {
   expect((await tenant.query('SELECT count(*)::int AS count FROM "GymConfiguration"')).rows[0].count).toBe(1);
   expect((await tenant.query('SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].count).toBe(TENANT_TEMPLATE_MANIFEST.migrations.length);
   expect((await tenant.query('SELECT "masterGymId" FROM "GymConfiguration"')).rows[0].masterGymId).toBe(final.gymId);
  } finally {await tenant.end();}
  expect((await worker().runOnce(reserved.operationId)).operationId).toBe(reserved.operationId);
  expect(await master.gymAccess.count({where:{gymId:final.gymId!,role:'OWNER',linkStatus:'ACTIVE'}})).toBe(1);
 }
 expect(await master.user.count()).toBe(before+5);
},120_000);
it('rejects an unknown existing database instead of adopting or deleting it',async()=>{
 const reserved=await reserve('orphan');const operation=await master.operation.findUniqueOrThrow({where:{id:reserved.operationId}});
 const admin=await run.connect(run.masterName);try{await admin.query(`CREATE DATABASE "${operation.databaseName}"`);}finally{await admin.end();}
 const result=await worker().runOnce(operation.id);expect(result.state).toBe('REPAIR_REQUIRED');
 const check=await run.connect(run.masterName);try{expect((await check.query('SELECT count(*)::int AS count FROM pg_database WHERE datname=$1',[operation.databaseName])).rows[0].count).toBe(1);}finally{await check.end();}
 await expect(run.registerProvisionedDatabase(operation)).rejects.toThrow('ambiguous');
});
it('fences a worker that loses its lease after database creation and resumes safely',async()=>{
 const reserved=await reserve('lost-lease');let fired=false;
 await expect(worker(async point=>{if(point==='AFTER_DATABASE_CREATE'&&!fired){fired=true;await master.operation.update({where:{id:reserved.operationId},data:{leaseExpiresAt:new Date(0),version:{increment:1}}});}}).runOnce(reserved.operationId)).rejects.toThrow('lease');
 await recordOwned(reserved.operationId);
 expect((await worker().runOnce(reserved.operationId)).state).toBe('COMPLETE');
});
it('concurrent workers produce one lease owner and one bound target',async()=>{
 const reserved=await reserve('concurrent-worker');
 const results=await Promise.allSettled([worker().runOnce(reserved.operationId),worker().runOnce(reserved.operationId)]);
 expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
 await recordOwned(reserved.operationId);
});
it('marks an unavailable pinned artifact for repair before creating a target',async()=>{
 const foundation=new OperationFoundationService(master);
 const claim=await foundation.claim({actorIdentityId:actor,kind:'PROVISION_GYM',requestedSlug:'wrong-pin',idempotencyKey:randomUUID(),intent:{name:'Wrong pin'},intendedTenantTemplateVersion:'unknown',intendedTenantManifestDigest:'a'.repeat(64),prepare:async(tx,operation)=>{
  const gym=await tx.gym.create({data:{name:'Wrong pin',slug:'wrong-pin',databaseName:operation.databaseName!,status:'PROVISIONING'}});
  await tx.provisioningIntent.create({data:{operationId:operation.id,name:'Wrong pin',ownerEmail:'wrong-pin@example.test',plannedOwnerIdentityId:randomUUID(),reuseIdentity:false,actorAuthVersion:0,currency:'USD',timezone:'UTC'}});
  await tx.operation.update({where:{id:operation.id},data:{gymId:gym.id,version:{increment:1}}});
 }});
 expect((await worker().runOnce(claim.operation.id)).state).toBe('REPAIR_REQUIRED');
 const client=await run.connect(run.masterName);try{expect((await client.query('SELECT count(*)::int AS count FROM pg_database WHERE datname=$1',[claim.operation.databaseName])).rows[0].count).toBe(0);}finally{await client.end();}
});
it('uses the same reservation/worker through the controlled CLI and refuses an unowned environment',async()=>{
 const execute=promisify(execFile); const script=fileURLToPath(new URL('../../scripts/provision-gym.mjs',import.meta.url));
 const env={...process.env,MASTER_DATABASE_URL:run.masterUrl,PROVISION_DATABASE_URL:run.masterUrl,TENANT_DATABASE_URL:run.masterUrl,GYMOS_OWNED_RUN_ID:run.runId};
 const args=['reserve',actor,randomUUID(),'CLI gym','cli-gym','cli@example.test','LKR','Asia/Colombo'];
 const first=await execute(process.execPath,[script,...args],{env,timeout:30_000});
 const result=JSON.parse(first.stdout);expect(result.state).toBe('COMPLETE');
 await recordOwned(result.operationId);
 const replay=await execute(process.execPath,[script,...args],{env,timeout:30_000});
 expect(JSON.parse(replay.stdout).operationId).toBe(result.operationId);
 const refused=await execute(process.execPath,[script,'resume',result.operationId],{env:{...env,GYMOS_OWNED_RUN_ID:''}}).catch(error=>({stdout:error.stdout,stderr:error.stderr,code:error.code}));
 expect(refused).toMatchObject({code:1,stdout:''});
 expect(refused.stderr).not.toContain(run.masterUrl);
 expect(await master.gym.count({where:{slug:'cli-gym'}})).toBe(1);
},60_000);
it('provisions with a dedicated CREATEDB/CREATEROLE login without superuser privileges',async()=>{
 const role=`gymos_provisioner_${run.runId}`;const password=randomBytes(32).toString('hex');
 const admin=await run.connect(run.masterName);
 try{await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' CREATEDB CREATEROLE NOSUPERUSER NOREPLICATION`);}finally{await admin.end();}
 const url=new URL(run.masterUrl);url.username=role;url.password=password;
 vi.stubEnv('PROVISION_DATABASE_URL',url.toString());const restricted=new GymProvisioningService(database);
 try{
  const reserved=await reserve('least-privilege');
  expect((await new ProvisioningWorker(database,restricted,tenants).runOnce(reserved.operationId)).state).toBe('COMPLETE');await recordOwned(reserved.operationId);
 }finally{await restricted.onApplicationShutdown();vi.stubEnv('PROVISION_DATABASE_URL',run.masterUrl);}
});

it('discovers a pending reservation and finishes it through the supervised runner', async () => {
 const reserved = await reserve('runner-discovery');
 const runner = new ProvisioningRunner(database, physical, tenants);
 try {
  await runner.tick();
  const completed = await reservations.status(actor, reserved.operationId);
  expect(completed.state).toBe('COMPLETE');
  await recordOwned(reserved.operationId);
 } finally { await runner.onModuleDestroy(); }
});
