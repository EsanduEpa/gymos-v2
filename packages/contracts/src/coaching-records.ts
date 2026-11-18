import { z } from 'zod';

const dietaryItems = z.array(z.string().trim().min(1).max(100)).max(12)
  .refine(items => new Set(items.map(item => item.toLowerCase())).size === items.length);
export const dietaryDetailsSchema = z.strictObject({ allergies: dietaryItems, restrictions: dietaryItems });
const revision = z.number().int().min(0).max(2_147_483_647).nullable();
export const dietaryProfileSchema = dietaryDetailsSchema.extend({
  version: revision,
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
});
export const dietaryProfileUpdateSchema = dietaryDetailsSchema.extend({ expectedVersion: revision });

function decimal(min: number, max: number) {
  return z.string().trim().regex(/^\d{1,3}(?:\.\d{1,2})?$/)
    .refine(value => Number(value) >= min && Number(value) <= max)
    .transform(value => String(Number(value)));
}

const circumferenceCm = decimal(0.01, 999.99).nullable().default(null);
const bodyReadingFields = z.strictObject({
  weightKg: decimal(0.01, 700).nullable(),
  heightCm: decimal(30, 300).nullable(),
  bodyFatPct: decimal(0, 100).nullable(),
  chestCm: circumferenceCm,
  waistCm: circumferenceCm,
  armCm: circumferenceCm,
});
type BodyReading = z.output<typeof bodyReadingFields>;

function hasReading({ weightKg, heightCm, bodyFatPct, chestCm, waistCm, armCm }: BodyReading) {
  return [weightKg, heightCm, bodyFatPct, chestCm, waistCm, armCm].some(value => value !== null);
}

export const bodyReadingSchema = bodyReadingFields.refine(hasReading);
const calendarDate = z.iso.date().refine(value => value >= '0001-01-01');
export const bodyMeasurementInputSchema = bodyReadingSchema.safeExtend({ measuredOn: calendarDate });
export const bodyMeasurementSchema = bodyMeasurementInputSchema.safeExtend({
  bmi: z.number().finite().positive().nullable(),
});
export const progressReportQuerySchema = z.strictObject({ through: calendarDate.optional() });
export const progressPhotoDateSchema = calendarDate;
export const progressPhotoLinkQuerySchema = z.strictObject({
  expiresAt: z.iso.datetime(),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});
const progressPhotoSchema = progressPhotoLinkQuerySchema.extend({
  id: z.uuid(),
  takenOn: calendarDate,
});
export const progressReportSchema = z.strictObject({
  from: z.iso.date(),
  through: z.iso.date(),
  today: z.iso.date(),
  timeZone: z.string().min(1).max(100),
  completedSessions: z.number().int().nonnegative(),
  measurements: z.array(bodyMeasurementSchema).max(90),
  photos: z.array(progressPhotoSchema).max(100).default([]),
});

export type DietaryProfile = z.infer<typeof dietaryProfileSchema>;
export type ProgressReport = z.infer<typeof progressReportSchema>;
