import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);

const trainerLevelSchema = z.enum(['LEVEL_1', 'LEVEL_2']);
const shiftTimeSchema = z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/);

export const trainerRegistrationInputSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(3).max(40),
  level: trainerLevelSchema,
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  specialisations: z.array(z.string().trim().min(1).max(60)).max(20),
  shiftStart: shiftTimeSchema.nullable(),
  shiftEnd: shiftTimeSchema.nullable(),
  bio: z.string().trim().max(2000).nullable(),
  idempotencyKey: idempotencyKeySchema,
}).superRefine((value, context) => {
  if ((value.shiftStart === null) !== (value.shiftEnd === null)) {
    context.addIssue({ code: 'custom', message: 'Provide both shift times or leave both blank', path: ['shiftEnd'] });
  }
  const normalized = value.specialisations.map(item => item.toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    context.addIssue({ code: 'custom', message: 'Specialisations must be unique', path: ['specialisations'] });
  }
});

export const trainerRegistrationResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ operationId: idSchema, status: z.literal('PENDING'), replayed: z.boolean(), consentRequired: z.literal(true) }),
  z.strictObject({ operationId: idSchema, trainerId: idSchema, status: z.literal('COMPLETE'), replayed: z.boolean(),
    credentialDeliveryVersion: versionSchema.optional(), temporaryPassword: z.string().min(1).max(128).optional(),
    credentialExpiresAt: z.iso.datetime({ offset: true }).optional() }),
]);
