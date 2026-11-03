import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const isoInstantSchema = z.iso.datetime({ offset: true });
const localDateSchema = z.iso.date();
const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const nonnegativeDecimalStringSchema = z.string().max(128).regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/);
const pageQuerySchema = z.strictObject({
  page: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1)).default(1),
  pageSize: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1).max(100)).default(25),
});
function pageSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({ items: z.array(item).max(100), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
    totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), asOf: isoInstantSchema,
  summary: z.strictObject({ basic: z.number().int().nonnegative(), operational: z.number().int().nonnegative(),
    historical: z.number().int().nonnegative(), pendingEnrollments: z.number().int().nonnegative(),
    statuses: z.strictObject({ ACTIVE: z.number().int().nonnegative(), INACTIVE: z.number().int().nonnegative(), SUSPENDED: z.number().int().nonnegative() }) }), }).superRefine((value, ctx) => {
      if (value.totalPages !== Math.ceil(value.totalCount / value.pageSize)) ctx.addIssue({ code: 'custom', message: 'Incorrect totalPages', path: ['totalPages'] });
      const remaining = Math.max(0, value.totalCount - (value.page - 1) * value.pageSize);
      if (value.items.length !== Math.min(value.pageSize, remaining)) ctx.addIssue({ code: 'custom', message: 'Page rows do not match totals', path: ['items'] });
    });
}

export const memberStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const memberRegistrationInputSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(1).max(40),
  dateOfBirth: localDateSchema,
  emergencyContact: optionalText(240),
  healthNotes: optionalText(4000),
  membershipPlanId: idSchema,
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
});

export const memberListQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  status: memberStatusSchema.optional(),
});
export const memberHistoryQuerySchema = pageQuerySchema.pick({ page: true, pageSize: true });

export const memberAccountStateSchema = z.enum(['BASIC', 'OPERATIONAL', 'HISTORICAL']);
export const memberListItemSchema = z.strictObject({
  id: idSchema, fullName: z.string().min(2).max(120), email: z.email().max(254).nullable(),
  status: memberStatusSchema, registrationState: z.enum(['BASIC', 'PENDING', 'COMPLETE', 'FAILED']),
  accountState: memberAccountStateSchema,
  currentTerm: z.strictObject({ id: idSchema, planName: z.string().max(80), startDate: localDateSchema,
    endDateExclusive: localDateSchema, agreedPrice: nonnegativeDecimalStringSchema, currency: z.enum(['LKR', 'USD']) }).nullable(),
  createdAt: isoInstantSchema,
});
export const memberListSchema = pageSchema(memberListItemSchema);

export const memberDetailSchema = z.strictObject({
  id: idSchema, fullName: z.string().min(2).max(120), email: z.email().max(254).nullable(),
  accountState: memberAccountStateSchema, joinedAt: isoInstantSchema,
  phone: z.string().max(40).nullable(), dateOfBirth: localDateSchema.nullable(),
  emergencyContact: z.string().max(240).nullable(), healthNotes: z.string().max(4000).nullable(),
  status: memberStatusSchema, registrationState: z.enum(['BASIC', 'PENDING', 'COMPLETE', 'FAILED']), version: versionSchema,
  memberships: z.array(z.strictObject({ id: idSchema, planName: z.string().max(80), startDate: localDateSchema,
    endDateExclusive: localDateSchema, agreedPrice: nonnegativeDecimalStringSchema, currency: z.enum(['LKR', 'USD']) })).max(100),
  membershipPage: z.number().int().min(1), membershipPageSize: z.number().int().min(1).max(100),
  membershipTotalCount: z.number().int().nonnegative(), membershipTotalPages: z.number().int().nonnegative(),
  sessionPacks: z.array(z.strictObject({ id: idSchema, issuedCredits: z.number().int().min(1).max(1000), availableCredits: z.number().int().min(0).max(1000),
    price: nonnegativeDecimalStringSchema, currency: z.enum(['LKR', 'USD']), startDate: localDateSchema, endDateExclusive: localDateSchema,
    status: z.enum(['ACTIVE', 'EXPIRED', 'DEPLETED']) })).max(100),
  recentSessions: z.array(z.strictObject({ id: idSchema, scheduledStart: isoInstantSchema, state: z.string().min(1).max(40) })).max(5),
  asOf: isoInstantSchema,
});

export const memberRegistrationResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ operationId: idSchema, status: z.literal('PENDING'), replayed: z.boolean(), consentRequired: z.literal(true) }),
  z.strictObject({ operationId: idSchema, memberId: idSchema,
    term: z.strictObject({ id: idSchema, planName: z.string().max(80), startDate: localDateSchema, endDateExclusive: localDateSchema,
      agreedPrice: nonnegativeDecimalStringSchema, currency: z.enum(['LKR', 'USD']) }),
    status: z.literal('COMPLETE'), replayed: z.boolean(),
    temporaryPassword: z.string().min(1).max(128).optional(),
    credentialDeliveryVersion: versionSchema.optional(), credentialExpiresAt: isoInstantSchema.optional() }),
]);

export const memberEnrollmentConsentInputSchema = z.strictObject({
  decision: z.enum(['ACCEPT', 'DECLINE']), currentPassword: z.string().min(1).max(1024),
});
export const memberEnrollmentConsentResultSchema = z.strictObject({
  operationId: idSchema, status: z.enum(['CONSENT_RECORDED', 'CONSENT_DECLINED']), replayed: z.boolean(),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationInputSchema>;
export type MemberListItem = z.infer<typeof memberListItemSchema>;
export type MemberDetail = z.infer<typeof memberDetailSchema>;
