import { identityToken } from '../support/identity-token.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { SignJWT } from 'jose';
import argon2 from 'argon2';
import { PrismaClient } from '../../src/generated/master/client.js';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import { GymProvisioningService } from '../../src/gym-provisioning.service.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { ProvisioningWorker } from '../../src/platform/provisioning-worker.js';
import { ProvisioningReservationService } from '../../src/platform/provisioning-reservation.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;let master:PrismaClient;let app:INestApplication;let base:string;
let database:DatabaseService;let physical:GymProvisioningService;let tenants:TenantDatabaseService;let actor:string;let admin:string;let other:string;
let reservations:ProvisioningReservationService;
const secret=randomBytes(32).toString('hex');
const password=randomBytes(24).toString('base64url');
async function token(id:string,authVersion=0){return identityToken(master, secret, id, authVersion);}
async function scopedToken(identityId:string,gymId:string){
 const account=await master.gymAccount.findUniqueOrThrow({where:{userId_gymId:{userId:identityId,gymId}}});
 const now=Date.now();const session=await master.identitySession.create({data:{identityId,gymAccountId:account.id,authVersion:account.authVersion,
  deviceClass:'SHARED',deviceLabel:'Owner integration test',refreshTokenHash:createHash('sha256').update(randomBytes(32)).digest('hex'),
  idleExpiresAt:new Date(now+600_000),absoluteExpiresAt:new Date(now+900_000)}});
 return new SignJWT({authVersion:account.authVersion,sid:session.id,gaid:account.id}).setProtectedHeader({alg:'HS256'}).setSubject(identityId)
  .setIssuer('gymos-v2').setAudience('gymos-api').setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
const call=(path:string,bearer:string,body?:unknown,key=randomUUID())=>fetch(`${base}${path}`,{method:body===undefined?'GET':'POST',headers:{...(bearer?{authorization:`Bearer ${bearer}`}:{ }),'content-type':'application/json','idempotency-key':key},...(body===undefined?{}:{body:JSON.stringify(body)})});
const input=(slug:string,email=`${slug}@example.test`)=>({name:'Synthetic activation gym',slug,ownerEmail:email,currency:'LKR' as const,timezone:'Asia/Colombo'});
const worker=(fault?:(point:string)=>Promise<void>)=>new ProvisioningWorker(database,physical,tenants,fault);
const reserve=(slug:string,email?:string)=>reservations.reserve(actor,0,randomUUID(),input(slug,email));
async function own(id:string){const operation=await master.operation.findUniqueOrThrow({where:{id}});await run.registerProvisionedDatabase(operation);return operation;}
beforeAll(async()=>{
 run=await createDisposablePostgresRun();await run.migrate(run.masterName,'master');
 vi.stubEnv('JWT_SECRET',secret);vi.stubEnv('PROVISION_DATABASE_URL',run.masterUrl);vi.stubEnv('TENANT_DATABASE_URL',run.masterUrl);
 master=new PrismaClient({adapter:new PrismaPg({connectionString:run.masterUrl,max:4})});database={master} as DatabaseService;
 actor=(await master.user.create({data:{email:'activation-admin@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id;
 admin=await token(actor);other=await token((await master.user.create({data:{email:'activation-other@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}})).id);
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DatabaseService).useValue(database).compile();
 app=module.createNestApplication();await app.listen(0,'127.0.0.1');base=await app.getUrl();
 physical=app.get(GymProvisioningService);tenants=app.get(TenantDatabaseService);reservations=app.get(ProvisioningReservationService);
});
afterAll(async()=>{await app?.close();await master?.$disconnect();if(run)console.info('[owner-owned-cleanup]',JSON.stringify(await run.cleanup()));vi.unstubAllEnvs();});
it('rolls back partial Master finalization, resumes tenant success, and hands off one new owner credential',async()=>{
 for(const [index,point] of ['AFTER_OWNER_TENANT_COMMIT','DURING_MASTER_ACTIVATION','AFTER_MASTER_ACTIVATION'].entries()){
  const key=randomUUID();const body=input(`activation-fault-${index}`);
  const reserved=await reservations.reserve(actor,0,key,body);let fired=false;
  const first=await worker(async current=>{if(current===point&&!fired){fired=true;throw new Error('Synthetic activation interruption');}}).runOnce(reserved.operationId);
  const operation=await own(reserved.operationId);
  if(point==='AFTER_MASTER_ACTIVATION')expect(first.state).toBe('COMPLETE');
  else {
   expect(first.state).toBe('FAILED_RETRYABLE');expect(first.gym.status).toBe('PROVISIONING');
   expect(await master.user.count({where:{email:body.ownerEmail}})).toBe(0);
   expect(await master.gymAccess.count({where:{gymId:operation.gymId!}})).toBe(0);
   expect(await master.theme.count({where:{gymId:operation.gymId!}})).toBe(0);
  }
  const final=await worker().runOnce(operation.id);expect(final.state).toBe('COMPLETE');expect(final.gym.status).toBe('ACTIVE');
  const done=await master.operation.findUniqueOrThrow({where:{id:operation.id}});
  expect(await master.user.count({where:{email:body.ownerEmail}})).toBe(1);
  expect(await master.gymAccess.count({where:{gymId:operation.gymId!,role:'OWNER',linkStatus:'ACTIVE'}})).toBe(1);
  const theme=await master.theme.findUniqueOrThrow({where:{gymId:operation.gymId!}});expect(theme.primaryColor).toBe('#2563EB');
  expect((await call('/admin/gyms',admin,body,key)).status).toBe(200);
  expect((await call(`/admin/operations/${done.id}/credentials/issue`,other,{})).status).toBe(404);
  const issuedResponse=await call(`/admin/operations/${done.id}/credentials/issue`,admin,{});expect(issuedResponse.status).toBe(200);
  const issued=await issuedResponse.json();expect(issued.status).toBe('ISSUED');
  expect((await (await call(`/admin/operations/${done.id}/credentials/issue`,admin,{})).json()).status).toBe('ALREADY_ISSUED');
  const subject=await master.user.findUniqueOrThrow({where:{id:done.subjectIdentityId!}});
  expect(await argon2.verify(subject.passwordHash,issued.temporaryPassword)).toBe(true);
  expect(subject.mustChangePassword).toBe(true);expect(subject.authVersion).toBe(1);
  const initialLogin=await call('/auth/login','',{email:subject.email,password:issued.temporaryPassword});expect(initialLogin.status).toBe(201);
  const initialToken=(await initialLogin.json()).accessToken;
  expect((await call(`/gyms/${body.slug}/access`,initialToken)).status).toBe(403);
  const changed=await call('/auth/change-password',initialToken,{currentPassword:issued.temporaryPassword,newPassword:password,confirmPassword:password});expect(changed.status).toBe(201);
  const account=await master.gymAccount.findUniqueOrThrow({where:{userId_gymId:{userId:subject.id,gymId:done.gymId!}}});
  expect(await argon2.verify(account.passwordHash!,password)).toBe(true);
  expect((await call(`/gyms/${body.slug}/access`,await scopedToken(subject.id,done.gymId!))).status).toBe(200);
  const safe=JSON.stringify(done.safeResult);expect(/password|credential|token|database|email/i.test(safe)).toBe(false);
  const tenant=await run.connect(done.databaseName!);try{
   expect((await tenant.query('SELECT count(*)::int AS count FROM "CommandReceipt" WHERE "sourceMasterOperationId"=$1',[done.id])).rows[0].count).toBe(1);
   const config=(await tenant.query('SELECT "currency", "timezone" FROM "GymConfiguration"')).rows[0];expect(config).toEqual({currency:'LKR',timezone:'Asia/Colombo'});
  }finally{await tenant.end();}
 }
},120_000);
it('requires private verified consent for an existing identity across two gyms and never changes its credentials',async()=>{
 const owner=await master.user.create({data:{email:'reused-owner@example.test',passwordHash:await argon2.hash(password)}});const bearer=await token(owner.id);
 const gyms=[];
 for(const slug of ['reused-a','reused-b']){
  const reserved=await reserve(slug,owner.email);gyms.push(reserved);
  expect((await worker().runOnce(reserved.operationId)).state).toBe('TENANT_COMMITTED');await own(reserved.operationId);
  expect((await call(`/gyms/${slug}/access`,bearer)).status).toBe(403);
 }
 expect((await call(`/auth/provisioning/${gyms[0].operationId}/owner-consent`,admin,{currentPassword:password})).status).toBe(404);
 expect((await call(`/auth/provisioning/${gyms[0].operationId}/owner-consent`,bearer,{currentPassword:'invalid'})).status).toBe(401);
 for(const gym of gyms){
  expect((await call(`/auth/provisioning/${gym.operationId}/owner-consent`,bearer,{currentPassword:password})).status).toBe(200);
  expect((await worker().runOnce(gym.operationId)).state).toBe('COMPLETE');
  expect((await call(`/admin/operations/${gym.operationId}/credentials/issue`,admin,{})).status).toBe(403);
  expect((await call(`/gyms/${gym.gym.slug}/access`,bearer)).status).toBe(403);
 }
 for(const gym of gyms){
  const username=`${gym.gym.slug}.owner@example.test`;
  expect((await call('/auth/gym-account/setup','',{gymSlug:gym.gym.slug,legacyEmail:owner.email,legacyPassword:password,username,newPassword:`${password}-scoped`})).status).toBe(201);
  const account=await master.gymAccount.findUniqueOrThrow({where:{userId_gymId:{userId:owner.id,gymId:gym.gym.id}}});
  expect(account.username).toBe(username);expect(await argon2.verify(account.passwordHash!,`${password}-scoped`)).toBe(true);
  expect((await call(`/gyms/${gym.gym.slug}/access`,await scopedToken(owner.id,gym.gym.id))).status).toBe(200);
 }
 const after=await master.user.findUniqueOrThrow({where:{id:owner.id}});
 expect(after.passwordHash===owner.passwordHash).toBe(true);
 expect(await master.credentialDelivery.count({where:{identityId:owner.id}})).toBe(0);
},90_000);
it('refuses a conflicting same-gym role and an identity appearing after reservation without resetting or deleting either identity',async()=>{
 const reused=await master.user.create({data:{email:'role-conflict@example.test',passwordHash:await argon2.hash(password)}});
 const reserved=await reserve('role-conflict',reused.email);
 await master.gymAccess.create({data:{userId:reused.id,gymId:reserved.gym.id,role:'MEMBER',linkStatus:'PENDING'}});
 const denied=await worker().runOnce(reserved.operationId);expect(denied.state).toBe('REPAIR_REQUIRED');await own(reserved.operationId);
 const race=await reserve('identity-race');const appeared=await master.user.create({data:{email:'identity-race@example.test',passwordHash:await argon2.hash(password)}});
 const result=await worker().runOnce(race.operationId);expect(result.state).toBe('REPAIR_REQUIRED');expect(result.gym.status).toBe('PROVISIONING');await own(race.operationId);
 expect((await master.user.findUniqueOrThrow({where:{id:appeared.id}})).passwordHash===appeared.passwordHash).toBe(true);
 expect((await master.user.findUniqueOrThrow({where:{id:reused.id}})).passwordHash===reused.passwordHash).toBe(true);
 expect(await master.theme.count({where:{gymId:race.gym.id}})).toBe(0);
},90_000);
