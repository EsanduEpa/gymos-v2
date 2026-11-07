import { z } from 'zod';
import { auditEventCodeSchema } from './notifications.js';
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const currency = z.enum(['LKR', 'USD']);
const decimal = z.string().max(128).regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/);
const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const instant = z.iso.datetime({ offset: true });
const localDate = z.iso.date();
const page = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(value => typeof value === 'string' ? Number(value) : value).pipe(z.number().int().min(1).max(1_000_000)).default(1);
const pageSize = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(value => typeof value === 'string' ? Number(value) : value).pipe(z.number().int().min(1).max(100)).default(25);

export const financeWindowQuerySchema = z.strictObject({
  from: localDate,
  to: localDate,
}).superRefine(({ from, to }, ctx) => {
  if (from > to) ctx.addIssue({ code: 'custom', path: ['to'], message: 'End date must not precede start date' });
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if ((end - start) / 86_400_000 > 366) ctx.addIssue({ code: 'custom', path: ['to'], message: 'Finance windows are limited to 367 inclusive dates' });
});
export const financeReadQuerySchema = financeWindowQuerySchema.extend({ page, pageSize });
export const expenseCategorySchema = z.enum(['RENT', 'UTILITIES', 'EQUIPMENT', 'MARKETING', 'SALARIES', 'MAINTENANCE', 'OTHER']);
const amountInput = z.string().regex(/^(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?$/);
const idempotencyKey = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);
export const expenseCreateSchema = z.strictObject({ category: expenseCategorySchema, amount: amountInput, currency, accountingDate: localDate,
  description: z.string().trim().max(500).optional(), recurring: z.boolean().default(false), idempotencyKey });
export const expenseListQuerySchema = financeReadQuerySchema.extend({ category: expenseCategorySchema.optional() });
export const expenseListSchema = z.strictObject({ items: z.array(z.strictObject({ id, category: expenseCategorySchema, amount: decimal,
  currency, accountingDate: localDate, description: z.string().nullable(), recurring: z.boolean(), version: z.number().int().nonnegative(), createdAt: instant })).max(100),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100), totalCount: z.number().int().nonnegative(), totalAmount: decimal,
  from: localDate, to: localDate, currency, asOf: instant });
export const expenseCreateResultSchema = z.strictObject({ id, version: z.number().int().nonnegative(), replayed: z.boolean() });
export const budgetWriteSchema = z.strictObject({ category: expenseCategorySchema, month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  amount: amountInput, currency, expectedVersion: z.number().int().nonnegative().nullable(), idempotencyKey });
export const budgetWriteResultSchema = z.strictObject({ id, version: z.number().int().nonnegative(), replayed: z.boolean() });
export const payrollCloseSchema = z.strictObject({ expectedVersion: z.number().int().nonnegative(), idempotencyKey });
export const payrollApproveSchema = z.strictObject({ expectedVersion: z.number().int().nonnegative(), expectedTotal: decimal, idempotencyKey });
export const payrollCommandResultSchema = z.strictObject({ periodId: id, state: z.enum(['OPEN', 'CLOSED', 'APPROVED']), version: z.number().int().nonnegative(),
  total: decimal, replayed: z.boolean(), approvedAt: instant.nullable() });
export const payrollPeriodListSchema = z.strictObject({ items: z.array(z.strictObject({ id, cadence: z.enum(['WEEKLY', 'MONTHLY']), start: localDate,
  endExclusive: localDate, timezone: z.string().min(1).max(100), state: z.enum(['OPEN', 'CLOSED', 'APPROVED']), version: z.number().int().nonnegative(),
  total: decimal, currency, recordCount: z.number().int().nonnegative() })).max(100), asOf: instant });
export const payrollCurrentSchema = z.strictObject({ asOf: instant, currency, period: z.strictObject({ id, cadence: z.enum(['WEEKLY', 'MONTHLY']),
  start: localDate, endExclusive: localDate, timezone: z.string().min(1).max(100), state: z.enum(['OPEN', 'CLOSED', 'APPROVED']),
  version: z.number().int().nonnegative(), total: decimal, recordCount: z.number().int().nonnegative() }).nullable() });
export const financePnlSchema = z.strictObject({ gymSlug: slug, from: localDate, to: localDate, rangeStart: instant, rangeEndExclusive: instant,
  timeZone: z.string().min(1).max(100), currency, asOf: instant,
  method: z.literal('operational earning by recognition date minus non-salary expenses by accounting date and trainer payroll by source session date; SALARIES-category expenses are displayed separately to prevent double counting'),
  operationalEarning: decimal, expenses: decimal, payrollCost: decimal, salaryExpenseExcluded: decimal, operatingSurplus: decimal,
  expenseByCategory: z.array(z.strictObject({ category: expenseCategorySchema, amount: decimal, sourceCount: z.number().int().nonnegative() })).length(7),
  sourceCounts: z.strictObject({ earning: z.number().int().nonnegative(), expense: z.number().int().nonnegative(), payroll: z.number().int().nonnegative() }) });
