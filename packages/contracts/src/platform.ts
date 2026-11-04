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

export const gymLifecycleInputSchema = z.strictObject({ expectedVersion: z.number().int().nonnegative(), target: z.enum(['SUSPENDED','ACTIVE']), reason: z.string().trim().min(10).max(500) });
export const gymLifecycleStatusSchema = z.strictObject({ operationId: z.string(), gymId: z.string(), state: z.string(), version: z.number().int().nonnegative(), target: z.enum(['SUSPENDED','ACTIVE']), appliedGymVersion: z.number().int().nonnegative().nullable(), retryable: z.boolean() });
export type GymLifecycleStatus = z.infer<typeof gymLifecycleStatusSchema>;

export const registryQuerySchema = z.strictObject({ cursor: z.string().min(1).max(128).optional() });
export const registryRowSchema = z.strictObject({
  id: z.string(), name: z.string(), slug: z.string(), status: z.enum(['PROVISIONING','ACTIVE','FAILED','SUSPENDED']), version: z.number().int().nonnegative(),
  ownerName: z.string().nullable(), memberCount: z.number().int().nonnegative().nullable(), trainerCount: z.number().int().nonnegative().nullable(),
  observedAt: z.iso.datetime().nullable(), health: z.enum(['VERIFIED','UNAVAILABLE','REPAIR_REQUIRED']),
  operation: platformOperationSchema.nullable(),
  lifecycleOperation: gymLifecycleStatusSchema.nullable().optional(),
});
export const registryPageSchema = z.strictObject({ items: z.array(registryRowSchema).max(25), total: z.number().int().nonnegative(), nextCursor: z.string().nullable() });
export const platformAnalyticsSummarySchema = z.strictObject({ totalGyms: z.number().int().nonnegative(), activeGyms: z.number().int().nonnegative(),
  verifiedGyms: z.number().int().nonnegative(), unavailableGyms: z.number().int().nonnegative(), staleGyms: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative().nullable(), trainerCount: z.number().int().nonnegative().nullable(), partial: z.boolean(), freshnessSeconds: z.number().int().positive(), asOf: z.iso.datetime() });
export const platformAnalyticsRefreshInputSchema = z.strictObject({ cursor: z.string().min(1).max(128).optional() });
export const platformAnalyticsRefreshResultSchema = z.strictObject({ processed: z.number().int().nonnegative().max(25), unavailable: z.number().int().nonnegative().max(25),
  nextCursor: z.string().nullable(), asOf: z.iso.datetime() });
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
export const schemaRolloutInputSchema = z.strictObject({
 idempotencyKey: idempotencyKeySchema, targetVersion: z.string().min(1).max(128), targetDigest: z.string().regex(/^[a-f0-9]{64}$/),
 gymIds: z.array(z.string().min(1).max(128)).min(1).max(100).refine(ids=>new Set(ids).size===ids.length), batchSize: z.number().int().min(1).max(25),
});
