import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const isoInstantSchema = z.iso.datetime({ offset: true });
const localDateSchema = z.iso.date();

export const sessionReadStateSchema = z.enum(['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'EXPIRED']);
export type SessionReadState = z.infer<typeof sessionReadStateSchema>;
const positivePage = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(v => typeof v === 'string' ? Number(v) : v).pipe(z.number().int().min(1).max(1_000_000));
const pageSize = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(v => typeof v === 'string' ? Number(v) : v).pipe(z.number().int().min(1).max(100));
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const sessionReadQuerySchema = z.strictObject({
  date: localDateSchema.optional(),
  month: monthSchema.optional(),
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
  state: sessionReadStateSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  memberId: idSchema.optional(),
  trainerId: idSchema.optional(),
  page: positivePage.default(1),
  pageSize: pageSize.default(25),
}).superRefine((v, ctx) => {
  const ranges = Number(Boolean(v.date)) + Number(Boolean(v.month)) + Number(Boolean(v.from || v.to));
  if (ranges > 1) ctx.addIssue({ code: 'custom', message: 'Choose one date range', path: ['date'] });
  if (Boolean(v.from) !== Boolean(v.to)) ctx.addIssue({ code: 'custom', message: 'Both range dates are required', path: ['to'] });
  if (v.from && v.to && v.to < v.from) ctx.addIssue({ code: 'custom', message: 'End date must not precede start date', path: ['to'] });
});

export const sessionReadItemSchema = z.strictObject({
  id: idSchema, memberId: idSchema, memberName: z.string().min(1).max(120), trainerId: idSchema, trainerName: z.string().min(1).max(120),
  state: sessionReadStateSchema, type: z.enum(['IN_PERSON', 'VIRTUAL', 'INTRODUCTORY']), version: z.number().int().nonnegative(),
  scheduledStartAt: isoInstantSchema, scheduledEndAt: isoInstantSchema, gymTimeZone: z.string().min(1).max(100),
  startedAt: isoInstantSchema.nullable(), endedAt: isoInstantSchema.nullable(), confirmedAt: isoInstantSchema.nullable(), requestExpiresAt: isoInstantSchema.nullable(), createdAt: isoInstantSchema,
  declineReason: z.string().max(500).nullable(),
  fee: z.string().regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/).nullable(), currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  notes: z.string().max(4000).nullable(), trainerPay: z.string().regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/).nullable(),
  commandAffordances: z.array(z.enum(['ACCEPT', 'DECLINE', 'START', 'UPDATE_NOTES', 'CANCEL', 'WITHDRAW', 'NO_SHOW', 'COMPLETE'])).max(8),
});
export const sessionReadPageSchema = z.strictObject({
  items: z.array(sessionReadItemSchema).max(100), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), asOf: isoInstantSchema,
  timeZone: z.string().min(1).max(100), rangeStart: isoInstantSchema.nullable(), rangeEndExclusive: isoInstantSchema.nullable(),
  filterTotal: z.number().int().nonnegative(),
  summary: z.strictObject({ monthBookings: z.number().int().nonnegative().nullable(), lifetimePackCredits: z.strictObject({ available: z.number().int().nonnegative(), held: z.number().int().nonnegative(), consumed: z.number().int().nonnegative(), expired: z.number().int().nonnegative() }).nullable() }),
});
export const recentSessionListSchema = z.strictObject({
  items: z.array(sessionReadItemSchema).max(10), limit: z.literal(10), totalCount: z.number().int().nonnegative(), hasMore: z.boolean(), asOf: isoInstantSchema, timeZone: z.string().min(1).max(100),
});
export const memberSessionOverviewQuerySchema = z.strictObject({
  month: monthSchema, q: z.string().trim().min(1).max(100).optional(), page: positivePage.default(1), pageSize: pageSize.default(25),
});
const memberMonthCountsSchema = z.strictObject({ pending: z.number().int().nonnegative(), scheduled: z.number().int().nonnegative(), active: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(), missed: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative(), declined: z.number().int().nonnegative(), expired: z.number().int().nonnegative() });
export const memberSessionOverviewItemSchema = z.strictObject({
  member: z.strictObject({ id: idSchema, fullName: z.string().min(2).max(120), email: z.email().max(254).nullable(), status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']) }),
  latestMembership: z.strictObject({ planName: z.string().min(1).max(80), startDate: localDateSchema, endDateExclusive: localDateSchema }).nullable(),
  packTotals: z.strictObject({ total: z.number().int().nonnegative(), remaining: z.number().int().nonnegative(), used: z.number().int().nonnegative(), expiredUnused: z.number().int().nonnegative(), basis: z.literal('LIFETIME') }),
  monthSessionCounts: memberMonthCountsSchema, matchingSessionCount: z.number().int().nonnegative(),
});
export const memberSessionOverviewSchema = z.strictObject({
  items: z.array(memberSessionOverviewItemSchema).max(100), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), matchingMemberCount: z.number().int().nonnegative(),
  month: monthSchema, timeZone: z.string().min(1).max(100), rangeStart: isoInstantSchema, rangeEndExclusive: isoInstantSchema, asOf: isoInstantSchema,
});
export type SessionReadQuery = z.infer<typeof sessionReadQuerySchema>;
export type SessionReadPage = z.infer<typeof sessionReadPageSchema>;
export type MemberSessionOverviewQuery = z.infer<typeof memberSessionOverviewQuerySchema>;
export type MemberSessionOverview = z.infer<typeof memberSessionOverviewSchema>;
