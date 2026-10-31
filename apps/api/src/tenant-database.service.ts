import { Injectable, Logger, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/tenant/client.js';
import { AdmissionUnavailable, BoundedTenantLeases } from './bounded-tenant-leases.js';
import { databasePoolConfig, DATABASE_POOL_LIMITS } from './database-pool-config.js';

function availabilityFailure(error: unknown): boolean {
  const visited = new Set<object>();
  const pending: unknown[] = [error];
  for (let inspected = 0; inspected < 32 && pending.length; inspected++) {
    const item = pending.shift();
    if (!item || typeof item !== 'object' || visited.has(item)) continue;
    visited.add(item);
    const value = item as Record<string, unknown>;
    for (const property of ['code', 'originalCode']) {
      const code = value[property];
      if (typeof code === 'string' && (['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1011', 'P1017', 'P2024', 'P2037', '57014'].includes(code) || code.startsWith('08') || code.startsWith('53'))) return true;
    }
    for (const nested of [
      value.cause,
      value.meta,
      value.error,
      value.driverAdapterError,
      value.user_facing_error,
      value.database_error,
    ]) if (nested && typeof nested === 'object') pending.push(nested);
  }
  return false;
}
@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly pools = new Set<pg.Pool>();
  private readonly leases = new BoundedTenantLeases<PrismaClient>((name) => {
    const pool = new pg.Pool(databasePoolConfig(process.env.TENANT_DATABASE_URL, 'tenant', name));
    pool.on('error', () => this.logger.warn('Tenant database connection failed'));
    let client: PrismaClient;
    try { client = new PrismaClient({ adapter: new PrismaPg(pool) }); }
    catch { void pool.end().catch(() => this.logger.warn('Uninitialized tenant pool cleanup failed')); throw new ServiceUnavailableException('Tenant database is temporarily unavailable'); }
    this.pools.add(pool);
    return {
      client,
      close: async () => {
        try { await client.$disconnect(); }
        finally { await pool.end(); this.pools.delete(pool); }
      },
    };
  }, {
    maxResident: DATABASE_POOL_LIMITS.maxTenantClients,
    admissionMs: DATABASE_POOL_LIMITS.admissionMs,
    idleMs: DATABASE_POOL_LIMITS.idleMs,
    drainMs: DATABASE_POOL_LIMITS.drainMs,
    onDrainTimeout: (state) => this.logger.error(`Tenant drain exceeded budget; active=${state.activeLeases}, resident=${state.resident}`),
    onCloseError: () => this.logger.error('Tenant pool cleanup failed; capacity remains quarantined'),
  });

  async withDatabase<Result>(databaseName: string, work: (client: PrismaClient) => Promise<Result>): Promise<Result> {
    try { return await this.leases.withDatabase(databaseName, work); }
    catch (error) {
      if (error instanceof AdmissionUnavailable || availabilityFailure(error)) throw new ServiceUnavailableException({ statusCode: 503, message: 'Tenant database is temporarily unavailable', retryable: true });
      throw error;
    }
  }

  async suspendAndDrain(databaseName: string): Promise<void> {
    try { await this.leases.suspendDatabase(databaseName); }
    catch (error) {
      if (error instanceof AdmissionUnavailable || availabilityFailure(error)) throw new ServiceUnavailableException('Tenant database is temporarily unavailable');
      throw error;
    }
  }

  // Controlled maintenance shares the SAME resident/connection budgets. Ordinary
  // tenant admission stays suspended. Never expose this through a tenant DTO.
  withMaintenanceDatabase<Result>(databaseName: string, work: (client: PrismaClient) => Promise<Result>): Promise<Result> {
    return this.leases.withDatabase(databaseName, work, true);
  }
  withAdministrativeRead<Result>(databaseName: string, work: (client: Prisma.TransactionClient) => Promise<Result>): Promise<Result> {
    return this.withMaintenanceDatabase(databaseName, tenant => tenant.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return work(tx);
    }));
  }

  resumeDatabase(databaseName: string): void {
    try { this.leases.resumeDatabase(databaseName); }
    catch { throw new ServiceUnavailableException('Tenant database is temporarily unavailable'); }
  }

  capacity() {
    return {
      ...this.leases.snapshot(),
      connections: [...this.pools].reduce((sum, pool) => sum + pool.totalCount, 0),
      idleConnections: [...this.pools].reduce((sum, pool) => sum + pool.idleCount, 0),
      waitingQueries: [...this.pools].reduce((sum, pool) => sum + pool.waitingCount, 0),
    };
  }

  onModuleDestroy(): Promise<void> { return this.leases.drain(); }
}
