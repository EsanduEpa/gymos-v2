import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ownerDashboardSchema } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';

type Access = TenantGateContext & { role: string; slug: string };

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
        const [{ asOf, date, start, end }] = await tx.$queryRaw<{ asOf: Date; date: string; start: Date; end: Date }[]>`
          WITH clock AS (SELECT clock_timestamp() AS now),
          day AS (SELECT now, (now AT TIME ZONE ${zone})::date AS local_day FROM clock)
          SELECT now AS "asOf", to_char(local_day, 'YYYY-MM-DD') AS date,
            local_day::timestamp AT TIME ZONE ${zone} AS start,
            (local_day + 1)::timestamp AT TIME ZONE ${zone} AS "end"
          FROM day`;
        const today = { scheduledStartAt: { gte: start, lt: end } };
        const monthFrom = `${date.slice(0, 7)}-01`;
        const todaySessionStates = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED'] as const;
        const [activeToday, activeSessions, scheduledToday, earningRows, pending, sessions, trainers, [memberships], [monthEarning]] = await Promise.all([
          tx.pTSession.count({ where: { state: 'ACTIVE', scheduledStartAt: { gte: start, lt: end } } }),
          tx.pTSession.findMany({ where: { state: 'ACTIVE' }, orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } } } }),
          tx.pTSession.count({ where: { ...today, state: { in: [...todaySessionStates] } } }),
          tx.$queryRaw<{ hour: number; amount: string; sourceCount: bigint }[]>`
            SELECT EXTRACT(HOUR FROM (s."scheduledStartAt" AT TIME ZONE ${zone}))::int AS hour,
              COALESCE(SUM(r."amount"),0)::text AS amount, COUNT(*)::bigint AS "sourceCount"
            FROM "RevenueRecord" r JOIN "PTSession" s ON s."id"=r."sessionId"
            WHERE s."scheduledStartAt" >= ${start} AND s."scheduledStartAt" < ${end}
              AND r."currency" = ${currency} AND r."category" <> 'EXPIRED_UNUSED'
            GROUP BY 1 ORDER BY 1`,
          tx.pTSession.count({ where: { state: 'PENDING_CONFIRMATION', requestExpiresAt: { gt: asOf } } }),
          tx.pTSession.findMany({ where: { ...today, state: { in: [...todaySessionStates] } }, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 10,
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } } } }),
          tx.pTSession.groupBy({ by: ['trainerId'], where: { ...today, state: { in: [...todaySessionStates] } }, _count: { _all: true } }),
          tx.$queryRaw<{ activeCount: number; expiringCount: number; expiring: { memberId: string; memberName: string; endDateExclusive: string }[] }[]>`
            WITH boundaries AS (SELECT ${date}::date AS today, ${date}::date + 30 AS cutoff),
            coverage AS (
              SELECT m.id, m."fullName", range_agg(daterange(t."startDate", t."endDateExclusive")) AS terms
              FROM "Member" m
              JOIN "MembershipTerm" t ON t."memberId" = m.id
              CROSS JOIN boundaries
              WHERE m.status = 'ACTIVE' AND t."endDateExclusive" > today AND t."startDate" < cutoff
              GROUP BY m.id, m."fullName"
            ),
            active AS (
              SELECT id AS "memberId", "fullName" AS "memberName", upper(period.term) AS expiry
              FROM coverage CROSS JOIN boundaries CROSS JOIN LATERAL unnest(terms) AS period(term)
              WHERE period.term @> today
            ),
            expiring AS (SELECT * FROM active CROSS JOIN boundaries WHERE expiry < cutoff),
            preview AS (
              SELECT "memberId", "memberName", to_char(expiry, 'YYYY-MM-DD') AS "endDateExclusive"
              FROM expiring ORDER BY expiry, "memberId" LIMIT 10
            )
            SELECT (SELECT count(*)::int FROM active) AS "activeCount",
              (SELECT count(*)::int FROM expiring) AS "expiringCount",
              COALESCE((SELECT json_agg(preview ORDER BY "endDateExclusive", "memberId") FROM preview), '[]'::json) AS expiring`,
          tx.$queryRaw<{ amount: string }[]>`
            WITH membership_spans AS (
              SELECT round("agreedPrice" * 100) AS cents, "endDateExclusive" - "startDate" AS days,
                greatest("startDate", ${monthFrom}::date) - "startDate" AS first_day,
                least("endDateExclusive", ${date}::date) - "startDate" AS end_day
              FROM "MembershipTerm"
              WHERE currency = ${currency} AND "startDate" < ${date}::date AND "endDateExclusive" > ${monthFrom}::date
            ),
            membership AS (
              SELECT coalesce(sum(
                floor(cents / days) * (end_day - first_day) + least(end_day, mod(cents, days)) - least(first_day, mod(cents, days))
              ), 0) / 100 AS amount
              FROM membership_spans
            ),
            pt AS (
              SELECT coalesce(sum(r.amount), 0) AS amount
              FROM "RevenueRecord" r JOIN "PTSession" s ON s.id = r."sessionId"
              WHERE r.currency = ${currency} AND r.category <> 'EXPIRED_UNUSED'
                AND s."scheduledStartAt" >= (${monthFrom}::date::timestamp AT TIME ZONE ${zone})
                AND s."scheduledStartAt" < ${end}
            )
            SELECT round(membership.amount + pt.amount, 4)::text AS amount FROM membership CROSS JOIN pt`,
        ]);
        const trainerIds = new Set([...trainers.map(row => row.trainerId), ...activeSessions.map(row => row.trainerId)]);
        const floorTrainers = trainerIds.size ? await tx.trainer.findMany({ where: { id: { in: [...trainerIds] } }, select: { id: true, fullName: true } }) : [];
        const activeTrainerIds = new Set(activeSessions.map(row => row.trainerId));
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
            activeSessionsToday: metric(activeToday, 'Count of PT session records currently in ACTIVE state whose scheduled start falls during this gym-local day.', activeToday),
            activeSessions: metric(activeSessions.length, 'Count of PT session records currently in ACTIVE state, across all scheduled dates.', activeSessions.length),
            trainersWithSessionsToday: metric(trainers.length, 'Distinct trainers with a scheduled, active, completed, or missed PT session during this gym-local day; this does not prove physical presence.', scheduledToday),
            todayOperationalEarning: { value: money(earning), definition: 'RevenueRecord operational earnings recognized during this gym-local day; excludes expired unused value and does not represent cash received.', numerator: money(earning), denominator: null, sourceCount: revenueSourceCount, currency },
            monthOperationalEarning: { value: monthEarning!.amount, from: monthFrom, through: date },
            pendingRequests: metric(pending, 'Count of all PT session records currently awaiting confirmation.', pending),
          },
          memberships,
          earningChart: buckets.map(bucket => ({ startHour: bucket.startHour, endHour: bucket.endHour, amount: money(bucket.amount), sourceCount: bucket.sourceCount })),
          sessions: sessions.map(row => ({ id: row.id, state: row.state, type: row.type, scheduledStartAt: row.scheduledStartAt.toISOString(), scheduledEndAt: row.scheduledEndAt.toISOString(), memberName: row.member.fullName, trainerName: row.trainer.fullName, currency: row.currency, fee: row.fee.toString() })),
          activeSessionItems: activeSessions.map(row => ({ id: row.id, startedAt: row.startedAt!.toISOString(), scheduledStartAt: row.scheduledStartAt.toISOString(), memberName: row.member.fullName, trainerName: row.trainer.fullName })),
          trainerCards: floorTrainers.map(trainer => ({ id: trainer.id, name: trainer.fullName, scheduledToday: trainers.find(row => row.trainerId === trainer.id)?._count._all ?? 0, activeNow: activeTrainerIds.has(trainer.id) ? 1 : 0 })),
        };
        return ownerDashboardSchema.parse(payload);
      }, { isolationLevel: 'RepeatableRead', timeout: 10_000 });
    });
  }
}
