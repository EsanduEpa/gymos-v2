import { z } from 'zod';
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const instant = z.iso.datetime({ offset: true });
const intentBase = { expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(1).max(500), sourceEventId: id };
export const sessionExceptionIntentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...intentBase, kind: z.literal('RESCHEDULE'), initiatedBy: z.enum(['MEMBER', 'TRAINER', 'GYM']), localDate: z.iso.date(), localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), offset: z.string().regex(/^[+-](?:0\d|1[0-4]):[0-5]\d$/).optional(), newEndDateExclusive: z.iso.date().optional() }),
  z.strictObject({ ...intentBase, kind: z.literal('CANCEL'), initiatedBy: z.enum(['MEMBER', 'TRAINER', 'GYM']) }),
  z.strictObject({ ...intentBase, kind: z.literal('REMEDY'), newEndDateExclusive: z.iso.date() }),
  z.strictObject({ ...intentBase, kind: z.literal('CORRECTION'), target: z.enum(['COMPLETED', 'MISSED', 'FREE_CANCELLED', 'LATE_CANCELLED']), actualStartedAt: instant.optional(), actualEndedAt: instant.optional() }),
]);
export const sessionExceptionCommitSchema = z.strictObject({ intent: sessionExceptionIntentSchema, quoteToken: z.string().min(32).max(8192), idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/) });
const money = z.string().regex(/^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/);
export const sessionExceptionQuoteSchema = z.strictObject({
  sessionId: id, kind: z.enum(['RESCHEDULE', 'REMEDY', 'CORRECTION', 'CANCEL']), sessionVersion: z.number().int().nonnegative(),
  sourceEventId: id, expiresAt: instant, quoteToken: z.string(), timeZone: z.string(), currency: z.string(),
  policyVersion: z.number().int().nonnegative(), cancellationCutoff: instant, targetOutcome: z.string(), actualStartedAt: instant.nullable(), actualEndedAt: instant.nullable(),
  oldStartAt: instant, oldEndAt: instant, replacementStartAt: instant.nullable(), replacementEndAt: instant.nullable(), replacementTimeZone: z.string().nullable(),
  sourcePackId: id, sourceCreditOrdinal: z.number().int().positive(), sourceValue: money,
  sourceExpiry: z.iso.date(), proposedExpiry: z.iso.date().nullable(),
  destinationPackId: id.nullable(), destinationCreditOrdinal: z.number().int().positive().nullable(), destinationValue: money.nullable(),
  replacementFee: money.nullable(), replacementCurrency: z.string().nullable(), replacementPayRate: money.nullable(), replacementPolicyVersion: z.number().int().nonnegative().nullable(),
  sourceCreditConsumed: z.boolean(), replacementCreditRequired: z.boolean(),
  operationalDelta: money, trainerPayDelta: money, payPeriodState: z.enum(['OPEN','CLOSED','APPROVED']).nullable(),
  payAdjustmentPeriodStart: z.iso.date().nullable(), payAdjustmentPeriodEndExclusive: z.iso.date().nullable(),
  payResolution: z.string().max(500), consequence: z.string().max(500),
});
export const sessionExceptionResultSchema = z.strictObject({ sessionId: id, adjustmentId: id, replacementSessionId: id.nullable(), version: z.number().int().nonnegative(), replayed: z.boolean() });
export type SessionExceptionIntent = z.infer<typeof sessionExceptionIntentSchema>;
export type SessionExceptionQuote = z.infer<typeof sessionExceptionQuoteSchema>;
