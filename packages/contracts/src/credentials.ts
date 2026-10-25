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
