import { z } from 'zod';

const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable();
const idempotencyKey = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);

export const accountProfileSchema = z.strictObject({
  identityId: idSchema,
  email: z.email().max(254),
  displayName: z.string().min(1).max(120).nullable(),
  globalRole: z.enum(['USER', 'SUPER_ADMIN']),
  version: versionSchema,
});
export const updateAccountProfileSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(120),
  expectedVersion: versionSchema,
  idempotencyKey,
});
export const profileCommandResultSchema = z.strictObject({ version: versionSchema, replayed: z.boolean() });

export const selfMemberProfileSchema = z.strictObject({
  memberId: idSchema, fullName: z.string().min(2).max(120), phone: z.string().max(40).nullable(),
  emergencyContact: z.string().max(240).nullable(), dateOfBirth: z.iso.date().nullable(), version: versionSchema,
});
export const updateSelfMemberProfileSchema = z.strictObject({
  phone: nullableText(40), emergencyContact: nullableText(240),
  expectedVersion: versionSchema, idempotencyKey,
});
export const selfTrainerProfileSchema = z.strictObject({
  trainerId: idSchema, fullName: z.string().min(2).max(120), phone: z.string().max(40).nullable(),
  biography: z.string().max(2000).nullable(), specialisations: z.array(z.string().max(60)).max(20),
  yearsExperience: z.number().int().min(0).max(80).nullable(), version: versionSchema,
});
export const updateSelfTrainerProfileSchema = z.strictObject({
  phone: nullableText(40), biography: nullableText(2000), specialisations: z.array(z.string().trim().min(1).max(60)).max(20),
  yearsExperience: z.number().int().min(0).max(80).nullable(), expectedVersion: versionSchema, idempotencyKey,
}).superRefine((value, context) => {
  const normalized = value.specialisations.map(item => item.toLocaleLowerCase('en'));
  if (new Set(normalized).size !== normalized.length) context.addIssue({ code: 'custom', message: 'Specialisations must be unique', path: ['specialisations'] });
});

export const memberCorrectionReasonSchema = z.enum(['MEMBER_REQUEST', 'SOURCE_DOCUMENT', 'ADMINISTRATIVE_CORRECTION']);
export const ownerMemberProfileCorrectionSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  dateOfBirth: z.iso.date().nullable(),
  phone: nullableText(40),
  emergencyContact: nullableText(240),
  expectedVersion: versionSchema,
  reason: memberCorrectionReasonSchema,
  idempotencyKey,
});

export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type SelfMemberProfile = z.infer<typeof selfMemberProfileSchema>;
export type SelfTrainerProfile = z.infer<typeof selfTrainerProfileSchema>;
