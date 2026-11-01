// Original source-inventory contracts remain frozen. Current platform E02/E03
// consumers use registryPageSchema/platformOperationSchema from ./platform.
import { z } from 'zod';
import { globalRoleSchema, gymRoleSchema, idSchema, isoInstantSchema } from './index.js';

// Exact current E01–E08 response contracts. These remain unwrapped while future
// slices introduce reviewed envelopes. No existing controller is changed here.
export const legacyGymStatusSchema = z.enum(['PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED']);
export const legacyMemberStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
// Current createGymInput has no length cap. Do not introduce the future
// common-contract cap while describing existing callers' valid responses.
export const legacyGymSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const legacyLoginSchema = z.strictObject({
  accessToken: z.string().min(1).max(16384),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  globalRole: globalRoleSchema,
  mustChangePassword: z.boolean(),
  gyms: z.array(z.strictObject({ id: idSchema, slug: legacyGymSlugSchema, name: z.string(), role: gymRoleSchema })),
});
export const legacyGymSchema = z.strictObject({
  id: idSchema, name: z.string(), slug: legacyGymSlugSchema, status: legacyGymStatusSchema,
});
export const legacyGymListSchema = z.array(legacyGymSchema);
export const legacyCreatedGymSchema = legacyGymSchema.extend({ status: z.literal('ACTIVE') });
export const legacyThemeValuesSchema = z.strictObject({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logoUrl: z.url().refine((value) => new URL(value).protocol === 'https:').nullable(),
});
export const legacyThemeSchema = z.strictObject({
  slug: legacyGymSlugSchema, name: z.string(), theme: legacyThemeValuesSchema,
});
export const legacyUpdatedThemeSchema = z.strictObject({ slug: legacyGymSlugSchema, theme: legacyThemeValuesSchema.extend({ version: z.number().int().nonnegative() }) });
export const legacyAccessSchema = z.strictObject({ gymId: idSchema, slug: legacyGymSlugSchema, role: gymRoleSchema });
export const legacyMemberSchema = z.strictObject({
  id: idSchema, fullName: z.string(), email: z.email().nullable(), status: legacyMemberStatusSchema,
});
export const legacyMembersSchema = z.array(legacyMemberSchema).max(100);
export const legacyCreatedMemberSchema = legacyMemberSchema.extend({ createdAt: isoInstantSchema });

export const existingEndpointContracts = {
  E01: { method: 'POST', path: '/auth/login', response: legacyLoginSchema },
  E02: { method: 'GET', path: '/admin/gyms', response: legacyGymListSchema },
  E03: { method: 'POST', path: '/admin/gyms', response: legacyCreatedGymSchema },
  E04: { method: 'GET', path: '/gyms/:slug/theme', response: legacyThemeSchema },
  E05: { method: 'PATCH', path: '/gyms/:slug/theme', response: legacyUpdatedThemeSchema },
  E06: { method: 'GET', path: '/gyms/:slug/access', response: legacyAccessSchema },
  E07: { method: 'GET', path: '/gyms/:slug/members', response: legacyMembersSchema },
  E08: { method: 'POST', path: '/gyms/:slug/members', response: legacyCreatedMemberSchema },
} as const;

// Safe shell projection; no credential or tenant connection material.
export const currentSessionSchema = legacyLoginSchema.omit({ accessToken: true, tokenType: true, expiresIn: true }).extend({
  identityId: idSchema,
  displayName: z.string().max(200).nullable(),
});

export const logoutResultSchema = z.strictObject({ revoked: z.literal(true) });