export const financeExportInputSchema = z.strictObject({ kind: z.enum(['revenue', 'expenses', 'payroll', 'audit']), from: localDate.optional(), to: localDate.optional(),
  page: z.number().int().min(1).max(1_000_000).default(1), pageSize: z.number().int().min(1).max(100).default(20), actionType: auditEventCodeSchema.optional() })
  .superRefine((value, ctx) => {
    if ((value.kind === 'revenue' || value.kind === 'expenses' || value.kind === 'payroll') && (!value.from || !value.to || value.from > value.to)) {
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'A valid ordered date window is required' });
    }
    if (value.from && value.to && (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / 86_400_000 > 366) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Exports are limited to 367 inclusive dates' });
    }
  });
export const ownerDashboardSchema = z.strictObject({ gymSlug: slug, date: localDate, timeZone: z.string().min(1).max(100),
  rangeStart: instant, rangeEndExclusive: instant, asOf: instant, currency,
  metrics: z.strictObject({
    activeSessionsToday: z.strictObject({ value: z.number().int().nonnegative(), definition: z.string(), numerator: z.number().int().nonnegative(), denominator: z.null(), sourceCount: z.number().int().nonnegative() }),
    activeSessions: z.strictObject({ value: z.number().int().nonnegative(), definition: z.string(), numerator: z.number().int().nonnegative(), denominator: z.null(), sourceCount: z.number().int().nonnegative() }),
    trainersWithSessionsToday: z.strictObject({ value: z.number().int().nonnegative(), definition: z.string(), numerator: z.number().int().nonnegative(), denominator: z.null(), sourceCount: z.number().int().nonnegative() }),
    todayOperationalEarning: z.strictObject({ value: decimal, definition: z.string(), numerator: decimal, denominator: z.null(), sourceCount: z.number().int().nonnegative(), currency }),
    pendingRequests: z.strictObject({ value: z.number().int().nonnegative(), definition: z.string(), numerator: z.number().int().nonnegative(), denominator: z.null(), sourceCount: z.number().int().nonnegative() }),
  }),
  earningChart: z.array(z.strictObject({ startHour: z.number().int().min(6).max(20), endHour: z.number().int().min(8).max(22), amount: decimal, sourceCount: z.number().int().nonnegative() })).length(8),
  sessions: z.array(z.strictObject({ id, state: z.string().min(1).max(32), type: z.string().min(1).max(32), scheduledStartAt: instant,
    scheduledEndAt: instant, memberName: z.string().min(1).max(120), trainerName: z.string().min(1).max(120), currency, fee: decimal })).max(10),
  activeSessionItems: z.array(z.strictObject({ id, startedAt: instant, scheduledStartAt: instant,
    memberName: z.string().min(1).max(120), trainerName: z.string().min(1).max(120) })),
  trainerCards: z.array(z.strictObject({ id, name: z.string().min(1).max(120), scheduledToday: z.number().int().nonnegative(), activeNow: z.number().int().nonnegative() })).max(50),
});
export type OwnerDashboard = z.infer<typeof ownerDashboardSchema>;
export const budgetResultSchema = z.strictObject({ id: id.nullable(), category: expenseCategorySchema, month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  amount: decimal, actual: decimal, variance: decimal, utilizationPercent: z.number().nullable(), status: z.enum(['ON_TRACK', 'OVER_BUDGET']),
  currency, version: z.number().int().nonnegative().nullable() });
export const budgetListSchema = z.strictObject({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), currency,
  items: z.array(budgetResultSchema).length(7), totalBudget: decimal, totalActual: decimal, totalVariance: decimal, asOf: instant });

export const earningLineSchema = z.strictObject({
  id, sourceId: id, sourceType: z.enum(['SESSION_SETTLEMENT', 'MEMBERSHIP_TERM', 'SESSION_PACK']),
  category: z.string().min(1).max(64), occurredAt: instant, amount: decimal, currency,
  trainerId: id.nullable(),
});
export const financeRevenueSchema = z.strictObject({
  gymSlug: slug, from: localDate, to: localDate, rangeStart: instant, rangeEndExclusive: instant,
  currency, asOf: instant, recognitionBasis: z.literal('operational earning; not money received'),
  cashReceived: z.null(), lines: z.array(earningLineSchema).max(100), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(),
  totals: z.strictObject({ completedSession: decimal, missedLate: decimal, lateCancel: decimal,
    membership: decimal, expiredUnusedSeparate: decimal, totalOperational: decimal }),
  deferred: z.strictObject({ membershipUnrecognized: decimal, packAvailable: decimal, packHeld: decimal, expiredPackUnused: decimal }),
});
export const trainerEarningsSchema = z.strictObject({
  gymSlug: slug, trainerId: id, from: localDate, to: localDate,
  rangeStart: instant, rangeEndExclusive: instant, currency, asOf: instant,
  lines: z.array(z.strictObject({ id, sessionId: id, periodId: id,
    scheduledStartAt: instant, amount: decimal, currency, periodState: z.enum(['OPEN', 'CLOSED', 'APPROVED']) })).max(100),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100), totalCount: z.number().int().nonnegative(),
  total: decimal, currentPeriod: z.object({ id, state: z.enum(['OPEN', 'CLOSED', 'APPROVED']), start: localDate,
    endExclusive: localDate, total: decimal }).nullable(),
});
export type FinanceWindowQuery = z.infer<typeof financeWindowQuerySchema>;
