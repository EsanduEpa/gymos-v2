import { z } from 'zod';

export const newPasswordSchema = z.string().min(10).max(200)
  .refine((value) => !/^\p{L}+$/u.test(value), 'Include at least one number or symbol')
  .refine((value) => value.trim() === value, 'Password cannot start or end with a space');

export const changePasswordInputSchema = z.strictObject({
  currentPassword: z.string().min(1).max(1024),
  newPassword: newPasswordSchema,
  confirmPassword: z.string().min(1).max(200),
}).refine((value) => value.newPassword !== value.currentPassword, {
  message: 'Choose a password different from your current one', path: ['newPassword'],
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'The new passwords do not match', path: ['confirmPassword'],
});

export const changePasswordResultSchema = z.strictObject({ success: z.literal(true) });

export const gymAccountSetupSchema = z.strictObject({
  gymSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  legacyEmail: z.email().max(254).transform(value => value.toLowerCase()),
  legacyPassword: z.string().min(1).max(1024),
  username: z.string().trim().toLowerCase().min(3).max(254).regex(/^[a-z0-9_.@+-]+$/),
  newPassword: newPasswordSchema,
}).refine(value => value.newPassword !== value.legacyPassword, { path: ['newPassword'], message: 'Choose a different password' });
export const gymAccountSetupResultSchema = z.strictObject({ success: z.literal(true) });

export const recoveryVerificationMethodSchema = z.enum(['IN_PERSON', 'KNOWN_CONTACT']);
export const recoveryIssueInputSchema = z.strictObject({
  verificationMethod: recoveryVerificationMethodSchema,
  reason: z.string().trim().min(8).max(500),
  currentPassword: z.string().min(1).max(1024),
});
export const operatorRecoveryIssueInputSchema = z.strictObject({
  email: z.email(),
  gymSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  verificationMethod: recoveryVerificationMethodSchema,
  reason: z.string().trim().min(8).max(500),
  currentPassword: z.string().min(1).max(1024),
});
export const recoveryCandidateSchema = z.strictObject({
  identityId: z.string().min(1).max(128),
  label: z.string().min(1).max(120),
  email: z.email(),
  relationship: z.enum(['MEMBER', 'TRAINER', 'PENDING_APPLICANT']),
});
export const recoveryCandidateListSchema = z.strictObject({ items: z.array(recoveryCandidateSchema).max(200) });
export const recoveryIssueResultSchema = z.strictObject({
  credentialId: z.string().min(1).max(128),
  secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.iso.datetime({ offset: true }),
  subjectLabel: z.string().min(1).max(120),
});
export const recoveryCompleteInputSchema = z.strictObject({
  credentialId: z.string().min(1).max(128),
  secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  newPassword: newPasswordSchema,
  confirmPassword: z.string().min(1).max(200),
}).refine(value => value.newPassword === value.confirmPassword, {
  message: 'The new passwords do not match', path: ['confirmPassword'],
});
export const recoveryCompleteResultSchema = z.strictObject({ success: z.literal(true) });
export const identitySecurityEventSchema = z.strictObject({
  event: z.enum(['PASSWORD_CHANGED', 'PASSWORD_RECOVERED', 'SESSIONS_REVOKED']),
  createdAt: z.iso.datetime({ offset: true }),
});
export const identitySecurityEventListSchema = z.strictObject({ items: z.array(identitySecurityEventSchema).max(50) });

export const credentialReissueInputSchema = z.strictObject({
  reason: z.enum(['LOST_HANDOFF', 'EXPIRED_CREDENTIAL']),
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
});

export const credentialIssueInputSchema = z.strictObject({});

export const credentialReissueResultSchema = z.strictObject({
  status: z.enum(['ISSUED', 'ALREADY_ISSUED']),
  deliveryVersion: z.number().int().nonnegative(),
  temporaryPassword: z.string().min(1).max(128).optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
});

export const credentialAcknowledgementInputSchema = z.strictObject({
  deliveryVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

export const credentialAcknowledgementResultSchema = z.strictObject({
  status: z.literal('ACKNOWLEDGED'),
  deliveryVersion: z.number().int().nonnegative(),
});
