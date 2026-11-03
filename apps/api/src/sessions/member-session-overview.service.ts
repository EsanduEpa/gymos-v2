import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/tenant/client.js';
import { DatabaseService } from '../database.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { memberSessionOverviewSchema, type MemberSessionOverviewQuery } from '@gymos/contracts';

type Access = TenantGateContext & { identityId: string; role: string };
type MonthBounds = { start: Date; end: Date };
type MonthCounts = { pending: number; scheduled: number; active: number; completed: number; missed: number; cancelled: number; declined: number };
const stateMap = {
  PENDING_CONFIRMATION: 'pending', SCHEDULED: 'scheduled', ACTIVE: 'active', COMPLETED: 'completed', MISSED: 'missed', CANCELLED: 'cancelled', DECLINED: 'declined',
} as const;

function monthEnd(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year!, monthNumber!, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
function localDate(value: Date) { return value.toISOString().slice(0, 10); }

@Injectable()
export class MemberSessionOverviewService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  async read(access: Access, query: MemberSessionOverviewQuery) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Member overview is unavailable');
      const monthStart = `${query.month}-01`;
      const monthNext = monthEnd(query.month);
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const nowRows = await tx.$queryRaw<{ now: Date; start: Date; end: Date; today: string }[]>`
          SELECT clock_timestamp() AS now,
            (${monthStart}::date::timestamp AT TIME ZONE ${configuration.timezone}) AS start,
            (${monthNext}::date::timestamp AT TIME ZONE ${configuration.timezone}) AS end,
            to_char(clock_timestamp() AT TIME ZONE ${configuration.timezone}, 'YYYY-MM-DD') AS today`;
        const now = nowRows[0]!.now;
        const bounds: MonthBounds = { start: nowRows[0]!.start, end: nowRows[0]!.end };
        const where: Prisma.MemberWhereInput = { registrationState: 'COMPLETE', ...(query.q ? { OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } },
        ] } : {}) };
        const [totalCount, members] = await Promise.all([
          tx.member.count({ where }),
          tx.member.findMany({ where, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
            select: { id: true, fullName: true, email: true, status: true } }),
        ]);
        const memberIds = members.map(member => member.id);
        if (!memberIds.length) return memberSessionOverviewSchema.parse({ items: [], page: query.page, pageSize: query.pageSize,
          totalCount, totalPages: Math.ceil(totalCount / query.pageSize), matchingMemberCount: totalCount, month: query.month,
          timeZone: configuration.timezone, rangeStart: bounds.start.toISOString(), rangeEndExclusive: bounds.end.toISOString(), asOf: now.toISOString() });

        const [terms, packRows, sessionGroups, matchingRows] = await Promise.all([
          tx.membershipTerm.findMany({ where: { memberId: { in: memberIds } }, orderBy: [{ memberId: 'asc' }, { startDate: 'desc' }, { id: 'desc' }],
            select: { memberId: true, planNameSnapshot: true, startDate: true, endDateExclusive: true } }),
          tx.$queryRaw<{ memberId: string; total: number; remaining: number; used: number; expiredUnused: number }[]>`
            WITH target_packs AS (SELECT "id" FROM "SessionPack" WHERE "memberId" IN (${Prisma.join(memberIds)})), ledger AS (
              SELECT "packId", SUM("availableDelta")::int AS available, SUM("heldDelta")::int AS held,
                SUM("consumedDelta")::int AS consumed, SUM("expiredDelta")::int AS expired
              FROM "PackCreditMovement" WHERE "packId" IN (SELECT "id" FROM target_packs) GROUP BY "packId"
            )
            SELECT p."memberId", COALESCE(SUM(p."issuedCredits"), 0)::int AS total,
              COALESCE(SUM(CASE WHEN p."endDateExclusive" <= ${nowRows[0]!.today}::date THEN 0 ELSE COALESCE(l.available, 0) + COALESCE(l.held, 0) END), 0)::int AS remaining,
              COALESCE(SUM(COALESCE(l.consumed, 0)), 0)::int AS used,
              COALESCE(SUM(COALESCE(l.expired, 0) + CASE WHEN p."endDateExclusive" <= ${nowRows[0]!.today}::date THEN COALESCE(l.available, 0) ELSE 0 END), 0)::int AS "expiredUnused"
            FROM "SessionPack" p LEFT JOIN ledger l ON l."packId" = p."id"
            WHERE p."memberId" IN (${Prisma.join(memberIds)}) GROUP BY p."memberId"`,
          tx.pTSession.groupBy({ by: ['memberId', 'state'], where: { memberId: { in: memberIds }, scheduledStartAt: { gte: bounds.start, lt: bounds.end } }, _count: { _all: true } }),
          tx.pTSession.groupBy({ by: ['memberId'], where: { memberId: { in: memberIds }, scheduledStartAt: { gte: bounds.start, lt: bounds.end } }, _count: { _all: true } }),
        ]);
        const latestTerms = new Map<string, (typeof terms)[number]>();
        for (const term of terms) if (!latestTerms.has(term.memberId)) latestTerms.set(term.memberId, term);
        const packByMember = new Map(packRows.map(pack => [pack.memberId, pack]));
        const countsByMember = new Map<string, MonthCounts>();
        for (const row of sessionGroups) {
          const counts = countsByMember.get(row.memberId) ?? { pending: 0, scheduled: 0, active: 0, completed: 0, missed: 0, cancelled: 0, declined: 0 };
          counts[stateMap[row.state]] = row._count._all;
          countsByMember.set(row.memberId, counts);
        }
        const sessionsByMember = new Map(matchingRows.map(row => [row.memberId, row._count._all]));
        const items = members.map(member => {
          const pack = packByMember.get(member.id);
          const term = latestTerms.get(member.id);
          return {
            member,
            latestMembership: term ? { planName: term.planNameSnapshot, startDate: localDate(term.startDate), endDateExclusive: localDate(term.endDateExclusive) } : null,
            packTotals: { total: pack?.total ?? 0, remaining: pack?.remaining ?? 0, used: pack?.used ?? 0, expiredUnused: pack?.expiredUnused ?? 0, basis: 'LIFETIME' as const },
            monthSessionCounts: countsByMember.get(member.id) ?? { pending: 0, scheduled: 0, active: 0, completed: 0, missed: 0, cancelled: 0, declined: 0 },
            matchingSessionCount: sessionsByMember.get(member.id) ?? 0,
          };
        });
        return memberSessionOverviewSchema.parse({ items, page: query.page, pageSize: query.pageSize, totalCount,
          totalPages: Math.ceil(totalCount / query.pageSize), matchingMemberCount: totalCount, month: query.month,
          timeZone: configuration.timezone, rangeStart: bounds.start.toISOString(), rangeEndExclusive: bounds.end.toISOString(), asOf: now.toISOString() });
      });
    });
  }
}
