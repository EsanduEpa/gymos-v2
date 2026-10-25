import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from './generated/master/client.js';
import { databasePoolConfig } from './database-pool-config.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly master: PrismaClient;
  private readonly pool: pg.Pool;
  private readonly logger = new Logger(DatabaseService.name);
  private closing?: Promise<void>;

  constructor() {
    this.pool = new pg.Pool(databasePoolConfig(process.env.MASTER_DATABASE_URL, 'master'));
    this.pool.on('error', () => this.logger.warn('Master database connection failed'));
    try { this.master = new PrismaClient({ adapter: new PrismaPg(this.pool) }); }
    catch { void this.pool.end().catch(() => this.logger.warn('Uninitialized Master pool cleanup failed')); throw new Error('Master database configuration is unavailable'); }
  }

  // Nest calls this after HTTP close, unlike onModuleDestroy. Active requests
  // and tenant callback leases drain before their required Master pool closes.
  onApplicationShutdown(): Promise<void> {
    if (!this.closing) this.closing = (async () => {
      try { await this.master.$disconnect(); }
      finally { await this.pool.end(); }
    })();
    return this.closing;
  }
}
