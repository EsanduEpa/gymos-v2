import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { budgetListSchema, budgetResultSchema, budgetWriteSchema, expenseCreateResultSchema, expenseCreateSchema, expenseListQuerySchema, expenseListSchema,
  financeExportInputSchema, financePnlSchema, financeReadQuerySchema, financeRevenueSchema, trainerEarningsSchema } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import type { TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { TenantSchemaGateService } from '../tenancy/tenant-schema-gate.service.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { OperationConflictError } from '../operations/primitives.js';
import { allocateMembershipMinorUnits } from './finance-arithmetic.js';
import { csvDocument } from './finance-csv.js';

type Access = TenantGateContext & { identityId: string; role: string; slug: string; actor?: { kind: string; id: string } | null };
function localParts(date: Date, zone: string, formatter?: Intl.DateTimeFormat) {
  const parts = (formatter ?? new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}
function localMidnight(value: string, zone: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const naive = Date.UTC(year!, month! - 1, day!);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let offset = -14 * 60; offset <= 14 * 60; offset++) {
    const candidate = new Date(naive - offset * 60_000);
    const parts = localParts(candidate, zone, formatter);
    if (Number(parts.year) === year && Number(parts.month) === month && Number(parts.day) === day
      && Number(parts.hour) === 0 && Number(parts.minute) === 0) return candidate;
  }
  throw new UnprocessableEntityException('Finance date boundary cannot be resolved in gym timezone');
}
function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10);
}
function dateColumnBounds(from: string, to: string) {
  return { start: new Date(`${from}T00:00:00.000Z`), end: new Date(`${nextDate(to)}T00:00:00.000Z`) };
}
function monthBounds(month: string, zone: string) {
  const [year, value] = month.split('-').map(Number);
  const end = value === 12 ? `${year! + 1}-01-01` : `${year}-${String(value! + 1).padStart(2, '0')}-01`;
  return { start: localMidnight(`${month}-01`, zone), end: localMidnight(end, zone), endMonth: end };
}
function amountMinor(value: string): bigint { return micros(value); }
function dateAt(date: Date, zone: string) {
  const p = localParts(date, zone);
  return `${p.year}-${p.month}-${p.day}`;
}
function minorUnits2(value: bigint): string { return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`; }
function utilization(actual: bigint, budget: bigint): number | null {
  if (budget === 0n) return null;
  const hundredths = (actual * 10_000n + budget / 2n) / budget;
  return Number(hundredths) / 100;
}
function micros(value: string): bigint {
  const negative = value.startsWith('-');
  const source = negative ? value.slice(1) : value;
  const [whole = '0', fraction = ''] = source.split('.');
  const amount = BigInt(whole) * 10_000n + BigInt((fraction + '0000').slice(0, 4));
  return negative ? -amount : amount;
}
function money(value: bigint): string {
  const abs = value < 0 ? -value : value;
  return `${value < 0 ? '-' : ''}${abs / 10_000n}.${String(abs % 10_000n).padStart(4, '0')}`;
}

@Injectable()
export class FinanceService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  async exportCsv(access: Access, rawInput: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Finance exports are owner-only');
    const parsed = financeExportInputSchema.safeParse(rawInput);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid bounded CSV scope');
    const input = parsed.data;
    if (input.kind !== 'audit' && (!input.from || !input.to)) throw new UnprocessableEntityException('A date range is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Finance export unavailable');
      const currency = config.currency; const zone = config.timezone; let rows: unknown[][]; let headers: string[];
      const snapshot = await tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        if (input.kind === 'revenue') {
          const from = input.from!; const to = input.to!; const start = localMidnight(from, zone); const end = localMidnight(nextDate(to), zone);
          const [facts, terms] = await Promise.all([
            tx.revenueRecord.findMany({ where: { currency, session: { scheduledStartAt: { gte: start, lt: end } } }, orderBy: [{ session: { scheduledStartAt: 'asc' } }, { id: 'asc' }], take: 5001,
            select: { id: true, sourceKey: true, category: true, amount: true, currency: true, session: { select: { scheduledStartAt: true } } } }),
            tx.membershipTerm.findMany({ where: { currency }, take: 5001, orderBy: [{ startDate: 'asc' }, { id: 'asc' }], select: { id: true, agreedPrice: true, currency: true, startDate: true, endDateExclusive: true } }),
          ]);
          if (facts.length > 5000 || terms.length > 5000) throw new UnprocessableEntityException('CSV source exceeds 5,000 rows');
          const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`; const today = dateAt(clock!.now, zone); const projected: Array<{ date: string; id: string; amount: string; currency: string }> = [];
          for (const term of terms) {
            const termStart = term.startDate.toISOString().slice(0, 10); const termEnd = term.endDateExclusive.toISOString().slice(0, 10);
            const days = Math.round((Date.parse(`${termEnd}T00:00:00Z`) - Date.parse(`${termStart}T00:00:00Z`)) / 86_400_000); if (days < 1) continue;
            const last = today < termEnd ? today : termEnd; const first = termStart > from ? termStart : from; const through = last < nextDate(to) ? last : nextDate(to);
            const count = Math.max(0, Math.round((Date.parse(`${through}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000));
            if (projected.length + count + facts.length > 5000) throw new UnprocessableEntityException('CSV source exceeds 5,000 rows');
            const total = BigInt(term.agreedPrice.toFixed(2).replace('.', ''));
            for (let i = 0; i < count; i++) { const day = new Date(Date.parse(`${first}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
              const index = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${termStart}T00:00:00Z`)) / 86_400_000);
              projected.push({ date: day, id: `membership-term:${term.id}:${day}`, amount: minorUnits2(allocateMembershipMinorUnits(total, days, index)), currency: term.currency }); }
          }
          const output = [
            ...facts.map(row => [row.session.scheduledStartAt.toISOString(), row.category, row.sourceKey, row.amount.toString(), row.currency, 'Operational earning; not money received']),
            ...projected.map(row => [`${row.date}T00:00:00`, 'MEMBERSHIP_DAILY', row.id, row.amount, row.currency, 'Operational earning; not money received']),
          ].sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[2]).localeCompare(String(b[2])));
          headers = ['Occurred at', 'Category', 'Source key', 'Amount', 'Currency', 'Basis']; rows = output;
        } else if (input.kind === 'expenses') {
          const range = dateColumnBounds(input.from!, input.to!);
          const expenses = await tx.expenseRecord.findMany({ where: { currency, accountingDate: { gte: range.start, lt: range.end } }, orderBy: [{ accountingDate: 'asc' }, { id: 'asc' }], take: 5001,
            select: { id: true, category: true, amount: true, currency: true, accountingDate: true, description: true, recurring: true, createdAt: true } });
          if (expenses.length > 5000) throw new UnprocessableEntityException('CSV source exceeds 5,000 rows');
          headers = ['Accounting date', 'Category', 'Amount', 'Currency', 'Description', 'Recurring note', 'Created at'];
          rows = expenses.map(row => [row.accountingDate.toISOString().slice(0, 10), row.category, row.amount.toString(), row.currency, row.description, row.recurring, row.createdAt.toISOString()]);
        } else if (input.kind === 'payroll') {
          const start = localMidnight(input.from!, zone); const end = localMidnight(nextDate(input.to!), zone);
          const [records, corrections] = await Promise.all([
            tx.payRecord.findMany({ where: { currency, session: { scheduledStartAt: { gte: start, lt: end } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5001,
              include: { period: { select: { cadence: true, localStartDate: true, localEndDateExclusive: true, state: true } }, session: { select: { trainerId: true, scheduledStartAt: true } } } }),
            tx.trainerPayCorrection.findMany({ where: { currency, session: { scheduledStartAt: { gte: start, lt: end } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5001,
              include: { correctionPeriod: { select: { cadence: true, localStartDate: true, localEndDateExclusive: true, state: true } }, session: { select: { trainerId: true, scheduledStartAt: true } } } }),
          ]);
          if (records.length + corrections.length > 5000) throw new UnprocessableEntityException('CSV source exceeds 5,000 rows');
          headers = ['Source session date', 'Trainer ID', 'Session ID', 'Payroll period', 'Period state', 'Amount', 'Currency', 'Record type'];
          rows = [...records.map(row => [row.session.scheduledStartAt.toISOString(), row.session.trainerId, row.sessionId, `${row.period.cadence}:${row.period.localStartDate.toISOString().slice(0, 10)}–${row.period.localEndDateExclusive.toISOString().slice(0, 10)}`, row.period.state, row.amount.toString(), row.currency, 'PAY_RECORD']),
            ...corrections.map(row => [row.session.scheduledStartAt.toISOString(), row.session.trainerId, row.sessionId, `${row.correctionPeriod.cadence}:${row.correctionPeriod.localStartDate.toISOString().slice(0, 10)}–${row.correctionPeriod.localEndDateExclusive.toISOString().slice(0, 10)}`, row.correctionPeriod.state, row.amount.toString(), row.currency, 'CORRECTION'])].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
        } else {
          const where = input.actionType ? { eventCode: input.actionType } : {};
          const logs = await tx.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (input.page - 1) * input.pageSize, take: input.pageSize,
            select: { id: true, eventCode: true, actorIdentityId: true, originalActorIdentityId: true, resourceType: true, resourceId: true, transition: true, createdAt: true } });
          headers = ['Event ID', 'Created at UTC', 'Action', 'Actor ID', 'Original actor ID', 'Resource type', 'Resource ID', 'From', 'To', 'Version'];
          rows = logs.map(row => { const transition = row.transition && typeof row.transition === 'object' && !Array.isArray(row.transition) ? row.transition as Record<string, unknown> : {};
            return [row.id, row.createdAt.toISOString(), row.eventCode, row.actorIdentityId, row.originalActorIdentityId, row.resourceType, row.resourceId,
              typeof transition.from === 'string' ? transition.from : '', typeof transition.to === 'string' ? transition.to : '', typeof transition.version === 'number' ? transition.version : '']; });
        }
        if (rows.length > 5000) throw new UnprocessableEntityException('CSV source exceeds 5,000 rows');
        return { headers, rows };
      }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
      await new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
        commandKind: 'EXPORT_GYM_CSV', idempotencyKey: randomUUID(), normalizedIntent: { kind: input.kind, from: input.from ?? null, to: input.to ?? null, page: input.page, pageSize: input.pageSize, actionType: input.actionType ?? null } },
        async () => ({ result: { resourceIds: [] }, resourceType: 'CSV_EXPORT', resourceId: input.kind,
          audits: [{ actorIdentityId: access.identityId, eventCode: 'CSV_EXPORTED', resourceType: 'CSV_EXPORT', resourceId: input.kind,
            transition: { to: input.kind, version: 0 } }] }));
      return { filename: `gymos-${access.slug}-${input.kind}-${input.from ?? 'current-page'}-${input.to ?? ''}.csv`.replace(/[^A-Za-z0-9_.-]/g, '_'),
        content: csvDocument(snapshot.headers, snapshot.rows) };
    });
  }

  async pnl(access: Access, queryInput: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Gym financials are owner-only');
    const parsed = financeReadQuerySchema.safeParse(queryInput);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid P&L window');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('P&L view unavailable');
      const currency = config.currency;
      const zone = config.timezone;
      const start = localMidnight(parsed.data.from, zone);
      const end = localMidnight(nextDate(parsed.data.to), zone);
      const accounting = dateColumnBounds(parsed.data.from, parsed.data.to);
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          const [clock, earningRows, terms, expenseGroups, expenseCount, payRecords, corrections] = await Promise.all([
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
          tx.revenueRecord.findMany({ where: { currency, category: { not: 'EXPIRED_UNUSED' }, session: { scheduledStartAt: { gte: start, lt: end } } }, take: 5001,
            orderBy: [{ session: { scheduledStartAt: 'asc' } }, { id: 'asc' }], select: { amount: true } }),
          tx.membershipTerm.findMany({ where: { currency }, take: 5001, orderBy: [{ startDate: 'asc' }, { id: 'asc' }], select: { id: true, agreedPrice: true, startDate: true, endDateExclusive: true } }),
          tx.expenseRecord.groupBy({ by: ['category'], where: { currency, accountingDate: { gte: accounting.start, lt: accounting.end } }, _sum: { amount: true }, _count: { _all: true } }),
          tx.expenseRecord.count({ where: { currency, accountingDate: { gte: accounting.start, lt: accounting.end } } }),
          tx.payRecord.aggregate({ where: { currency, session: { scheduledStartAt: { gte: start, lt: end } } }, _sum: { amount: true }, _count: { _all: true } }),
          tx.trainerPayCorrection.aggregate({ where: { currency, session: { scheduledStartAt: { gte: start, lt: end } } }, _sum: { amount: true }, _count: { _all: true } }),
        ]);
        if (terms.length > 5000) throw new UnprocessableEntityException('P&L membership source exceeds its bound');
        const asOf = clock[0]!.now;
        const today = dateAt(asOf, zone);
        const afterToday = nextDate(today);
        let membershipMinor = 0n;
        let projectedLines = 0;
        for (const term of terms) {
          const termStart = term.startDate.toISOString().slice(0, 10);
          const termEnd = term.endDateExclusive.toISOString().slice(0, 10);
          const days = Math.round((Date.parse(`${termEnd}T00:00:00Z`) - Date.parse(`${termStart}T00:00:00Z`)) / 86_400_000);
          if (days < 1) continue;
          const recognizedThrough = today < termEnd ? today : termEnd;
          const first = termStart > parsed.data.from ? termStart : parsed.data.from;
          const lastExclusive = recognizedThrough < afterToday ? recognizedThrough : afterToday;
          const count = Math.max(0, Math.round((Date.parse(`${lastExclusive}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000));
          projectedLines += count;
          if (projectedLines > 5000) throw new UnprocessableEntityException('P&L membership projection exceeds its bound');
          const total = BigInt(term.agreedPrice.toFixed(2).replace('.', ''));
          for (let offset = 0; offset < count; offset++) {
            const date = new Date(Date.parse(`${first}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
            const index = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${termStart}T00:00:00Z`)) / 86_400_000);
            membershipMinor += allocateMembershipMinorUnits(total, days, index) * 100n;
          }
        }
        if (earningRows.length > 5000) throw new UnprocessableEntityException('P&L operational earning source exceeds its bound');
        const sourceEarning = earningRows.reduce((sum, row) => sum + micros(row.amount.toString()), 0n);
        const operationalEarning = sourceEarning + membershipMinor;
        const categories = ['RENT', 'UTILITIES', 'EQUIPMENT', 'MARKETING', 'SALARIES', 'MAINTENANCE', 'OTHER'] as const;
        const byCategory = new Map(expenseGroups.map(row => [row.category, row]));
        const expenseRows = categories.map(category => { const row = byCategory.get(category); return { category,
          amount: row?._sum.amount?.toString() ?? '0.0000', sourceCount: row?._count._all ?? 0 }; });
        const salaryExpenseExcluded = micros(expenseRows.find(row => row.category === 'SALARIES')!.amount);
        const nonSalaryExpenses = expenseRows.reduce((sum, row) => row.category === 'SALARIES' ? sum : sum + micros(row.amount), 0n);
        const payroll = micros(payRecords._sum.amount?.toString() ?? '0') + micros(corrections._sum.amount?.toString() ?? '0');
        return financePnlSchema.parse({ gymSlug: access.slug, from: parsed.data.from, to: parsed.data.to, rangeStart: start.toISOString(),
          rangeEndExclusive: end.toISOString(), timeZone: zone, currency, asOf: asOf.toISOString(),
          method: 'operational earning by recognition date minus non-salary expenses by accounting date and trainer payroll by source session date; SALARIES-category expenses are displayed separately to prevent double counting',
          operationalEarning: money(operationalEarning), expenses: money(nonSalaryExpenses), payrollCost: money(payroll),
          salaryExpenseExcluded: money(salaryExpenseExcluded), operatingSurplus: money(operationalEarning - nonSalaryExpenses - payroll), expenseByCategory: expenseRows,
          sourceCounts: { earning: earningRows.length + projectedLines, expense: expenseCount, payroll: payRecords._count._all + corrections._count._all } });
      }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
    });
  }

  async revenue(access: Access, queryInput: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Gym financials are owner-only');
    const query = financeReadQuerySchema.safeParse(queryInput);
    if (!query.success) throw new UnprocessableEntityException('Enter a valid finance window and page');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Finance view unavailable');
      const currency = config.currency;
      const zone = config.timezone;
      const start = localMidnight(query.data.from, zone);
      const endExclusive = localMidnight(nextDate(query.data.to), zone);
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock, rows, grouped, terms] = await Promise.all([
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
          tx.revenueRecord.findMany({ where: { currency, session: { scheduledStartAt: { gte: start, lt: endExclusive } } },
            orderBy: [{ session: { scheduledStartAt: 'asc' } }, { id: 'asc' }], take: 5001,
            include: { session: { select: { trainerId: true, scheduledStartAt: true } } } }),
          tx.revenueRecord.findMany({ where: { currency, session: { scheduledStartAt: { gte: start, lt: endExclusive } } }, take: 5001,
            select: { category: true, amount: true } }),
          tx.membershipTerm.findMany({ where: { currency }, orderBy: [{ startDate: 'asc' }, { id: 'asc' }], take: 5001,
            select: { id: true, agreedPrice: true, currency: true, startDate: true, endDateExclusive: true } }),
        ]);
        if (rows.length > 5000 || terms.length > 5000) throw new UnprocessableEntityException('Finance projection exceeds its bounded source limit');
        const totals = { completedSession: 0n, missedLate: 0n, lateCancel: 0n, membership: 0n, expiredUnusedSeparate: 0n };
        if (grouped.length > 5000) throw new UnprocessableEntityException('Finance earning source exceeds its bounded window limit');
        for (const row of grouped) {
          const amount = micros(row.amount.toString());
          if (row.category === 'COMPLETED_SESSION') totals.completedSession += amount;
          else if (row.category === 'MISSED_LATE') totals.missedLate += amount;
          else if (row.category === 'LATE_CANCEL') totals.lateCancel += amount;
          else if (row.category === 'EXPIRED_UNUSED') totals.expiredUnusedSeparate += amount;
        }
        const asOf = clock[0]!.now;
        const today = dateAt(asOf, zone);
        const termRows = terms.map(term => {
          const termStart = term.startDate.toISOString().slice(0, 10);
          const termEnd = term.endDateExclusive.toISOString().slice(0, 10);
          const duration = (Date.parse(`${termEnd}T00:00:00Z`) - Date.parse(`${termStart}T00:00:00Z`)) / 86_400_000;
          const totalMinor = BigInt(term.agreedPrice.toFixed(2).replace('.', ''));
          const recognizedTo = today < termEnd ? today : termEnd;
          const elapsedDays = Math.max(0, Math.min(duration, (Date.parse(`${recognizedTo}T00:00:00Z`) - Date.parse(`${termStart}T00:00:00Z`)) / 86_400_000));
          const base = totalMinor / BigInt(duration);
          const remainder = totalMinor % BigInt(duration);
          const earnedBefore = base * BigInt(elapsedDays) + (BigInt(elapsedDays) < remainder ? BigInt(elapsedDays) : remainder);
          const fromDate = termStart > query.data.from ? termStart : query.data.from;
          const throughDate = recognizedTo < nextDate(query.data.to) ? recognizedTo : nextDate(query.data.to);
          const lineCount = Math.max(0, (Date.parse(`${throughDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);
          return { term, termStart, termEnd, duration, totalMinor, recognizedTo, fromDate, lineCount, earnedBefore };
        });
        const projectedCount = termRows.reduce((sum, row) => sum + row.lineCount, 0);
        if (projectedCount > 5000) throw new UnprocessableEntityException('Membership earning projection exceeds its bounded window limit');
        const membershipLineRows: Array<{ id: string; sourceId: string; sourceType: 'MEMBERSHIP_TERM'; category: string; occurredAt: string; amount: string; currency: string; trainerId: null }> = [];
        let membershipTotal = 0n;
        let membershipUnrecognized = 0n;
        for (const item of termRows) {
          membershipUnrecognized += item.totalMinor - item.earnedBefore;
          for (let offset = 0; offset < item.lineCount; offset++) {
            const date = new Date(Date.parse(`${item.fromDate}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
            const index = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${item.termStart}T00:00:00Z`)) / 86_400_000;
            const amount = allocateMembershipMinorUnits(item.totalMinor, item.duration, index);
            const sourceId = `membership-term:${item.term.id}:${date}`;
            const line = { id: sourceId, sourceId, sourceType: 'MEMBERSHIP_TERM' as const, category: 'MEMBERSHIP_DAILY',
              occurredAt: localMidnight(date, zone).toISOString(), amount: minorUnits2(amount), currency: item.term.currency, trainerId: null };
            membershipLineRows.push(line);
            membershipTotal += amount * 100n;
          }
        }
        const [packDeferred] = await tx.$queryRaw<{ available: string; held: string; expired: string; recordedExpired: string; inconsistent: bigint }[]>`
          SELECT COALESCE(SUM(CASE WHEN "effectiveEndDateExclusive">${today}::date THEN available*"valueMinorUnits" ELSE 0 END),0)::text AS available,
            COALESCE(SUM(held*"valueMinorUnits"),0)::text AS held,
            COALESCE(SUM((expired+CASE WHEN "effectiveEndDateExclusive"<=${today}::date THEN available ELSE 0 END)*"valueMinorUnits"),0)::text AS expired,
            COALESCE(SUM(CASE WHEN (expired=1 OR (available=1 AND "effectiveEndDateExclusive"<=${today}::date)) AND EXISTS (
              SELECT 1 FROM "RevenueRecord" r JOIN "SessionCreditHold" h ON h."sessionId"=r."sessionId"
              WHERE h."packId"=u."packId" AND h."creditOrdinal"=u."creditOrdinal" AND r.category='EXPIRED_UNUSED' GROUP BY h."packId",h."creditOrdinal" HAVING SUM(r.amount)>0
            ) THEN "valueMinorUnits" ELSE 0 END),0)::text AS "recordedExpired",
            COUNT(*) FILTER (WHERE NOT consistent)::bigint AS inconsistent
          FROM "PTCreditUnitBalance" u WHERE currency=${currency}`;
        if (!packDeferred || BigInt(packDeferred.inconsistent) > 0n) throw new ConflictException('Pack value allocation is inconsistent; finance read is unavailable');
        const packAvailable = BigInt(packDeferred.available);
        const packHeld = BigInt(packDeferred.held);
        const packExpired = BigInt(packDeferred.expired);
        const allLines = [
          ...rows.map(row => ({ id: row.id, sourceId: row.sourceKey, sourceType: 'SESSION_SETTLEMENT' as const, category: row.category,
            occurredAt: row.session.scheduledStartAt.toISOString(), amount: row.amount.toString(), currency: row.currency, trainerId: row.session.trainerId })),
          ...membershipLineRows.filter(row => row.occurredAt >= start.toISOString() && row.occurredAt < endExclusive.toISOString()),
        ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
        const totalsMembership = totals.membership + membershipTotal;
        const pageLines = allLines.slice((query.data.page - 1) * query.data.pageSize, query.data.page * query.data.pageSize);
        return financeRevenueSchema.parse({ gymSlug: access.slug, from: query.data.from, to: query.data.to, rangeStart: start.toISOString(),
          rangeEndExclusive: endExclusive.toISOString(), currency, asOf: asOf.toISOString(),
          recognitionBasis: 'operational earning; not money received', cashReceived: null,
          lines: pageLines, page: query.data.page, pageSize: query.data.pageSize, totalCount: allLines.length,
          totals: { completedSession: money(totals.completedSession), missedLate: money(totals.missedLate), lateCancel: money(totals.lateCancel),
            membership: money(totalsMembership), expiredUnusedSeparate: money(totals.expiredUnusedSeparate + (packExpired - BigInt(packDeferred.recordedExpired)) * 100n),
            totalOperational: money(totals.completedSession + totals.missedLate + totals.lateCancel + totalsMembership) },
          deferred: { membershipUnrecognized: minorUnits2(membershipUnrecognized), packAvailable: minorUnits2(packAvailable),
            packHeld: minorUnits2(packHeld), expiredPackUnused: minorUnits2(packExpired) } });
      });
    });
  }

  async listExpenses(access: Access, queryInput: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Expenses are owner-only');
    const parsed = expenseListQuerySchema.safeParse(queryInput);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid expense window and page');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Expense view unavailable');
      const currency = config.currency;
      const { start, end } = dateColumnBounds(parsed.data.from, parsed.data.to);
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const where = { currency, accountingDate: { gte: start, lt: end }, ...(parsed.data.category ? { category: parsed.data.category } : {}) };
        const [clock, totalCount, total, items] = await Promise.all([
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`, tx.expenseRecord.count({ where }),
          tx.expenseRecord.aggregate({ where, _sum: { amount: true } }),
          tx.expenseRecord.findMany({ where, orderBy: [{ accountingDate: 'desc' }, { id: 'asc' }], skip: (parsed.data.page - 1) * parsed.data.pageSize,
            take: parsed.data.pageSize, select: { id: true, category: true, amount: true, currency: true, accountingDate: true, description: true,
              recurring: true, version: true, createdAt: true } }),
        ]);
        return expenseListSchema.parse({ items: items.map(item => ({ ...item, amount: item.amount.toString(), accountingDate: item.accountingDate.toISOString().slice(0, 10), createdAt: item.createdAt.toISOString() })),
          page: parsed.data.page, pageSize: parsed.data.pageSize, totalCount, totalAmount: total._sum.amount?.toString() ?? '0.0000',
          from: parsed.data.from, to: parsed.data.to, currency, asOf: clock[0]!.now.toISOString() });
      });
    });
  }

  async createExpense(access: Access, body: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Expenses are owner-only');
    const parsed = expenseCreateSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid category, exact amount and accounting date');
    const input = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Expense entry unavailable');
      if (config.currency !== input.currency) throw new UnprocessableEntityException('Expense currency must match gym currency');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (input.accountingDate > today) throw new UnprocessableEntityException('Expense date cannot be in the future');
      const id = randomUUID();
      let command;
      try {
        command = await new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
          commandKind: 'CREATE_EXPENSE', idempotencyKey: input.idempotencyKey,
          normalizedIntent: { category: input.category, amount: input.amount, currency: input.currency, accountingDate: input.accountingDate,
            description: input.description ?? null, recurring: input.recurring } }, async (tx, receipt) => {
          const row = await tx.expenseRecord.create({ data: { id, category: input.category, amount: input.amount, currency: input.currency,
            accountingDate: new Date(`${input.accountingDate}T00:00:00.000Z`), description: input.description || null, recurring: input.recurring,
            commandReceiptId: receipt.id, createdByIdentityId: access.identityId } });
          return { result: { resourceIds: [row.id], version: row.version }, resourceType: 'EXPENSE', resourceId: row.id,
            audits: [{ actorIdentityId: access.identityId, eventCode: 'EXPENSE_CREATED', resourceType: 'EXPENSE', resourceId: row.id, transition: { to: input.category, version: row.version } }] };
        });
      } catch (error) { if (error instanceof OperationConflictError) throw new ConflictException('Expense request conflicts with an earlier command'); throw error; }
      return expenseCreateResultSchema.parse({ id: command.result.resourceIds?.[0], version: command.result.version ?? 0, replayed: command.replayed });
    });
  }

  async listBudgets(access: Access, month: string) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Budgets are owner-only');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new UnprocessableEntityException('Enter a valid budget month');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Budget view unavailable');
      const currency = config.currency;
      const bounds = { start: new Date(`${month}-01T00:00:00.000Z`), end: new Date(`${monthBounds(month, config.timezone).endMonth}T00:00:00.000Z`) };
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock, rows, actuals] = await Promise.all([
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
          tx.categoryBudget.findMany({ where: { month: new Date(`${month}-01T00:00:00.000Z`), currency }, orderBy: { category: 'asc' } }),
          tx.expenseRecord.groupBy({ by: ['category'], where: { currency, accountingDate: { gte: bounds.start, lt: bounds.end } }, _sum: { amount: true } }),
        ]);
        const actual = new Map(actuals.map(row => [row.category, row._sum?.amount?.toString() ?? '0.0000']));
        const byCategory = new Map(rows.map(row => [row.category, row]));
        const categories = ['RENT', 'UTILITIES', 'EQUIPMENT', 'MARKETING', 'SALARIES', 'MAINTENANCE', 'OTHER'] as const;
        const values = categories.map(category => {
          const row = byCategory.get(category);
          const budget = row?.amount.toString() ?? '0.0000';
          const spend = actual.get(category) ?? '0.0000';
          const budgetMinor = amountMinor(budget);
          const actualMinor = amountMinor(spend);
          const variance = actualMinor - budgetMinor;
          return budgetResultSchema.parse({ id: row?.id ?? null, category, month, amount: budget, actual: spend,
            variance: money(variance), utilizationPercent: utilization(actualMinor, budgetMinor),
            status: variance > 0n ? 'OVER_BUDGET' : 'ON_TRACK', currency, version: row?.version ?? null });
        });
        const totalBudget = rows.reduce((sum, row) => sum + amountMinor(row.amount.toString()), 0n);
        const totalActual = actuals.reduce((sum, row) => sum + amountMinor(row._sum?.amount?.toString() ?? '0.0000'), 0n);
        return budgetListSchema.parse({ month, currency, items: values, totalBudget: money(totalBudget), totalActual: money(totalActual),
          totalVariance: money(totalActual - totalBudget), asOf: clock[0]!.now.toISOString() });
      });
    });
  }

  async setBudget(access: Access, body: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Budgets are owner-only');
    const parsed = budgetWriteSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid budget category, month and amount');
    const input = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Budget entry unavailable');
      if (config.currency !== input.currency) throw new UnprocessableEntityException('Budget currency must match gym currency');
      const monthDate = new Date(`${input.month}-01T00:00:00.000Z`);
      let command;
      try {
        command = await new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
          commandKind: 'SET_CATEGORY_BUDGET', idempotencyKey: input.idempotencyKey,
          normalizedIntent: { category: input.category, month: input.month, amount: input.amount, currency: input.currency, expectedVersion: input.expectedVersion } }, async (tx, receipt) => {
          await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`budget:${input.category}:${input.month}`},0))`;
          const existing = await tx.categoryBudget.findUnique({ where: { category_month: { category: input.category, month: monthDate } } });
          if ((existing?.version ?? null) !== input.expectedVersion) throw new ConflictException('Budget changed; reload before saving');
          const row = existing ? await tx.categoryBudget.update({ where: { id: existing.id }, data: { amount: input.amount, version: { increment: 1 }, commandReceiptId: receipt.id } })
            : await tx.categoryBudget.create({ data: { category: input.category, month: monthDate, amount: input.amount, currency: input.currency,
              commandReceiptId: receipt.id, actorIdentityId: access.identityId } });
          return { result: { resourceIds: [row.id], version: row.version }, resourceType: 'CATEGORY_BUDGET', resourceId: row.id,
            audits: [{ actorIdentityId: access.identityId, eventCode: 'BUDGET_SET', resourceType: 'CATEGORY_BUDGET', resourceId: row.id,
              transition: { from: existing ? String(existing.version) : 'NONE', to: input.category, version: row.version } }] };
        });
      } catch (error) { if (error instanceof OperationConflictError) throw new ConflictException('Budget request conflicts with an earlier command'); throw error; }
      return { id: command.result.resourceIds?.[0], version: command.result.version ?? 0, replayed: command.replayed };
    });
  }

  async myEarnings(access: Access, queryInput: unknown) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer earnings are available only to the assigned trainer');
    const query = financeReadQuerySchema.safeParse(queryInput);
    if (!query.success) throw new UnprocessableEntityException('Enter a valid earnings window and page');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const [config, trainer] = await Promise.all([
        tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } }),
        tenant.trainer.findFirst({ where: { id: access.actor!.id, identityId: access.identityId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } }),
      ]);
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId || !trainer) throw new NotFoundException('Trainer earnings unavailable');
      const currency = config.currency;
      const start = localMidnight(query.data.from, config.timezone);
      const endExclusive = localMidnight(nextDate(query.data.to), config.timezone);
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock, baseRows, correctionRows] = await Promise.all([
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
          tx.payRecord.findMany({ where: { currency, session: { trainerId: trainer.id, scheduledStartAt: { gte: start, lt: endExclusive } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5001, include: { period: { select: { id: true, state: true } }, session: { select: { scheduledStartAt: true } } } }),
          tx.trainerPayCorrection.findMany({ where: { currency, session: { trainerId: trainer.id, scheduledStartAt: { gte: start, lt: endExclusive } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5001, include: { correctionPeriod: { select: { id: true, state: true } }, session: { select: { scheduledStartAt: true } } } }),
        ]);
        if (baseRows.length + correctionRows.length > 5000) throw new UnprocessableEntityException('Narrow the earnings date range');
        const allRows = [...baseRows, ...correctionRows.map(row => ({ ...row, periodId: row.correctionPeriodId, period: row.correctionPeriod }))].sort((a,b) => a.createdAt.getTime()-b.createdAt.getTime() || a.id.localeCompare(b.id));
        const totalCount = allRows.length;
        const totalAmount = money(allRows.reduce((sum,row) => sum + micros(row.amount.toString()),0n));
        const rows = allRows.slice((query.data.page-1)*query.data.pageSize,query.data.page*query.data.pageSize);
        const currentPeriod = await tx.trainerPayPeriod.findFirst({ where: { utcStartAt: { lte: clock[0]!.now }, utcEndAt: { gt: clock[0]!.now }, OR: [
          { records: { some: { session: { trainerId: trainer.id } } } },
          { corrections: { some: { session: { trainerId: trainer.id } } } },
        ] }, orderBy: { utcStartAt: 'desc' }, include: {
          records: { where: { currency, session: { trainerId: trainer.id } }, select: { amount: true } },
          corrections: { where: { currency, session: { trainerId: trainer.id } }, select: { amount: true } },
        } });
        const currentTotal = currentPeriod ? money(currentPeriod.records.reduce((sum, row) => sum + micros(row.amount.toString()), 0n)
          + currentPeriod.corrections.reduce((sum, row) => sum + micros(row.amount.toString()), 0n)) : null;
        return trainerEarningsSchema.parse({ gymSlug: access.slug, trainerId: trainer.id, from: query.data.from, to: query.data.to,
          rangeStart: start.toISOString(), rangeEndExclusive: endExclusive.toISOString(), currency, asOf: clock[0]!.now.toISOString(),
          lines: rows.map(row => ({ id: row.id, sessionId: row.sessionId, periodId: row.periodId, scheduledStartAt: row.session.scheduledStartAt.toISOString(),
            amount: row.amount.toString(), currency: row.currency, periodState: row.period.state })), page: query.data.page, pageSize: query.data.pageSize,
          totalCount, total: totalAmount, currentPeriod: currentPeriod ? {
            id: currentPeriod.id, state: currentPeriod.state, start: currentPeriod.localStartDate.toISOString().slice(0, 10),
            endExclusive: currentPeriod.localEndDateExclusive.toISOString().slice(0, 10), total: currentTotal!,
          } : null });
      });
    });
  }
}
