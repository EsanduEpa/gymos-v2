import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const date = z.iso.date();
const minute = z.number().int().min(0).max(1440);
const interval = z.strictObject({ startMinute: minute, endMinute: minute }).refine(value => value.endMinute > value.startMinute, 'End must follow start');

export const availabilityQuerySchema = z.strictObject({ from: date, through: date });
export const availabilityUpdateSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
  weekly: z.array(z.strictObject({ weekday: z.number().int().min(0).max(6), effectiveFrom: date, effectiveToExclusive: date, windows: z.array(interval).min(1).max(8) })).max(56),
  dated: z.array(z.strictObject({ localDate: date, windows: z.array(interval).max(8) })).max(60),
  blocks: z.array(z.strictObject({ localDate: date, ...interval.shape, reason: z.string().trim().max(500).optional() })).max(100),
  closures: z.array(date).max(60),
  closureRange: z.strictObject({ from: date, through: date }).optional(),
}).superRefine((value, ctx) => {
  const unique = new Set<string>();
  for (const day of value.weekly) {
    if (day.effectiveToExclusive <= day.effectiveFrom) ctx.addIssue({ code: 'custom', message: 'Effective end must be after start', path: ['weekly'] });
    const key = `${day.weekday}:${day.effectiveFrom}`;
    if (unique.has(key)) ctx.addIssue({ code: 'custom', message: 'Duplicate weekly effective date', path: ['weekly'] });
    unique.add(key);
  }
  if (value.closureRange && value.closureRange.through < value.closureRange.from) ctx.addIssue({ code: 'custom', message: 'Closure range must be ordered', path: ['closureRange'] });
  if (value.closures.length && !value.closureRange) ctx.addIssue({ code: 'custom', message: 'Closure changes require an explicit date range', path: ['closureRange'] });
  if (value.closureRange && value.closures.some(day => day < value.closureRange!.from || day > value.closureRange!.through)) ctx.addIssue({ code: 'custom', message: 'Closure dates must be inside the edited range', path: ['closures'] });
});

export const availabilitySchema = z.strictObject({
  trainerId: id, version: z.number().int().nonnegative(), timeZone: z.string().min(1).max(100), asOf: z.iso.datetime({ offset: true }),
  weekly: z.array(z.strictObject({ weekday: z.number().int().min(0).max(6), effectiveFrom: date, effectiveToExclusive: date, startMinute: minute, endMinute: minute })).max(500),
  dated: z.array(z.strictObject({ localDate: date, startMinute: minute, endMinute: minute })).max(500),
  blocks: z.array(z.strictObject({ localDate: date, startMinute: minute, endMinute: minute, reason: z.string().max(500).nullable() })).max(500),
  closures: z.array(date).max(500),
});

export const availabilitySlotsQuerySchema = z.strictObject({ trainerId: id, localDate: date, memberId: id.optional() });
export const availabilitySlotsSchema = z.strictObject({ trainerId: id, localDate: date, timeZone: z.string().min(1).max(100), asOf: z.iso.datetime({ offset: true }),
  availabilityVersion: z.number().int().nonnegative(), durationMinutes: z.literal(60), slots: z.array(z.strictObject({ startAt: z.iso.datetime({ offset: true }), endAt: z.iso.datetime({ offset: true }), localTime: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/), offset: z.string().regex(/^(?:\+|-)[0-9]{2}:[0-9]{2}$/) })).max(96),
  reason: z.enum(['NO_AVAILABILITY', 'CLOSED', 'NO_ELIGIBLE_SLOT']).nullable() });

export type AvailabilityUpdate = z.infer<typeof availabilityUpdateSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
