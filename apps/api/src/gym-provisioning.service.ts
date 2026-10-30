import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Injectable, Logger, ServiceUnavailableException, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { DatabaseService } from './database.service.js';
import type { Operation } from './generated/master/client.js';
import { AdmissionUnavailable } from './bounded-tenant-leases.js';
import { databasePoolConfig } from './database-pool-config.js';
import { SingleAdmission } from './single-admission.js';
import { OperationConflictError, OperationIntegrityError, reference } from './operations/primitives.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest, type TenantTemplateManifest } from './tenancy/tenant-template-manifest.js';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(import.meta.url);
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
          const directory=await mkdtemp(join(tmpdir(),'gymos-pinned-')); await chmod(directory,0o700);
          try {
            const migrations=join(directory,'migrations'); await mkdir(migrations); await writeFile(join(migrations,'migration_lock.toml'),'provider = "postgresql"\n');
            for (const entry of manifest.migrations) {
              const source=join(root,'packages/database-tenant/prisma/migrations',entry.name,'migration.sql');
              const checksum=createHash('sha256').update(await readFile(source)).digest('hex');
              if (checksum!==entry.checksum) throw new OperationIntegrityError('Pinned migration checksum mismatch');
              await mkdir(join(migrations,entry.name)); await copyFile(source,join(migrations,entry.name,'migration.sql'));
            }
            await writeFile(join(directory,'schema.prisma'),'datasource db {\n provider = "postgresql"\n}\n');
            const config=join(directory,'prisma.config.mjs');
            await writeFile(config,`import {defineConfig} from ${JSON.stringify(require.resolve('prisma/config'))};\nexport default defineConfig({schema:${JSON.stringify(join(directory,'schema.prisma'))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.GYMOS_CONTROLLED_TENANT_URL}});\n`);
            const target=new URL(provision); target.pathname=`/${databaseName}`;
            try { await execute(process.execPath,[join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',config],{
              cwd:directory,env:{...process.env,DOTENV_CONFIG_PATH:'/dev/null',GYMOS_CONTROLLED_TENANT_URL:target.toString()},timeout:120_000,maxBuffer:1024*1024,
            }); } catch { throw new OperationIntegrityError('Migration needs explicit evidence review'); }
          } finally {await rm(directory,{recursive:true,force:true});}
        }});
      } finally {
        if (locked) await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`provision:${operation.id}`]).catch(()=>undefined);
        client.release();
      }
    }); } catch(error) {if(error instanceof AdmissionUnavailable)throw new ServiceUnavailableException('Provisioning worker is busy');throw error;}
  }
  async onApplicationShutdown() {await this.admission.drain();if(this.pool)await this.pool.end();}
}
