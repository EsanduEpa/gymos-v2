import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest } from '../tenancy/tenant-template-manifest.js';
import { verifyInstalledTenant } from '../tenancy/tenant-schema-verifier.js';
import { canonicalJson } from '../operations/primitives.js';
import { sweepSessionReminders } from './session-reminders.js';
import { expirePendingSession } from './expire-pending-session.js';

const intervalMs = 30_000;
const maxPerTenantPerTick = 500;
const batchSize = 50;

type TickResult = { gyms: number; expired: number; skipped: number; failures: number; startedAt: string; completedAt: string };

@Injectable()
export class SessionExpiryRunner implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SessionExpiryRunner.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopping = false;
  private lastResult: TickResult | null = null;
  private totalFailures = 0;
  private gymCursor: string | null = null;

  constructor(private readonly database: DatabaseService, private readonly tenants: TenantDatabaseService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.PT_EXPIRY_RUNNER_ENABLED === 'false') {
      this.logger.log('PT scheduled-work runner disabled');
      return;
    }
    this.logger.log(`PT scheduled-work runner enabled; interval=${intervalMs}ms batch=${batchSize} perTenantLimit=${maxPerTenantPerTick}`);
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
    void this.tick();
  }

  async onApplicationShutdown() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    while (this.running) await new Promise(resolve => setTimeout(resolve, 25));
  }

  status() {
    return { enabled: Boolean(this.timer), running: this.running, lastResult: this.lastResult, totalFailures: this.totalFailures,
      intervalMs, batchSize, maxPerTenantPerTick };
  }

  async tick(): Promise<TickResult | null> {
    if (this.running || this.stopping) return null;
    this.running = true;
    const startedAt = new Date().toISOString();
    let gyms = 0; let expired = 0; let skipped = 0; let failures = 0;
    try {
      const manifestDigest = tenantManifestDigest(TENANT_TEMPLATE_MANIFEST);
      const registry = await this.database.master.gym.findMany({
        where: { status: 'ACTIVE', expectedTenantSchemaVersion: TENANT_TEMPLATE_MANIFEST.version,
          expectedTenantManifestDigest: manifestDigest, expectedTenantOperationId: { not: null }, ...(this.gymCursor ? { id: { gt: this.gymCursor } } : {}) },
        orderBy: { id: 'asc' }, take: 1000,
        include: { expectedTenantOperation: { select: { state: true, databaseName: true, kind: true, gymId: true } } },
      });
      for (const gym of registry) {
        this.gymCursor = gym.id;
        if (this.stopping) break;
        const operation = gym.expectedTenantOperation;
        if (operation?.state !== 'COMPLETE') { skipped++; continue; }
        if (operation.databaseName !== gym.databaseName) {
          // Rollout operations reference an already owned physical database;
          // databaseName is unique to its original provisioning operation.
          const owner = operation.kind === 'ROLLOUT_TENANT_SCHEMA' && operation.gymId === gym.id
            ? await this.database.master.operation.findFirst({ where: { kind: 'PROVISION_GYM', state: 'COMPLETE', gymId: gym.id, databaseName: gym.databaseName }, select: { id: true } })
            : null;
          if (!owner) { skipped++; continue; }
        }
        try {
          const counts = await this.database.master.$transaction(async masterTx => {
            const [lock] = await masterTx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${`pt-expiry:${gym.id}`}, 0)) AS locked`;
            if (!lock?.locked) return { skipped: true, expired: 0 };
            return this.tenants.withDatabase(gym.databaseName, async tenant => {
              const evidence = await verifyInstalledTenant(tenant, TENANT_TEMPLATE_MANIFEST);
              const [configuration, schema] = await Promise.all([
                tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } }),
                tenant.schemaState.findUnique({ where: { id: 'current' }, select: { state: true, appliedTemplateVersion: true, appliedManifestDigest: true, lastOperationId: true, verifiedMigrations: true } }),
              ]);
              if (configuration?.masterGymId !== gym.id || schema?.state !== 'VERIFIED'
                || schema.appliedTemplateVersion !== TENANT_TEMPLATE_MANIFEST.version
                || schema.appliedManifestDigest !== manifestDigest
                || schema.lastOperationId !== gym.expectedTenantOperationId
                || canonicalJson(schema.verifiedMigrations) !== canonicalJson(evidence.verifiedMigrations)) throw new Error('Tenant schema or gym binding is not verified');
              let tenantExpired = 0;
              for (let offset = 0; offset < maxPerTenantPerTick; offset += batchSize) {
                const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
                const candidates = await tenant.pTSession.findMany({ where: { state: 'PENDING_CONFIRMATION', requestExpiresAt: { lte: clock!.now } },
                  orderBy: [{ requestExpiresAt: 'asc' }, { id: 'asc' }], take: Math.min(batchSize, maxPerTenantPerTick - offset),
                  select: { id: true, memberId: true, trainerId: true, version: true, createdByIdentityId: true } });
                if (!candidates.length) break;
                for (const candidate of candidates) {
                  const outcome = await expirePendingSession(tenant, gym.id, candidate.id);
                  if (outcome.result.requestOutcome === 'EXPIRED') tenantExpired++; else skipped++;
                }
                if (candidates.length < batchSize) break;
              }
              const reminders = await sweepSessionReminders(tenant, this.database.master, gym.id);
              failures += reminders.failed; this.totalFailures += reminders.failed;
              this.logger.log(`PT reminders: gym=${gym.id} sent=${reminders.sent} failed=${reminders.failed}`);
              return { skipped: false, expired: tenantExpired };
            });
          }, { timeout: 120_000, maxWait: 5_000 });
          gyms++; expired += counts.expired; if (counts.skipped) skipped++;
        } catch (error) {
          failures++; this.totalFailures++;
          this.logger.error(`PT scheduled-work sweep failed for a verified tenant batch (${gym.id}): ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }
      if (registry.length < 1000) this.gymCursor = null;
      const result = { gyms, expired, skipped, failures, startedAt, completedAt: new Date().toISOString() };
      this.lastResult = result;
      this.logger.log(`PT scheduled-work sweep completed: gyms=${gyms} expired=${expired} skipped=${skipped} failures=${failures}`);
      return result;
    } catch (error) {
      failures++; this.totalFailures++;
      const result = { gyms, expired, skipped, failures, startedAt, completedAt: new Date().toISOString() };
      this.lastResult = result;
      this.logger.error(`PT expiry registry scan failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return result;
    } finally { this.running = false; }
  }
}
