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
import { PlatformRegistryService } from '../../src/platform/platform-registry.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run:Awaited<ReturnType<typeof createDisposablePostgresRun>>;let master:PrismaClient;let app:INestApplication;let base:string;let actor:string;let bearer:string;let other:string;let tenants:TenantDatabaseService;let registry:PlatformRegistryService;
let gymA:{id:string;slug:string};let gymB:{id:string;slug:string};let pending:{id:string;slug:string};
const secret=randomBytes(32).toString('hex');
const token=async(id:string,authVersion=0,sessionId?:string)=>new SignJWT({authVersion,...(sessionId?{sid:sessionId}:{})}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
async function call(path:string,method='GET',body?:unknown,context?:string,identity=bearer){return fetch(`${base}${path}`,{method,headers:{authorization:`Bearer ${identity}`,'content-type':'application/json',...(context?{'x-gymos-support-context':context}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
const entry=(gymId:string)=>({gymId,scope:'GYM_SUMMARY_READ',reasonCode:'DIAGNOSE_ACCESS',explanation:'Synthetic support acceptance check'});
const enter=async(gymId:string)=>{const response=await call('/admin/support-sessions','POST',entry(gymId));expect(response.status).toBe(201);return response.json();};
const summary=(session:{id:string},slug:string)=>`/admin/support-sessions/${session.id}/gyms/${slug}/summary`;
beforeAll(async()=>{
 run=await createDisposablePostgresRun();await run.migrate(run.masterName,'master');vi.stubEnv('JWT_SECRET',secret);vi.stubEnv('PROVISION_DATABASE_URL',run.masterUrl);vi.stubEnv('TENANT_DATABASE_URL',run.masterUrl);
 master=new PrismaClient({adapter:new PrismaPg({connectionString:run.masterUrl,max:4})});const database={master} as DatabaseService;
 actor=(await master.user.create({data:{email:'support-admin@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id;bearer=await token(actor);
 other=await token((await master.user.create({data:{email:'support-other@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id);
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DatabaseService).useValue(database).compile();app=module.createNestApplication();await app.listen(0,'127.0.0.1');base=await app.getUrl();
 tenants=app.get(TenantDatabaseService);registry=app.get(PlatformRegistryService);const reservations=app.get(ProvisioningReservationService);
 const gyms=[];
 for(const slug of ['support-a','support-b']){
  const reserved=await reservations.reserve(actor,0,randomUUID(),{name:`Synthetic ${slug}`,slug,ownerEmail:`${slug}@example.test`,currency:'USD',timezone:'UTC'});
  expect((await new ProvisioningWorker(database,app.get(GymProvisioningService),tenants).runOnce(reserved.operationId)).state).toBe('COMPLETE');
  const operation=await master.operation.findUniqueOrThrow({where:{id:reserved.operationId}});await run.registerProvisionedDatabase(operation);gyms.push(reserved.gym);
 }
 [gymA,gymB]=gyms;
 const reserved=await reservations.reserve(actor,0,randomUUID(),{name:'Pending support',slug:'support-pending',ownerEmail:'pending@example.test',currency:'LKR',timezone:'Asia/Colombo'});pending=reserved.gym;
 const gym=await master.gym.findUniqueOrThrow({where:{id:gymA.id}});
 await tenants.withDatabase(gym.databaseName,async tenant=>{await tenant.member.createMany({data:[{fullName:'Synthetic one'},{fullName:'Synthetic two'}]});await tenant.trainer.create({data:{fullName:'Synthetic trainer'}});});
});
afterAll(async()=>{await app?.close();await master?.$disconnect();if(run)console.info('[support-owned-cleanup]',JSON.stringify(await run.cleanup()));vi.unstubAllEnvs();});
it('returns actual bounded read-model counts and pagination without opening tenants during registry reads',async()=>{
 await registry.refreshOne(gymA.id,actor);
 const spy=vi.spyOn(tenants,'withAdministrativeRead');const response=await call('/admin/gyms');expect(response.status).toBe(200);const page=await response.json();
 expect(spy).not.toHaveBeenCalled();spy.mockRestore();
 const row=page.items.find((item:{id:string})=>item.id===gymA.id);expect(row.memberCount).toBe(2);expect(row.trainerCount).toBe(1);expect(row.observedAt).not.toBeNull();
 const unavailable=vi.spyOn(tenants,'withAdministrativeRead').mockRejectedValueOnce(new Error('Synthetic dependency unavailable'));
 await registry.refreshOne(gymA.id,actor);unavailable.mockRestore();
 const stale=(await registry.page(actor)).items.find(item=>item.id===gymA.id)!;
 expect(stale.health).toBe('UNAVAILABLE');expect(stale.memberCount).toBeNull();expect(stale.trainerCount).toBeNull();expect(stale.observedAt).toBeNull();
 expect(page.items.find((item:{id:string})=>item.id===gymB.id).memberCount).toBeNull();
 const raw=JSON.stringify(page);expect(/databaseName|password|ownerEmail|explanation|tokenHash/.test(raw)).toBe(false);
 for(let index=0;index<26;index++)await master.gym.create({data:{slug:`page-${index}`,name:'Synthetic registry page',databaseName:`gymos_${randomUUID().replaceAll('-','')}`}});
 const first=await(await call('/admin/gyms')).json();expect(first.items).toHaveLength(25);expect(first.nextCursor).not.toBeNull();
 const second=await(await call(`/admin/gyms?cursor=${first.nextCursor}`)).json();expect(second.items).toHaveLength(4);
 expect(new Set([...first.items,...second.items].map(row=>row.id)).size).toBe(29);
});
it('requires explicit scope/reason and denies forged, foreign, wrong-gym and all operational mutation paths',async()=>{
 const ordinary=await master.user.create({data:{email:'support-ordinary@example.test',passwordHash:'not-a-login-hash'}});
 expect((await call('/admin/support-sessions','POST',entry(gymA.id),undefined,await token(ordinary.id))).status).toBe(403);
 for(const body of [{...entry(gymA.id),explanation:'short'},{...entry(gymA.id),scope:'OWNER'},{...entry(gymA.id),databaseName:'injected'}])expect((await call('/admin/support-sessions','POST',body)).status).toBe(422);
 const session=await enter(gymA.id);const stored=await master.supportSession.findUniqueOrThrow({where:{id:session.id}});expect(stored.tokenHash===createHash('sha256').update(session.context).digest('hex')).toBe(true);expect(stored.tokenHash===session.context).toBe(false);
 expect((await call(summary(session,gymA.slug),'GET',undefined,randomBytes(32).toString('base64url'))).status).toBe(404);
 expect((await call(summary(session,gymA.slug),'GET',undefined,session.context,other)).status).toBe(404);
 expect((await call(summary(session,gymB.slug),'GET',undefined,session.context)).status).toBe(404);
 const response=await call(summary(session,gymA.slug),'GET',undefined,session.context);expect(response.status).toBe(200);const text=await response.text();const value=JSON.parse(text);expect(value.tenant.memberCount).toBe(2);
 expect(/password|token|proof|credential|database|healthNotes|fullName|email|explanation|AuditLog/.test(text)).toBe(false);
 const gym=await master.gym.findUniqueOrThrow({where:{id:gymA.id}});const before=await tenants.withDatabase(gym.databaseName,tenant=>tenant.member.count());
 expect((await call(`/gyms/${gymA.slug}/members`,'POST',{fullName:'Forbidden write'},session.context)).status).toBe(403);
 expect((await call(`/gyms/${gymA.slug}/theme`,'PATCH',{primaryColor:'#123456'},session.context)).status).toBe(403);
 expect((await call('/admin/gyms','POST',{},session.context)).status).toBe(403);
 expect((await call('/auth/change-password','POST',{},session.context)).status).toBe(403);
 expect((await call(`/gyms/${gymA.slug}/theme`,'GET',undefined,session.context)).status).toBe(403);
 expect(await tenants.withDatabase(gym.databaseName,tenant=>tenant.member.count())).toBe(before);
 await expect(tenants.withAdministrativeRead(gym.databaseName,tx=>tx.member.create({data:{fullName:'Read-only violation'}}))).rejects.toThrow();
 const audit=await master.supportEvent.findFirstOrThrow({where:{supportSessionId:session.id,outcome:'ALLOWED'}});expect(audit.originalActorIdentityId).toBe(actor);expect(audit.gymId).toBe(gymA.id);expect(audit.reasonReference).toBe(session.id);
});
it('discards a pending tenant summary when its support context exits',async()=>{
 const session=await enter(gymA.id);let started!:()=>void;let release!:()=>void;
 const began=new Promise<void>(resolve=>{started=resolve;});const held=new Promise<void>(resolve=>{release=resolve;});
 const original=tenants.withAdministrativeRead.bind(tenants);
 const spy=vi.spyOn(tenants,'withAdministrativeRead').mockImplementationOnce(async(name,work)=>{started();await held;return original(name,work);});
 const pendingRead=call(summary(session,gymA.slug),'GET',undefined,session.context);await began;
 expect((await call(`/admin/support-sessions/${session.id}`,'DELETE',undefined,session.context)).status).toBe(200);
 release();expect((await pendingRead).status).toBe(403);spy.mockRestore();
 expect(await master.supportEvent.count({where:{supportSessionId:session.id,outcome:'DENIED_AFTER_READ'}})).toBe(1);
});
it('supports suspended read-only summaries, keeps partial gyms Master-only and invalidates old contexts on switch and exit',async()=>{
 const first=await enter(gymA.id);const second=await enter(gymB.id);
 expect((await call(summary(first,gymA.slug),'GET',undefined,first.context)).status).toBe(403);
 const gym=await master.gym.update({where:{id:gymB.id},data:{status:'SUSPENDED',version:{increment:1}}});await tenants.suspendAndDrain(gym.databaseName);
 expect((await call(summary(second,gymB.slug),'GET',undefined,second.context)).status).toBe(200);
 await expect(tenants.withDatabase(gym.databaseName,async()=>true)).rejects.toThrow();
 const partial=await enter(pending.id);const spy=vi.spyOn(tenants,'withAdministrativeRead');const response=await call(summary(partial,pending.slug),'GET',undefined,partial.context);expect(response.status).toBe(200);expect((await response.json()).tenant).toBeNull();expect(spy).not.toHaveBeenCalled();spy.mockRestore();
 expect((await call(`/admin/support-sessions/${partial.id}`,'DELETE',undefined,partial.context)).status).toBe(200);
 expect((await call(summary(partial,pending.slug),'GET',undefined,partial.context)).status).toBe(403);
 const broken=await enter(gymA.id);const alpha=await master.gym.findUniqueOrThrow({where:{id:gymA.id}});
 const prior=await tenants.withDatabase(alpha.databaseName,tenant=>tenant.schemaState.findUniqueOrThrow({where:{id:'current'}}));
 await tenants.withDatabase(alpha.databaseName,tenant=>tenant.schemaState.update({where:{id:'current'},data:{lastOperationId:randomUUID(),version:{increment:1}}}));
 expect((await call(summary(broken,gymA.slug),'GET',undefined,broken.context)).status).toBe(403);
 expect((await master.supportSession.findUniqueOrThrow({where:{id:broken.id}})).revocationReason).toBe('BINDING_UNAVAILABLE');
 await tenants.withDatabase(alpha.databaseName,tenant=>tenant.schemaState.update({where:{id:'current'},data:{lastOperationId:prior.lastOperationId,version:{increment:1}}}));
});
it('expires at the exact boundary, rejects changed security versions and revokes support on logout',async()=>{
 const context=randomBytes(32).toString('base64url');const issuedAt=new Date(Date.now()-900_001);
 const expired=await master.supportSession.create({data:{...entry(gymA.id),actorIdentityId:actor,authVersion:0,tokenHash:createHash('sha256').update(context).digest('hex'),issuedAt,expiresAt:new Date(issuedAt.getTime()+900_000)}});
 expect((await call(summary(expired,gymA.slug),'GET',undefined,context)).status).toBe(403);expect(await master.supportEvent.count({where:{supportSessionId:expired.id,outcome:'EXPIRED'}})).toBe(1);
 const changed=await enter(gymA.id);await master.user.update({where:{id:actor},data:{authVersion:{increment:1}}});bearer=await token(actor,1);
 expect((await call(summary(changed,gymA.slug),'GET',undefined,changed.context)).status).toBe(403);
 expect((await master.supportSession.findUniqueOrThrow({where:{id:changed.id}})).revocationReason).toBe('SECURITY_REVOKED');
 const now=Date.now();const login=await master.identitySession.create({data:{identityId:actor,authVersion:1,deviceClass:'SHARED',deviceLabel:'Support integration test',
  refreshTokenHash:createHash('sha256').update(randomBytes(32)).digest('hex'),idleExpiresAt:new Date(now+600_000),absoluteExpiresAt:new Date(now+900_000)}});
 bearer=await token(actor,1,login.id);
 const current=await enter(gymA.id);expect((await call('/auth/logout','POST',{scope:'ALL'})).status).toBe(201);
 expect((await master.supportSession.findUniqueOrThrow({where:{id:current.id}})).revocationReason).toBe('LOGOUT_REVOKED');
 expect((await call(summary(current,gymA.slug),'GET',undefined,current.context)).status).toBe(401);
});
