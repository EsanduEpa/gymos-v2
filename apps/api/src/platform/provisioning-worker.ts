import { ForbiddenException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { DatabaseService } from '../database.service.js';
import { GymProvisioningService } from '../gym-provisioning.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import { OperationFoundationService, createLeaseHeartbeat } from '../operations/operation.service.js';
import { OperationConflictError, OperationIntegrityError, type CompletedSteps, type StepCode, type StepEvidence } from '../operations/primitives.js';
import { appendMasterVersionAudit } from '../operations/transaction-audit.js';
import { TenantSchemaIntegrityError, TenantSchemaVerifier } from '../tenancy/tenant-schema-verifier.js';
import { reviewedTenantManifest } from '../tenancy/tenant-template-manifest.js';
import { ProvisioningReservationService } from './provisioning-reservation.service.js';
import { ProvisioningOwnerService } from './provisioning-owner.service.js';

export class ProvisioningWorker {
  constructor(private readonly database: DatabaseService, private readonly physical: GymProvisioningService,
    private readonly tenants: TenantDatabaseService, private readonly fault?: (point:string)=>Promise<void>) {}
  async runOnce(operationId:string) {
    const master=this.database.master; const service=new OperationFoundationService(master);
    const read=()=>master.operation.findUniqueOrThrow({where:{id:operationId}});
    const initial=await read();
    if(initial.kind!=='PROVISION_GYM' || !initial.gymId) throw new OperationIntegrityError('Not a provisioning reservation');
    const status=()=>new ProvisioningReservationService(this.database).status(initial.actorIdentityId,operationId);
    if(initial.state==='COMPLETE')return status();
    const intent=await master.provisioningIntent.findUniqueOrThrow({where:{operationId}});
    const owners=new ProvisioningOwnerService(this.database,this.tenants);
    const actor=await master.user.findUnique({where:{id:initial.actorIdentityId},select:{globalRole:true,mustChangePassword:true}});
    if(actor?.globalRole!=='SUPER_ADMIN' || actor.mustChangePassword)throw new ForbiddenException('Provisioning actor unavailable');
    const lease=await service.acquireLease(initial.id,initial.version); const heartbeat=createLeaseHeartbeat(service,lease);
    const fence=()=>heartbeat.run(async current=>({lease:await service.heartbeat(current),value:undefined}));
    const checkpoint=(step:StepCode,evidence:StepEvidence,localEffects?: Parameters<OperationFoundationService['checkpoint']>[1]['localEffects'])=>heartbeat.run(async current=>{
      const result=await service.checkpoint(current,{step,evidence,localEffects});return {lease:result.lease,value:undefined};
    });
    try {
      const manifest=reviewedTenantManifest(initial.intendedTenantTemplateVersion,initial.intendedTenantManifestDigest);
      if(!manifest)throw new OperationIntegrityError('Pinned artifact unavailable');
      await this.physical.withReservedTarget(initial,async target=>{
        await heartbeat.run(async current=>({lease:await service.reconcileLease(current,async recorded=>{
          const exists=await target.inspect(); const steps=recorded.completedSteps as CompletedSteps;
          if(!exists && steps.DATABASE_CREATED)throw new OperationIntegrityError('Recorded database is missing');
          if(exists) await this.tenants.withDatabase(recorded.databaseName!,async tenant=>{
            const tables=await tenant.$queryRaw<{present:boolean}[]>`SELECT to_regclass('public."GymConfiguration"') IS NOT NULL AS present`;
            if(tables[0].present){const configuration=await tenant.gymConfiguration.findUnique({where:{id:'current'},select:{masterGymId:true}});if(configuration && configuration.masterGymId!==recorded.gymId)throw new OperationIntegrityError('Tenant binding conflicts');}
          });
        }),value:undefined}));
        let operation=await read(); let steps=operation.completedSteps as CompletedSteps;
        if(!steps.GYM_RESERVED){await checkpoint('GYM_RESERVED',{gymId:initial.gymId!,databaseName:initial.databaseName!});await this.fault?.('AFTER_RESERVATION');}
        await fence(); await target.ensureDatabase(); await this.fault?.('AFTER_DATABASE_CREATE');
        operation=await read();steps=operation.completedSteps as CompletedSteps;
        if(!steps.DATABASE_CREATED)await checkpoint('DATABASE_CREATED',{databaseName:initial.databaseName!});
        await fence(); await target.deploy(manifest); await this.fault?.('AFTER_MIGRATION');
        await fence();
        const evidence=await this.tenants.withDatabase(initial.databaseName!,tenant=>new TenantSchemaVerifier(tenant).verifyAndAttest({masterGymId:initial.gymId!,operationId},manifest));
        await this.fault?.('AFTER_TENANT_VERIFICATION');
        operation=await read();steps=operation.completedSteps as CompletedSteps;
        if(!steps.TENANT_TEMPLATE_VERIFIED)await checkpoint('TENANT_TEMPLATE_VERIFIED',{appliedTenantTemplateVersion:evidence.templateVersion,appliedTenantManifestDigest:evidence.manifestDigest});
        if(!steps.TENANT_BOUND)await checkpoint('TENANT_BOUND',{gymId:initial.gymId!},async tx=>{
          const gym=await tx.gym.findUniqueOrThrow({where:{id:initial.gymId!}});
          if(gym.status!=='PROVISIONING')throw new OperationIntegrityError('Gym lifecycle changed during provisioning');
          await tx.gym.update({where:{id:gym.id},data:{expectedTenantSchemaVersion:evidence.templateVersion,expectedTenantManifestDigest:evidence.manifestDigest,expectedTenantOperationId:operationId,version:{increment:1}}});
          await appendMasterVersionAudit(tx,{actorIdentityId:initial.actorIdentityId,gymId:gym.id,eventCode:'TENANT_SCHEMA_OBSERVED',resourceType:'GYM',resourceId:gym.id,committedVersion:gym.version+1,transition:{version:gym.version+1}});
        });
        await this.fault?.('AFTER_TENANT_BOUND');
        if(!(await owners.ready(initial,intent)))return;
        if(!manifest.postconditions.columns.GymConfiguration.includes('currency'))throw new OperationIntegrityError('Pinned schema requires an explicit configuration upgrade');
        await fence();const receiptId=await owners.prepareTenant(initial,intent);
        await this.fault?.('AFTER_OWNER_TENANT_COMMIT');
        const themeId=randomUUID();
        const initialHash=intent.reuseIdentity?'':await argon2.hash(randomBytes(32),{type:argon2.argon2id});
        await heartbeat.run(async current=>{
          const result=await service.checkpoint(current,{step:'MASTER_ACTIVATED',
            evidence:{gymId:initial.gymId!,subjectIdentityId:intent.plannedOwnerIdentityId,ownerThemeId:themeId,tenantCommandReceiptId:receiptId},
            finalResult:{operationId,state:'COMPLETE',resourceIds:[initial.gymId!],publicationState:'ACTIVE'},
            localEffects:(tx,operation)=>owners.activate(tx,operation,intent,themeId,initialHash,()=>this.fault?.('DURING_MASTER_ACTIVATION') ?? Promise.resolve()),
          });return {lease:result.lease,value:undefined};
        });
        await this.fault?.('AFTER_MASTER_ACTIVATION');
      });
      const current=await heartbeat.stop();if((await read()).state!=='COMPLETE')await service.releaseLease(current);return status();
    } catch(error) {
      const current=await heartbeat.stop().catch(()=>null);
      if(current)await service.fail(current,error instanceof OperationIntegrityError || error instanceof TenantSchemaIntegrityError?'REPAIR_REQUIRED':'FAILED_RETRYABLE',error instanceof OperationIntegrityError || error instanceof TenantSchemaIntegrityError?'TARGET_REVIEW_REQUIRED':'WORKER_INTERRUPTED').catch(()=>undefined);
      if(error instanceof OperationConflictError)throw error;
      return status();
    }
  }
}
