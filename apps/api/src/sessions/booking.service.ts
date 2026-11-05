import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PrismaClient } from '../generated/tenant/client.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { OperationConflictError, tenantAuditKey } from '../operations/primitives.js';
import { DatabaseService } from '../database.service.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { appendTenantNotification } from '../notifications.service.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { derivePackCreditBalance } from './session-state.js';
import { reserveSessionCredit } from './credit-holds.js';
import { allowedStartMinutes, type AvailabilityRule } from './availability-policy.js';
import { retrySessionTransaction } from './session-transactions.js';
import {
  sessionBookingInputSchema, sessionBookingOptionsSchema, sessionBookingResultSchema,
  type SessionBookingOptionsQuery,
} from '@gymos/contracts';

type Access = TenantGateContext & { identityId: string; identityVersion: number; accessVersion: number; role: string; slug: string };
type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

function partsAt(instant: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day), hour: Number(value.hour), minute: Number(value.minute) };
}
function localDateAt(instant: Date, timeZone: string): string {
  const p = partsAt(instant, timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
function localKey(p: LocalParts) { return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; }
function offsetText(minutes: number) {
  const sign = minutes < 0 ? '-' : '+'; const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}
export function resolveSessionLocalTime(localDate: string, localTime: string, timeZone: string, selectedOffset?: string): { instant: Date; offset: string } {
  try { new Intl.DateTimeFormat('en', { timeZone }).format(new Date()); }
  catch { throw new UnprocessableEntityException({ message: 'Enter a valid gym time zone', fieldErrors: { timeZone: ['Use the gym IANA time zone'] } }); }
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = localTime.split(':').map(Number);
  const desired = { year: year!, month: month!, day: day!, hour: hour!, minute: minute! };
  const naive = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
  const possibilities: { instant: Date; offset: string }[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 1) {
    const instant = new Date(naive - offset * 60_000);
    if (localKey(partsAt(instant, timeZone)) === localKey(desired)) possibilities.push({ instant, offset: offsetText(offset) });
  }
  if (!possibilities.length) throw new UnprocessableEntityException({ message: 'This local time does not exist in the gym time zone', fieldErrors: { localTime: ['Choose a valid time outside the daylight-saving gap'] } });
  if (possibilities.length > 1 && !selectedOffset) throw new UnprocessableEntityException({ message: 'Choose the UTC offset for this ambiguous local time', fieldErrors: { offset: ['An explicit offset is required'] } });
  if (selectedOffset) {
    const match = possibilities.find(candidate => candidate.offset === selectedOffset);
    if (!match) throw new UnprocessableEntityException({ message: 'The UTC offset is not valid for this local time', fieldErrors: { offset: ['Choose one of the valid offsets for the selected time'] } });
    return match;
  }
  return possibilities[0]!;
}
function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
function decimal(value: { toString(): string } | string | null | undefined) { return value == null ? null : typeof value === 'string' ? value : value.toString(); }
function minorUnitsAmount(value: bigint) { return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`; }
function decimalSum(a: string, b: string) {
  const [aw = '0', af = ''] = a.split('.'); const [bw = '0', bf = ''] = b.split('.');
  const scale = Math.max(af.length, bf.length); const factor = 10n ** BigInt(scale);
  const left = BigInt(aw) * factor + BigInt((af + '0'.repeat(scale)).slice(0, scale) || '0');
  const right = BigInt(bw) * factor + BigInt((bf + '0'.repeat(scale)).slice(0, scale) || '0');
  const result = left + right; const whole = result / factor; const fraction = (result % factor).toString().padStart(scale, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
function totalPages(total: number, size: number) { return Math.ceil(total / size); }
function withinShift(start: Date, end: Date, timeZone: string, shiftStart: string | null, shiftEnd: string | null) {
  if (!shiftStart || !shiftEnd) return true;
  const localStart = partsAt(start, timeZone); const localEnd = partsAt(new Date(end.getTime() - 60_000), timeZone);
  const startMinute = localStart.hour * 60 + localStart.minute;
  const endMinute = localEnd.hour * 60 + localEnd.minute + 1;
  const shiftA = Number(shiftStart.slice(0, 2)) * 60 + Number(shiftStart.slice(3));
  const shiftB = Number(shiftEnd.slice(0, 2)) * 60 + Number(shiftEnd.slice(3));
  const overnight = shiftB <= shiftA;
  const startDate = localDateAt(start, timeZone); const endDate = localDateAt(new Date(end.getTime() - 60_000), timeZone);
  if (!overnight) return startDate === endDate && startMinute >= shiftA && endMinute <= shiftB;
  if (startMinute >= shiftA) return endDate === startDate ? true : endDate === addDays(startDate, 1) && endMinute <= shiftB;
  if (startMinute < shiftB) return endDate === startDate && endMinute <= shiftB;
  return false;
}
function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { code?: string; cause?: unknown; meta?: { code?: string } };
  return value.code ?? value.meta?.code ?? errorCode(value.cause);
}
function conflictFromDatabase(error: unknown): never {
  const code = errorCode(error);
  if (code === 'P2002' || code === 'P2004' || code === '23P01' || code === '23505') throw new ConflictException('This member or trainer already has a session in that time range');
  throw error;
}

@Injectable()
export class SessionBookingService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  private async publishedBindings(tenant: PrismaClient, gymId: string, role: 'MEMBER' | 'TRAINER') {
    const links = await this.database.master.gymAccess.findMany({ where: { gymId, role, actorKind: role, linkStatus: 'ACTIVE', tenantActorId: { not: null }, enrollmentOperationId: { not: null } },
      select: { userId: true, tenantActorId: true, enrollmentOperationId: true } });
    if (!links.length) return [];
    const operations = await this.database.master.operation.findMany({ where: { id: { in: links.map(link => link.enrollmentOperationId!) }, gymId,
      kind: role === 'MEMBER' ? 'REGISTER_MEMBER' : 'REGISTER_TRAINER', state: 'COMPLETE', tenantCommandReceiptId: { not: null } },
      select: { id: true, subjectIdentityId: true, tenantActorId: true, tenantCommandReceiptId: true } });
    const operationMap = new Map(operations.map(operation => [operation.id, operation]));
    const receipts = await tenant.commandReceipt.findMany({ where: { sourceMasterOperationId: { in: operations.map(operation => operation.id) }, state: 'COMMITTED',
      commandKind: `REGISTER_${role}`, resourceType: role }, select: { id: true, sourceMasterOperationId: true, resourceId: true } });
    const receiptMap = new Map(receipts.map(receipt => [receipt.sourceMasterOperationId, receipt]));
    const actorIds = links.map(link => link.tenantActorId!).filter(Boolean);
    const rows = role === 'MEMBER'
      ? await tenant.member.findMany({ where: { id: { in: actorIds }, registrationState: 'COMPLETE' }, select: { id: true, identityId: true, enrollmentOperationId: true } })
      : await tenant.trainer.findMany({ where: { id: { in: actorIds }, registrationState: 'COMPLETE' }, select: { id: true, identityId: true, enrollmentOperationId: true } });
    const actorMap = new Map(rows.map(row => [row.id, row]));
    return links.flatMap(link => {
      const operation = operationMap.get(link.enrollmentOperationId!); const receipt = receiptMap.get(link.enrollmentOperationId!);
      const actor = actorMap.get(link.tenantActorId!);
      return operation && receipt && actor && operation.subjectIdentityId === link.userId && operation.tenantActorId === link.tenantActorId
        && receipt.id === operation.tenantCommandReceiptId && receipt.resourceId === link.tenantActorId
        && actor.identityId === link.userId && actor.enrollmentOperationId === link.enrollmentOperationId
        ? [{ identityId: link.userId, actorId: link.tenantActorId!, operationId: link.enrollmentOperationId! }] : [];
    });
  }

  async options(access: Access, query: SessionBookingOptionsQuery) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Session booking options are owner-only');
    return this.tenantGate.withVerifiedTenant(access, async tenant => withGymAccessFence(this.database.master,
      [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' }], async () => {
        const [config, memberBindings, trainerBindings] = await Promise.all([
          tenant.gymConfiguration.findUnique({ where: { id: 'current' } }),
          this.publishedBindings(tenant, access.gymId, 'MEMBER'), this.publishedBindings(tenant, access.gymId, 'TRAINER'),
        ]);
        if (!config?.timezone || !config.currency || config.masterGymId !== access.gymId) throw new UnprocessableEntityException('Gym currency and time zone must be configured');
        const currency = config.currency;
        const timeZone = config.timezone;
        const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now; const localDate = query.localDate ?? localDateAt(now, config.timezone);
        const localDateValue = new Date(`${localDate}T00:00:00.000Z`);
        const memberBindingIds = memberBindings.map(binding => binding.actorId);
        const trainerBindingIds = trainerBindings.map(binding => binding.actorId);
        const membersAll = await tenant.member.findMany({ where: { id: { in: memberBindingIds }, status: 'ACTIVE', registrationState: 'COMPLETE', ...(query.qMembers ? { fullName: { contains: query.qMembers, mode: 'insensitive' } } : {}) },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }], select: { id: true, fullName: true } });
        const trainersAll = await tenant.trainer.findMany({ where: { id: { in: trainerBindingIds }, status: 'ACTIVE', registrationState: 'COMPLETE', level: { not: null }, ...(query.qTrainers ? { fullName: { contains: query.qTrainers, mode: 'insensitive' } } : {}) },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }], select: { id: true, fullName: true, level: true, shiftStart: true, shiftEnd: true } });
        const memberPageRows = membersAll.slice((query.memberPage - 1) * query.memberPageSize, query.memberPage * query.memberPageSize);
        const trainerPageRows = trainersAll.slice((query.trainerPage - 1) * query.trainerPageSize, query.trainerPage * query.trainerPageSize);
        const makeMemberOption = async (member: { id: string; fullName: string }) => {
          const [termCount, packs] = await Promise.all([
            tenant.membershipTerm.count({ where: { memberId: member.id, startDate: { lte: localDateValue }, endDateExclusive: { gt: localDateValue } } }),
            tenant.sessionPack.findMany({ where: { memberId: member.id, startDate: { lte: localDateValue }, endDateExclusive: { gt: localDateValue }, currency },
              include: { creditMovements: { select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } } } }),
          ]);
          const availableCredits = packs.reduce((total, pack) => total + derivePackCreditBalance(pack.issuedCredits, pack.creditMovements.map(movement => ({ available: movement.availableDelta,
            held: movement.heldDelta, consumed: movement.consumedDelta, expired: movement.expiredDelta }))).available, 0);
          return { memberId: member.id, name: member.fullName, availableCredits,
            eligibility: termCount === 0 ? 'NO_ACTIVE_MEMBERSHIP' as const : availableCredits === 0 ? 'NO_CREDIT' as const : 'ELIGIBLE' as const };
        };
        const members = await Promise.all(memberPageRows.map(makeMemberOption));
        const trainers = trainerPageRows.map(trainer => ({ trainerId: trainer.id, name: trainer.fullName, level: trainer.level!, shiftStart: trainer.shiftStart, shiftEnd: trainer.shiftEnd }));
        const selectedMember = query.selectedMemberId ? await (async () => {
          const member = await tenant.member.findFirst({ where: { id: { equals: query.selectedMemberId, in: memberBindingIds }, status: 'ACTIVE', registrationState: 'COMPLETE' }, select: { id: true, fullName: true } });
          return member ? makeMemberOption(member) : null;
        })() : null;
        const selectedTrainerRow = query.selectedTrainerId ? await tenant.trainer.findFirst({ where: { id: { equals: query.selectedTrainerId, in: trainerBindingIds }, status: 'ACTIVE', registrationState: 'COMPLETE', level: { not: null } }, select: { id: true, fullName: true, level: true, shiftStart: true, shiftEnd: true } }) : null;
        const result = {
          members: { items: members, page: query.memberPage, pageSize: query.memberPageSize, totalCount: membersAll.length, totalPages: totalPages(membersAll.length, query.memberPageSize), asOf: now.toISOString() },
          trainers: { items: trainers, page: query.trainerPage, pageSize: query.trainerPageSize, totalCount: trainersAll.length, totalPages: totalPages(trainersAll.length, query.trainerPageSize), asOf: now.toISOString() },
          selectedMember, selectedTrainer: selectedTrainerRow ? { trainerId: selectedTrainerRow.id, name: selectedTrainerRow.fullName, level: selectedTrainerRow.level!, shiftStart: selectedTrainerRow.shiftStart, shiftEnd: selectedTrainerRow.shiftEnd } : null,
          policy: { timeZone, localDate, minimumDurationMinutes: 60 as const, maximumDurationMinutes: 60 as const,
            scheduleHorizonDays: 14 as const, configurationVersion: config.version, cancellationWindowMinutes: config.cancellationWindowMinutes },
          rateInfo: { currency, defaultSessionFee: config.defaultSessionFee.toString(), level2SessionFee: decimal(config.level2SessionFee), introSessionFee: decimal(config.introSessionFee),
            level1BaseRate: config.level1BaseRate.toString(), level2BaseRate: config.level2BaseRate.toString(), offShiftPremium: config.offShiftPremium.toString() },
          noEligibleMembersReason: membersAll.length === 0 || members.every(item => item.eligibility !== 'ELIGIBLE') ? 'NO_ACTIVE_MEMBERSHIP_OR_CREDIT' as const : null,
          asOf: now.toISOString(),
        };
        return sessionBookingOptionsSchema.parse(result);
      }));
  }

  async book(access: Access, raw: unknown, idempotencyHeader?: string) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can book sessions');
    const parsed = sessionBookingInputSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session booking details');
    const input = parsed.data;
    if (idempotencyHeader && idempotencyHeader !== input.idempotencyKey) throw new ConflictException('Idempotency header and request key differ');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const [memberBinding] = await this.publishedBindings(tenant, access.gymId, 'MEMBER').then(rows => rows.filter(row => row.actorId === input.memberId));
      const [trainerBinding] = await this.publishedBindings(tenant, access.gymId, 'TRAINER').then(rows => rows.filter(row => row.actorId === input.trainerId));
      if (!memberBinding || !trainerBinding) throw new NotFoundException('Member or trainer not found');
      const targets = [
        { identityId: access.identityId, gymId: access.gymId, role: 'OWNER' as const },
        { identityId: memberBinding.identityId, gymId: access.gymId, role: 'MEMBER' as const, tenantActorId: memberBinding.actorId },
        { identityId: trainerBinding.identityId, gymId: access.gymId, role: 'TRAINER' as const, tenantActorId: trainerBinding.actorId },
      ];
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== 3 || locked.some(item => item.gymId !== access.gymId)) throw new ForbiddenException('Booking access changed; reload and try again');
        try {
          const command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId,
            actorIdentityId: access.identityId, commandKind: 'BOOK_PT_SESSION', idempotencyKey: input.idempotencyKey,
            normalizedIntent: { gymId: access.gymId, memberId: input.memberId, trainerId: input.trainerId, localDate: input.localDate,
              localTime: input.localTime, timeZone: input.timeZone, offset: input.offset ?? null, type: input.type, durationMinutes: input.durationMinutes, notes: input.notes ?? null } },
          async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${input.trainerId} FOR UPDATE`;
            const config = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
            if (!config?.timezone || !config.currency || config.masterGymId !== access.gymId) throw new UnprocessableEntityException('Gym currency and time zone must be configured');
            if (input.timeZone !== config.timezone) throw new ConflictException('Gym time zone changed; reload booking options');
            const start = resolveSessionLocalTime(input.localDate, input.localTime, config.timezone, input.offset);
            const end = new Date(start.instant.getTime() + input.durationMinutes * 60_000);
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
            if (input.type !== 'IN_PERSON' || input.durationMinutes !== 60) throw new UnprocessableEntityException('New PT bookings must be in-person and 60 minutes');
            const earliest = new Date(clock!.now.getTime() + 2 * 60 * 60_000);
            const latest = new Date(clock!.now.getTime() + 14 * 24 * 60 * 60_000);
            if (start.instant < earliest || start.instant > latest) throw new UnprocessableEntityException('Choose a start at least 2 hours from now and within the next 14 days');
            const [member, trainer] = await Promise.all([
              tx.member.findFirst({ where: { id: input.memberId, identityId: memberBinding.identityId, enrollmentOperationId: memberBinding.operationId,
                registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true, fullName: true, identityId: true } }),
              tx.trainer.findFirst({ where: { id: input.trainerId, identityId: trainerBinding.identityId, enrollmentOperationId: trainerBinding.operationId,
                registrationState: 'COMPLETE', status: 'ACTIVE', level: { not: null } }, select: { id: true, fullName: true, identityId: true, level: true, shiftStart: true, shiftEnd: true } }),
            ]);
            if (!member || !trainer) throw new UnprocessableEntityException('Member and trainer must be active and published in this gym');
            const availability = await tx.pTAvailabilityRule.findMany({ where: { OR: [{ trainerId: trainer.id }, { kind: 'GYM_CLOSURE', localDate: new Date(`${input.localDate}T00:00:00.000Z`) }] } });
            const startParts = partsAt(start.instant, config.timezone);
            const startMinute = startParts.hour * 60 + startParts.minute;
            const weekday = new Date(`${input.localDate}T00:00:00.000Z`).getUTCDay();
            if (!allowedStartMinutes(input.localDate, availability as AvailabilityRule[], weekday).includes(startMinute)) {
              throw new ConflictException('This time is outside the trainer’s published availability or is no longer available');
            }
            const dateValue = new Date(`${input.localDate}T00:00:00.000Z`);
            if (await tx.membershipTerm.count({ where: { memberId: member.id, startDate: { lte: dateValue }, endDateExclusive: { gt: dateValue } } }) === 0) {
              throw new UnprocessableEntityException('Member has no active membership for the session date');
            }
            const fee = trainer.level === 'LEVEL_2' ? config.level2SessionFee ?? config.defaultSessionFee : config.defaultSessionFee;
            const coveredByShift = withinShift(start.instant, end, config.timezone, trainer.shiftStart, trainer.shiftEnd);
            const rate = trainer.level === 'LEVEL_2' ? config.level2BaseRate : config.level1BaseRate;
            const confirmationRate = coveredByShift ? rate : decimalSum(rate.toString(), config.offShiftPremium.toString());
            const sessionId = randomUUID();
            const session = await tx.pTSession.create({ data: { id: sessionId, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED',
              type: input.type, scheduledStartAt: start.instant, scheduledEndAt: end, gymTimezone: config.timezone,
              fee: fee.toString(), currency: config.currency, confirmationRate, confirmationLevel: trainer.level!,
              confirmationShiftStart: trainer.shiftStart, confirmationShiftEnd: trainer.shiftEnd, configurationVersion: config.version,
              confirmedAt: clock!.now, notes: (input.notes ?? '').replace(/\r\n?/g, '\n') || null, createdByIdentityId: access.identityId } });
            await reserveSessionCredit(tx, { masterGymId: access.gymId, sessionId: session.id, memberId: member.id, trainerId: trainer.id,
              scheduledLocalDate: input.localDate, actorIdentityId: access.identityId, receiptId: receipt.id });
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'PT_SESSION_BOOKED', resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: 0 });
            await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: null, toState: 'SCHEDULED', committedVersion: 0,
              actorIdentityId: access.identityId, receiptId: receipt.id, eventKey } });
            const notification = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_BOOKED', resourceId: session.id,
              recipientIdentityId: member.identityId! });
            return { result: { resourceIds: [session.id, notification.id], notificationState: 'AVAILABLE' }, resourceType: 'PT_SESSION', resourceId: session.id,
              audits: [{ actorIdentityId: access.identityId, eventCode: 'PT_SESSION_BOOKED', resourceType: 'PT_SESSION', resourceId: session.id,
                transition: { to: 'SCHEDULED', version: 0 } }] };
          }));
          const sessionId = command.result.resourceIds?.[0];
          const eventId = command.result.resourceIds?.[1];
          if (!sessionId || !eventId) throw new ConflictException('Booking receipt has no session or notification resource');
          const session = await tenant.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: { include: { pack: true } } } });
          if (!session || !session.creditHold) throw new ConflictException('Booking receipt references an incomplete session');
          if (command.result.notificationState !== 'AVAILABLE') throw new ConflictException('Booking receipt has no persisted notification outcome');
          const parsedResult = sessionBookingResultSchema.parse({ receiptId: command.receiptId, replayed: command.replayed,
            notificationOutcome: { eventId, recipient: { role: 'MEMBER', actorId: session.memberId }, gymSlug: access.slug, state: command.result.notificationState, retryable: false },
            session: { id: session.id, memberId: session.memberId, trainerId: session.trainerId, state: 'SCHEDULED', type: session.type,
              scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(),
              timeZone: session.gymTimezone, durationMinutes: Math.floor((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000), version: 0 },
            creditReservation: { holdId: session.creditHold.id, packId: session.creditHold.packId, state: 'HELD',
              creditOrdinal: session.creditHold.creditOrdinal, creditValue: minorUnitsAmount(session.creditHold.creditValueMinorUnits),
              allocationPolicyVersion: session.creditHold.pack.creditAllocationPolicyVersion },
            feeQuote: { amount: session.fee.toString(), currency: session.currency } });
          return parsedResult;
        } catch (error) {
          if (error instanceof OperationConflictError) throw new ConflictException('Idempotency key was used for a different booking');
          return conflictFromDatabase(error);
        }
      });
    });
  }
}
