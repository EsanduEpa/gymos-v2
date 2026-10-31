import { z } from 'zod';
import { idSchema, idempotencyKeySchema } from './index.js';
import { legacyGymSchema } from './legacy.js';

export const provisioningInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerEmail: z.string().trim().toLowerCase().pipe(z.email()).refine(value => /^[\x21-\x7e]+$/.test(value)),
  currency: z.enum(['LKR', 'USD']),
  timezone: z.string().min(1).max(100).refine(value => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }, 'Choose a valid IANA timezone'),
});
export type ProvisioningInput = z.infer<typeof provisioningInputSchema>;
export const platformOperationSchema = z.strictObject({
  credentialHandoffAvailable: z.boolean().optional(),
  operationId: idSchema,
  state: z.enum(['PENDING','MASTER_PREPARED','TENANT_COMMITTED','COMPLETE','FAILED_RETRYABLE','FAILED_FINAL','REPAIR_REQUIRED']),
  step: z.string().min(1).max(80), version: z.number().int().nonnegative(),
  retryable: z.boolean(), ownerVerificationRequired: z.boolean(),
  gym: legacyGymSchema,
});
export type PlatformOperation = z.infer<typeof platformOperationSchema>;
export const operationRetrySchema = z.strictObject({ expectedVersion: z.number().int().nonnegative() });
export { idempotencyKeySchema };

export const registryQuerySchema = z.strictObject({ cursor: z.string().min(1).max(128).optional() });
export const registryRowSchema = z.strictObject({
  id: z.string(), name: z.string(), slug: z.string(), status: z.enum(['PROVISIONING','ACTIVE','FAILED','SUSPENDED']), version: z.number().int().nonnegative(),
  ownerName: z.string().nullable(), memberCount: z.number().int().nonnegative().nullable(), trainerCount: z.number().int().nonnegative().nullable(),
  observedAt: z.iso.datetime().nullable(), health: z.enum(['VERIFIED','UNAVAILABLE','REPAIR_REQUIRED']),
  operation: platformOperationSchema.nullable(),
});
export const registryPageSchema = z.strictObject({ items: z.array(registryRowSchema).max(25), total: z.number().int().nonnegative(), nextCursor: z.string().nullable() });
export const supportEntrySchema = z.strictObject({ gymId: z.string().min(1).max(128), scope: z.literal('GYM_SUMMARY_READ'), reasonCode: z.string().regex(/^[A-Z][A-Z0-9_]{1,49}$/), explanation: z.string().trim().min(10).max(500) });
export const supportEntryResultSchema = z.strictObject({ id: z.string(), context: z.string().regex(/^[A-Za-z0-9_-]{43}$/), slug: z.string(), expiresAt: z.iso.datetime() });
export const supportSummarySchema = z.strictObject({
  id: z.string(), scope: z.literal('GYM_SUMMARY_READ'), expiresAt: z.iso.datetime(),
  gym: z.strictObject({ id: z.string(), slug: z.string(), name: z.string(), status: z.string(), primaryColor: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() }),
  operationState: z.string().nullable(), health: z.enum(['VERIFIED','UNAVAILABLE','REPAIR_REQUIRED','MASTER_ONLY']),
  tenant: z.strictObject({ currency: z.string().nullable(), timezone: z.string().nullable(), memberCount: z.number().int().nonnegative(), trainerCount: z.number().int().nonnegative() }).nullable(),
});
export type RegistryPage = z.infer<typeof registryPageSchema>;
export type SupportSummary = z.infer<typeof supportSummarySchema>;
