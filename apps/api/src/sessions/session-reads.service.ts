import { creditTotals, creditUnits } from './credit-unit-projection.js';
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, type PrismaClient } from '../generated/tenant/client.js';
import { DatabaseService } from '../database.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { recentSessionListSchema, sessionReadPageSchema, sessionReadQuerySchema, type SessionReadQuery, sessionDetailSchema, sessionAttentionPageSchema } from '@gymos/contracts';

type Access = TenantGateContext & { identityId: string; role: string; actor?: { kind: string; id: string } | null };
type Range = { start: Date | null; end: Date | null; month: string | null };
type SessionRow = Prisma.PTSessionGetPayload<{ include: { member: { select: { fullName: true } }; trainer: { select: { fullName: true } }; payRecord: { select: { amount: true } }; payCorrections: { select: { amount: true } }; creditHold: { select: { state: true } } } }>;

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

export function sessionCommandAffordances(session: { state: string; scheduledStartAt: Date; scheduledEndAt: Date; startedAt: Date | null; requestExpiresAt?: Date | null }, role: string, now: Date, minimumCompletionMinutes: number | null = null) {
  const commands: Array<'ACCEPT' | 'DECLINE' | 'START' | 'UPDATE_NOTES' | 'CANCEL' | 'WITHDRAW' | 'NO_SHOW' | 'COMPLETE'> = [];
  if (role === 'TRAINER') {
    if (session.state === 'PENDING_CONFIRMATION' && session.requestExpiresAt && now < session.requestExpiresAt) commands.push('ACCEPT', 'DECLINE');
    if (session.state === 'SCHEDULED') {
      commands.push('CANCEL');
      if (session.scheduledStartAt.getTime() - 15 * 60_000 <= now.getTime() && now <= session.scheduledEndAt) commands.push('START');
      if (now.getTime() >= session.scheduledStartAt.getTime() + 15 * 60_000) commands.push('NO_SHOW');
    }
    if (session.state === 'COMPLETED') commands.push('UPDATE_NOTES');
  } else if (role === 'MEMBER') {
    if (session.state === 'PENDING_CONFIRMATION' && session.requestExpiresAt && now < session.requestExpiresAt) commands.push('WITHDRAW');
    if (session.state === 'SCHEDULED') commands.push('CANCEL');
  }
  else if (role === 'OWNER') {
    if (session.state === 'SCHEDULED') commands.push('CANCEL');
    if (session.state === 'COMPLETED') commands.push('UPDATE_NOTES');
    if (session.state === 'SCHEDULED' && now.getTime() >= session.scheduledStartAt.getTime() + 15 * 60_000) commands.push('NO_SHOW');
  }
  if (session.state === 'ACTIVE' && session.startedAt && role === 'TRAINER' && minimumCompletionMinutes !== null
    && now.getTime() >= session.startedAt.getTime() + minimumCompletionMinutes * 60_000) commands.push('COMPLETE');
  return commands;
}

