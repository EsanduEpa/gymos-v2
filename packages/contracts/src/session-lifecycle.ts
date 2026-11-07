import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const key = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);
const amount = z.string().regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/);
const instant = z.iso.datetime({ offset: true });
const version = z.number().int().nonnegative();

export const sessionLifecycleCommandInputSchema = z.strictObject({
  expectedVersion: version,
  idempotencyKey: key,
});

export const sessionNotesInputSchema = z.strictObject({
  notes: z.string().nullable(),
  expectedVersion: version,
  idempotencyKey: key,
}).superRefine((value, ctx) => {
  if (Array.from(value.notes ?? '').length > 4000) {
    ctx.addIssue({ code: 'custom', message: 'Notes must be at most 4,000 codepoints', path: ['notes'] });
  }
});

const lifecycleSession = z.strictObject({
  id, memberId: id, trainerId: id,
  state: z.enum(['ACTIVE', 'COMPLETED']),
  scheduledStartAt: instant, scheduledEndAt: instant,
  startedAt: instant, endedAt: instant.nullable(),
  version,
});
const notificationOutcome = z.strictObject({
  eventId: id,
  recipient: z.strictObject({ role: z.literal('MEMBER'), actorId: id }),
  gymSlug: z.string().min(1).max(80),
  state: z.enum(['QUEUED', 'AVAILABLE', 'FAILED']),
  retryable: z.boolean(),
});

export const sessionStartResultSchema = z.strictObject({
  receiptId: id, replayed: z.boolean(), session: lifecycleSession.extend({ state: z.literal('ACTIVE'), endedAt: z.null() }),
  notificationOutcome,
});

export const sessionNotesResultSchema = z.strictObject({
  receiptId: id, replayed: z.boolean(), sessionId: id, notes: z.string().nullable(), version,
}).superRefine((value, ctx) => {
  if (Array.from(value.notes ?? '').length > 4000) ctx.addIssue({ code: 'custom', message: 'Notes must be at most 4,000 codepoints', path: ['notes'] });
});

export const sessionCompleteResultSchema = z.strictObject({
  receiptId: id, replayed: z.boolean(), session: lifecycleSession.extend({ state: z.literal('COMPLETED'), endedAt: instant }),
  creditEffect: z.strictObject({ holdId: id, packId: id, creditOrdinal: z.number().int().min(1).max(1000),
    delta: z.literal(-1), creditValue: amount, balance: z.number().int().nonnegative() }),
  recognizedRevenue: z.strictObject({ recordId: id, amount, currency: z.enum(['LKR', 'USD']) }),
  trainerPay: z.strictObject({ recordId: id, amount, currency: z.enum(['LKR', 'USD']), periodId: id }),
  notificationOutcome,
  auditState: z.literal('AVAILABLE'),
});

