import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { SignJWT } from 'jose';
import { PrismaClient } from '../../src/generated/master/client.js';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import { GymProvisioningService } from '../../src/gym-provisioning.service.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { ProvisioningWorker } from '../../src/platform/provisioning-worker.js';
import { ProvisioningReservationService } from '../../src/platform/provisioning-reservation.service.js';
import { GymLifecycleService } from '../../src/platform/gym-lifecycle.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run:Awaited<ReturnType<typeof createDisposablePostgresRun>>;let master:PrismaClient;let app:INestApplication;let base:string;let actor:string;let admin:string;let other:string;let ownerA:string;let ownerB:string;let tenants:TenantDatabaseService;let lifecycle:GymLifecycleService;let gymA:{id:string;slug:string;databaseName:string};let gymB:typeof gymA;
const secret=randomBytes(32).toString('hex');
let releaseInFlight=()=>{};
const token=async(id:string)=>new SignJWT({authVersion:0}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
async function ownerToken(identityId:string,gymId:string){
 const account=await master.gymAccount.upsert({where:{userId_gymId:{userId:identityId,gymId}},
  create:{userId:identityId,gymId,username:`lifecycle-${identityId}-${gymId}`,passwordHash:'fixture-not-a-login-hash',status:'ACTIVE'},
  update:{status:'ACTIVE',mustChangePassword:false,credentialExpiresAt:null}});
 const now=Date.now();const session=await master.identitySession.create({data:{identityId,gymAccountId:account.id,authVersion:account.authVersion,
  deviceClass:'SHARED',deviceLabel:'Lifecycle integration test',refreshTokenHash:createHash('sha256').update(randomBytes(32)).digest('hex'),
  idleExpiresAt:new Date(now+600_000),absoluteExpiresAt:new Date(now+900_000)}});
 return new SignJWT({authVersion:account.authVersion,sid:session.id,gaid:account.id}).setProtectedHeader({alg:'HS256'}).setSubject(identityId)
  .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
const call=(path:string,identity=admin,body?:unknown,key=randomUUID(),method=body===undefined?'GET':'POST')=>fetch(`${base}${path}`,{method,headers:{authorization:`Bearer ${identity}`,'content-type':'application/json','idempotency-key':key},...(body===undefined?{}:{body:JSON.stringify(body)})});
const intent=async(target:'ACTIVE'|'SUSPENDED')=>({target,expectedVersion:(await master.gym.findUniqueOrThrow({where:{id:gymA.id}})).version,reason:'Synthetic lifecycle acceptance check'});
async function waitBlocked(){for(let index=0;index<100;index++){if((await master.gym.findUniqueOrThrow({where:{id:gymA.id}})).status==='SUSPENDED')return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Suspension was not recorded');}
beforeAll(async()=>{
 run=await createDisposablePostgresRun();await run.migrate(run.masterName,'master');vi.stubEnv('JWT_SECRET',secret);vi.stubEnv('PROVISION_DATABASE_URL',run.masterUrl);vi.stubEnv('TENANT_DATABASE_URL',run.masterUrl);
 master=new PrismaClient({adapter:new PrismaPg({connectionString:run.masterUrl,max:4})});const database={master} as DatabaseService;
 actor=(await master.user.create({data:{email:'lifecycle-admin@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id;admin=await token(actor);other=await token((await master.user.create({data:{email:'lifecycle-other@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id);
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DatabaseService).useValue(database).compile();app=module.createNestApplication();await app.listen(0,'127.0.0.1');base=await app.getUrl();tenants=app.get(TenantDatabaseService);lifecycle=app.get(GymLifecycleService);
 const gyms=[];const owners=[];
 for(const slug of ['lifecycle-a','lifecycle-b']){
  const reserved=await app.get(ProvisioningReservationService).reserve(actor,0,randomUUID(),{name:`Synthetic ${slug}`,slug,ownerEmail:`${slug}@example.test`,currency:'USD',timezone:'UTC'});
  expect((await new ProvisioningWorker(database,app.get(GymProvisioningService),tenants).runOnce(reserved.operationId)).state).toBe('COMPLETE');
  const operation=await master.operation.findUniqueOrThrow({where:{id:reserved.operationId}});await run.registerProvisionedDatabase(operation);gyms.push(await master.gym.findUniqueOrThrow({where:{id:reserved.gym.id}}));owners.push(operation.subjectIdentityId!);
 }
 [gymA,gymB]=gyms;[ownerA,ownerB]=await Promise.all([ownerToken(owners[0],gymA.id),ownerToken(owners[1],gymB.id)]);
 await tenants.withDatabase(gymA.databaseName,tenant=>tenant.member.create({data:{fullName:'Synthetic retained member'}}));
});
afterAll(async()=>{releaseInFlight();await app?.close();await master?.$disconnect();if(run)console.info('[lifecycle-owned-cleanup]',JSON.stringify(await run.cleanup()));vi.unstubAllEnvs();});
it('blocks old tokens/cached pools before draining in-flight leases, replays once, and keeps Gym B unchanged',async()=>{
 const beforeB=await master.gym.findUniqueOrThrow({where:{id:gymB.id}});let started!:()=>void;let release!:()=>void;const began=new Promise<void>(resolve=>{started=resolve;});const held=new Promise<void>(resolve=>{release=resolve;});
 releaseInFlight=release;
 const requestInFlight=tenants.withDatabase(gymA.databaseName,async tenant=>{started();await held;return tenant.member.count();});await began;
 const body=await intent('SUSPENDED');const key=randomUUID();let completed=false;
 const transition=call(`/admin/gyms/${gymA.id}/lifecycle`,admin,body,key).then(response=>{completed=true;return response;});await waitBlocked();
 expect(completed).toBe(false);
 for(const path of ['access','members'])expect((await call(`/gyms/${gymA.slug}/${path}`,ownerA)).status).toBe(403);
 expect((await call(`/gyms/${gymA.slug}/members`,ownerA,{fullName:'Forbidden member'})).status).toBe(403);
 expect((await call(`/gyms/${gymA.slug}/theme`,ownerA,{primaryColor:'#123456'},randomUUID(),'PATCH')).status).toBe(403);
 expect((await call(`/gyms/${gymB.slug}/members`,ownerB)).status).toBe(200);
 release();expect(await requestInFlight).toBe(1);const response=await transition;expect(response.status).toBe(200);const result=await response.json();
 expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,body,key)).status).toBe(200);
 expect(await master.gymLifecycleIntent.count()).toBe(1);await expect(tenants.withDatabase(gymA.databaseName,async()=>true)).rejects.toThrow();
 expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,{...body,reason:'Different synthetic reason'},key)).status).toBe(409);
 expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,body)).status).toBe(409);
 expect((await call(`/admin/lifecycle/${result.operationId}`,other)).status).toBe(404);
 expect((await call(`/admin/lifecycle/${result.operationId}/resume`,other,{})).status).toBe(404);
 const audit=await master.platformAuditLog.findFirstOrThrow({where:{eventCode:'GYM_SUSPENDED',gymId:gymA.id}});expect(audit.actorIdentityId).toBe(actor);
 expect((await master.gymLifecycleIntent.findUniqueOrThrow({where:{operationId:result.operationId}})).reason).toBe(body.reason);
 const afterB=await master.gym.findUniqueOrThrow({where:{id:gymB.id}});expect(afterB.version).toBe(beforeB.version);expect(afterB.status).toBe(beforeB.status);expect(afterB.databaseName===beforeB.databaseName).toBe(true);
});
it('rejects stale versions/wrong roles and keeps reactivation blocked on a bad marker until the original operation is resumed',async()=>{
 const body=await intent('ACTIVE');expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,ownerA,body)).status).toBe(403);
 expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,{...body,expectedVersion:body.expectedVersion-1})).status).toBe(409);
 expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,{...body,databaseName:'injected'})).status).toBe(422);
 const prior=await tenants.withMaintenanceDatabase(gymA.databaseName,tenant=>tenant.schemaState.findUniqueOrThrow({where:{id:'current'}}));
 await tenants.withMaintenanceDatabase(gymA.databaseName,tenant=>tenant.schemaState.update({where:{id:'current'},data:{lastOperationId:randomUUID(),version:{increment:1}}}));
 const response=await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,body);expect(response.status).toBe(503);const failed=await response.json();
 expect((await master.gym.findUniqueOrThrow({where:{id:gymA.id}})).status).toBe('SUSPENDED');expect((await call(`/gyms/${gymA.slug}/access`,ownerA)).status).toBe(403);
 await tenants.withMaintenanceDatabase(gymA.databaseName,tenant=>tenant.schemaState.update({where:{id:'current'},data:{lastOperationId:prior.lastOperationId,version:{increment:1}}}));
 const resumed=await call(`/admin/lifecycle/${failed.operationId}/resume`,admin,{});expect(resumed.status).toBe(200);expect((await resumed.json()).state).toBe('COMPLETE');
 expect((await call(`/gyms/${gymA.slug}/members`,ownerA)).status).toBe(200);
 expect(await tenants.withDatabase(gymA.databaseName,tenant=>tenant.member.count())).toBe(1);
 expect((await master.gym.findUniqueOrThrow({where:{id:gymB.id}})).status).toBe('ACTIVE');
});
it('recovers drain failure and every lifecycle response/checkpoint boundary without repeating the status transition',async()=>{
 const broken=vi.spyOn(tenants,'suspendAndDrain').mockRejectedValueOnce(new Error('Synthetic drain failure'));
 const failure=await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,await intent('SUSPENDED'));expect(failure.status).toBe(503);broken.mockRestore();
 const id=(await failure.json()).operationId;expect((await call(`/admin/lifecycle/${id}/resume`,admin,{})).status).toBe(200);
 expect((await call(`/admin/gyms/${gymA.id}/lifecycle`,admin,await intent('ACTIVE'))).status).toBe(200);
 for(const [point,target] of [['AFTER_ADMISSION_BLOCKED','SUSPENDED'],['AFTER_POOL_DRAIN','ACTIVE'],['AFTER_REACTIVATION_HEALTH','ACTIVE'],['AFTER_LIFECYCLE_COMMIT','SUSPENDED']] as const){
  const current=await master.gym.findUniqueOrThrow({where:{id:gymA.id}});
  if(current.status===target)await lifecycle.execute(actor,0,randomUUID(),gymA.id,await intent(target==='ACTIVE'?'SUSPENDED':'ACTIVE'));
  const body=await intent(target);const key=randomUUID();let fired=false;
  const pending=lifecycle.execute(actor,0,key,gymA.id,body,async name=>{if(name===point&&!fired){fired=true;throw new Error('Synthetic lifecycle interruption');}});
  if(point==='AFTER_LIFECYCLE_COMMIT')expect((await pending).state).toBe('COMPLETE');else await expect(pending).rejects.toThrow('Lifecycle operation');
  const operation=await master.operation.findFirstOrThrow({where:{actorIdentityId:actor,kind:'CHANGE_ACCESS',idempotencyKey:key}});
  const resumed=await lifecycle.resume(actor,0,operation.id);expect(resumed.state).toBe('COMPLETE');expect(resumed.appliedGymVersion).toBe(body.expectedVersion+1);
  expect((await master.gym.findUniqueOrThrow({where:{id:gymA.id}})).version).toBe(body.expectedVersion+1);
  expect(await master.platformAuditLog.count({where:{gymId:gymA.id,eventCode:target==='ACTIVE'?'GYM_REACTIVATED':'GYM_SUSPENDED',transition:{path:['version'],equals:body.expectedVersion+1}}})).toBe(1);
 }
 expect(await tenants.withMaintenanceDatabase(gymA.databaseName,tenant=>tenant.member.count())).toBe(1);
 expect((await call(`/gyms/${gymB.slug}/access`,ownerB)).status).toBe(200);
},90_000);
it('fences an expired worker lease and requires active owner access before reactivation',async()=>{
 const activate=await intent('ACTIVE');const key=randomUUID();let lost=false;
 await expect(lifecycle.execute(actor,0,key,gymA.id,activate,async point=>{
  if(point==='AFTER_POOL_DRAIN'&&!lost){lost=true;const operation=await master.operation.findFirstOrThrow({where:{idempotencyKey:key,kind:'CHANGE_ACCESS'}});await master.operation.update({where:{id:operation.id},data:{leaseExpiresAt:new Date(0),version:{increment:1}}});}
 })).rejects.toThrow('lifecycle changed');
 const expired=await master.operation.findFirstOrThrow({where:{idempotencyKey:key,kind:'CHANGE_ACCESS'}});
 const owner=await master.gymAccess.findFirstOrThrow({where:{gymId:gymA.id,role:'OWNER'}});
 await master.gymAccess.update({where:{userId_gymId:{userId:owner.userId,gymId:gymA.id}},data:{linkStatus:'REVOKED',version:{increment:1}}});
 await expect(lifecycle.resume(actor,0,expired.id)).rejects.toThrow('Lifecycle operation');
 expect((await master.gym.findUniqueOrThrow({where:{id:gymA.id}})).status).toBe('SUSPENDED');
 await master.gymAccess.update({where:{userId_gymId:{userId:owner.userId,gymId:gymA.id}},data:{linkStatus:'ACTIVE',version:{increment:1}}});
 expect((await lifecycle.resume(actor,0,expired.id)).state).toBe('COMPLETE');
 expect((await master.gym.findUniqueOrThrow({where:{id:gymA.id}})).version).toBe(activate.expectedVersion+1);
 expect((await call(`/gyms/${gymA.slug}/access`,ownerA)).status).toBe(200);
 expect((await call(`/gyms/${gymB.slug}/access`,ownerB)).status).toBe(200);
});
