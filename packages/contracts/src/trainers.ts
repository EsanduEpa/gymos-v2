import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);

const trainerLevelSchema = z.enum(['LEVEL_1', 'LEVEL_2']);
const shiftTimeSchema = z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/);
const pageQuerySchema = z.strictObject({
  page: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1)).default(1),
  pageSize: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1).max(100)).default(25),
});

export const trainerListQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']).optional(),
  level: trainerLevelSchema.optional(),
});

const trainerSummarySchema = z.strictObject({
  id: idSchema, fullName: z.string().min(2).max(120), email: z.email().nullable(), phone: z.string().max(40).nullable(),
  level: trainerLevelSchema.nullable(), specialisations: z.array(z.string().max(60)).max(20), yearsExperience: z.number().int().nonnegative().max(80).nullable(),
  shiftStart: shiftTimeSchema.nullable(), shiftEnd: shiftTimeSchema.nullable(), bio: z.string().max(2000).nullable(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']), registrationState: z.enum(['PENDING', 'COMPLETE', 'FAILED']), version: versionSchema, createdAt: z.iso.datetime({ offset: true }),
});
const trainerMemberSummarySchema = z.strictObject({
  id: idSchema, fullName: z.string().min(2).max(120), level: trainerLevelSchema.nullable(),
  specialisations: z.array(z.string().max(60)).max(20), bio: z.string().max(2000).nullable(),
  shiftStart: shiftTimeSchema.nullable(), shiftEnd: shiftTimeSchema.nullable(), rating: z.null(),
});
function trainerPageSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({ items: z.array(item).max(100), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
    totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), asOf: z.iso.datetime({ offset: true })
  }).superRefine((value, ctx) => {
    if (value.totalPages !== Math.ceil(value.totalCount / value.pageSize)) ctx.addIssue({ code: 'custom', message: 'Incorrect totalPages', path: ['totalPages'] });
    const remaining = Math.max(0, value.totalCount - (value.page - 1) * value.pageSize);
    if (value.items.length !== Math.min(value.pageSize, remaining)) ctx.addIssue({ code: 'custom', message: 'Page rows do not match totals', path: ['items'] });
  });
}
export const trainerListSchema = trainerPageSchema(trainerSummarySchema);
const trainerRecentSessionSchema = z.strictObject({
  id: idSchema,
  state: z.enum(['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED']),
  type: z.enum(['IN_PERSON', 'VIRTUAL', 'INTRODUCTORY']),
  scheduledStartAt: z.iso.datetime({ offset: true }),
  scheduledEndAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
});
export const trainerProfileSchema = z.strictObject({
  trainer: trainerSummarySchema,
  gymTimeZone: z.string().min(1).max(100),
  profile: z.strictObject({ email: z.email().nullable(), phone: z.string().max(40).nullable(), biography: z.string().max(2000).nullable(), joinedAt: z.iso.datetime({ offset: true }) }),
  recentSessions: z.strictObject({ items: z.array(trainerRecentSessionSchema).max(10), limit: z.literal(10), totalCount: z.number().int().nonnegative(), hasMore: z.boolean() }),
  stats: z.strictObject({ relatedClientCount: z.number().int().nonnegative(), completedInLoadedWindow: z.number().int().nonnegative(), totalCompleted: z.number().int().nonnegative(), rating: z.null() }),
  asOf: z.iso.datetime({ offset: true }),
});
export const trainerShiftInputSchema = z.strictObject({ start: shiftTimeSchema, end: shiftTimeSchema, overnight: z.boolean(), expectedVersion: versionSchema });
export const trainerShiftResultSchema = z.strictObject({ trainerId: idSchema, shift: z.strictObject({ start: shiftTimeSchema, end: shiftTimeSchema, overnight: z.boolean() }), timeZone: z.string().min(1).max(100), version: versionSchema });
export const trainerStatusInputSchema = z.strictObject({
  targetStatus: z.enum(['ACTIVE', 'DEACTIVATED']),
  expectedVersion: versionSchema,
  reason: z.string().trim().min(1).max(500),
});
export const trainerLifecycleResultSchema = z.strictObject({
  operationId: idSchema, gymId: idSchema, trainerId: idSchema,
  targetStatus: z.enum(['ACTIVE', 'DEACTIVATED']),
  state: z.enum(['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED', 'COMPLETE', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'REPAIR_REQUIRED']),
  version: versionSchema, retryable: z.boolean(),
});
export const memberTrainerDirectoryQuerySchema = pageQuerySchema.extend({ q: z.string().trim().max(120).optional() });
export const memberTrainerDirectorySchema = trainerPageSchema(trainerMemberSummarySchema);

export const trainerRegistrationInputSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(3).max(40),
  level: trainerLevelSchema,
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  specialisations: z.array(z.string().trim().min(1).max(60)).max(20),
  shiftStart: shiftTimeSchema.nullable(),
  shiftEnd: shiftTimeSchema.nullable(),
  bio: z.string().trim().max(2000).nullable(),
  idempotencyKey: idempotencyKeySchema,
}).superRefine((value, context) => {
  if ((value.shiftStart === null) !== (value.shiftEnd === null)) {
    context.addIssue({ code: 'custom', message: 'Provide both shift times or leave both blank', path: ['shiftEnd'] });
  }
  const normalized = value.specialisations.map(item => item.toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    context.addIssue({ code: 'custom', message: 'Specialisations must be unique', path: ['specialisations'] });
  }
});

export const trainerRegistrationResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ operationId: idSchema, status: z.literal('PENDING'), replayed: z.boolean(), consentRequired: z.literal(true) }),
  z.strictObject({ operationId: idSchema, trainerId: idSchema, status: z.literal('COMPLETE'), replayed: z.boolean(),
    credentialDeliveryVersion: versionSchema.optional(), temporaryPassword: z.string().min(1).max(128).optional(),
    credentialExpiresAt: z.iso.datetime({ offset: true }).optional() }),
]);