function item(row: SessionRow, role: string, now: Date, minimumCompletionMinutes: number | null = null) {
  return {
    id: row.id, memberId: row.memberId, memberName: row.member.fullName, trainerId: row.trainerId, trainerName: row.trainer.fullName,
    state: row.state, type: row.type, version: row.version,
    scheduledStartAt: row.scheduledStartAt.toISOString(), scheduledEndAt: row.scheduledEndAt.toISOString(), gymTimeZone: row.gymTimezone,
    startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null, confirmedAt: row.confirmedAt?.toISOString() ?? null,
    requestExpiresAt: row.requestExpiresAt?.toISOString() ?? null,
    declineReason: role === 'MEMBER' ? row.declineReason : null,
    createdAt: row.createdAt.toISOString(), fee: role === 'OWNER' ? row.fee?.toString() ?? null : null,
    currency: role === 'OWNER' || role === 'TRAINER' && (row.payRecord || row.payCorrections?.length) ? row.currency ?? null : null, notes: row.notes,
    trainerPay: role === 'TRAINER' && (row.payRecord || row.payCorrections?.length) ? (row.payCorrections ?? []).reduce((sum, correction) => sum.plus(correction.amount.toString()), new Prisma.Decimal(row.payRecord?.amount.toString() ?? '0')).toString() : null,
    commandAffordances: sessionCommandAffordances(row, role, now, minimumCompletionMinutes).filter(command => row.creditHold?.state === 'HELD' || !['START', 'COMPLETE'].includes(command)),
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
      const whereBase: Prisma.PTSessionWhereInput = {
        ...actorFilter,
        ...(query.state ? { state: query.state } : {}),
        ...(rangeStart && rangeEndExclusive ? { scheduledStartAt: { gte: rangeStart, lt: rangeEndExclusive } } : {}),
      };
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const nowRows = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = nowRows[0]!.now;
        const where: Prisma.PTSessionWhereInput = { ...whereBase, AND: [
          { OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: now } }] },
          ...(query.q ? [{ OR: [{ member: { fullName: { contains: query.q, mode: 'insensitive' as const } } }, { trainer: { fullName: { contains: query.q, mode: 'insensitive' as const } } }] }] : []),
        ] };
        const [totalCount, rows, monthBookings, lifetimePackCredits] = await Promise.all([
          tx.pTSession.count({ where }),
          tx.pTSession.findMany({ where, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } }, payRecord: { select: { amount: true } }, payCorrections: { select: { amount: true } }, creditHold: { select: { state: true } } } }),
          query.month && rangeStart && rangeEndExclusive ? tx.pTSession.count({ where: { ...actorFilter, scheduledStartAt: { gte: rangeStart, lt: rangeEndExclusive }, AND: [{ OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: now } }] }] } }) : Promise.resolve(null),
          access.role === 'MEMBER' ? this.memberPackBalance(tx, access.actor!.id, timeZone, now) : Promise.resolve(null),
        ]);
        const policies = await tx.gymConfigurationVersion.findMany({ where: { gymConfigurationId: 'current', configurationVersion: { in: [...new Set(rows.map(row => row.configurationVersion))] } }, select: { configurationVersion: true, minimumSessionDurationMinutes: true } });
        return sessionReadPageSchema.parse({ items: rows.map(row => item(row, access.role, now, policies.find(policy => policy.configurationVersion === row.configurationVersion)?.minimumSessionDurationMinutes ?? null)), page: query.page, pageSize: query.pageSize,
          totalCount, totalPages: Math.ceil(totalCount / query.pageSize), filterTotal: totalCount, asOf: now.toISOString(), timeZone,
          rangeStart: rangeStart?.toISOString() ?? null, rangeEndExclusive: rangeEndExclusive?.toISOString() ?? null,
          summary: { monthBookings, lifetimePackCredits } });
      });
    });
  }

  async detail(access: Access, sessionId: string, timelinePage = 1) {
    if (!['OWNER', 'TRAINER', 'MEMBER'].includes(access.role)) throw new ForbiddenException('Gym access is required');
    if (!/^[A-Za-z0-9_:-]{1,128}$/.test(sessionId)) throw new NotFoundException('Session not found');
    if (!Number.isSafeInteger(timelinePage) || timelinePage < 1 || timelinePage > 1_000_000) throw new UnprocessableEntityException('Enter a valid timeline page');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      await this.verifyReadActor(tenant, access);
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        const row = await tx.pTSession.findFirst({ where: { id: sessionId,
          ...(access.role === 'MEMBER' ? { memberId: access.actor!.id } : access.role === 'TRAINER' ? { trainerId: access.actor!.id } : {}) },
          include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } }, payRecord: { select: { amount: true } }, payCorrections: { select: { amount: true } }, creditHold: { select: { state: true, id: true, packId: true, creditOrdinal: true, remedies: { select: { newEndDateExclusive: true } } } }, settlement: { select: { kind: true, creditConsumed: true } }, adjustments: { orderBy: { committedVersion: 'desc' }, take: 20 }, replacementAdjustment: { select: { sessionId: true } } } });
        const config = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true, address: true } });
        if (!row || config?.masterGymId !== access.gymId) throw new NotFoundException('Session not found');
        const [policy, events, total] = await Promise.all([
          tx.gymConfigurationVersion.findFirst({ where: { gymConfigurationId: 'current', configurationVersion: row.configurationVersion }, select: { address: true, cancellationWindowMinutes: true, minimumSessionDurationMinutes: true } }),
          tx.sessionStateEvent.findMany({ where: { sessionId }, orderBy: [{ committedVersion: 'asc' }, { id: 'asc' }], skip: (timelinePage - 1) * 50, take: 50,
            select: { fromState: true, toState: true, createdAt: true, committedVersion: true } }),
          tx.sessionStateEvent.count({ where: { sessionId } }),
        ]);
        const timelineAdjustments = await tx.pTSessionAdjustment.findMany({ where: { sessionId, committedVersion: { in: events.map(event => event.committedVersion) } }, select: { committedVersion: true, kind: true } });
        const projected = item(row, access.role, now, policy?.minimumSessionDurationMinutes ?? null);
        const expiryAwaitingSweep = row.state === 'PENDING_CONFIRMATION' && (!row.requestExpiresAt || row.requestExpiresAt <= now);
        if (expiryAwaitingSweep) { projected.state = 'EXPIRED'; projected.commandAffordances = []; }
        const resolution = row.adjustments?.find(adjustment => adjustment.effectiveSettlementKind !== null);
        const sourceUnit = row.creditHold?.packId ? (await creditUnits(tx, row.memberId)).find(unit => unit.packId === row.creditHold!.packId && unit.creditOrdinal === row.creditHold!.creditOrdinal) : null;
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: row.gymTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const awaitingRemedy = row.state === 'CANCELLED' && row.creditHold?.state === 'RELEASED' && sourceUnit && !sourceUnit.held && !sourceUnit.consumed && sourceUnit.effectiveEndDateExclusive.toISOString().slice(0,10) <= today && !row.creditHold.remedies?.length;
        const latestEvent = access.role === 'OWNER' ? (await tx.sessionStateEvent.findMany({ where: { sessionId }, orderBy: { committedVersion: 'desc' }, take: 1, select: { id: true } }))[0] : null;
        const allowedKinds: string[] = [];
        if (row.state === 'SCHEDULED' && !row.startedAt && row.creditHold?.state === 'HELD') { allowedKinds.push('CANCEL'); if (row.scheduledStartAt > now) allowedKinds.push('RESCHEDULE'); }
        if (row.creditHold && ['SCHEDULED','ACTIVE','COMPLETED','MISSED','CANCELLED'].includes(row.state) && (row.state !== 'SCHEDULED' || row.scheduledEndAt <= now) && !row.adjustments?.some(adjustment => adjustment.kind === 'RESCHEDULE')) allowedKinds.push('CORRECTION');
        if (awaitingRemedy) allowedKinds.push('REMEDY');
        return sessionDetailSchema.parse({ session: projected, location: policy?.address ?? config.address, creditCost: 1,
          reservation: row.creditHold?.state ?? 'NONE', settlement: resolution?.effectiveSettlementKind ?? row.settlement?.kind ?? null, creditConsumed: resolution?.creditConsumed ?? row.settlement?.creditConsumed ?? null,
          cancellationDeadline: policy ? new Date(row.scheduledStartAt.getTime() - (row.availabilityVersion != null ? 1440 : policy.cancellationWindowMinutes) * 60_000).toISOString() : null,
          minimumCompletionMinutes: policy?.minimumSessionDurationMinutes ?? null,
          completionAvailableAt: row.startedAt && policy ? new Date(row.startedAt.getTime() + policy.minimumSessionDurationMinutes * 60_000).toISOString() : null,
          expiryAwaitingSweep, ownerAttention: access.role === 'OWNER' ? awaitingRemedy ? 'CREDIT_REMEDY_REQUIRED' : sessionAttentionReason(row, now) : null,
          creditRemedyStatus: awaitingRemedy ? 'AWAITING_OWNER' : row.creditHold?.remedies?.length ? 'APPROVED' : null,
          restoredCreditExpiry: row.creditHold?.remedies?.length && sourceUnit ? sourceUnit.effectiveEndDateExclusive.toISOString().slice(0,10) : null,
          replacementSessionId: row.adjustments?.find(adjustment => adjustment.replacementSessionId)?.replacementSessionId ?? null, originalSessionId: row.replacementAdjustment?.sessionId ?? null,
          ownerRecovery: access.role === 'OWNER' ? { latestEventId: latestEvent?.id ?? null, allowedKinds, latestReason: row.adjustments?.[0]?.reason ?? null } : null,
          timeline: events.map(event => ({ from: event.fromState, to: event.toState, at: event.createdAt.toISOString(), notesUpdated: event.fromState === 'COMPLETED' && event.toState === 'COMPLETED' && !timelineAdjustments.some(adjustment => adjustment.committedVersion === event.committedVersion), adjustmentKind: timelineAdjustments.find(adjustment => adjustment.committedVersion === event.committedVersion)?.kind ?? null })),
          timelinePage, timelineTotal: total, timelinePages: Math.ceil(total / 50), asOf: now.toISOString() });
      }, { isolationLevel: 'RepeatableRead' });
    });
  }

  async attention(access: Access, query: { page: number; pageSize: number }) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const now = clock!.now;
      const unresolved = Prisma.sql`(p.state='SCHEDULED' AND p."scheduledEndAt"<${now}) OR (p.state='ACTIVE' AND p."scheduledEndAt"<${now})
        OR (p.state='PENDING_CONFIRMATION' AND (p."requestExpiresAt"<=${now} OR p."requestExpiresAt" IS NULL))
        OR (p.state='CANCELLED' AND h.state='RELEASED' AND u.held=0 AND u.consumed=0 AND u."effectiveEndDateExclusive"<=(${now}::timestamptz AT TIME ZONE p."gymTimezone")::date
          AND NOT EXISTS(SELECT 1 FROM "PTCreditRemedy" r WHERE r."sourceHoldId"=h.id))`;
      const joins = Prisma.sql`FROM "PTSession" p LEFT JOIN "SessionCreditHold" h ON h."sessionId"=p.id LEFT JOIN "PTCreditUnitBalance" u ON u."packId"=h."packId" AND u."creditOrdinal"=h."creditOrdinal"`;
      const [candidates, totals] = await Promise.all([
        tx.$queryRaw<Array<{ id: string; reason: string }>>(Prisma.sql`SELECT p.id, CASE WHEN p.state='CANCELLED' THEN 'CREDIT_REMEDY_REQUIRED' WHEN p.state='SCHEDULED' THEN 'SCHEDULED_PAST_END' WHEN p.state='ACTIVE' THEN 'ACTIVE_PAST_END' ELSE 'REQUEST_EXPIRED' END AS reason ${joins} WHERE ${unresolved} ORDER BY p."scheduledStartAt",p.id LIMIT ${query.pageSize} OFFSET ${(query.page-1)*query.pageSize}`),
        tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total ${joins} WHERE ${unresolved}`),
      ]);
      const rows = await tx.pTSession.findMany({ where: { id: { in: candidates.map(row => row.id) } }, include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } }, payRecord: { select: { amount: true } }, payCorrections: { select: { amount: true } }, creditHold: { select: { state: true } } } });
      const totalCount = Number(totals[0]!.total);
      return sessionAttentionPageSchema.parse({ items: candidates.map(candidate => ({ session: item(rows.find(row => row.id === candidate.id)!, 'OWNER', now), reason: candidate.reason })),
        page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize), asOf: now.toISOString() });
    }, { isolationLevel: 'RepeatableRead' }));
  }

  private async verifyReadActor(tenant: PrismaClient, access: Access) {
    if (access.role === 'OWNER') return;
    if (access.actor?.kind !== access.role) throw new NotFoundException('Session not found');
    const where = { id: access.actor.id, identityId: access.identityId, registrationState: 'COMPLETE' as const };
    const actor = access.role === 'MEMBER' ? await tenant.member.findFirst({ where }) : await tenant.trainer.findFirst({ where: { ...where, status: 'ACTIVE' } });
    if (!actor?.enrollmentOperationId) throw new NotFoundException('Session not found');
    const link = await this.database.master.gymAccess.findFirst({ where: { gymId: access.gymId, userId: access.identityId, role: access.role as 'MEMBER' | 'TRAINER', actorKind: access.role as 'MEMBER' | 'TRAINER',
      tenantActorId: actor.id, linkStatus: 'ACTIVE', enrollmentOperationId: actor.enrollmentOperationId } });
    const operation = await this.database.master.operation.findFirst({ where: { id: actor.enrollmentOperationId, gymId: access.gymId, kind: access.role === 'MEMBER' ? 'REGISTER_MEMBER' : 'REGISTER_TRAINER', state: 'COMPLETE', subjectIdentityId: access.identityId, tenantActorId: actor.id, tenantCommandReceiptId: { not: null } } });
    const receipt = operation?.tenantCommandReceiptId ? await tenant.commandReceipt.findUnique({ where: { id: operation.tenantCommandReceiptId } }) : null;
    if (!link || receipt?.state !== 'COMMITTED' || receipt.sourceMasterOperationId !== actor.enrollmentOperationId || receipt.resourceId !== actor.id || receipt.resourceType !== access.role || receipt.commandKind !== `REGISTER_${access.role}`) throw new NotFoundException('Session not found');
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
        const nowRows = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = nowRows[0]!.now;
        const where = { memberId, OR: [{ state: { not: 'PENDING_CONFIRMATION' as const } }, { requestExpiresAt: { gt: now } }] };
        const [totalCount, rows] = await Promise.all([
          tx.pTSession.count({ where }),
          tx.pTSession.findMany({ where, orderBy: [{ scheduledStartAt: 'desc' }, { id: 'desc' }], take: 10,
            include: { member: { select: { fullName: true } }, trainer: { select: { fullName: true } }, payRecord: { select: { amount: true } }, payCorrections: { select: { amount: true } }, creditHold: { select: { state: true } } } }),
        ]);
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
    const totals = (await creditTotals(tx, [memberId], todayRows[0]!.today)).get(memberId);
    return { available: totals?.available ?? 0, held: totals?.held ?? 0, consumed: totals?.consumed ?? 0, expired: totals?.expired ?? 0 };
  }
}

export function sessionAttentionReason(session: { state: string; scheduledEndAt: Date; requestExpiresAt: Date | null }, now: Date) {
  if (session.state === 'PENDING_CONFIRMATION' && (!session.requestExpiresAt || session.requestExpiresAt <= now)) return 'REQUEST_EXPIRED' as const;
  if (session.state === 'SCHEDULED' && session.scheduledEndAt < now) return 'SCHEDULED_PAST_END' as const;
  if (session.state === 'ACTIVE' && session.scheduledEndAt < now) return 'ACTIVE_PAST_END' as const;
  return null;
}
