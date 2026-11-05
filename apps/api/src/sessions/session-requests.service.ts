import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma as TP, PrismaClient } from '../generated/tenant/client.js';
import { DatabaseService } from '../database.service.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { appendTenantNotification } from '../notifications.service.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { tenantAuditKey, OperationConflictError } from '../operations/primitives.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { reserveSessionCredit } from './credit-holds.js';
import { derivePackCreditBalance, selectEligibleSessionPack } from './session-state.js';
import { retrySessionTransaction } from './session-transactions.js';
import { sessionDecisionInputSchema, sessionDecisionResultSchema, sessionRequestInputSchema, sessionRequestOptionsSchema, sessionRequestResultSchema, trainerSessionRequestsSchema } from '@gymos/contracts';

type Access = TenantGateContext & { identityId: string; identityVersion: number; accessVersion: number; role: string; slug: string;
  actor: { kind: 'MEMBER' | 'TRAINER'; id: string; registrationOperationId: string } | null };
type Binding = { identityId: string; actorId: string; operationId: string };
function partsAt(instant: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const p = Object.fromEntries(values.map(v => [v.type, v.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour), minute: Number(p.minute) };
}
function localKey(p: ReturnType<typeof partsAt>) { return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; }
function localDateAt(date: Date, zone: string) { const p = partsAt(date, zone); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; }
function shiftCovered(start: Date, end: Date, zone: string, shiftStart: string | null, shiftEnd: string | null) {
  if (!shiftStart || !shiftEnd) return true;
  const a = partsAt(start, zone); const b = partsAt(new Date(end.getTime() - 60_000), zone);
  const startMinute = a.hour * 60 + a.minute; const endMinute = b.hour * 60 + b.minute + 1;
  const shiftA = Number(shiftStart.slice(0, 2)) * 60 + Number(shiftStart.slice(3)); const shiftB = Number(shiftEnd.slice(0, 2)) * 60 + Number(shiftEnd.slice(3));
  const startDate = localDateAt(start, zone); const endDate = localDateAt(new Date(end.getTime() - 60_000), zone);
  if (shiftB > shiftA) return startDate === endDate && startMinute >= shiftA && endMinute <= shiftB;
  const nextDate = new Date(`${startDate}T00:00:00.000Z`); nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const next = nextDate.toISOString().slice(0, 10);
  if (startMinute >= shiftA) return endDate === startDate || endDate === next && endMinute <= shiftB;
  return startMinute < shiftB && endDate === startDate && endMinute <= shiftB;
}
function addDecimal(left: string, right: string) {
  const [lw = '0', lf = ''] = left.split('.'); const [rw = '0', rf = ''] = right.split('.'); const scale = Math.max(lf.length, rf.length); const unit = 10n ** BigInt(scale);
  const a = BigInt(lw) * unit + BigInt((lf + '0'.repeat(scale)).slice(0, scale) || '0'); const b = BigInt(rw) * unit + BigInt((rf + '0'.repeat(scale)).slice(0, scale) || '0');
  const total = a + b; const fraction = (total % unit).toString().padStart(scale, '0').replace(/0+$/, '');
  return fraction ? `${total / unit}.${fraction}` : (total / unit).toString();
}
function resolveLocal(date: string, time: string, zone: string, selectedOffset?: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(new Date()); } catch { throw new UnprocessableEntityException('Use the gym time zone'); }
  const [y, m, d] = date.split('-').map(Number); const [h, min] = time.split(':').map(Number);
  const expected = { year: y!, month: m!, day: d!, hour: h!, minute: min! }; const naive = Date.UTC(y!, m! - 1, d!, h!, min!);
  const matches: { instant: Date; offset: string }[] = [];
  for (let minutes = -840; minutes <= 840; minutes++) {
    const instant = new Date(naive - minutes * 60_000);
    if (localKey(partsAt(instant, zone)) === localKey(expected)) {
      const sign = minutes < 0 ? '-' : '+'; const abs = Math.abs(minutes);
      matches.push({ instant, offset: `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}` });
    }
  }
  if (!matches.length) throw new UnprocessableEntityException('This local time does not exist in the gym time zone');
  if (matches.length > 1 && !selectedOffset) throw new UnprocessableEntityException('Choose the UTC offset for this ambiguous local time');
  const chosen = selectedOffset ? matches.find(value => value.offset === selectedOffset) : matches[0];
  if (!chosen) throw new UnprocessableEntityException('The selected UTC offset is not valid for this local time');
  return chosen.instant;
}
function pagesError(error: unknown): never {
  if (error instanceof OperationConflictError) throw new ConflictException('Idempotency key was used for a different session command');
  const e = error as { code?: string; meta?: { code?: string }; cause?: unknown };
  const code = e?.code ?? e?.meta?.code;
  if (code === 'P2002' || code === 'P2004' || code === '23P01' || code === '23505') throw new ConflictException('The requested session time or credit is no longer available');
  throw error;
}

