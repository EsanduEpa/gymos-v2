import { createHash } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { DatabaseService } from './database.service.js';
import type { Operation } from './generated/master/client.js';
import { AdmissionUnavailable } from './bounded-tenant-leases.js';
import { databasePoolConfig } from './database-pool-config.js';
import { SingleAdmission } from './single-admission.js';
import { OperationConflictError, OperationIntegrityError, reference } from './operations/primitives.js';
import { deployPinnedArtifact } from './tenancy/pinned-deploy.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest, type TenantTemplateManifest } from './tenancy/tenant-template-manifest.js';

export function provisionOwnerRole(operationId: string) { return `gymos_owner_${createHash('sha256').update(reference(operationId)).digest('hex').slice(0,32)}`; }
export function provisionOwnershipMarker(operation: Pick<Operation,'id'|'gymId'|'requestDigest'>) {
  return `gymos-provision:${reference(operation.id)}:${reference(operation.gymId)}:${operation.requestDigest}`;
}
// Physical I/O only. No HTTP controller invokes this service; the controlled
// worker holds a durable lease and this session lock around external effects.
@Injectable()
export class GymProvisioningService implements OnApplicationShutdown {
  private readonly logger = new Logger(GymProvisioningService.name);
  private readonly admission = new SingleAdmission(); private pool?: pg.Pool;
  constructor(private readonly database: DatabaseService) {}
  private provisioningPool(): pg.Pool {
    if (!this.pool) {
      this.pool=new pg.Pool(databasePoolConfig(process.env.PROVISION_DATABASE_URL,'provisioning'));
      this.pool.on('error',()=>this.logger.warn('Provisioning database connection failed'));
    }
    return this.pool;
  }
  async withReservedTarget<T>(operation: Operation, work: (target: {
    ensureDatabase: () => Promise<void>; deploy: (manifest?: TenantTemplateManifest) => Promise<void>;
    inspect: () => Promise<boolean>;
  })=>Promise<T>): Promise<T> {
    if (!operation.gymId || !/^gymos_[a-f0-9]{32}$/.test(operation.databaseName ?? '')) throw new OperationIntegrityError('Invalid reserved target');
    const recorded=await this.database.master.operation.findUnique({where:{id:operation.id}});
    if (!recorded || recorded.gymId!==operation.gymId || recorded.databaseName!==operation.databaseName || recorded.requestDigest!==operation.requestDigest) throw new OperationIntegrityError('Reserved target changed');
    const provision=process.env.PROVISION_DATABASE_URL; const runtime=process.env.TENANT_DATABASE_URL;
    if (!provision || !runtime) throw new ServiceUnavailableException('Controlled worker is not configured');
    const base=new URL(provision); const tenantBase=new URL(runtime);
    if (base.hostname!==tenantBase.hostname || (base.port||'5432')!==(tenantBase.port||'5432')) throw new OperationIntegrityError('Worker/runtime target server mismatch');
    const databaseName=operation.databaseName!; const role=provisionOwnerRole(operation.id); const marker=provisionOwnershipMarker(operation);
    try { return await this.admission.run(async()=>{
      const client=await this.provisioningPool().connect(); let locked=false;
      try {
        const lock=await client.query<{locked:boolean}>('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[`provision:${operation.id}`]);
        if (!lock.rows[0].locked) throw new OperationConflictError('Physical target is still in flight'); locked=true;
        const inspect=async()=>{
          const row=(await client.query<{owner:string;marker:string|null}>('SELECT r.rolname AS owner, shobj_description(r.oid,\'pg_authid\') AS marker FROM pg_database d JOIN pg_roles r ON r.oid=d.datdba WHERE d.datname=$1',[databaseName])).rows[0];
          if (!row) return false;
          if (row.owner!==role || row.marker!==marker) throw new OperationIntegrityError('Existing target ownership is ambiguous');
          return true;
        };
        const ensureDatabase=async()=>{
          if (await inspect()) return;
          const existing=(await client.query<{marker:string|null}>('SELECT shobj_description(oid,\'pg_authid\') AS marker FROM pg_roles WHERE rolname=$1',[role])).rows[0];
          if (existing && existing.marker!==marker) throw new OperationIntegrityError('Target owner marker conflicts');
          if (!existing) {
            await client.query('BEGIN');
            try {
              await client.query(`CREATE ROLE "${role}" NOLOGIN NOCREATEDB NOCREATEROLE NOINHERIT`);
              // A CREATEDB/CREATEROLE provisioner must be able to SET ROLE to
              // its new database owner and inherit that owner's schema rights.
              await client.query(`GRANT "${role}" TO CURRENT_USER WITH INHERIT TRUE, SET TRUE`);
              // All interpolated text consists solely of validated references and hex digests.
              if (!/^gymos-provision:[A-Za-z0-9_:-]+:d1:[a-f0-9]{64}$/.test(marker)) throw new OperationIntegrityError('Invalid ownership marker');
              await client.query(`COMMENT ON ROLE "${role}" IS '${marker}'`); await client.query('COMMIT');
            } catch(error) {await client.query('ROLLBACK');throw error;}
          }
          // OWNER is part of CREATE DATABASE itself, closing the crash window
          // before later table/marker initialization. Unknown targets are never adopted.
          await client.query(`CREATE DATABASE "${databaseName}" OWNER "${role}"`);
          await inspect();
        };
        return await work({ensureDatabase,inspect,deploy:async(manifest=TENANT_TEMPLATE_MANIFEST)=>{
          if (!(await inspect())) throw new OperationIntegrityError('Reserved target is missing');
          if (tenantManifestDigest(manifest)!==operation.intendedTenantManifestDigest || manifest.version!==operation.intendedTenantTemplateVersion) throw new OperationIntegrityError('Pinned manifest mismatch');
          const target=new URL(provision); target.pathname=`/${databaseName}`;
          await deployPinnedArtifact('tenant',manifest.migrations,target.toString());
        }});
      } finally {
        if (locked) await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`provision:${operation.id}`]).catch(()=>undefined);
        client.release();
      }
    }); } catch(error) {if(error instanceof AdmissionUnavailable)throw new ServiceUnavailableException('Provisioning worker is busy');throw error;}
  }
  async withRolloutTarget<T>(rollout: Operation, work: (deploy: (manifest: TenantTemplateManifest) => Promise<void>) => Promise<T>) {
    const target=await this.database.master.schemaRolloutTarget.findUnique({where:{operationId:rollout.id}});
    const owner=target?await this.database.master.operation.findUnique({where:{id:target.ownershipOperationId}}):null;
    const gym=rollout.gymId?await this.database.master.gym.findUnique({where:{id:rollout.gymId}}):null;
    if(!target||!owner||!gym||owner.kind!=='PROVISION_GYM'||owner.state!=='COMPLETE'||owner.gymId!==gym.id||owner.databaseName!==target.databaseName||gym.databaseName!==target.databaseName)throw new OperationIntegrityError('Rollout ownership proof is unavailable');
    return this.withReservedTarget(owner,async physical=>{
      if(!(await physical.inspect()))throw new OperationIntegrityError('Rollout target is missing');
      return work(async manifest=>{
        if(manifest.version!==rollout.intendedTenantTemplateVersion||tenantManifestDigest(manifest)!==rollout.intendedTenantManifestDigest)throw new OperationIntegrityError('Rollout pin changed');
        const url=new URL(process.env.PROVISION_DATABASE_URL!);url.pathname=`/${target.databaseName}`;
        await deployPinnedArtifact('tenant',manifest.migrations,url.toString());
      });
    });
  }
  async onApplicationShutdown() {await this.admission.drain();if(this.pool)await this.pool.end();}
}
