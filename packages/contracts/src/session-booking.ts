import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const date = z.iso.date();
const time = z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/);
const amount = z.string().regex(/^(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?$/);
const currency = z.enum(['LKR', 'USD']);
const level = z.enum(['LEVEL_1', 'LEVEL_2']);
const sessionType = z.enum(['IN_PERSON', 'VIRTUAL', 'INTRODUCTORY']);
const newSessionType = z.literal('IN_PERSON');
const sessionState = z.enum(['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'EXPIRED']);
const pageSchema = <T extends z.ZodType>(item: T) => z.strictObject({
  items: z.array(item).max(100), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), asOf: z.iso.datetime({ offset: true }),
}).superRefine((value, ctx) => {
  if (value.totalPages !== Math.ceil(value.totalCount / value.pageSize)) ctx.addIssue({ code: 'custom', message: 'Incorrect totalPages', path: ['totalPages'] });
  const remaining = Math.max(0, value.totalCount - (value.page - 1) * value.pageSize);
  if (value.items.length !== Math.min(value.pageSize, remaining)) ctx.addIssue({ code: 'custom', message: 'Page rows do not match totals', path: ['items'] });
});
const positiveQuery = (max = 100) => z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1).max(max));

export const sessionBookingOptionsQuerySchema = z.strictObject({
  qMembers: z.string().trim().max(120).optional(), qTrainers: z.string().trim().max(120).optional(),
  memberPage: positiveQuery(Number.MAX_SAFE_INTEGER).default(1), memberPageSize: positiveQuery().default(25),
  trainerPage: positiveQuery(Number.MAX_SAFE_INTEGER).default(1), trainerPageSize: positiveQuery().default(25),
  localDate: date.optional(), type: sessionType.optional(), selectedMemberId: id.optional(), selectedTrainerId: id.optional(),
});
const memberOptionSchema = z.strictObject({ memberId: id, name: z.string().min(2).max(120), availableCredits: z.number().int().nonnegative(),
  eligibility: z.enum(['ELIGIBLE', 'NO_ACTIVE_MEMBERSHIP', 'NO_CREDIT']) });
const trainerOptionSchema = z.strictObject({ trainerId: id, name: z.string().min(2).max(120), level: level,
  shiftStart: time.nullable(), shiftEnd: time.nullable() });
export const sessionBookingOptionsSchema = z.strictObject({
  members: pageSchema(memberOptionSchema), trainers: pageSchema(trainerOptionSchema),
  selectedMember: memberOptionSchema.nullable(), selectedTrainer: trainerOptionSchema.nullable(),
  policy: z.strictObject({ timeZone: z.string().min(1).max(100), localDate: date, minimumDurationMinutes: z.literal(60),
    maximumDurationMinutes: z.literal(60), scheduleHorizonDays: z.literal(14), configurationVersion: z.number().int().nonnegative(),
    cancellationWindowMinutes: z.number().int().min(0).max(10080) }),
  rateInfo: z.strictObject({ currency, defaultSessionFee: amount, level2SessionFee: amount.nullable(), introSessionFee: amount.nullable(),
    level1BaseRate: amount, level2BaseRate: amount, offShiftPremium: amount }),
  noEligibleMembersReason: z.enum(['NO_ACTIVE_MEMBERSHIP_OR_CREDIT']).nullable(), asOf: z.iso.datetime({ offset: true }),
});

export const sessionBookingInputSchema = z.strictObject({
  memberId: id, trainerId: id, localDate: date, localTime: time, timeZone: z.string().min(1).max(100),
  offset: z.string().regex(/^(?:\+|-)(?:0[0-9]|1[0-4]):[0-5][0-9]$/).optional(),
  type: newSessionType, durationMinutes: z.literal(60), notes: z.string().max(4000).nullable().optional(),
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
});
const notificationOutcomeSchema = z.strictObject({ eventId: id, recipient: z.strictObject({ role: z.literal('MEMBER'), actorId: id }),
  gymSlug: z.string().min(1).max(80), state: z.enum(['QUEUED', 'AVAILABLE', 'FAILED']), retryable: z.boolean() });
const sessionSchema = z.strictObject({ id, memberId: id, trainerId: id, state: z.literal('SCHEDULED'), type: sessionType,
  scheduledStartAt: z.iso.datetime({ offset: true }), scheduledEndAt: z.iso.datetime({ offset: true }),
  timeZone: z.string().min(1).max(100), durationMinutes: z.number().int().min(15).max(480), version: z.literal(0) });
export const sessionBookingResultSchema = z.strictObject({
  receiptId: id, replayed: z.boolean(), notificationOutcome: notificationOutcomeSchema, session: sessionSchema,
  creditReservation: z.strictObject({ holdId: id, packId: id, state: z.literal('HELD'), creditOrdinal: z.number().int().min(1).max(1000),
    creditValue: amount, allocationPolicyVersion: z.string().min(1).max(80) }),
  feeQuote: z.strictObject({ amount, currency }),
});

export type SessionBookingOptionsQuery = z.infer<typeof sessionBookingOptionsQuerySchema>;
export type SessionBookingOptions = z.infer<typeof sessionBookingOptionsSchema>;
export type SessionBookingInput = z.infer<typeof sessionBookingInputSchema>;
