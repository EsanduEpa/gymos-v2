import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { analyticsQuerySchema, gymAnalyticsSchema } from '@gymos/contracts';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';

type Access = TenantGateContext & { role: string; slug: string };
function parts(date: Date, zone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
}
function midnight(day: string, zone: string) {
  const [year, month, date] = day.split('-').map(Number);
  const guess = Date.UTC(year!, month! - 1, date!);
  for (let offset = -840; offset <= 840; offset++) {
    const value = new Date(guess - offset * 60_000);
    const p = parts(value, zone);
    if (`${p.year}-${p.month}-${p.day}` === day && p.hour === '00' && p.minute === '00') return value;
  }
  throw new Error('Local midnight unavailable');
}
function dateAdd(day: string, amount: number) { const value = new Date(`${day}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); }
function localDay(value: Date, zone: string) { const p = parts(value, zone); return `${p.year}-${p.month}-${p.day}`; }
function monthAdd(month: string, amount: number) { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + amount); return d.toISOString().slice(0, 7); }
export function shiftHours(start: string | null, end: string | null) {
  if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return 8;
  const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
  const minutes = eh! * 60 + em! - sh! * 60 - sm!;
  return (minutes > 0 ? minutes : minutes + 1440) / 60;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly gate: TenantSchemaGateService) {}
  async gym(access: Access, rawQuery: unknown) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Analytics are owner-only');
    const parsed = analyticsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) throw new NotFoundException('Analytics window unavailable');
    return this.gate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!config?.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Analytics unavailable');
      const zone = config.timezone;
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const asOf = clock!.now;
        const today = localDay(asOf, zone);
        const monthStart = `${today.slice(0, 7)}-01`;
        const sixMonthStart = `${monthAdd(today.slice(0, 7), -5)}-01`;
        const nextMonthStart = `${monthAdd(today.slice(0, 7), 1)}-01`;
        const start30 = new Date(asOf.getTime() - 30 * 86_400_000);
        const utilizationEnd = midnight(dateAdd(today, 366), zone); // today plus the full 365-day booking horizon
        const [trainers, trainerHours, peak, growth] = await Promise.all([
          tx.trainer.findMany({ where: { status: 'ACTIVE' }, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], take: 101,
            select: { id: true, fullName: true, shiftStart: true, shiftEnd: true } }),
          tx.$queryRaw<{ trainerId: string; scheduledHours: string; sourceCount: bigint }[]>`
            SELECT s."trainerId", COALESCE(SUM(EXTRACT(EPOCH FROM (s."scheduledEndAt"-s."scheduledStartAt"))/3600),0)::text AS "scheduledHours", COUNT(*)::bigint AS "sourceCount"
            FROM "PTSession" s WHERE s."scheduledStartAt" >= ${start30} AND s."scheduledStartAt" < ${utilizationEnd}
              AND s."state" IN ('SCHEDULED','ACTIVE','COMPLETED') GROUP BY s."trainerId"`,
          tx.$queryRaw<{ hour: number; sessionCount: bigint }[]>`
            SELECT EXTRACT(HOUR FROM ("scheduledStartAt" AT TIME ZONE ${zone}))::int AS hour, COUNT(*)::bigint AS "sessionCount"
            FROM "PTSession" WHERE "scheduledStartAt" >= ${start30} AND "scheduledStartAt" < ${asOf}
              AND "state" IN ('SCHEDULED','ACTIVE','COMPLETED') AND EXTRACT(HOUR FROM ("scheduledStartAt" AT TIME ZONE ${zone})) BETWEEN 6 AND 20
            GROUP BY 1 ORDER BY 1`,
          tx.$queryRaw<{ month: string; count: bigint }[]>`
            SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${zone}, 'YYYY-MM') AS month, COUNT(*)::bigint AS count
            FROM "Member" WHERE ("createdAt" AT TIME ZONE 'UTC') >= ${midnight(sixMonthStart, zone)} AND ("createdAt" AT TIME ZONE 'UTC') < ${midnight(nextMonthStart, zone)}
            GROUP BY 1 ORDER BY 1`,
        ]);
        if (trainers.length > 100) throw new NotFoundException('Analytics source exceeds its configured bound');
        const hoursByTrainer = new Map(trainerHours.map(row => [row.trainerId, row]));
        const utilization = trainers.map(trainer => {
          const scheduledHours = Number(hoursByTrainer.get(trainer.id)?.scheduledHours ?? 0);
          const availableHours = shiftHours(trainer.shiftStart, trainer.shiftEnd) * 22;
          const valuePercent = availableHours === 0 ? null : Math.min(100, Math.round(scheduledHours / availableHours * 100));
          return { trainerId: trainer.id, trainerName: trainer.fullName, scheduledHours: Math.round(scheduledHours * 10) / 10,
            availableHours, idleHours: Math.max(0, Math.round((availableHours - scheduledHours) * 10) / 10), valuePercent,
            sourceCount: Number(hoursByTrainer.get(trainer.id)?.sourceCount ?? 0) };
        });
        const peakMap = new Map(peak.map(row => [row.hour, Number(row.sessionCount)]));
        const growthMap = new Map(growth.map(row => [row.month, Number(row.count)]));
        const points = Array.from({ length: 6 }, (_, index) => monthAdd(today.slice(0, 7), index - 5));
        const rangeStart = parsed.data.window === '30d' ? start30 : midnight(sixMonthStart, zone);
        return gymAnalyticsSchema.parse({ gymSlug: access.slug, window: parsed.data.window, timeZone: zone,
          rangeStart: rangeStart.toISOString(), rangeEndExclusive: (parsed.data.window === '30d' ? asOf : midnight(nextMonthStart, zone)).toISOString(), asOf: asOf.toISOString(),
          utilization: { label: 'Estimated trainer utilization', formula: 'scheduled PT-session duration in trailing 30×24 hours plus future sessions within the 365-day booking horizon divided by current trainer shift hours × 22 working days; default shift is 8 hours and overnight shifts wrap midnight', points: utilization },
          peakHours: { label: 'Average scheduled sessions per trailing 30 days', formula: 'scheduled, active and completed PT-session records by gym-local scheduled start hour from 06:00 through 20:59, divided by 30', points: Array.from({ length: 15 }, (_, index) => { const hour = index + 6; const sessionCount = peakMap.get(hour) ?? 0; return { hour, sessionCount, averagePerDay: Math.round(sessionCount / 30 * 10) / 10 }; }) },
          memberGrowth: { label: 'Member profiles created', formula: 'member records grouped by gym-local creation month across six calendar months including the current month', points: points.map(month => ({ month, count: growthMap.get(month) ?? 0 })) },
        });
      }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
    });
  }
}
