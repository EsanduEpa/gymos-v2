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
  operationId: idSchema,
  state: z.enum(['PENDING','MASTER_PREPARED','TENANT_COMMITTED','COMPLETE','FAILED_RETRYABLE','FAILED_FINAL','REPAIR_REQUIRED']),
  step: z.string().min(1).max(80), version: z.number().int().nonnegative(),
  retryable: z.boolean(), ownerVerificationRequired: z.boolean(),
  gym: legacyGymSchema,
});
export type PlatformOperation = z.infer<typeof platformOperationSchema>;
export const operationRetrySchema = z.strictObject({ expectedVersion: z.number().int().nonnegative() });
export { idempotencyKeySchema };
