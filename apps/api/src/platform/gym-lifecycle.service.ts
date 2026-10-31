import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { gymLifecycleStatusSchema, type gymLifecycleInputSchema } from '@gymos/contracts/platform';
import type { z } from 'zod';
import { DatabaseService } from '../database.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import type { Prisma } from '../generated/master/client.js';
import { OperationFoundationService, createLeaseHeartbeat } from '../operations/operation.service.js';
import { canonicalJson, OperationConflictError, OperationIntegrityError, type CompletedSteps, type StepCode } from '../operations/primitives.js';
import { appendMasterAudit, appendMasterVersionAudit } from '../operations/transaction-audit.js';
import { reviewedTenantManifest } from '../tenancy/tenant-template-manifest.js';
import { verifyInstalledTenant } from '../tenancy/tenant-schema-verifier.js';

@Injectable()
export class GymLifecycleService {
 constructor(private readonly database:DatabaseService,private readonly tenants:TenantDatabaseService){}
 private async authorize(tx:Prisma.TransactionClient,actorIdentityId:string,authVersion:number){
  const actor=await tx.user.findUnique({where:{id:actorIdentityId}});
  const [{now}]=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
  if(actor?.globalRole!=='SUPER_ADMIN'||actor.authVersion!==authVersion||actor.mustChangePassword||(actor.credentialExpiresAt&&actor.credentialExpiresAt<=now))throw new ForbiddenException('Platform authorization changed');
 }
 async status(actorIdentityId:string,id:string){
  const operation=await this.database.master.operation.findFirst({where:{id,actorIdentityId,kind:'CHANGE_ACCESS'},include:{lifecycleIntent:true}});
  if(!operation?.lifecycleIntent||!operation.gymId)throw new NotFoundException('Lifecycle operation unavailable');
  return gymLifecycleStatusSchema.parse({operationId:id,gymId:operation.gymId,state:operation.state,version:operation.version,target:operation.lifecycleIntent.target,appliedGymVersion:operation.state==='COMPLETE'?operation.lifecycleIntent.expectedGymVersion+1:null,retryable:operation.state==='FAILED_RETRYABLE'});
 }
 async execute(actorIdentityId:string,authVersion:number,key:string,gymId:string,input:z.infer<typeof gymLifecycleInputSchema>,fault?:(point:string)=>Promise<void>){
  try{
   const claim=await new OperationFoundationService(this.database.master).claim({actorIdentityId,kind:'CHANGE_ACCESS',gymId,idempotencyKey:key,intent:{command:'GYM_LIFECYCLE',...input},prepare:async(tx,operation)=>{
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`gym-lifecycle:${gymId}`},0))`;
    await this.authorize(tx,actorIdentityId,authVersion);
    const gym=await tx.gym.findUnique({where:{id:gymId}});if(!gym)throw new NotFoundException('Gym unavailable');
    if(gym.version!==input.expectedVersion||gym.status!==(input.target==='SUSPENDED'?'ACTIVE':'SUSPENDED'))throw new OperationConflictError('Gym status/version changed');
    const pending=await tx.operation.findFirst({where:{gymId,kind:'CHANGE_ACCESS',id:{not:operation.id},state:{notIn:['COMPLETE','FAILED_FINAL']},lifecycleIntent:{isNot:null}},select:{id:true}});
    if(pending)throw new OperationConflictError('Resume the existing lifecycle operation first');
    await tx.gymLifecycleIntent.create({data:{operationId:operation.id,expectedGymVersion:input.expectedVersion,target:input.target,reason:input.reason}});
    await appendMasterAudit(tx,{actorIdentityId,operationId:operation.id,gymId,stepCode:'LIFECYCLE_RESERVED',eventCode:'GYM_LIFECYCLE_REQUESTED',resourceType:'GYM',resourceId:gymId,transition:{to:input.target,version:input.expectedVersion}});
   }});
   return this.resume(actorIdentityId,authVersion,claim.operation.id,fault);
  }catch(error){if(error instanceof OperationConflictError)throw new ConflictException('Gym status/version or lifecycle intent changed');throw error;}
 }
 async resume(actorIdentityId:string,authVersion:number,id:string,fault?:(point:string)=>Promise<void>){
  const current=await this.status(actorIdentityId,id);if(current.state==='COMPLETE')return current;
  const master=this.database.master;await master.$transaction(tx=>this.authorize(tx,actorIdentityId,authVersion));
  const initial=await master.operation.findUniqueOrThrow({where:{id},include:{lifecycleIntent:true,gym:true}});
  const intent=initial.lifecycleIntent!;const gym=initial.gym!;
  const expectedBlockedVersion=intent.expectedGymVersion+(intent.target==='SUSPENDED'?1:0);
  const service=new OperationFoundationService(master);let lease;
  try{lease=await service.acquireLease(id,initial.version);}catch(error){if(error instanceof OperationConflictError)throw new ConflictException('Lifecycle operation is already running or requires review');throw error;}
  const heartbeat=createLeaseHeartbeat(service,lease);
  const fence=()=>heartbeat.run(async value=>({lease:await service.heartbeat(value),value:undefined}));
  const checkpoint=(step:StepCode,effects?:(tx:Prisma.TransactionClient)=>Promise<void>,complete=false)=>heartbeat.run(async value=>{
   const result=await service.checkpoint(value,{step,evidence:{gymId:gym.id},...(complete?{finalResult:{operationId:id,state:'COMPLETE' as const,resourceIds:[gym.id],version:intent.expectedGymVersion+1}}:{}),localEffects:effects});return {lease:result.lease,value:undefined};
  });
  let readsPaused=false;
  try{
   await heartbeat.run(async value=>({lease:await service.reconcileLease(value,async operation=>{
    const observed=await master.gym.findUniqueOrThrow({where:{id:gym.id}});const blocked=Boolean((operation.completedSteps as CompletedSteps).ADMISSION_BLOCKED);
    if(observed.version!==(blocked?expectedBlockedVersion:intent.expectedGymVersion)||observed.status!==(blocked?'SUSPENDED':intent.target==='SUSPENDED'?'ACTIVE':'SUSPENDED'))throw new OperationIntegrityError('Gym lifecycle evidence changed');
   }),value:undefined}));
   let operation=await master.operation.findUniqueOrThrow({where:{id}});
   if(!(operation.completedSteps as CompletedSteps).ADMISSION_BLOCKED){
    await checkpoint('ADMISSION_BLOCKED',async tx=>{
     await this.authorize(tx,actorIdentityId,authVersion);
     if(intent.target==='SUSPENDED'){
      const changed=await tx.gym.updateMany({where:{id:gym.id,status:'ACTIVE',version:intent.expectedGymVersion},data:{status:'SUSPENDED',version:{increment:1}}});
      if(changed.count!==1)throw new OperationConflictError('Gym lifecycle changed');
      await appendMasterVersionAudit(tx,{actorIdentityId,gymId:gym.id,eventCode:'GYM_SUSPENDED',resourceType:'GYM',resourceId:gym.id,committedVersion:expectedBlockedVersion,transition:{from:'ACTIVE',to:'SUSPENDED',version:expectedBlockedVersion}});
     }else if(!(await tx.gym.findFirst({where:{id:gym.id,status:'SUSPENDED',version:intent.expectedGymVersion}})))throw new OperationConflictError('Gym lifecycle changed');
    });
    await fault?.('AFTER_ADMISSION_BLOCKED');
   }
   this.tenants.pauseAdministrativeReads(gym.databaseName);readsPaused=true;
   await fence();await this.drain(gym.databaseName);await fault?.('AFTER_POOL_DRAIN');
   operation=await master.operation.findUniqueOrThrow({where:{id}});
   if(!(operation.completedSteps as CompletedSteps).POOLS_DRAINED)await checkpoint('POOLS_DRAINED');
   if(intent.target==='ACTIVE'){
    const bound=await master.gym.findUniqueOrThrow({where:{id:gym.id},include:{expectedTenantOperation:true}});
    const manifest=reviewedTenantManifest(bound.expectedTenantSchemaVersion,bound.expectedTenantManifestDigest);
    if(!manifest)throw new OperationIntegrityError('No supported schema is recorded');
    // This controlled read bypasses suspended admission only; it never migrates.
    await this.tenants.withMaintenanceDatabase(gym.databaseName,async tenant=>{
     await tenant.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await verifyInstalledTenant(tx,manifest);});
    });
    // The approved projection performs fresh binding/SchemaState checks.
    // Administrative reads remain paused for other requests while we verify.
    const state=await this.tenants.withMaintenanceDatabase(gym.databaseName,async tenant=>({configuration:await tenant.gymConfiguration.findUnique({where:{id:'current'},select:{masterGymId:true}}),schema:await tenant.schemaState.findUnique({where:{id:'current'}})}));
    if(state.configuration?.masterGymId!==gym.id||state.schema?.state!=='VERIFIED'||state.schema.lastOperationId!==bound.expectedTenantOperationId||state.schema.appliedTemplateVersion!==manifest.version||state.schema.appliedManifestDigest!==bound.expectedTenantManifestDigest||canonicalJson(state.schema.verifiedMigrations)!==canonicalJson(manifest.migrations)||bound.expectedTenantOperation?.state!=='COMPLETE'||bound.expectedTenantOperation.gymId!==gym.id||bound.expectedTenantOperation.appliedTenantTemplateVersion!==manifest.version||bound.expectedTenantOperation.appliedTenantManifestDigest!==bound.expectedTenantManifestDigest)throw new OperationIntegrityError('Tenant binding requires review');
    await this.drain(gym.databaseName);await fault?.('AFTER_REACTIVATION_HEALTH');
   }
   await checkpoint('LIFECYCLE_APPLIED',async tx=>{
    await this.authorize(tx,actorIdentityId,authVersion);
    const observed=await tx.gym.findUniqueOrThrow({where:{id:gym.id}});
    if(observed.status!=='SUSPENDED'||observed.version!==expectedBlockedVersion)throw new OperationConflictError('Gym lifecycle changed');
    if(intent.target==='ACTIVE'){
     const owner=await tx.gymAccess.findFirst({where:{gymId:gym.id,role:'OWNER',linkStatus:'ACTIVE',user:{is:{globalRole:'USER'}}},select:{userId:true}});
     if(!owner)throw new OperationIntegrityError('Active owner access is required');
     const changed=await tx.gym.updateMany({where:{id:gym.id,status:'SUSPENDED',version:expectedBlockedVersion},data:{status:'ACTIVE',version:{increment:1}}});
     if(changed.count!==1)throw new OperationConflictError('Gym lifecycle changed');
     await appendMasterVersionAudit(tx,{actorIdentityId,gymId:gym.id,eventCode:'GYM_REACTIVATED',resourceType:'GYM',resourceId:gym.id,committedVersion:expectedBlockedVersion+1,transition:{from:'SUSPENDED',to:'ACTIVE',version:expectedBlockedVersion+1}});
    }
   },true);
   await heartbeat.stop();
   if(intent.target==='ACTIVE')this.tenants.resumeDatabase(gym.databaseName);
   await fault?.('AFTER_LIFECYCLE_COMMIT');
   return this.status(actorIdentityId,id);
  }catch(error){
   const held=await heartbeat.stop().catch(()=>null);
   if((await master.operation.findUnique({where:{id},select:{state:true}}))?.state==='COMPLETE')return this.status(actorIdentityId,id);
   if(held)await service.fail(held,error instanceof OperationConflictError?'FAILED_FINAL':'FAILED_RETRYABLE',error instanceof OperationIntegrityError?'HEALTH_REVIEW_REQUIRED':'LIFECYCLE_INTERRUPTED').catch(()=>undefined);
   if(error instanceof OperationConflictError)throw new ConflictException('Gym lifecycle changed; inspect the original operation');
   throw new ServiceUnavailableException({statusCode:503,message:'Lifecycle operation is incomplete. The gym remains blocked once suspension is recorded; inspect or resume the original operation.',operationId:id,retryable:true});
  }finally{if(readsPaused)this.tenants.resumeAdministrativeReads(gym.databaseName);}
 }
 private async drain(databaseName:string){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([this.tenants.suspendAndDrain(databaseName),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Drain requires review')),10_000);timer.unref();})]);}
  finally{clearTimeout(timer);}
 }
}
