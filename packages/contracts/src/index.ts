import { z } from 'zod';
export * from './configuration.js';
export * from './members.js';
export * from './trainers.js';
export * from './notifications.js';
export * from './packs.js';
export * from './session-booking.js';
export * from './session-reads.js';
export * from './session-requests.js';
export * from './session-lifecycle.js';
export * from './member-lifecycle.js';
export * from './coaching.js';

// Transport syntax only: feature schemas own business bounds, currency support,
// rounding and authorization. No Prisma-generated types cross this boundary.
export const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
export const gymSlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const isoInstantSchema = z.iso.datetime({ offset: true });
export const localDateSchema = z.iso.date();
export const globalRoleSchema = z.enum(['USER', 'SUPER_ADMIN']);
export const gymRoleSchema = z.enum(['OWNER', 'TRAINER', 'MEMBER']);
export const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);

export const decimalStringSchema = z.string().max(128)
  .regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
  .refine((value) => !/^-0(?:\.0+)?$/.test(value), 'Negative zero is not canonical');
export const nonnegativeDecimalStringSchema = decimalStringSchema.refine(
  (value) => !value.startsWith('-'), 'Amount must be nonnegative',
);
// Three-letter syntax is not a claim that a currency is supported. DEC-06 and
// the owning feature must validate its approved currency set and precision.
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const moneySchema = z.strictObject({
  amount: nonnegativeDecimalStringSchema,
  currency: currencyCodeSchema,
});
export const signedMoneySchema = z.strictObject({
  amount: decimalStringSchema,
  currency: currencyCodeSchema,
});
export type Money = z.infer<typeof moneySchema>;

export const identitySummarySchema = z.strictObject({
  identityId: idSchema,
  displayName: z.string().min(1).max(120).nullable(),
  email: z.email(),
  globalRole: globalRoleSchema,
  mustChangePassword: z.boolean(),
});
export const actorLinkSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('MEMBER'), memberId: idSchema }),
  z.strictObject({ kind: z.literal('TRAINER'), trainerId: idSchema }),
]);
// GymAccess currently has a composite primary key; do not invent access.id.
export const gymAccessKeySchema = z.strictObject({ identityId: idSchema, gymId: idSchema });
export type IdentitySummary = z.infer<typeof identitySummarySchema>;
export type ActorLink = z.infer<typeof actorLinkSchema>;

export const readMetaSchema = z.strictObject({
  requestId: idSchema,
  asOf: isoInstantSchema,
  gymSlug: gymSlugSchema.optional(),
  currency: currencyCodeSchema.optional(),
  timeZone: z.string().min(1).max(100).refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
    catch { return false; }
  }, 'Invalid time zone').optional(),
});
export function readSchema<T extends z.ZodType>(data: T) {
  return z.strictObject({ data, meta: readMetaSchema });
}

function positiveQueryInteger(maximum: number) {
  return z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)])
    .transform((value) => typeof value === 'string' ? Number(value) : value)
    .pipe(z.number().int().min(1).max(maximum));
}
export const pageQuerySchema = z.strictObject({
  page: positiveQueryInteger(Number.MAX_SAFE_INTEGER).default(1),
  pageSize: positiveQueryInteger(100).default(25),
});
// Audit uses pageSize20 at its feature boundary; this is the common default.
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({
    items: z.array(item).max(100),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    pageSize: z.number().int().min(1).max(100),
    totalCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    totalPages: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    asOf: isoInstantSchema,
  }).superRefine((value, ctx) => {
    if (value.totalPages !== Math.ceil(value.totalCount / value.pageSize)) {
      ctx.addIssue({ code: 'custom', message: 'Incorrect totalPages', path: ['totalPages'] });
    }
    const remaining = Math.max(0, value.totalCount - (value.page - 1) * value.pageSize);
    if (value.items.length !== Math.min(value.pageSize, remaining)) {
      ctx.addIssue({ code: 'custom', message: 'Page rows do not match totals', path: ['items'] });
    }
  });
}

export const errorCodeSchema = z.enum([
  'UNAUTHENTICATED', 'FORBIDDEN', 'PASSWORD_CHANGE_REQUIRED', 'NOT_FOUND', 'CONFLICT', 'INVALID_INPUT', 'VALIDATION',
  'RATE_LIMITED', 'UNAVAILABLE', 'INTERNAL', 'OUTCOME_UNKNOWN',
]);
export const failureSchema = z.strictObject({
  ok: z.literal(false),
  code: errorCodeSchema,
  message: z.string().min(1).max(500),
  fieldErrors: z.record(z.string().min(1).max(128), z.array(z.string().max(300)).max(20)).optional(),
  requestId: idSchema,
  retryable: z.boolean(),
  operationId: idSchema.optional(),
  retryAfterSeconds: z.number().int().nonnegative().max(86400).optional(),
  currentState: z.strictObject({
    resourceId: idSchema, status: z.string().min(1).max(80), version: versionSchema,
  }).optional(),
});
export type ApiFailure = z.infer<typeof failureSchema>;
export function commandSchema<T extends z.ZodType>(data: T) {
  return z.strictObject({
    ok: z.literal(true),
    operationId: idSchema,
    data,
    replayed: z.boolean(),
    effects: z.strictObject({
      changedResourceIds: z.array(idSchema).max(1000),
      // Feature adapters map these descriptors to a fixed gym-scoped registry;
      // they are never executable URLs or client-supplied cache authorization.
      refreshScopes: z.array(z.string().min(1).max(128).regex(/^[A-Za-z0-9_:/.-]+$/)).max(100),
    }),
  });
}
export type ReadMeta = z.infer<typeof readMetaSchema>;
