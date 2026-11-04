import { z } from 'zod';

const instant = z.iso.datetime({ offset: true });
const integer = z.number().int().nonnegative();
const point = z.strictObject({ trainerId: z.string().min(1).max(128), trainerName: z.string().min(1).max(120),
  scheduledHours: z.number().nonnegative(), idleHours: z.number().nonnegative(), availableHours: z.number().nonnegative(), valuePercent: z.number().nullable(), sourceCount: integer });
export const analyticsQuerySchema = z.strictObject({ window: z.enum(['30d', '6m']).default('30d') });
export const gymAnalyticsSchema = z.strictObject({ gymSlug: z.string().min(1).max(100), window: z.enum(['30d', '6m']), timeZone: z.string().min(1).max(100),
  rangeStart: instant, rangeEndExclusive: instant, asOf: instant,
  utilization: z.strictObject({ label: z.literal('Estimated trainer utilization'), formula: z.string(), points: z.array(point).max(100) }),
  peakHours: z.strictObject({ label: z.literal('Average scheduled sessions per trailing 30 days'), formula: z.string(), points: z.array(z.strictObject({ hour: z.number().int().min(6).max(20), sessionCount: integer, averagePerDay: z.number().nonnegative() })).length(15) }),
  memberGrowth: z.strictObject({ label: z.literal('Member profiles created'), formula: z.string(), points: z.array(z.strictObject({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), count: integer })).length(6) }),
});
export type GymAnalytics = z.infer<typeof gymAnalyticsSchema>;
