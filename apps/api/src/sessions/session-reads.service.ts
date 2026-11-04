import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../generated/tenant/client.js';
import { DatabaseService } from '../database.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { derivePackCreditBalance } from './session-state.js';
import { recentSessionListSchema, sessionReadPageSchema, sessionReadQuerySchema, type SessionReadQuery } from '@gymos/contracts';

type Access = TenantGateContext & { identityId: string; role: string; actor?: { kind: string; id: string } | null };
type Range = { start: Date | null; end: Date | null; month: string | null };
type SessionRow = Prisma.PTSessionGetPayload<{ include: { member: { select: { fullName: true } }; trainer: { select: { fullName: true } }; payRecord: { select: { amount: true } } } }>;

function dateRange(query: SessionReadQuery): Range {
  if (query.date) return { start: new Date(`${query.date}T00:00:00.000Z`), end: new Date(`${query.date}T00:00:00.000Z`), month: null };
  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    const first = `${query.month}-01`;
    const next = month === 12 ? `${year! + 1}-01-01` : `${year}-${String(month! + 1).padStart(2, '0')}-01`;
    return { start: new Date(`${first}T00:00:00.000Z`), end: new Date(`${next}T00:00:00.000Z`), month: query.month };
  }
  if (query.from && query.to) return { start: new Date(`${query.from}T00:00:00.000Z`), end: new Date(`${query.to}T00:00:00.000Z`), month: null };
  return { start: null, end: null, month: null };
}

function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10);
}

export function sessionCommandAffordances(session: { state: string; scheduledStartAt: Date; scheduledEndAt: Date; startedAt: Date | null }, role: string, now: Date) {
  const commands: Array<'ACCEPT' | 'DECLINE' | 'START' | 'UPDATE_NOTES' | 'CANCEL' | 'WITHDRAW' | 'NO_SHOW' | 'COMPLETE'> = [];
  if (role === 'TRAINER') {
    if (session.state === 'PENDING_CONFIRMATION') commands.push('ACCEPT', 'DECLINE');
    if (session.state === 'SCHEDULED') {
      commands.push('CANCEL');
      if (session.scheduledStartAt.getTime() - 15 * 60_000 <= now.getTime() && now <= session.scheduledEndAt) commands.push('START');
      if (now.getTime() >= session.scheduledStartAt.getTime() + 15 * 60_000) commands.push('NO_SHOW');
    }
    if (session.state === 'COMPLETED') commands.push('UPDATE_NOTES');
  } else if (role === 'MEMBER') {
    if (session.state === 'PENDING_CONFIRMATION') commands.push('WITHDRAW');
    if (session.state === 'SCHEDULED') commands.push('CANCEL');
  }
  else if (role === 'OWNER') {
    if (session.state === 'SCHEDULED') commands.push('CANCEL');
    if (session.state === 'COMPLETED') commands.push('UPDATE_NOTES');
    if (session.state === 'SCHEDULED' && now.getTime() >= session.scheduledStartAt.getTime() + 15 * 60_000) commands.push('NO_SHOW');
  }
  if (session.state === 'ACTIVE' && session.startedAt && role === 'TRAINER') commands.push('COMPLETE');
  return commands;
}

function item(row: SessionRow, role: string, now: Date) {
  return {
    id: row.id, memberId: row.memberId, memberName: row.member.fullName, trainerId: row.trainerId, trainerName: row.trainer.fullName,
    state: row.state, type: row.type, version: row.version,
    scheduledStartAt: row.scheduledStartAt.toISOString(), scheduledEndAt: row.scheduledEndAt.toISOString(), gymTimeZone: row.gymTimezone,
    startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null, confirmedAt: row.confirmedAt?.toISOString() ?? null,
    declineReason: role === 'MEMBER' ? row.declineReason : null,
    createdAt: row.createdAt.toISOString(), fee: role === 'OWNER' ? row.fee?.toString() ?? null : null,
    currency: role === 'OWNER' || role === 'TRAINER' && row.payRecord ? row.currency ?? null : null, notes: row.notes,
    trainerPay: role === 'TRAINER' ? row.payRecord?.amount?.toString() ?? null : null,
    commandAffordances: sessionCommandAffordances(row, role, now),
  };
}

