import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { GymProvisioningService } from '../gym-provisioning.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import { ProvisioningWorker } from './provisioning-worker.js';

/** Discovery only: worker leases and verified target ownership authorize every effect. */
@Injectable()
export class ProvisioningRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProvisioningRunner.name);
  private timer?: NodeJS.Timeout;
  private active?: Promise<void>;
  private stopping = false;
  constructor(private readonly database: DatabaseService, private readonly physical: GymProvisioningService,
    private readonly tenants: TenantDatabaseService) {}
  onModuleInit() {
    if (process.env.PROVISIONING_RUNNER_ENABLED !== 'true') return;
    this.logger.log('Provisioning runner enabled; interval=5000ms batch=5');
    this.timer = setInterval(() => { void this.tick(); }, 5000);
    this.timer.unref();
    void this.tick();
  }
  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.active;
  }
  async tick(): Promise<void> {
    if (this.stopping || this.active) return;
    this.active = this.sweep();
    try { await this.active; } finally { this.active = undefined; }
  }
  private async sweep() {
    try {
      const [{ now }] = await this.database.master.$queryRaw<{now: Date}[]>`SELECT clock_timestamp() AS now`;
      const rows = await this.database.master.operation.findMany({
        where: { kind: 'PROVISION_GYM', state: { in: ['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED'] },
          AND: [{ OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] },
            { OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lte: new Date(now.getTime() - 30_000) } }] }] },
        orderBy: [{ lastAttemptAt: 'asc' }, { id: 'asc' }], take: 5, select: { id: true },
      });
      const worker = new ProvisioningWorker(this.database, this.physical, this.tenants);
      for (const row of rows) {
        if (this.stopping) break;
        try {
          const result = await worker.runOnce(row.id);
          this.logger.log(`Provisioning operation ${row.id}: ${result.state}`);
        } catch { this.logger.warn(`Provisioning operation ${row.id} could not advance; inspect durable status`); }
      }
    } catch { this.logger.warn('Provisioning discovery unavailable; retrying next sweep'); }
  }
}