export const sessionQuoteActionSchema = z.enum(['CANCEL', 'NO_SHOW']);
export const sessionLifecycleQuoteSchema = z.strictObject({
  sessionId: id,
  action: sessionQuoteActionSchema,
  state: z.enum(['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'EXPIRED']),
  sessionVersion: version,
  policyVersion: version,
  asOf: instant,
  expiresAt: instant,
  eligible: z.boolean(),
  eligibleAt: instant.nullable(),
  cancellationCutoff: instant.nullable(),
  consequence: z.enum(['PENDING_WITHDRAWAL', 'FREE_CANCELLATION', 'LATE_CANCELLATION', 'NO_SHOW']).nullable(),
  requiresAcknowledgment: z.boolean(),
  acknowledgmentToken: z.string().min(32).max(2048).nullable(),
  creditValue: amount.nullable(),
  currency: z.enum(['LKR', 'USD']).nullable(),
  creditOrdinal: z.number().int().min(1).max(1000).nullable(),
});
export const sessionCancelResultSchema = z.strictObject({
  receiptId: id, replayed: z.boolean(), session: z.strictObject({ id, memberId: id, trainerId: id, state: z.literal('CANCELLED'),
    scheduledStartAt: instant, scheduledEndAt: instant, startedAt: z.null(), endedAt: instant, version }),
  consequence: z.enum(['PENDING_WITHDRAWAL', 'FREE_CANCELLATION', 'LATE_CANCELLATION']),
  isLateCancel: z.boolean(), deductedCredits: z.number().int().min(0).max(1),
  creditEffect: z.strictObject({ holdId: id.nullable(), packId: id.nullable(), creditOrdinal: z.number().int().min(1).max(1000).nullable(),
    resolution: z.enum(['RELEASED', 'CONSUMED', 'NONE']), creditValue: amount, balance: z.number().int().nonnegative().nullable() }),
  recognizedRevenue: z.strictObject({ recordId: id.nullable(), amount, currency: z.enum(['LKR', 'USD']) }),
  cutoff: instant.nullable(), policyVersion: version,
  notificationOutcome: z.strictObject({ eventId: id, recipient: z.strictObject({ role: z.enum(['MEMBER', 'TRAINER']), actorId: id }),
    gymSlug: z.string().min(1).max(80), state: z.enum(['QUEUED', 'AVAILABLE', 'FAILED']), retryable: z.boolean() }),
  auditState: z.literal('AVAILABLE'),
});
export const sessionNoShowResultSchema = z.strictObject({
  receiptId: id, replayed: z.boolean(), session: z.strictObject({ id, memberId: id, trainerId: id, state: z.literal('MISSED'),
    scheduledStartAt: instant, scheduledEndAt: instant, startedAt: z.null(), endedAt: instant, version }),
  creditEffect: z.strictObject({ holdId: id, packId: id, creditOrdinal: z.number().int().min(1).max(1000),
    resolution: z.literal('CONSUMED'), creditValue: amount, balance: z.number().int().nonnegative() }),
  recognizedRevenue: z.strictObject({ recordId: id, amount, currency: z.enum(['LKR', 'USD']) }),
  noShowAt: instant, policyVersion: version,
  notificationOutcome: z.strictObject({ eventId: id, recipient: z.strictObject({ role: z.literal('MEMBER'), actorId: id }),
    gymSlug: z.string().min(1).max(80), state: z.enum(['QUEUED', 'AVAILABLE', 'FAILED']), retryable: z.boolean() }),
  auditState: z.literal('AVAILABLE'),
});
export const sessionCancelInputSchema = z.strictObject({
  expectedVersion: version, policyVersion: version, idempotencyKey: key, acknowledgmentToken: z.string().min(32).max(2048).nullable().optional(), reason: z.string().trim().min(1).max(500).optional(), initiatedBy: z.enum(['MEMBER','TRAINER','GYM']).optional(),
});
export const sessionNoShowInputSchema = z.strictObject({
  expectedVersion: version, policyVersion: version, idempotencyKey: key, acknowledgmentToken: z.string().min(32).max(2048),
});

export type SessionLifecycleCommandInput = z.infer<typeof sessionLifecycleCommandInputSchema>;
export type SessionNotesInput = z.infer<typeof sessionNotesInputSchema>;
export type SessionStartResult = z.infer<typeof sessionStartResultSchema>;
export type SessionNotesResult = z.infer<typeof sessionNotesResultSchema>;
export type SessionCompleteResult = z.infer<typeof sessionCompleteResultSchema>;
export type SessionLifecycleQuote = z.infer<typeof sessionLifecycleQuoteSchema>;
export type SessionCancelInput = z.infer<typeof sessionCancelInputSchema>;
export type SessionNoShowInput = z.infer<typeof sessionNoShowInputSchema>;
export type SessionCancelResult = z.infer<typeof sessionCancelResultSchema>;
export type SessionNoShowResult = z.infer<typeof sessionNoShowResultSchema>;