@Injectable()
export class SessionReadsService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  async list(access: Access, queryInput: unknown) {
    const query: SessionReadQuery = sessionReadQuerySchema.parse(queryInput ?? {});
    if (!['OWNER', 'TRAINER', 'MEMBER'].includes(access.role)) throw new ForbiddenException('Gym access is required');
    if (access.role !== 'OWNER' && (query.memberId || query.trainerId)) throw new UnprocessableEntityException('Actor filters are not supported for personal session views');
    if ((access.role === 'MEMBER' && access.actor?.kind !== 'MEMBER') || (access.role === 'TRAINER' && access.actor?.kind !== 'TRAINER')) {
      throw new ForbiddenException('A verified gym actor is required');
    }
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Session view unavailable');
      const timeZone = configuration.timezone;
      const [rangeStart, rangeEndExclusive] = await this.utcBounds(tenant, dateRange(query), timeZone);
      if (access.role === 'MEMBER') {
        const actor = await tenant.member.findFirst({ where: { id: access.actor!.id, identityId: access.identityId, registrationState: 'COMPLETE' }, select: { id: true } });
        if (!actor) throw new ForbiddenException('Member session access is unavailable');
      }
      if (access.role === 'TRAINER') {
        const actor = await tenant.trainer.findFirst({ where: { id: access.actor!.id, identityId: access.identityId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } });
        if (!actor) throw new ForbiddenException('Trainer session access is unavailable');
      }
      const actorFilter: Prisma.PTSessionWhereInput = access.role === 'OWNER'
        ? { ...(query.memberId ? { memberId: query.memberId } : {}), ...(query.trainerId ? { trainerId: query.trainerId } : {}) }
        : access.role === 'MEMBER' ? { memberId: access.actor!.id } : { trainerId: access.actor!.id };
      const where: Prisma.PTSessionWhereInput = {
        ...actorFilter,
        ...(query.state ? { state: query.state } : {}),
        ...(rangeStart && rangeEndExclusive ? { scheduledStartAt: { gte: rangeStart, lt: rangeEndExclusive } } : {}),
        ...(query.q ? { OR: [{ member: { fullName: { contains: query.q, mode: 'insensitive' } } }, { trainer: { fullName: { contains: query.q, mode: 'insensitive' } } }] } : {}),
      };
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const nowRows = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = nowRows[0]!.now;
        const [totalCount, rows, monthBookings, lifetimePackCredits] = await Promise.all([
          tx.pTSession.count({ where }),
          tx.pTSession.findMany({ where, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } }, payRecord: { select: { amount: true } } } }),
          query.month && rangeStart && rangeEndExclusive ? tx.pTSession.count({ where: { ...actorFilter, scheduledStartAt: { gte: rangeStart, lt: rangeEndExclusive } } }) : Promise.resolve(null),
          access.role === 'MEMBER' ? this.memberPackBalance(tx, access.actor!.id, timeZone, now) : Promise.resolve(null),
        ]);
        return sessionReadPageSchema.parse({ items: rows.map(row => item(row, access.role, now)), page: query.page, pageSize: query.pageSize,
          totalCount, totalPages: Math.ceil(totalCount / query.pageSize), filterTotal: totalCount, asOf: now.toISOString(), timeZone,
          rangeStart: rangeStart?.toISOString() ?? null, rangeEndExclusive: rangeEndExclusive?.toISOString() ?? null,
          summary: { monthBookings, lifetimePackCredits } });
      });
    });
  }

  async recentMember(access: Access, memberId: string) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const [config, member] = await Promise.all([
        tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } }),
        tenant.member.findUnique({ where: { id: memberId }, select: { id: true, identityId: true, enrollmentOperationId: true, registrationState: true } }),
      ]);
      if (!config?.timezone || config.masterGymId !== access.gymId || !member) throw new NotFoundException('Member not found');
      const published = await this.database.master.operation.findFirst({ where: { id: member.enrollmentOperationId ?? '', gymId: access.gymId,
        kind: 'REGISTER_MEMBER', state: 'COMPLETE', tenantActorId: member.id, subjectIdentityId: member.identityId, tenantCommandReceiptId: { not: null } }, select: { id: true } });
      if (!published || member.registrationState !== 'COMPLETE') throw new NotFoundException('Member not found');
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [nowRows, totalCount, rows] = await Promise.all([
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
          tx.pTSession.count({ where: { memberId } }),
          tx.pTSession.findMany({ where: { memberId }, orderBy: [{ scheduledStartAt: 'desc' }, { id: 'desc' }], take: 10,
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } }, payRecord: { select: { amount: true } } } }),
        ]);
        const now = nowRows[0]!.now;
        return recentSessionListSchema.parse({ items: rows.map(row => item(row, 'OWNER', now)), limit: 10, totalCount, hasMore: totalCount > rows.length,
          asOf: now.toISOString(), timeZone: config.timezone });
      });
    });
  }

  private async utcBounds(tenant: PrismaClient, range: Range, timeZone: string): Promise<[Date | null, Date | null]> {
    if (!range.start || !range.end) return [null, null];
    const startDate = range.start.toISOString().slice(0, 10);
    const endDate = range.end.toISOString().slice(0, 10);
    const sqlEnd = range.month ? endDate : nextDate(endDate);
    const [bounds] = await tenant.$queryRaw<{ start: Date; end: Date }[]>`SELECT (${startDate}::date::timestamp AT TIME ZONE ${timeZone}) AS start, (${sqlEnd}::date::timestamp AT TIME ZONE ${timeZone}) AS end`;
    return [bounds!.start, bounds!.end];
  }

  private async memberPackBalance(tx: Prisma.TransactionClient, memberId: string, timeZone: string, now: Date) {
    const todayRows = await tx.$queryRaw<{ today: string }[]>`SELECT to_char(${now}::timestamptz AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS today`;
    const packs = await tx.sessionPack.findMany({ where: { memberId }, include: { creditMovements: { select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } } } });
    return packs.reduce((total, pack) => {
      const balance = derivePackCreditBalance(pack.issuedCredits, pack.creditMovements.map(m => ({ available: m.availableDelta, held: m.heldDelta, consumed: m.consumedDelta, expired: m.expiredDelta })));
      const expired = todayRows[0]!.today >= pack.endDateExclusive.toISOString().slice(0, 10);
      return { available: total.available + (expired ? 0 : balance.available), held: total.held + balance.held,
        consumed: total.consumed + balance.consumed, expired: total.expired + balance.expired + (expired ? balance.available : 0) };
    }, { available: 0, held: 0, consumed: 0, expired: 0 });
  }
}
