import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const isoInstantSchema = z.iso.datetime({ offset: true });
const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const correctionEmailSchema = z.string().trim().max(254).regex(/^[!-~]+$/).pipe(z.email()).transform(value => value.toLowerCase());
export const emailCorrectionSubmitSchema = z.strictObject({ requestedEmail: correctionEmailSchema, currentPassword: z.string().min(1).max(1024) });
export const emailCorrectionStateSchema = z.enum(['PENDING', 'WITHDRAWN', 'CLOSED']);
export const emailCorrectionResolutionSchema = z.enum(['FOLLOW_UP_RECORDED', 'CLOSED_NO_CHANGE']);
export const emailCorrectionItemSchema = z.strictObject({ id: idSchema, requestedEmail: z.email(), state: emailCorrectionStateSchema,
  resolution: emailCorrectionResolutionSchema.nullable(), version: versionSchema, submittedAt: isoInstantSchema, resolvedAt: isoInstantSchema.nullable() });
export const emailCorrectionListSchema = z.array(emailCorrectionItemSchema).max(20);
export const emailCorrectionCloseSchema = z.strictObject({ expectedVersion: versionSchema, resolution: emailCorrectionResolutionSchema });
export const emailCorrectionAdminItemSchema = emailCorrectionItemSchema.extend({ identityId: idSchema, currentEmail: z.email(), displayName: z.string().max(200).nullable() }).strict();
export const emailCorrectionAdminListSchema = z.array(emailCorrectionAdminItemSchema).max(100);
export type EmailCorrectionItem = z.infer<typeof emailCorrectionItemSchema>;
