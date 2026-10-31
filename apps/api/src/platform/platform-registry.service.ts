import { Injectable, NotFoundException } from '@nestjs/common';
import { registryPageSchema } from '@gymos/contracts/platform';
import type { Gym, Operation, Prisma } from '../generated/master/client.js';
import { DatabaseService } from '../database.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import { canonicalJson, OperationIntegrityError } from '../operations/primitives.js';
import { appendMasterVersionAudit } from '../operations/transaction-audit.js';
import { reviewedTenantManifest } from '../tenancy/tenant-template-manifest.js';
import { ProvisioningReservationService } from './provisioning-reservation.service.js';

type BoundGym = Gym & { expectedTenantOperation: Operation | null };
export async function readApprovedTenantSummary(tenants: TenantDatabaseService, gym: BoundGym) {
 const operation=gym.expectedTenantOperation;
 const manifest=reviewedTenantManifest(gym.expectedTenantSchemaVersion,gym.expectedTenantManifestDigest);
 if(!manifest || !operation || operation.state!=='COMPLETE' || operation.gymId!==gym.id || operation.appliedTenantTemplateVersion!==manifest.version || operation.appliedTenantManifestDigest!==gym.expectedTenantManifestDigest)throw new OperationIntegrityError('Tenant binding is unavailable');
 return tenants.withAdministrativeRead(gym.databaseName,async tx=>{
  const configuration=await tx.gymConfiguration.findUnique({where:{id:'current'},select:{masterGymId:true}});
  const schema=await tx.schemaState.findUnique({where:{id:'current'}});
  if(configuration?.masterGymId!==gym.id || schema?.state!=='VERIFIED' || schema.lastOperationId!==gym.expectedTenantOperationId || schema.appliedTemplateVersion!==manifest.version || schema.appliedManifestDigest!==gym.expectedTenantManifestDigest || canonicalJson(schema.verifiedMigrations)!==canonicalJson(manifest.migrations))throw new OperationIntegrityError('Tenant binding is unavailable');
  const config=manifest.postconditions.columns.GymConfiguration.includes('currency')?await tx.gymConfiguration.findUniqueOrThrow({where:{id:'current'},select:{currency:true,timezone:true}}):{currency:null,timezone:null};
  // Keep one transaction connection sequential; counts are of tenant actors,
  // never Master logins/owners and never person-level/private projections.
  const memberCount=await tx.member.count();const trainerCount=await tx.trainer.count();
  return {...config,memberCount,trainerCount};
 });
}
@Injectable()
export class PlatformRegistryService {
 constructor(private readonly database:DatabaseService,private readonly tenants:TenantDatabaseService){}
 async page(actorIdentityId:string,cursor?:string){
  if(cursor && !(await this.database.master.gym.findUnique({where:{id:cursor},select:{id:true}})))throw new NotFoundException('Registry page unavailable');
  const [gyms,total]=await Promise.all([
   this.database.master.gym.findMany({take:26,...(cursor?{cursor:{id:cursor},skip:1}:{}),orderBy:[{createdAt:'desc'},{id:'desc'}],include:{gymAccesses:{where:{role:'OWNER',linkStatus:'ACTIVE'},select:{user:{select:{displayName:true}}}},operations:{where:{kind:'PROVISION_GYM',actorIdentityId,provisioningIntent:{isNot:null}},take:1,orderBy:{createdAt:'desc'}}}}),
   this.database.master.gym.count(),
  ]);
  const rows=gyms.slice(0,25);const summaries=await this.database.master.gymRegistrySummary.findMany({where:{gymId:{in:rows.map(gym=>gym.id)}}});
  return registryPageSchema.parse({total,nextCursor:gyms.length>25?rows.at(-1)!.id:null,items:await Promise.all(rows.map(async gym=>{
   const summary=summaries.find(row=>row.gymId===gym.id);
   return {id:gym.id,name:gym.name,slug:gym.slug,status:gym.status,version:gym.version,ownerName:gym.gymAccesses[0]?.user.displayName??null,
    memberCount:summary?.memberCount??null,trainerCount:summary?.trainerCount??null,observedAt:summary?.observedAt?.toISOString()??null,health:summary?.health??'UNAVAILABLE',
    operation:gym.operations[0]?await new ProvisioningReservationService(this.database).status(actorIdentityId,gym.operations[0].id):null};
  }))});
 }
 // Explicit bounded worker job. The registry HTTP read never fans out to tenants.
 async refreshOne(gymId:string,actorIdentityId:string){
  const gym=await this.database.master.gym.findUniqueOrThrow({where:{id:gymId},include:{expectedTenantOperation:true}});
  let values: {memberCount?:number;trainerCount?:number;observedAt?:Date;schemaVersion?:string;health:string}={health:'UNAVAILABLE'};
  if(['ACTIVE','SUSPENDED'].includes(gym.status)){
   try{const summary=await readApprovedTenantSummary(this.tenants,gym);values={memberCount:summary.memberCount,trainerCount:summary.trainerCount,observedAt:new Date(),schemaVersion:gym.expectedTenantSchemaVersion!,health:'VERIFIED'};}
   catch(error){values={health:error instanceof OperationIntegrityError?'REPAIR_REQUIRED':'UNAVAILABLE'};}
  }
  await this.database.master.$transaction(async tx=>{
   const actor=await tx.user.findUnique({where:{id:actorIdentityId},select:{globalRole:true,mustChangePassword:true}});
   if(actor?.globalRole!=='SUPER_ADMIN'||actor.mustChangePassword)throw new OperationIntegrityError('Registry worker actor unavailable');
   const current=await tx.gym.findUniqueOrThrow({where:{id:gymId},select:{version:true}});
   if(current.version!==gym.version)throw new OperationIntegrityError('Registry changed during summary observation');
   const updated=await tx.gymRegistrySummary.upsert({where:{gymId},create:{gymId,...values},update:{...values,version:{increment:1}}});
   await appendMasterVersionAudit(tx,{actorIdentityId,gymId,eventCode:'REGISTRY_SUMMARY_OBSERVED',resourceType:'GYM_SUMMARY',resourceId:gymId,committedVersion:updated.version,transition:{to:updated.health,version:updated.version}});
  });
 }
}
export type MasterTransaction = Prisma.TransactionClient;
