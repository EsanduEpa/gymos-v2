import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ownerDashboardSchema } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';

type Access = TenantGateContext & { role: string; slug: string };
function localDate(date: Date, zone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function boundary(date: string, zone: string) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y!, m! - 1, d!);
  for (let offset = -14 * 60; offset <= 14 * 60; offset++) {
    const candidate = new Date(guess - offset * 60_000);
    if (localDate(candidate, zone) === date && new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(candidate) === '00:00') return candidate;
  }
  throw new Error('Gym local midnight unavailable');
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService, private readonly gate: TenantSchemaGateService) {}

  async owner(access: Access) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Owner dashboard is owner-only');
    return this.gate.withVerifiedTenant(access, async tenant => {
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true, masterGymId: true } });
      if (!config?.currency || !config.timezone || config.masterGymId !== access.gymId) throw new NotFoundException('Dashboard unavailable');
      const zone = config.timezone;
      const currency = config.currency;
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const asOf = clock!.now;
        const date = localDate(asOf, zone);
        const start = boundary(date, zone);
        const end = boundary(new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10), zone);
        const [activeToday, allActive, scheduledToday, earningRows, pending, sessions, trainers] = await Promise.all([
          tx.pTSession.count({ where: { state: 'ACTIVE', scheduledStartAt: { gte: start, lt: end } } }),
          tx.pTSession.count({ where: { state: 'ACTIVE' } }),
          tx.pTSession.count({ where: { scheduledStartAt: { gte: start, lt: end } } }),
          tx.$queryRaw<{ hour: number; amount: string; sourceCount: bigint }[]>`
            SELECT EXTRACT(HOUR FROM (s."scheduledStartAt" AT TIME ZONE ${zone}))::int AS hour,
              COALESCE(SUM(r."amount"),0)::text AS amount, COUNT(*)::bigint AS "sourceCount"
            FROM "RevenueRecord" r JOIN "PTSession" s ON s."id"=r."sessionId"
            WHERE s."scheduledStartAt" >= ${start} AND s."scheduledStartAt" < ${end}
              AND r."currency" = ${currency} AND r."category" <> 'EXPIRED_UNUSED'
            GROUP BY 1 ORDER BY 1`,
          tx.pTSession.count({ where: { state: 'PENDING_CONFIRMATION' } }),
          tx.pTSession.findMany({ where: { scheduledStartAt: { gte: start, lt: end } }, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 10,
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } } } }),
          tx.pTSession.groupBy({ by: ['trainerId'], where: { scheduledStartAt: { gte: start, lt: end } }, _count: { _all: true } }),
        ]);
        const floorTrainers = trainers.length ? await tx.trainer.findMany({ where: { id: { in: trainers.map(row => row.trainerId) } }, select: { id: true, fullName: true } }) : [];
        const activeTrainerIds = new Set((await tx.pTSession.findMany({ where: { state: 'ACTIVE', scheduledStartAt: { gte: start, lt: end } }, select: { trainerId: true }, distinct: ['trainerId'] })).map(row => row.trainerId));
        const buckets = Array.from({ length: 8 }, (_, i) => ({ startHour: 6 + 2 * i, endHour: 8 + 2 * i, amount: 0n, sourceCount: 0 }));
        let earning = 0n;
        let revenueSourceCount = 0;
        for (const row of earningRows) {
          const hour = row.hour;
          const [whole, fraction = ''] = row.amount.split('.');
          const minor = BigInt(whole!) * 10_000n + BigInt((fraction + '0000').slice(0, 4));
          earning += minor;
          revenueSourceCount += Number(row.sourceCount);
          if (hour >= 6 && hour < 22) { const bucket = buckets[Math.floor((hour - 6) / 2)]!; bucket.amount += minor; bucket.sourceCount += Number(row.sourceCount); }
        }
        const money = (minor: bigint) => `${minor / 10_000n}.${String(minor % 10_000n).padStart(4, '0')}`;
        const metric = (value: number, definition: string, sourceCount: number) => ({ value, definition, numerator: value, denominator: null as null, sourceCount });
        const payload = { gymSlug: access.slug, date, timeZone: zone, rangeStart: start.toISOString(), rangeEndExclusive: end.toISOString(), asOf: asOf.toISOString(), currency: config.currency,
          metrics: {
            membersInGym: metric(activeToday, 'Count of PT session records in ACTIVE state scheduled during this gym-local day; this is not a people count or physical attendance.', activeToday),
            activeSessions: metric(allActive, 'Count of PT session records currently in ACTIVE state, across all scheduled dates.', allActive),
            trainersOnFloor: metric(floorTrainers.length, 'Distinct trainers with at least one PT session scheduled during this gym-local day; this does not prove physical presence.', scheduledToday),
            todayOperationalEarning: { value: money(earning), definition: 'RevenueRecord operational earnings recognized during this gym-local day; excludes expired unused value and does not represent cash received.', numerator: money(earning), denominator: null, sourceCount: revenueSourceCount, currency },
            pendingRequests: metric(pending, 'Count of all PT session records currently awaiting confirmation.', pending),
          },
          earningChart: buckets.map(bucket => ({ startHour: bucket.startHour, endHour: bucket.endHour, amount: money(bucket.amount), sourceCount: bucket.sourceCount })),
          sessions: sessions.map(row => ({ id: row.id, state: row.state, type: row.type, scheduledStartAt: row.scheduledStartAt.toISOString(), scheduledEndAt: row.scheduledEndAt.toISOString(), memberName: row.member.fullName, trainerName: row.trainer.fullName, currency: row.currency, fee: row.fee.toString() })),
          trainerCards: floorTrainers.map(trainer => ({ id: trainer.id, name: trainer.fullName, scheduledToday: trainers.find(row => row.trainerId === trainer.id)?._count._all ?? 0, activeToday: activeTrainerIds.has(trainer.id) ? 1 : 0 })),
        };
        return ownerDashboardSchema.parse(payload);
      }, { isolationLevel: 'RepeatableRead', timeout: 10_000 });
    });
  }
}
