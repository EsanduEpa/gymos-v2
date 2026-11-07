import { z } from 'zod';

// Keep this module independent of the root barrel: the barrel re-exports this
// file, so importing shared primitives from it creates an ESM initialization
// cycle when contracts are consumed at runtime.
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const isoInstantSchema = z.iso.datetime({ offset: true });

export const sessionDeviceClassSchema = z.enum(['PERSONAL', 'SHARED']);
export const sessionIssueSchema = z.strictObject({
  accessToken: z.string().min(1).max(16384),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  sessionId: idSchema,
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  refreshExpiresAt: isoInstantSchema,
  absoluteExpiresAt: isoInstantSchema,
  deviceClass: sessionDeviceClassSchema,
  deviceLabel: z.string().min(1).max(80),
});
export const sessionRenewalSchema = sessionIssueSchema;
export const sessionListItemSchema = z.strictObject({
  id: idSchema,
  deviceClass: sessionDeviceClassSchema,
  deviceLabel: z.string().min(1).max(80),
  createdAt: isoInstantSchema,
  lastActivityAt: isoInstantSchema,
  idleExpiresAt: isoInstantSchema,
  absoluteExpiresAt: isoInstantSchema,
  current: z.boolean(),
});
export const sessionListSchema = z.strictObject({ items: z.array(sessionListItemSchema).max(50) });
export const sessionLogoutInputSchema = z.strictObject({ scope: z.enum(['CURRENT', 'ALL']) });
export const sessionRevocationResultSchema = z.strictObject({ sessionId: idSchema, revoked: z.boolean() });
