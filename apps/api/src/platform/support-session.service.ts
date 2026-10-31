import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { supportSummarySchema, type supportEntrySchema } from '@gymos/contracts/platform';
import type { z } from 'zod';
import type { Prisma, SupportSession } from '../generated/master/client.js';
import { DatabaseService } from '../database.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import { readApprovedTenantSummary } from './platform-registry.service.js';
const hash=(context:string)=>createHash('sha256').update(context).digest('hex');
async function event(tx:Prisma.TransactionClient,session:SupportSession,route:string,outcome:string,once=false){
 await tx.supportEvent.createMany({skipDuplicates:true,data:[{
  eventKey:once?`support:${session.id}:${outcome}`:randomUUID(),supportSessionId:session.id,
  originalActorIdentityId:session.actorIdentityId,gymId:session.gymId,scope:session.scope,route,outcome,reasonReference:session.id,
 }]});
}
export async function revokeSupportForActor(tx:Prisma.TransactionClient,actorIdentityId:string,reason:string){
 const sessions=await tx.supportSession.findMany({where:{actorIdentityId,revokedAt:null}});
 const [{now}]=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
 for(const session of sessions){
  const changed=await tx.supportSession.updateMany({where:{id:session.id,version:session.version,revokedAt:null},data:{revokedAt:now,revocationReason:reason,version:{increment:1}}});
  if(changed.count)await event(tx,session,'SUPPORT_CONTEXT',reason,true);
 }
}
@Injectable()
export class SupportSessionService {
 constructor(private readonly database:DatabaseService,private readonly tenants:TenantDatabaseService){}
 async enter(actorIdentityId:string,authVersion:number,input:z.infer<typeof supportEntrySchema>){
  const context=randomBytes(32).toString('base64url');
  return this.database.master.$transaction(async tx=>{
   await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${actorIdentityId} FOR UPDATE`;
   const actor=await tx.user.findUnique({where:{id:actorIdentityId}});
   const [{now}]=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
   if(actor?.globalRole!=='SUPER_ADMIN'||actor.authVersion!==authVersion||actor.mustChangePassword||(actor.credentialExpiresAt&&actor.credentialExpiresAt<=now))throw new ForbiddenException('Platform session changed');
   const gym=await tx.gym.findUnique({where:{id:input.gymId},select:{id:true,slug:true}});if(!gym)throw new NotFoundException('Gym unavailable');
   await revokeSupportForActor(tx,actorIdentityId,'REPLACED');
   const session=await tx.supportSession.create({data:{...input,tokenHash:hash(context),actorIdentityId,authVersion,gymId:gym.id,issuedAt:now,expiresAt:new Date(now.getTime()+900_000)}});
   await event(tx,session,'SUPPORT_ENTRY','ENTERED',true);
   return {id:session.id,context,slug:gym.slug,expiresAt:session.expiresAt.toISOString()};
  });
 }
 private async validate(actorIdentityId:string,authVersion:number,id:string,context:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(context))throw new ForbiddenException('Support context unavailable');
  const session=await this.database.master.supportSession.findFirst({where:{id,actorIdentityId,tokenHash:hash(context)}});
  if(!session)throw new NotFoundException('Support context unavailable');
  const [{now}]=await this.database.master.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
  const actor=await this.database.master.user.findUnique({where:{id:actorIdentityId},select:{authVersion:true,globalRole:true,mustChangePassword:true}});
  if(session.revokedAt)throw new ForbiddenException('Support context ended');
  if(session.expiresAt<=now){await this.database.master.$transaction(tx=>event(tx,session,'SUPPORT_CONTEXT','EXPIRED',true));throw new ForbiddenException('Support context expired');}
  if(session.authVersion!==authVersion||actor?.authVersion!==authVersion||actor.globalRole!=='SUPER_ADMIN'||actor.mustChangePassword){
   await this.database.master.$transaction(tx=>revokeSupportForActor(tx,actorIdentityId,'SECURITY_REVOKED'));throw new ForbiddenException('Support context revoked');
  }
  return session;
 }
 async exit(actorIdentityId:string,authVersion:number,id:string,context:string){
  const session=await this.database.master.supportSession.findFirst({where:{id,actorIdentityId,tokenHash:hash(context)}});
  if(!session||session.authVersion!==authVersion)throw new NotFoundException('Support context unavailable');
  await this.database.master.$transaction(async tx=>{
   const [{now}]=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
   const changed=await tx.supportSession.updateMany({where:{id,revokedAt:null},data:{revokedAt:now,revocationReason:'EXITED',version:{increment:1}}});
   if(changed.count)await event(tx,session,'SUPPORT_EXIT','EXITED',true);
  });
  return {revoked:true};
 }
 async summary(actorIdentityId:string,authVersion:number,id:string,context:string,slug:string){
  const session=await this.validate(actorIdentityId,authVersion,id,context);
  const gym=await this.database.master.gym.findUnique({where:{id:session.gymId},include:{theme:true,expectedTenantOperation:true}});
  if(!gym||gym.slug!==slug)throw new NotFoundException('Support gym unavailable');
  let tenant=null;let health:'VERIFIED'|'UNAVAILABLE'|'REPAIR_REQUIRED'|'MASTER_ONLY'='MASTER_ONLY';
  const tenantAllowed=['ACTIVE','SUSPENDED'].includes(gym.status)&&gym.expectedTenantOperation?.state!=='REPAIR_REQUIRED';
  if(tenantAllowed){
   try{tenant=await readApprovedTenantSummary(this.tenants,gym);health='VERIFIED';}
   catch{
    await this.database.master.$transaction(async tx=>{
     const changed=await tx.supportSession.updateMany({where:{id,revokedAt:null},data:{revokedAt:new Date(),revocationReason:'BINDING_UNAVAILABLE',version:{increment:1}}});
     if(changed.count)await event(tx,session,'GYM_SUMMARY_READ','BINDING_UNAVAILABLE',true);
    });
    throw new ForbiddenException('Support binding unavailable; context ended');
   }
  }
  // A concurrent exit/switch must win over an in-flight tenant read.
  try {
   await this.validate(actorIdentityId,authVersion,id,context);
   const current=await this.database.master.gym.findUnique({where:{id:gym.id},select:{version:true}});
   if(current?.version!==gym.version)throw new ForbiddenException('Gym context changed; reload before continuing');
  }
  catch(error) {
   if(tenantAllowed)await this.database.master.$transaction(tx=>event(tx,session,'GYM_SUMMARY_READ','DENIED_AFTER_READ'));
   throw error;
  }
  if(tenantAllowed)await this.database.master.$transaction(tx=>event(tx,session,'GYM_SUMMARY_READ','ALLOWED'));
  return supportSummarySchema.parse({id,scope:'GYM_SUMMARY_READ',expiresAt:session.expiresAt.toISOString(),gym:{id:gym.id,slug:gym.slug,name:gym.name,status:gym.status,primaryColor:gym.theme?.primaryColor??null,createdAt:gym.createdAt.toISOString(),updatedAt:gym.updatedAt.toISOString()},operationState:gym.expectedTenantOperation?.state??null,health,tenant});
 }
}
