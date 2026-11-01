import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const gymSlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const decimalStringSchema = z.string().max(128).regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/);

export const payPeriodSchema = z.enum(['WEEKLY', 'MONTHLY']);
export const moneyAmountSchema = decimalStringSchema.refine((value) => ((value.replace(/^-/, '').split('.')[1]?.length ?? 0) <= 4));
export const gymConfigurationSchema = z.strictObject({
  version: versionSchema,
  currency: z.enum(['LKR', 'USD']), timezone: z.string().min(1).max(100),
  address: z.string().max(300), phone: z.string().max(40).nullable(), email: z.email().max(254).nullable(),
  payPeriod: payPeriodSchema,
  defaultSessionFee: moneyAmountSchema, level2SessionFee: moneyAmountSchema.nullable(), introSessionFee: moneyAmountSchema.nullable(),
  level1BaseRate: moneyAmountSchema, level2BaseRate: moneyAmountSchema, offShiftPremium: moneyAmountSchema,
  cancellationWindowMinutes: z.number().int().min(0).max(10080), lateCancelDeduction: z.boolean(),
  minimumSessionDurationMinutes: z.number().int().min(15).max(480),
});
export const membershipPlanSchema = z.strictObject({
  id: idSchema, name: z.string().min(1).max(80), description: z.string().max(500).nullable(),
  price: moneyAmountSchema, currency: z.enum(['LKR', 'USD']), durationDays: z.number().int().min(1).max(3650),
  status: z.enum(['ACTIVE', 'INACTIVE']), version: versionSchema, createdAt: z.iso.datetime({ offset: true }),
});
export const createdMembershipPlanSchema = membershipPlanSchema.extend({ configurationVersion: versionSchema });
export const configurationReadSchema = z.strictObject({
  slug: gymSlugSchema, configuration: gymConfigurationSchema, plans: z.array(membershipPlanSchema).max(500), asOf: z.iso.datetime({ offset: true }),
});
export const createMembershipPlanSchema = z.strictObject({
  expectedVersion: versionSchema,
  name: z.string().trim().min(1).max(80), description: z.string().trim().max(500).nullable().optional(),
  price: decimalStringSchema, durationDays: z.number().int().min(1).max(3650),
});
export const updateConfigurationSchema = z.strictObject({
  expectedVersion: versionSchema,
  address: z.string().trim().max(300).optional(), phone: z.string().trim().max(40).nullable().optional(),
  email: z.union([z.email().max(254), z.literal('')]).nullable().optional(), payPeriod: payPeriodSchema.optional(),
  defaultSessionFee: decimalStringSchema.optional(), level2SessionFee: z.union([decimalStringSchema, z.literal('')]).nullable().optional(),
  introSessionFee: z.union([decimalStringSchema, z.literal('')]).nullable().optional(),
  level1BaseRate: decimalStringSchema.optional(), level2BaseRate: decimalStringSchema.optional(), offShiftPremium: decimalStringSchema.optional(),
  cancellationWindowMinutes: z.number().int().min(0).max(10080).optional(), lateCancelDeduction: z.boolean().optional(),
  minimumSessionDurationMinutes: z.number().int().min(15).max(480).optional(),
}).refine(({ expectedVersion: _version, ...changes }) => Object.keys(changes).length > 0);

export const membershipEligibilitySchema = z.strictObject({
  memberId: idSchema, status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE', 'EXPIRED', 'NOT_STARTED', 'NONE']),
  eligible: z.boolean(), reason: z.enum(['ACTIVE_TERM', 'MEMBER_SUSPENDED', 'MEMBER_INACTIVE', 'EXPIRED_TERM', 'FUTURE_TERM', 'NO_TERM']),
  asOfLocalDate: z.iso.date(), term: z.strictObject({ id: idSchema, startDate: z.iso.date(), endDateExclusive: z.iso.date(),
    agreedPrice: decimalStringSchema, currency: z.enum(['LKR', 'USD']), planName: z.string().max(80) }).nullable(), version: versionSchema,
});
export const renewMembershipSchema = z.strictObject({
  planId: idSchema, expectedMemberVersion: versionSchema, idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
  startPolicy: z.enum(['IMMEDIATE', 'NEXT_AVAILABLE']),
});
export const gymThemeSettingsSchema = z.strictObject({
  slug: gymSlugSchema,
  theme: z.strictObject({ primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), logoUrl: z.url().refine(value => new URL(value).protocol === 'https:').nullable(), version: versionSchema }),
});
export const updateGymThemeSchema = z.strictObject({
  expectedVersion: versionSchema, primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.union([z.url().refine(value => new URL(value).protocol === 'https:'), z.literal('')]).nullable().optional(),
}).refine(({ expectedVersion: _v, ...rest }) => Object.keys(rest).length > 0);
export const gymPublicProfileSchema = z.strictObject({ name: z.string().min(2).max(120), version: versionSchema });
export const updateGymPublicProfileSchema = z.strictObject({ expectedVersion: versionSchema, name: z.string().trim().min(2).max(120) });
export const renewalResultSchema = z.strictObject({ termId: idSchema, memberId: idSchema, startDate: z.iso.date(), endDateExclusive: z.iso.date(),
  agreedPrice: decimalStringSchema, currency: z.enum(['LKR', 'USD']), planName: z.string().max(80), memberVersion: versionSchema, replayed: z.boolean() });

export type GymConfiguration = z.infer<typeof gymConfigurationSchema>;
export type MembershipPlan = z.infer<typeof membershipPlanSchema>;
export type GymConfigurationRead = z.infer<typeof configurationReadSchema>;
export type GymThemeSettings = z.infer<typeof gymThemeSettingsSchema>;
export type GymPublicProfile = z.infer<typeof gymPublicProfileSchema>;