@Injectable()
export class SessionRequestsService {
  constructor(private readonly db: DatabaseService, private readonly gate: TenantSchemaGateService) {}

  private async publishedTrainer(tenant: PrismaClient, gymId: string, trainerId: string): Promise<Binding> {
    const link = await this.db.master.gymAccess.findFirst({ where: { gymId, role: 'TRAINER', actorKind: 'TRAINER', linkStatus: 'ACTIVE', tenantActorId: trainerId, enrollmentOperationId: { not: null } },
      select: { userId: true, tenantActorId: true, enrollmentOperationId: true } });
    if (!link?.tenantActorId || !link.enrollmentOperationId) throw new NotFoundException('Trainer not found');
    const op = await this.db.master.operation.findUnique({ where: { id: link.enrollmentOperationId }, select: { kind: true, state: true, gymId: true, subjectIdentityId: true, tenantActorId: true, tenantCommandReceiptId: true } });
    const receipt = op?.tenantCommandReceiptId ? await tenant.commandReceipt.findUnique({ where: { id: op.tenantCommandReceiptId } }) : null;
    const trainer = await tenant.trainer.findUnique({ where: { id: trainerId }, select: { identityId: true, enrollmentOperationId: true, registrationState: true, status: true } });
    if (op?.kind !== 'REGISTER_TRAINER' || op.state !== 'COMPLETE' || op.gymId !== gymId || op.subjectIdentityId !== link.userId
      || op.tenantActorId !== trainerId || receipt?.state !== 'COMMITTED' || receipt.resourceType !== 'TRAINER' || receipt.resourceId !== trainerId
      || trainer?.identityId !== link.userId || trainer.enrollmentOperationId !== link.enrollmentOperationId || trainer.registrationState !== 'COMPLETE' || trainer.status !== 'ACTIVE') {
      throw new NotFoundException('Trainer not found');
    }
    return { identityId: link.userId, actorId: trainerId, operationId: link.enrollmentOperationId };
  }

