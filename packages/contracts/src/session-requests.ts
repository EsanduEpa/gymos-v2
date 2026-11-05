import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const date = z.iso.date();
const time = z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/);
const amount = z.string().regex(/^(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?$/);
const currency = z.enum(['LKR', 'USD']);
const level = z.enum(['LEVEL_1', 'LEVEL_2']);
const type = z.enum(['IN_PERSON', 'VIRTUAL', 'INTRODUCTORY']);
const newSessionType = z.literal('IN_PERSON');
const notificationOutcome = z.strictObject({ eventId: id, recipient: z.strictObject({ role: z.enum(['MEMBER', 'TRAINER']), actorId: id }),
  gymSlug: z.string().min(1).max(80), state: z.enum(['QUEUED', 'AVAILABLE', 'FAILED']), retryable: z.boolean() });

export const sessionRequestInputSchema = z.strictObject({
  trainerId: id,
  localDate: date, localTime: time, timeZone: z.string().min(1).max(100),
  offset: z.string().regex(/^(?:\+|-)(?:0[0-9]|1[0-4]):[0-5][0-9]$/).optional(),
  type: newSessionType, durationMinutes: z.literal(60), notes: z.string().max(4000).nullable().optional(),
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
});
export const sessionDecisionInputSchema = z.strictObject({
  action: z.enum(['ACCEPT', 'DECLINE']), expectedVersion: z.number().int().nonnegative(),
  reason: z.string().max(500).optional().transform(value => value?.replace(/\r\n?/g, '\n').trim() || undefined),
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
}).superRefine((value, ctx) => {
  if (value.action === 'ACCEPT' && value.reason !== undefined) ctx.addIssue({ code: 'custom', message: 'Acceptance does not accept a decline reason', path: ['reason'] });
});
const sessionSchema = z.strictObject({ id, memberId: id, trainerId: id, state: z.enum(['PENDING_CONFIRMATION', 'SCHEDULED', 'DECLINED', 'EXPIRED']),
  type, scheduledStartAt: z.iso.datetime({ offset: true }), scheduledEndAt: z.iso.datetime({ offset: true }), timeZone: z.string().min(1).max(100), requestExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  durationMinutes: z.number().int().min(15).max(480), notes: z.string().max(4000).nullable(), version: z.number().int().nonnegative() });
export const sessionRequestResultSchema = z.strictObject({ receiptId: id, replayed: z.boolean(), session: sessionSchema, notificationOutcome });
export const sessionRequestOptionsSchema = z.strictObject({ trainerId: id, trainerName: z.string().min(2).max(120), level: level.nullable(),
  specialisations: z.array(z.string().min(1).max(80)).max(30), shiftStart: time.nullable(), shiftEnd: time.nullable(),
  timeZone: z.string().min(1).max(100), minimumDurationMinutes: z.literal(60),
  maximumDurationMinutes: z.literal(60), currency, availableCredits: z.number().int().nonnegative(), heldCredits: z.number().int().nonnegative(), expiredCredits: z.number().int().nonnegative(),
  activeMembershipToday: z.boolean(), asOf: z.iso.datetime({ offset: true }) });
export const trainerSessionRequestsSchema = z.strictObject({ items: z.array(z.strictObject({ id, memberId: id, memberName: z.string().min(2).max(120),
  state: z.literal('PENDING_CONFIRMATION'), requestExpiresAt: z.iso.datetime({ offset: true }), type, scheduledStartAt: z.iso.datetime({ offset: true }), scheduledEndAt: z.iso.datetime({ offset: true }),
  timeZone: z.string().min(1).max(100), durationMinutes: z.number().int().min(15).max(480), notes: z.string().max(4000).nullable(), version: z.number().int().nonnegative() })).max(100),
  asOf: z.iso.datetime({ offset: true }) });
export const sessionDecisionResultSchema = z.strictObject({ receiptId: id, replayed: z.boolean(), session: sessionSchema, decision: z.enum(['ACCEPT', 'DECLINE']), notificationOutcome,
  creditReservation: z.strictObject({ holdId: id, packId: id, state: z.literal('HELD'), creditOrdinal: z.number().int().min(1).max(1000),
    creditValue: amount, allocationPolicyVersion: z.string().min(1).max(80) }).nullable() });

export type SessionRequestInput = z.infer<typeof sessionRequestInputSchema>;
export type SessionDecisionInput = z.infer<typeof sessionDecisionInputSchema>;
