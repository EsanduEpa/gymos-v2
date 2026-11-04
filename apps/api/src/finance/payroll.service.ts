import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { payrollApproveSchema, payrollCloseSchema, payrollCommandResultSchema, payrollCurrentSchema, payrollPeriodListSchema } from '@gymos/contracts';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { OperationConflictError } from '../operations/primitives.js';
import { TenantSchemaGateService } from '../tenancy/tenant-schema-gate.service.js';
import type { TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import type { Prisma } from '../generated/tenant/client.js';
import { DatabaseService } from '../database.service.js';

type Access = TenantGateContext & { identityId: string; role: string; slug: string; actor?: { kind: string; id: string } | null };
function dateOnly(value: Date) { return value.toISOString().slice(0, 10); }
function units(value: string) {
  const negative = value.startsWith('-'); const source = negative ? value.slice(1) : value;
  const [whole = '0', fraction = ''] = source.split('.'); const exact = BigInt(whole) * 10_000n + BigInt((fraction + '0000').slice(0, 4));
  return negative ? -exact : exact;
}
function decimal(value: bigint) { const abs = value < 0n ? -value : value; return `${value < 0n ? '-' : ''}${abs / 10_000n}.${String(abs % 10_000n).padStart(4, '0')}`; }

@Injectable()
export class PayrollService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  async list(access: Access) {
    if (!['OWNER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Payroll is not available to this role');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, masterGymId: true } });
      if (!config?.currency || config.masterGymId !== access.gymId) throw new NotFoundException('Payroll unavailable');
      const currency = config.currency;
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const actorId = access.role === 'TRAINER' ? access.actor?.id ?? '' : undefined;
        const periodWhere: Prisma.TrainerPayPeriodWhereInput = actorId ? { OR: [
          { records: { some: { session: { trainerId: actorId } } } },
          { corrections: { some: { session: { trainerId: actorId } } } },
        ] } : {};
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const periods = await tx.trainerPayPeriod.findMany({ where: periodWhere,
          orderBy: [{ utcStartAt: 'desc' }, { id: 'desc' }], take: 100,
          include: { records: { where: { currency, ...(actorId ? { session: { trainerId: actorId } } : {}) }, select: { amount: true } },
            corrections: { where: { currency, ...(actorId ? { session: { trainerId: actorId } } : {}) }, select: { amount: true } } } });
        return payrollPeriodListSchema.parse({ asOf: clock.now.toISOString(), items: periods.map(period => {
          const total = period.records.reduce((sum, row) => sum + units(row.amount.toString()), 0n)
            + period.corrections.reduce((sum, row) => sum + units(row.amount.toString()), 0n);
          return { id: period.id, cadence: period.cadence, start: dateOnly(period.localStartDate), endExclusive: dateOnly(period.localEndDateExclusive),
            timezone: period.timezone, state: period.state, version: period.version, total: decimal(total), recordCount: period.records.length + period.corrections.length };
        }) });
      });
    });
  }

  async current(access: Access) {
    if (!['OWNER', 'TRAINER'].includes(access.role) || (access.role === 'TRAINER' && access.actor?.kind !== 'TRAINER')) {
      throw new ForbiddenException('Current payroll is not available to this role');
    }
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Current payroll unavailable');
      const currency = config.currency;
      const actorId = access.role === 'TRAINER' ? access.actor!.id : undefined;
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock.now;
        const period = await tx.trainerPayPeriod.findFirst({ where: { utcStartAt: { lte: now }, utcEndAt: { gt: now }, OR: [
          { records: { some: { currency, ...(actorId ? { session: { trainerId: actorId } } : {}) } } },
          { corrections: { some: { currency, ...(actorId ? { session: { trainerId: actorId } } : {}) } } },
        ] }, orderBy: [{ utcStartAt: 'desc' }, { id: 'desc' }], include: {
          records: { where: { currency, ...(actorId ? { session: { trainerId: actorId } } : {}) }, select: { amount: true } },
          corrections: { where: { currency, ...(actorId ? { session: { trainerId: actorId } } : {}) }, select: { amount: true } },
        } });
        const total = !period ? null : access.role === 'OWNER' ? period.calculatedTotal.toString()
          : decimal(period.records.reduce((sum, item) => sum + units(item.amount.toString()), 0n)
            + period.corrections.reduce((sum, item) => sum + units(item.amount.toString()), 0n));
        return payrollCurrentSchema.parse({ asOf: now.toISOString(), currency, period: period ? {
          id: period.id, cadence: period.cadence, start: dateOnly(period.localStartDate), endExclusive: dateOnly(period.localEndDateExclusive),
          timezone: period.timezone, state: period.state, version: period.version, total,
          recordCount: period.records.length + period.corrections.length,
        } : null });
      });
    });
  }

  async close(access: Access, periodId: string, raw: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Only the owner can close payroll');
    const parsed = payrollCloseSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter the current period version and an idempotency key');
    return this.transition(access, periodId, 'CLOSE', parsed.data, parsed.data.idempotencyKey);
  }

  async approve(access: Access, periodId: string, raw: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Only the owner can approve payroll');
    const parsed = payrollApproveSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter the current period version, calculated total and an idempotency key');
    return this.transition(access, periodId, 'APPROVE', parsed.data, parsed.data.idempotencyKey);
  }

  private async transition(access: Access, periodId: string, action: 'CLOSE' | 'APPROVE', input: { expectedVersion: number; expectedTotal?: string }, idempotencyKey: string) {
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, masterGymId: true } });
      const period = await tenant.trainerPayPeriod.findUnique({ where: { id: periodId } });
      if (!config?.currency || config.masterGymId !== access.gymId || !period) throw new NotFoundException('Pay period not found');
      const currency = config.currency;
      const lock = `trainer-pay-period:${access.gymId}:${period.cadence}:${dateOnly(period.localStartDate)}`;
      let command;
      try {
        command = await new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
          commandKind: action === 'CLOSE' ? 'CLOSE_PAY_PERIOD' : 'APPROVE_PAY_PERIOD', idempotencyKey,
          normalizedIntent: { periodId, expectedVersion: input.expectedVersion, ...(input.expectedTotal ? { expectedTotal: input.expectedTotal } : {}) } }, async tx => {
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lock}, 0))`;
          await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id" = ${periodId} FOR UPDATE`;
          const current = await tx.trainerPayPeriod.findUnique({ where: { id: periodId } });
          if (!current) throw new NotFoundException('Pay period not found');
          if (current.version !== input.expectedVersion) throw new ConflictException('Pay period changed; refresh before retrying');
          const fromState = current.state;
          if (action === 'CLOSE' && fromState !== 'OPEN') throw new ConflictException('Only an open period can be closed');
          if (action === 'APPROVE' && fromState !== 'CLOSED') throw new ConflictException('Only a closed period can be approved');
          if (action === 'APPROVE') {
            const [base, corrections] = await Promise.all([
              tx.payRecord.aggregate({ where: { periodId, currency }, _sum: { amount: true } }),
              tx.trainerPayCorrection.aggregate({ where: { correctionPeriodId: periodId, currency }, _sum: { amount: true } }),
            ]);
            const reconciled = units(base._sum?.amount?.toString() ?? '0') + units(corrections._sum?.amount?.toString() ?? '0');
            if (units(current.calculatedTotal.toString()) !== reconciled || !input.expectedTotal || units(input.expectedTotal) !== reconciled) {
              throw new ConflictException('Payroll total changed; reload the period before approval');
            }
          }
          const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
          const updated = await tx.trainerPayPeriod.update({ where: { id: periodId, version: current.version, state: fromState }, data: action === 'CLOSE'
            ? { state: 'CLOSED', version: { increment: 1 } }
            : { state: 'APPROVED', version: { increment: 1 }, approvedAt: now, approvedByIdentityId: access.identityId } });
          const toState = action === 'CLOSE' ? 'CLOSED' : 'APPROVED';
          return { result: { resourceIds: [periodId], version: updated.version }, resourceType: 'PAY_PERIOD', resourceId: periodId,
            audits: [{ actorIdentityId: access.identityId, eventCode: action === 'CLOSE' ? 'PAY_PERIOD_CLOSED' : 'PAY_PERIOD_APPROVED',
              resourceType: 'PAY_PERIOD', resourceId: periodId, transition: { from: fromState, to: toState, version: updated.version } }] };
        });
      } catch (error) { if (error instanceof OperationConflictError) throw new ConflictException('Payroll command conflicts with an earlier request'); throw error; }
      const updated = await tenant.trainerPayPeriod.findUnique({ where: { id: command.result.resourceIds?.[0] ?? periodId } });
      if (!updated) throw new ConflictException('Pay period receipt references a missing period');
      return payrollCommandResultSchema.parse({ periodId: updated.id, state: updated.state, version: updated.version,
        total: updated.calculatedTotal.toString(), replayed: command.replayed, approvedAt: updated.approvedAt?.toISOString() ?? null });
    });
  }
}