  private memberBinding(access: Access): Binding {
    if (access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    return { identityId: access.identityId, actorId: access.actor.id, operationId: access.actor.registrationOperationId };
  }

  async options(access: Access, trainerId: string) {
    const member = this.memberBinding(access);
    return this.gate.withVerifiedTenant(access, async tenant => {
      const trainerBinding = await this.publishedTrainer(tenant, access.gymId, trainerId);
      return withGymAccessFence(this.db.master, [
        { identityId: member.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: member.actorId },
        { identityId: trainerBinding.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: trainerId },
      ], async () => {
        const [trainer, config, clockRows, memberRow] = await Promise.all([
          tenant.trainer.findUnique({ where: { id: trainerId }, select: { fullName: true, level: true, specialisations: true, shiftStart: true, shiftEnd: true, status: true } }),
          tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, currency: true, minimumSessionDurationMinutes: true, masterGymId: true } }),
          tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
          tenant.member.findUnique({ where: { id: member.actorId }, select: { identityId: true, registrationState: true, status: true } }),
        ]);
        if (!memberRow || memberRow.identityId !== member.identityId || memberRow.registrationState !== 'COMPLETE' || memberRow.status !== 'ACTIVE') throw new ForbiddenException('Member access is inactive');
        if (!trainer || trainer.status !== 'ACTIVE') throw new NotFoundException('Trainer not found');
        if (!config?.timezone || !config.currency || config.masterGymId !== access.gymId) throw new UnprocessableEntityException('Gym session policy is unavailable');
        const asOf = clockRows[0]!.now;
        const localToday = localDateAt(asOf, config.timezone);
        const [membership, packs] = await Promise.all([
          tenant.membershipTerm.findFirst({ where: { memberId: member.actorId, startDate: { lte: new Date(`${localToday}T00:00:00.000Z`) }, endDateExclusive: { gt: new Date(`${localToday}T00:00:00.000Z`) } }, select: { id: true } }),
          tenant.sessionPack.findMany({ where: { memberId: member.actorId }, include: { creditMovements: { select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } } } }),
        ]);
        const balances = packs.map(pack => ({ pack, balance: derivePackCreditBalance(pack.issuedCredits, pack.creditMovements.map(row => ({
          available: row.availableDelta, held: row.heldDelta, consumed: row.consumedDelta, expired: row.expiredDelta,
        }))) }));
        const currentlyEligible = balances.filter(({ pack }) => pack.startDate.toISOString().slice(0, 10) <= localToday && pack.endDateExclusive.toISOString().slice(0, 10) > localToday);
        const expiredCredits = balances.reduce((total, { pack, balance }) => total + balance.expired +
          (pack.endDateExclusive.toISOString().slice(0, 10) <= localToday ? balance.available : 0), 0);
        return sessionRequestOptionsSchema.parse({ trainerId, trainerName: trainer.fullName, level: trainer.level, specialisations: trainer.specialisations,
          shiftStart: trainer.shiftStart, shiftEnd: trainer.shiftEnd,
          timeZone: config.timezone, minimumDurationMinutes: 60, maximumDurationMinutes: 60,
          currency: config.currency, availableCredits: currentlyEligible.reduce((total, row) => total + row.balance.available, 0),
          heldCredits: balances.reduce((total, row) => total + row.balance.held, 0), expiredCredits,
          activeMembershipToday: Boolean(membership), asOf: asOf.toISOString() });
      });
    });
  }

  async pendingForTrainer(access: Access) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.gate.withVerifiedTenant(access, async tenant => withGymAccessFence(this.db.master, [
      { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
    ], async () => {
      const [trainer, clockRows] = await Promise.all([
        tenant.trainer.findUnique({ where: { id: access.actor!.id }, select: { identityId: true, registrationState: true, status: true } }),
        tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
      ]);
      if (!trainer || trainer.identityId !== access.identityId || trainer.registrationState !== 'COMPLETE' || trainer.status !== 'ACTIVE') throw new ForbiddenException('Trainer access is inactive');
      const rows = await tenant.pTSession.findMany({ where: { trainerId: access.actor!.id, state: 'PENDING_CONFIRMATION' },
        orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 100, include: { member: { select: { fullName: true } } } });
      return trainerSessionRequestsSchema.parse({ items: rows.map(session => ({ id: session.id, memberId: session.memberId,
        memberName: session.member.fullName, state: session.state, type: session.type, scheduledStartAt: session.scheduledStartAt.toISOString(),
        scheduledEndAt: session.scheduledEndAt.toISOString(), timeZone: session.gymTimezone,
        durationMinutes: Math.round((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000), notes: session.notes, version: session.version })),
        asOf: clockRows[0]!.now.toISOString() });
    }));
  }

  async request(access: Access, raw: unknown) {
    const input = sessionRequestInputSchema.safeParse(raw);
    if (!input.success) throw new UnprocessableEntityException('Enter valid session request details');
    const trainerId = input.data.trainerId;
    const member = this.memberBinding(access);
    try {
      return await this.gate.withVerifiedTenant(access, async tenant => {
        const trainer = await this.publishedTrainer(tenant, access.gymId, trainerId);
        return withGymAccessFence(this.db.master, [
          { identityId: member.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: member.actorId },
          { identityId: trainer.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: trainer.actorId },
        ], async () => retrySessionTransaction(async () => {
          const receiptService = new CommandReceiptFoundationService(tenant);
          const command = await receiptService.execute({ masterGymId: access.gymId, actorIdentityId: member.identityId, commandKind: 'REQUEST_PT_SESSION',
            idempotencyKey: input.data.idempotencyKey, normalizedIntent: input.data }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${member.actorId} FOR UPDATE`;
            await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${trainer.actorId} FOR UPDATE`;
            const [config, memberRow, trainerRow, clockRows] = await Promise.all([
              tx.gymConfiguration.findUnique({ where: { id: 'current' } }),
              tx.member.findFirst({ where: { id: member.actorId, identityId: member.identityId, enrollmentOperationId: member.operationId, registrationState: 'COMPLETE', status: 'ACTIVE' } }),
              tx.trainer.findFirst({ where: { id: trainer.actorId, identityId: trainer.identityId, enrollmentOperationId: trainer.operationId, registrationState: 'COMPLETE', status: 'ACTIVE', level: { not: null } } }),
              tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
            ]);
            if (!config?.timezone || !config.currency || config.masterGymId !== access.gymId || !memberRow || !trainerRow) throw new UnprocessableEntityException('Member and trainer must be active in this gym');
            if (input.data.timeZone !== config.timezone) throw new UnprocessableEntityException('Use the configured gym time zone');
            const start = resolveLocal(input.data.localDate, input.data.localTime, config.timezone, input.data.offset);
            const end = new Date(start.getTime() + input.data.durationMinutes * 60_000); const now = clockRows[0]!.now;
            if (input.data.type !== 'IN_PERSON' || input.data.durationMinutes !== 60) throw new UnprocessableEntityException('New PT requests must be in-person and 60 minutes');
            const earliest = new Date(now.getTime() + 2 * 60 * 60_000);
            const latest = new Date(now.getTime() + 14 * 24 * 60 * 60_000);
            if (start < earliest || start > latest) throw new UnprocessableEntityException('Choose a start at least 2 hours from now and within the next 14 days');
            const day = new Date(`${input.data.localDate}T00:00:00.000Z`);
            const term = await tx.membershipTerm.findFirst({ where: { memberId: member.actorId, startDate: { lte: day }, endDateExclusive: { gt: day } }, select: { id: true } });
            if (!term) throw new UnprocessableEntityException('Member has no active membership for the session date');
            const packs = await tx.sessionPack.findMany({ where: { memberId: member.actorId, startDate: { lte: day }, endDateExclusive: { gt: day } },
              orderBy: [{ endDateExclusive: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], select: { id: true, startDate: true, endDateExclusive: true, createdAt: true, issuedCredits: true } });
            const eligibles = [];
            for (const pack of packs) {
              const movements = await tx.packCreditMovement.findMany({ where: { packId: pack.id }, select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } });
              const balance = derivePackCreditBalance(pack.issuedCredits, movements.map(m => ({ available: m.availableDelta, held: m.heldDelta, consumed: m.consumedDelta, expired: m.expiredDelta })));
              eligibles.push({ id: pack.id, startDate: pack.startDate.toISOString().slice(0, 10), endDateExclusive: pack.endDateExclusive.toISOString().slice(0, 10), createdAt: pack.createdAt, availableCredits: balance.available });
            }
            if (!selectEligibleSessionPack(eligibles, input.data.localDate)) throw new UnprocessableEntityException('No available unexpired session credit');
            const overlap = await tx.pTSession.findFirst({ where: { state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'] }, OR: [{ memberId: member.actorId }, { trainerId: trainer.actorId }], scheduledStartAt: { lt: end }, scheduledEndAt: { gt: start } }, select: { id: true } });
            if (overlap) throw new ConflictException('Member or trainer already has a request or session in that time range');
            const id = randomUUID();
            await tx.pTSession.create({ data: { id, memberId: member.actorId, trainerId: trainer.actorId, state: 'PENDING_CONFIRMATION',
              type: input.data.type, scheduledStartAt: start, scheduledEndAt: end, gymTimezone: config.timezone,
              fee: (trainerRow.level === 'LEVEL_2' ? config.level2SessionFee ?? config.defaultSessionFee : config.defaultSessionFee).toString(),
              currency: config.currency, confirmationShiftStart: trainerRow.shiftStart, confirmationShiftEnd: trainerRow.shiftEnd,
              configurationVersion: config.version, notes: (input.data.notes ?? '').replace(/\r\n?/g, '\n') || null, createdByIdentityId: member.identityId } });
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'PT_SESSION_REQUESTED', resourceType: 'PT_SESSION', resourceId: id, eventOrdinal: 0 });
            await tx.sessionStateEvent.create({ data: { sessionId: id, fromState: null, toState: 'PENDING_CONFIRMATION', committedVersion: 0, actorIdentityId: member.identityId, receiptId: receipt.id, eventKey } });
            const notification = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'HIRE_REQUEST', resourceId: id, recipientIdentityId: trainer.identityId });
            return { result: { resourceIds: [id, notification.id], notificationState: 'AVAILABLE', retryable: false }, resourceType: 'PT_SESSION', resourceId: id,
              audits: [{ actorIdentityId: member.identityId, eventCode: 'PT_SESSION_REQUESTED', resourceType: 'PT_SESSION', resourceId: id, transition: { to: 'PENDING_CONFIRMATION', version: 0 } }] };
          });
          const id = command.result.resourceIds?.[0];
          const eventId = command.result.resourceIds?.[1];
          if (!id || !eventId) throw new ConflictException('Request receipt has no session or notification resource');
          const session = await tenant.pTSession.findUnique({ where: { id } });
          if (!session) throw new ConflictException('Request receipt references a missing session');
          return sessionRequestResultSchema.parse({ receiptId: command.receiptId, replayed: command.replayed, session: { id: session.id, memberId: session.memberId,
            trainerId: session.trainerId, state: session.state, type: session.type, scheduledStartAt: session.scheduledStartAt.toISOString(),
            scheduledEndAt: session.scheduledEndAt.toISOString(), timeZone: session.gymTimezone,
            durationMinutes: Math.round((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000), notes: session.notes, version: session.version },
            notificationOutcome: { eventId, recipient: { role: 'TRAINER', actorId: trainer.actorId }, gymSlug: access.slug,
              state: command.result.notificationState ?? 'AVAILABLE', retryable: command.result.retryable ?? false } });
        }));
      });
    } catch (error) { return pagesError(error); }
  }

  async decide(access: Access, sessionId: string, raw: unknown) {
    const input = sessionDecisionInputSchema.safeParse(raw);
    if (!input.success) throw new UnprocessableEntityException('Enter a valid session decision and current version');
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    try {
      return await this.gate.withVerifiedTenant(access, async tenant => {
        const existing = await tenant.pTSession.findUnique({ where: { id: sessionId }, select: { id: true, memberId: true, trainerId: true } });
        if (!existing || existing.trainerId !== access.actor!.id) throw new NotFoundException('Session request not found');
        const [member] = await this.db.master.gymAccess.findMany({ where: { gymId: access.gymId, role: 'MEMBER', linkStatus: 'ACTIVE', tenantActorId: existing.memberId, actorKind: 'MEMBER' }, select: { userId: true, tenantActorId: true } });
        if (!member?.tenantActorId) throw new NotFoundException('Session request not found');
        return withGymAccessFence(this.db.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: member.userId, gymId: access.gymId, role: 'MEMBER', tenantActorId: member.tenantActorId },
        ], async () => retrySessionTransaction(async () => {
          const service = new CommandReceiptFoundationService(tenant);
          const command = await service.execute({ masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: `TRAINER_${input.data.action}_PT_SESSION`,
            idempotencyKey: input.data.idempotencyKey, normalizedIntent: { sessionId, ...input.data } }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${existing.memberId} FOR UPDATE`;
            await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${existing.trainerId} FOR UPDATE`;
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
            const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true } });
            if (!session || session.trainerId !== access.actor!.id || session.trainer.identityId !== access.identityId || session.member.identityId !== member.userId) throw new NotFoundException('Session request not found');
            if (session.version !== input.data.expectedVersion) throw new ConflictException('Session request changed; reload before deciding');
            if (session.state !== 'PENDING_CONFIRMATION') throw new ConflictException('Only a pending session request can be decided');
            const eventCode = input.data.action === 'ACCEPT' ? 'PT_SESSION_ACCEPTED' : 'PT_SESSION_DECLINED';
            let updated: TP.PTSessionGetPayload<object>;
            if (input.data.action === 'ACCEPT') {
              const [config, clockRows] = await Promise.all([tx.gymConfiguration.findUnique({ where: { id: 'current' } }), tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`]);
              if (!config?.timezone || !config.currency || config.masterGymId !== access.gymId || session.member.status !== 'ACTIVE' || session.trainer.status !== 'ACTIVE') throw new UnprocessableEntityException('Session eligibility changed; the request cannot be accepted');
              const local = localDateAt(session.scheduledStartAt, config.timezone); const day = new Date(`${local}T00:00:00.000Z`);
              if (session.scheduledStartAt <= clockRows[0]!.now) throw new ConflictException('This request time has passed and cannot be accepted');
              const durationMinutes = Math.round((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000);
              if (session.type !== 'IN_PERSON' || durationMinutes !== 60) throw new UnprocessableEntityException('This legacy request cannot be accepted under current PT policy');
              const term = await tx.membershipTerm.findFirst({ where: { memberId: session.memberId, startDate: { lte: day }, endDateExclusive: { gt: day } }, select: { id: true } });
              if (!term) throw new UnprocessableEntityException('Member has no active membership for the session date');
              const fee = session.trainer.level === 'LEVEL_2' ? config.level2SessionFee ?? config.defaultSessionFee : config.defaultSessionFee;
              const rate = session.trainer.level === 'LEVEL_2' ? config.level2BaseRate : config.level1BaseRate;
              const coveredByShift = shiftCovered(session.scheduledStartAt, session.scheduledEndAt, config.timezone, session.trainer.shiftStart, session.trainer.shiftEnd);
              const confirmationRate = coveredByShift ? rate.toString() : addDecimal(rate.toString(), config.offShiftPremium.toString());
              updated = await tx.pTSession.update({ where: { id: session.id, version: input.data.expectedVersion, state: 'PENDING_CONFIRMATION' }, data: {
                state: 'SCHEDULED', version: { increment: 1 }, confirmedAt: clockRows[0]!.now, gymTimezone: config.timezone,
                fee: fee.toString(), currency: config.currency, confirmationLevel: session.trainer.level!, confirmationRate,
                confirmationShiftStart: session.trainer.shiftStart, confirmationShiftEnd: session.trainer.shiftEnd, configurationVersion: config.version,
              } });
              await reserveSessionCredit(tx, { masterGymId: access.gymId, sessionId: session.id, memberId: session.memberId, trainerId: session.trainerId,
                scheduledLocalDate: local, actorIdentityId: access.identityId, receiptId: receipt.id });
            } else {
              updated = await tx.pTSession.update({ where: { id: session.id, version: input.data.expectedVersion, state: 'PENDING_CONFIRMATION' },
                data: { state: 'DECLINED', declineReason: input.data.reason ?? null, version: { increment: 1 } } });
            }
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: updated.version });
            await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: session.state, toState: updated.state, committedVersion: updated.version, actorIdentityId: access.identityId, receiptId: receipt.id, eventKey } });
            const notification = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: input.data.action === 'ACCEPT' ? 'SESSION_BOOKED' : 'SESSION_DECLINED', resourceId: session.id, recipientIdentityId: member.userId });
            return { result: { resourceIds: [session.id, notification.id], notificationState: 'AVAILABLE', retryable: false },
              resourceType: 'PT_SESSION', resourceId: session.id,
              audits: [{ actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, transition: { from: session.state, to: updated.state, version: updated.version } }] };
          });
          const id = command.result.resourceIds?.[0];
          const eventId = command.result.resourceIds?.[1];
          if (!id || !eventId) throw new ConflictException('Decision receipt has no session or notification resource');
          const session = await tenant.pTSession.findUnique({ where: { id }, include: { creditHold: { include: { pack: { select: { creditAllocationPolicyVersion: true } } } } } });
          if (!session) throw new ConflictException('Decision receipt references a missing session');
          const hold = session.creditHold;
          const creditReservation = hold?.state === 'HELD' ? { holdId: hold.id, packId: hold.packId, state: 'HELD' as const,
            creditOrdinal: hold.creditOrdinal, creditValue: `${hold.creditValueMinorUnits / 100n}.${(hold.creditValueMinorUnits % 100n).toString().padStart(2, '0')}`,
            allocationPolicyVersion: hold.pack.creditAllocationPolicyVersion } : null;
          return sessionDecisionResultSchema.parse({ receiptId: command.receiptId, replayed: command.replayed, decision: input.data.action,
            session: { id: session.id, memberId: session.memberId, trainerId: session.trainerId, state: session.state, type: session.type,
              scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(), timeZone: session.gymTimezone,
              durationMinutes: Math.round((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000), notes: session.notes, version: session.version }, creditReservation,
            notificationOutcome: { eventId, recipient: { role: 'MEMBER', actorId: member.tenantActorId! }, gymSlug: access.slug,
              state: command.result.notificationState ?? 'AVAILABLE', retryable: command.result.retryable ?? false } });
        }));
      });
    } catch (error) { return pagesError(error); }
  }
}
