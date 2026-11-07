import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { sessionExceptionIntentSchema, sessionExceptionCommitSchema, sessionExceptionQuoteSchema, sessionExceptionResultSchema, type SessionExceptionIntent } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import type { Prisma, PrismaClient } from '../generated/tenant/client.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { withGymAccessFence, type GymAccessFenceTarget } from '../identity/gym-access-fence.js';
import { canonicalJson, OperationConflictError, tenantAuditKey } from '../operations/primitives.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { appendTenantNotification } from '../notifications.service.js';
import { creditUnits, eligibleUnits, type CreditUnit } from './credit-unit-projection.js';
import { resolveSessionCreditHold } from './credit-holds.js';
import { SessionBookingService, resolveSessionLocalTime, withinShift, decimalSum } from './booking.service.js';
import { allowedStartMinutes, type AvailabilityRule } from './availability-policy.js';
import { cancellationConsequence, confirmedCancellationPolicy, localDateAt, periodFor, nextPeriod, payAmountMinor } from './session-lifecycle.service.js';
import { retrySessionTransaction } from './session-transactions.js';

type Access = TenantGateContext & { identityId: string; identityVersion: number; accessVersion: number; role: string; slug: string };
type Tx = Prisma.TransactionClient;
const decimalUnits = (value: { toString(): string } | string) => { const text = value.toString(); const negative = text.startsWith('-'); const [w, f = ''] = (negative ? text.slice(1) : text).split('.'); return (negative ? -1n : 1n) * (BigInt(w!) * 10000n + BigInt(f.padEnd(4, '0'))); };
const amount = (value: bigint) => { const abs = value < 0n ? -value : value; return `${value < 0n ? '-' : ''}${abs / 10000n}.${String(abs % 10000n).padStart(4, '0')}`; };
const date = (value: Date) => value.toISOString().slice(0, 10);
const secret = () => { if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new ConflictException('Quote signing is unavailable'); return createHmac('sha256', process.env.JWT_SECRET).update('gymos-pt-exception-v1').digest(); };
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
function tokenFor(binding: unknown, expires: number) { const payload = Buffer.from(canonicalJson({ binding, expires })).toString('base64url'); return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`; }
function verify(token: string, binding: unknown, now: Date) {
  try { const [payload, signature, extra] = token.split('.'); if (!payload || !signature || extra) return false; const actual = Buffer.from(signature, 'base64url'); const expected = createHmac('sha256', secret()).update(payload).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims.expires > now.getTime() && claims.expires <= now.getTime() + 120000 && canonicalJson(claims.binding) === canonicalJson(binding);
  } catch { return false; }
}

@Injectable()
export class SessionExceptionsService {
  constructor(private readonly db: DatabaseService, private readonly gate: TenantSchemaGateService, private readonly bookings: SessionBookingService) {}

  private async targets(tenant: PrismaClient, access: Access, sessionId: string, reschedule: boolean) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Only the owner can resolve PT exceptions');
    const session = await tenant.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true } });
    if (!session) throw new NotFoundException('Session not found');
    const targets: GymAccessFenceTarget[] = [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' }];
    // Historical recovery needs published provenance, even when a participant's access has since been revoked.
    for (const [role, actor] of [['MEMBER', session.member], ['TRAINER', session.trainer]] as const) {
      const operation = actor.enrollmentOperationId ? await this.db.master.operation.findFirst({ where: { id: actor.enrollmentOperationId,
        gymId: access.gymId, kind: role === 'MEMBER' ? 'REGISTER_MEMBER' : 'REGISTER_TRAINER', state: 'COMPLETE', subjectIdentityId: actor.identityId, tenantActorId: actor.id, tenantCommandReceiptId: { not: null } } }) : null;
      const receipt = operation?.tenantCommandReceiptId ? await tenant.commandReceipt.findUnique({ where: { id: operation.tenantCommandReceiptId } }) : null;
      if (actor.registrationState !== 'COMPLETE' || !actor.identityId || receipt?.state !== 'COMMITTED' || receipt.resourceId !== actor.id || receipt.resourceType !== role || receipt.commandKind !== `REGISTER_${role}` || receipt.sourceMasterOperationId !== actor.enrollmentOperationId) throw new NotFoundException('Session not found');
      if (reschedule) targets.push({ identityId: actor.identityId, gymId: access.gymId, role, tenantActorId: actor.id });
    }
    return targets;
  }

  private async plan(tx: Tx, access: Access, sessionId: string, intent: SessionExceptionIntent) {
    const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: { include: { pack: true } }, settlement: true,
      adjustments: { orderBy: { committedVersion: 'desc' } }, revenueRecords: true, payRecord: { include: { period: true } }, payCorrections: { include: { originalPeriod: true } } } });
    if (!session) throw new NotFoundException('Session not found');
    const hold = session.creditHold;
    if (!hold) throw new ConflictException('This session has no source credit reservation to resolve');
    if (session.version !== intent.expectedVersion) throw new ConflictException('The booking changed. Review a new quote.');
    const sourceEvent = await tx.sessionStateEvent.findFirst({ where: { id: intent.sourceEventId, sessionId, committedVersion: session.version } });
    if (!sourceEvent) throw new ConflictException('Select the latest booking history event before correcting it');
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const now = clock!.now; const today = localDateAt(now, session.gymTimezone);
    const storedPolicy = await tx.gymConfigurationVersion.findFirst({ where: { gymConfigurationId: 'current', configurationVersion: session.configurationVersion } });
    if (!storedPolicy) throw new ConflictException('The original booking policy is unavailable');
    const policy = confirmedCancellationPolicy(session, storedPolicy);
    const units = await creditUnits(tx, session.memberId);
    const source = units.find(unit => unit.packId === hold.packId && unit.creditOrdinal === hold.creditOrdinal);
    if (!source) throw new ConflictException('Source credit allocation is unavailable');
    const netRevenue = session.revenueRecords.reduce((sum, row) => sum + decimalUnits(row.amount), 0n);
    const netPay = (session.payRecord ? decimalUnits(session.payRecord.amount) : 0n) + session.payCorrections.reduce((sum, row) => sum + decimalUnits(row.amount), 0n);
    const priorResolution = session.adjustments.find(row => row.effectiveSettlementKind !== null);
    let consume = priorResolution?.creditConsumed ?? session.settlement?.creditConsumed ?? false;
    let target = session.state; let settlement = priorResolution?.effectiveSettlementKind ?? session.settlement?.kind ?? null;
    let desiredRevenue = netRevenue; let desiredPay = netPay;
    let replacement: { start: Date; end: Date; localDate: string; localTime: string; offset: string; timeZone: string } | null = null;
    let destination: CreditUnit | null = null;
    let replacementTerms: { fee: string; currency: string; rate: string; version: number; trainerVersion: number } | null = null;
    let newExpiry: string | null = null;
    let consequence = '';
    if (intent.kind === 'REMEDY') {
      if (hold.state !== 'RELEASED' || consume || date(source.effectiveEndDateExclusive) > today || source.held || source.consumed) throw new ConflictException('Only an expired, released source credit can receive this remedy');
      if (await tx.pTCreditRemedy.findUnique({ where: { sourceHoldId: hold.id } })) throw new ConflictException('This cancellation already received its source-credit remedy');
      if (intent.newEndDateExclusive <= today || intent.newEndDateExclusive <= date(source.effectiveEndDateExclusive)) throw new UnprocessableEntityException('Choose a new expiry after today and the original expiry');
      newExpiry = intent.newEndDateExclusive;
      desiredRevenue = netRevenue - session.revenueRecords.filter(row => row.category === 'EXPIRED_UNUSED' && row.reversesId === null && !session.revenueRecords.some(other => other.reversesId === row.id)).reduce((sum, row) => sum + decimalUnits(row.amount), 0n);
      consequence = 'Restore this original credit only. Membership must still cover the replacement booking date.';
    } else if (intent.kind === 'RESCHEDULE') {
      if (session.state !== 'SCHEDULED' || session.startedAt || session.scheduledStartAt <= now || hold.state !== 'HELD' || session.settlement) throw new ConflictException('Only a future confirmed session that has not started can be rescheduled');
      const config = await tx.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
      if (!config.timezone || !config.currency || config.masterGymId !== access.gymId) throw new ConflictException('Gym booking configuration is unavailable');
      if (session.member.status !== 'ACTIVE' || session.trainer.status !== 'ACTIVE') throw new ConflictException('Both participants must have active gym access for a replacement');
      const resolved = resolveSessionLocalTime(intent.localDate, intent.localTime, config.timezone, intent.offset);
      const end = new Date(resolved.instant.getTime() + 3600000);
      if (resolved.instant.getTime() < now.getTime() + 7200000 || resolved.instant.getTime() > now.getTime() + 14 * 86400000) throw new UnprocessableEntityException('Choose a replacement at least two hours ahead and within 14 days');
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(resolved.instant).map(part => [part.type, part.value]));
      const rules = await tx.pTAvailabilityRule.findMany({ where: { OR: [{ trainerId: session.trainerId }, { kind: 'GYM_CLOSURE', localDate: new Date(`${intent.localDate}T00:00:00Z`) }] } });
      if (!allowedStartMinutes(intent.localDate, rules as AvailabilityRule[], new Date(`${intent.localDate}T00:00:00Z`).getUTCDay()).includes(Number(parts.hour) * 60 + Number(parts.minute))) throw new ConflictException('This replacement is outside published availability');
      const overlap = await tx.pTSession.findFirst({ where: { id: { not: session.id }, state: { in: ['PENDING_CONFIRMATION','SCHEDULED','ACTIVE'] },
        AND: [{ OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: now } }] }], OR: [{ memberId: session.memberId }, { trainerId: session.trainerId }], scheduledStartAt: { lt: end }, scheduledEndAt: { gt: resolved.instant } } });
      if (overlap) throw new ConflictException('The replacement overlaps another booking or live request');
      const day = new Date(`${intent.localDate}T00:00:00Z`);
      if (!await tx.membershipTerm.findFirst({ where: { memberId: session.memberId, startDate: { lte: day }, endDateExclusive: { gt: day } } })) throw new ConflictException('Membership does not cover the replacement date');
      consume = intent.initiatedBy === 'MEMBER' && cancellationConsequence(now.getTime(), session.scheduledStartAt.getTime(), policy.cancellationWindowMinutes, policy.lateCancelDeduction) === 'LATE_CANCELLATION';
      if (intent.newEndDateExclusive) {
        if (intent.initiatedBy === 'MEMBER' || intent.newEndDateExclusive <= intent.localDate || intent.newEndDateExclusive <= date(source.effectiveEndDateExclusive)) throw new UnprocessableEntityException('A gym-side source remedy must extend beyond the replacement date and current expiry');
        if (await tx.pTCreditRemedy.findUnique({ where: { sourceHoldId: hold.id } })) throw new ConflictException('This source reservation already has an approved remedy');
        newExpiry = intent.newEndDateExclusive;
      }
      const simulated = units.map(unit => unit === source && !consume ? { ...unit, available: 1, held: 0, effectiveEndDateExclusive: newExpiry ? new Date(`${newExpiry}T00:00:00Z`) : unit.effectiveEndDateExclusive } : unit);
      destination = eligibleUnits(simulated.filter(unit => unit.currency === config.currency).sort((a,b) => a.effectiveEndDateExclusive.getTime()-b.effectiveEndDateExclusive.getTime() || a.packCreatedAt.getTime()-b.packCreatedAt.getTime() || a.packId.localeCompare(b.packId) || a.creditOrdinal-b.creditOrdinal), intent.localDate)[0] ?? null;
      if (!destination) throw new ConflictException(consume ? 'Late member rescheduling needs a separate eligible credit. The original booking remains unchanged.' : 'No eligible replacement credit. For a gym-side change, explicitly approve a source-credit expiry remedy if needed.');
      replacement = { start: resolved.instant, end, localDate: intent.localDate, localTime: intent.localTime, offset: resolved.offset, timeZone: config.timezone };
      const baseRate = session.trainer.level === 'LEVEL_2' ? config.level2BaseRate : config.level1BaseRate;
      replacementTerms = { fee: (session.trainer.level === 'LEVEL_2' ? config.level2SessionFee ?? config.defaultSessionFee : config.defaultSessionFee).toString(), currency: config.currency,
        rate: withinShift(resolved.instant, end, config.timezone, session.trainer.shiftStart, session.trainer.shiftEnd) ? baseRate.toString() : decimalSum(baseRate.toString(), config.offShiftPremium.toString()), version: config.version, trainerVersion: session.trainer.version };
      target = 'CANCELLED'; settlement = consume ? 'LATE_CANCELLED' : 'FREE_CANCELLED';
      desiredRevenue = consume ? hold.creditValueMinorUnits * 100n : 0n; desiredPay = 0n;
      consequence = consume ? 'The original late cancellation consumes one credit; the replacement reserves a separate credit.' : 'The source reservation is released and one eligible credit is reserved for the replacement.';
    } else if (intent.kind === 'CANCEL') {
      if (session.state !== 'SCHEDULED' || session.startedAt || hold.state !== 'HELD') throw new ConflictException('Only a confirmed session that has not started can be cancelled');
      consume = intent.initiatedBy === 'MEMBER' && cancellationConsequence(now.getTime(), session.scheduledStartAt.getTime(), policy.cancellationWindowMinutes, policy.lateCancelDeduction) === 'LATE_CANCELLATION';
      target = 'CANCELLED'; settlement = consume ? 'LATE_CANCELLED' : 'FREE_CANCELLED'; desiredRevenue = consume ? hold.creditValueMinorUnits * 100n : 0n; desiredPay = 0n;
      consequence = consume ? 'The member-requested late cancellation consumes one credit.' : 'The source reservation is released without a member charge. Expired restored value needs an owner expiry remedy.';
    } else {
      if (!['SCHEDULED','ACTIVE','COMPLETED','MISSED','CANCELLED'].includes(session.state) || session.adjustments.some(row => row.kind === 'RESCHEDULE')) throw new ConflictException('Use the current linked booking to resolve this session');
      if (session.state === 'SCHEDULED' && session.scheduledEndAt > now) throw new ConflictException('Future bookings use cancellation or rescheduling, not delivery correction');
      consume = intent.target !== 'FREE_CANCELLED';
      target = intent.target === 'COMPLETED' ? 'COMPLETED' : intent.target === 'MISSED' ? 'MISSED' : 'CANCELLED';
      settlement = intent.target;
      if (intent.target === 'COMPLETED') {
        if (!intent.actualStartedAt || !intent.actualEndedAt) throw new UnprocessableEntityException('Provide the actual training start and end as evidence');
        const start = new Date(intent.actualStartedAt); const end = new Date(intent.actualEndedAt);
        if (start >= end || end > now || end.getTime() - start.getTime() < policy.minimumSessionDurationMinutes * 60000 || localDateAt(start, session.gymTimezone) !== localDateAt(session.scheduledStartAt, session.gymTimezone)) throw new UnprocessableEntityException('Actual training times must be ordered, in the past, on the booked gym-local date, and meet the stored minimum duration');
      } else if (intent.actualStartedAt || intent.actualEndedAt) throw new UnprocessableEntityException('Actual training times apply only to a delivered-session correction');
      if (intent.target === 'MISSED' && session.scheduledStartAt.getTime() + 900000 > now.getTime()) throw new ConflictException('No-show grace has not elapsed');
      if (consume && hold.state === 'RELEASED' && !source.available && !source.expired) throw new ConflictException('The source unit has been allocated elsewhere. Resolve that booking before correcting the charge.');
      desiredRevenue = consume ? hold.creditValueMinorUnits * 100n : 0n;
      if (intent.target === 'COMPLETED' && (!session.confirmationRate || !session.confirmationLevel)) throw new ConflictException('The original trainer-pay snapshot is unavailable');
      desiredPay = intent.target === 'COMPLETED' ? payAmountMinor(hold.creditValueMinorUnits, session.confirmationRate!.toString()) * 100n : 0n;
      consequence = consume ? 'Record the corrected outcome using the original credit value and trainer-pay snapshot.' : 'Reverse the mistaken charge; expired restored value will await an owner expiry remedy.';
    }
    const originalPeriod = session.payRecord?.period ?? session.payCorrections[0]?.originalPeriod ?? await tx.trainerPayPeriod.findUnique({ where: { cadence_localStartDate: { cadence: policy.payPeriod, localStartDate: new Date(`${periodFor(session.scheduledStartAt, policy.payPeriod, session.gymTimezone).start}T00:00:00Z`) } } });
    const needsZeroPayFact = intent.kind === 'CORRECTION' && intent.target === 'COMPLETED' && !session.payRecord && session.payCorrections.length === 0;
    let payDestination: { start: string; end: string; periodId: string | null; version: number | null } | null = null;
    if (desiredPay !== netPay || needsZeroPayFact) {
      let info = periodFor(session.scheduledStartAt, policy.payPeriod, session.gymTimezone);
      if (originalPeriod && originalPeriod.state !== 'OPEN') { const current = periodFor(now, policy.payPeriod, session.gymTimezone); info = current.utcStart > info.utcStart ? current : nextPeriod(info); }
      for (let attempt = 0; attempt < 120; attempt++) {
        const period = await tx.trainerPayPeriod.findUnique({ where: { cadence_localStartDate: { cadence: info.cadence, localStartDate: new Date(`${info.start}T00:00:00Z`) } } });
        if (!period || period.state === 'OPEN') { payDestination = { start: info.start, end: info.end, periodId: period?.id ?? null, version: period?.version ?? null }; break; }
        info = nextPeriod(info);
      }
      if (!payDestination) throw new ConflictException('No open trainer adjustment period is available');
    }
    const preview = { sessionId, kind: intent.kind, sessionVersion: session.version, sourceEventId: sourceEvent.id, timeZone: session.gymTimezone, currency: session.currency,
      policyVersion: session.configurationVersion, cancellationCutoff: new Date(session.scheduledStartAt.getTime()-policy.cancellationWindowMinutes*60000).toISOString(), targetOutcome: intent.kind === 'CORRECTION' ? intent.target : settlement ?? session.state, actualStartedAt: intent.kind === 'CORRECTION' ? intent.actualStartedAt ?? null : null, actualEndedAt: intent.kind === 'CORRECTION' ? intent.actualEndedAt ?? null : null,
      oldStartAt: session.scheduledStartAt.toISOString(), oldEndAt: session.scheduledEndAt.toISOString(), replacementStartAt: replacement?.start.toISOString() ?? null, replacementEndAt: replacement?.end.toISOString() ?? null, replacementTimeZone: replacement?.timeZone ?? null,
      sourcePackId: hold.packId, sourceCreditOrdinal: hold.creditOrdinal, sourceValue: amount(hold.creditValueMinorUnits * 100n), sourceExpiry: date(source.effectiveEndDateExclusive), proposedExpiry: newExpiry,
      destinationPackId: destination?.packId ?? null, destinationCreditOrdinal: destination?.creditOrdinal ?? null, destinationValue: destination ? amount(destination.valueMinorUnits * 100n) : null,
      replacementFee: replacementTerms?.fee ?? null, replacementCurrency: replacementTerms?.currency ?? null, replacementPayRate: replacementTerms?.rate ?? null, replacementPolicyVersion: replacementTerms?.version ?? null,
      sourceCreditConsumed: consume, replacementCreditRequired: intent.kind === 'RESCHEDULE', operationalDelta: amount(desiredRevenue - netRevenue), trainerPayDelta: amount(desiredPay - netPay),
      payAdjustmentPeriodStart: payDestination?.start ?? null, payAdjustmentPeriodEndExclusive: payDestination?.end ?? null,
      payPeriodState: originalPeriod?.state ?? null, payResolution: originalPeriod && originalPeriod.state !== 'OPEN' ? 'The original closed/approved pay facts stay unchanged. A signed adjustment goes to an open correction period; no payment is recorded.' : 'Any signed trainer-pay adjustment is recorded in the open period; no payment is recorded.', consequence };
    const binding = { owner: access.identityId, gym: access.gymId, intent: hash(intent), preview, sourcePeriodVersion: originalPeriod?.version ?? null, sourceHoldVersion: hold.version, replacementTrainerVersion: replacementTerms?.trainerVersion ?? null, payDestination };
    return { session, hold, source, now, today, policy, originalPeriod, payDestination, needsZeroPayFact, target, settlement, consume, desiredRevenue, desiredPay, netPay, replacement, destination, newExpiry, preview, binding };
  }

  async quote(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionExceptionIntentSchema.safeParse(raw); if (!parsed.success) throw new UnprocessableEntityException('Enter valid exception details and an owner reason');
    return this.gate.withVerifiedTenant(access, async tenant => {
      const targets = await this.targets(tenant, access, sessionId, parsed.data.kind === 'RESCHEDULE');
      return withGymAccessFence(this.db.master, targets, () => tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const plan = await this.plan(tx, access, sessionId, parsed.data); const expires = plan.now.getTime() + 120000;
        return sessionExceptionQuoteSchema.parse({ ...plan.preview, expiresAt: new Date(expires).toISOString(), quoteToken: tokenFor(plan.binding, expires) });
      }, { isolationLevel: 'RepeatableRead' }));
    });
  }

  async commit(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionExceptionCommitSchema.safeParse(raw); if (!parsed.success) throw new UnprocessableEntityException('Review the exception quote before confirming');
    const input = parsed.data;
    return this.gate.withVerifiedTenant(access, async tenant => {
      const targets = await this.targets(tenant, access, sessionId, input.intent.kind === 'RESCHEDULE');
      return withGymAccessFence(this.db.master, targets, async () => {
        let command;
        try { command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
          commandKind: 'RESOLVE_PT_EXCEPTION', idempotencyKey: input.idempotencyKey, normalizedIntent: { sessionId, intent: input.intent, quoteDigest: hash(input.quoteToken) } }, async (tx, receipt) => {
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`pt-settlement:${access.gymId}`}, 0))`;
          const preflight = await tx.pTSession.findUniqueOrThrow({ where: { id: sessionId } });
          await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id"=${preflight.memberId} FOR UPDATE`;
          await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id"=${preflight.trainerId} FOR UPDATE`;
          await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id"=${sessionId} FOR UPDATE`;
          const plan = await this.plan(tx, access, sessionId, input.intent);
          await tx.$queryRaw`SELECT "id" FROM "SessionPack" WHERE "id"=${plan.hold.packId} FOR UPDATE`;
          if (!verify(input.quoteToken, plan.binding, plan.now)) throw new ConflictException('The quote expired or its effects changed. Review a new quote.');
          const adjustmentId = randomUUID(); const version = plan.session.version + 1;
          // A replacement ID is allocated before the adjustment, then its FK is populated after booking.
          const replacementId = input.intent.kind === 'RESCHEDULE' ? randomUUID() : null;
          // Defer the replacement FK until both records exist, without permitting an unlinked committed adjustment.
          if (replacementId) await tx.$executeRaw`SET CONSTRAINTS "PTSessionAdjustment_replacementSessionId_fkey" DEFERRED`;
          const adjustment = await tx.pTSessionAdjustment.create({ data: { id: adjustmentId, sessionId, replacementSessionId: replacementId, receiptId: receipt.id,
            sourceEventId: input.intent.sourceEventId, kind: input.intent.kind === 'CANCEL' ? 'CANCELLATION' : input.intent.kind, initiatedBy: input.intent.kind === 'RESCHEDULE' || input.intent.kind === 'CANCEL' ? input.intent.initiatedBy : 'GYM', reason: input.intent.reason,
            actorIdentityId: access.identityId, committedVersion: version, fromState: plan.session.state, toState: plan.target,
            effectiveSettlementKind: input.intent.kind === 'REMEDY' ? null : plan.settlement, creditConsumed: input.intent.kind === 'REMEDY' ? null : plan.consume,
            previousStartedAt: plan.session.startedAt, previousEndedAt: plan.session.endedAt,
            actualStartedAt: input.intent.kind === 'CORRECTION' && input.intent.target === 'COMPLETED' ? new Date(input.intent.actualStartedAt!) : null,
            actualEndedAt: input.intent.kind === 'CORRECTION' && input.intent.target === 'COMPLETED' ? new Date(input.intent.actualEndedAt!) : null } });
          if (plan.newExpiry) await tx.pTCreditRemedy.create({ data: { adjustmentId, sourceHoldId: plan.hold.id, packId: plan.hold.packId, creditOrdinal: plan.hold.creditOrdinal,
            originalEndDateExclusive: plan.source.effectiveEndDateExclusive, newEndDateExclusive: new Date(`${plan.newExpiry}T00:00:00Z`), valueMinorUnits: plan.hold.creditValueMinorUnits } });
          if (input.intent.kind === 'RESCHEDULE') {
            await resolveSessionCreditHold(tx, { masterGymId: access.gymId, sessionId, receiptId: receipt.id, actorIdentityId: access.identityId, resolution: plan.consume ? 'CONSUME' : 'RELEASE', gymLocalDate: plan.today });
          } else await this.adjustCredit(tx, plan, adjustmentId, receipt.id, access.identityId, input.intent.kind === 'REMEDY');
          if (input.intent.kind !== 'REMEDY') {
            const completed = input.intent.kind === 'CORRECTION' && input.intent.target === 'COMPLETED';
            await tx.pTSession.update({ where: { id: sessionId, version: plan.session.version }, data: { state: plan.target, version,
              startedAt: completed ? new Date(input.intent.kind === 'CORRECTION' ? input.intent.actualStartedAt! : '') : null,
              endedAt: completed ? new Date(input.intent.kind === 'CORRECTION' ? input.intent.actualEndedAt! : '') : plan.now } });
          } else await tx.pTSession.update({ where: { id: sessionId, version: plan.session.version }, data: { version } });
          if (!plan.session.settlement && plan.settlement && input.intent.kind !== 'REMEDY') await tx.sessionSettlement.create({ data: { sessionId, kind: plan.settlement, creditConsumed: plan.consume,
            creditValue: amount(plan.hold.creditValueMinorUnits * 100n), currency: plan.session.currency, sourceReceiptId: receipt.id } });
          await this.adjustFinance(tx, access, plan, adjustmentId, input.intent);
          let newId: string | null = null;
          let bookingAudits: import('../operations/transaction-audit.js').AuditInput[] = [];
          if (plan.replacement && replacementId) {
            const members = await this.bookings.publishedBindings(tx as unknown as PrismaClient, access.gymId, 'MEMBER'); const trainers = await this.bookings.publishedBindings(tx as unknown as PrismaClient, access.gymId, 'TRAINER');
            const member = members.find(row => row.actorId === plan.session.memberId); const trainer = trainers.find(row => row.actorId === plan.session.trainerId);
            if (!member || !trainer) throw new ConflictException('Replacement participant publication changed');
            const outcome = await this.bookings.bookInTransaction(tx, receipt, access, { memberId: plan.session.memberId, trainerId: plan.session.trainerId, localDate: plan.replacement.localDate,
              localTime: plan.replacement.localTime, timeZone: plan.replacement.timeZone, offset: plan.replacement.offset, durationMinutes: 60, type: 'IN_PERSON', idempotencyKey: input.idempotencyKey }, member, trainer, replacementId);
            newId = outcome.resourceId; bookingAudits = outcome.audits;
            const held = await tx.sessionCreditHold.findUniqueOrThrow({ where: { sessionId: newId } });
            if (held.packId !== plan.destination!.packId || held.creditOrdinal !== plan.destination!.creditOrdinal) throw new ConflictException('Replacement allocation changed; review a fresh quote');
          }
          await creditUnits(tx, plan.session.memberId);
          const eventCode = input.intent.kind === 'REMEDY' ? 'PT_CREDIT_REMEDY_APPROVED' : input.intent.kind === 'RESCHEDULE' ? 'PT_SESSION_RESCHEDULED' : input.intent.kind === 'CANCEL' ? 'PT_SESSION_CANCELLED' : 'PT_SESSION_CORRECTED';
          await tx.sessionStateEvent.create({ data: { sessionId, fromState: plan.session.state, toState: plan.target, committedVersion: version, actorIdentityId: access.identityId, receiptId: receipt.id,
            eventKey: tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId, eventOrdinal: version }) } });
          const noticeCode = input.intent.kind === 'REMEDY' ? 'CREDIT_REMEDY_APPROVED' : input.intent.kind === 'RESCHEDULE' ? 'SESSION_RESCHEDULED' : input.intent.kind === 'CANCEL' ? 'SESSION_CANCELLED' : 'SESSION_CORRECTED';
          for (const [recipient, linkKind] of [[plan.session.member.identityId, 'MEMBER_SESSIONS'], [plan.session.trainer.identityId, 'TRAINER_SCHEDULE']] as const) {
            if (!recipient) throw new ConflictException('Notification recipient is unavailable');
            await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: noticeCode, resourceId: newId ?? sessionId, recipientIdentityId: recipient, linkKind, eventOrdinal: version });
          }
          return { result: { resourceIds: [sessionId, adjustment.id, ...(newId ? [newId] : [])], version }, resourceType: 'PT_SESSION', resourceId: sessionId,
            audits: [...bookingAudits, { actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId, transition: { from: plan.session.state, to: plan.target, version } }] };
        })); } catch (error) { if (error instanceof OperationConflictError) throw new ConflictException('This key belongs to another exception command'); throw error; }
        return sessionExceptionResultSchema.parse({ sessionId: command.result.resourceIds![0], adjustmentId: command.result.resourceIds![1], replacementSessionId: command.result.resourceIds?.[2] ?? null, version: command.result.version, replayed: command.replayed });
      });
    });
  }

  private async adjustCredit(tx: Tx, plan: Awaited<ReturnType<SessionExceptionsService['plan']>>, adjustmentId: string, receiptId: string, actorIdentityId: string, remedy: boolean) {
    const unit = (await creditUnits(tx, plan.session.memberId)).find(row => row.packId === plan.hold.packId && row.creditOrdinal === plan.hold.creditOrdinal)!;
    const from = plan.hold.state === 'HELD' ? 'held' : plan.hold.state === 'CONSUMED' ? 'consumed' : unit.available ? 'available' : unit.expired ? 'expired' : null;
    const to = remedy ? 'available' : plan.consume ? 'consumed' : date(unit.effectiveEndDateExclusive) <= plan.today ? 'expired' : 'available';
    if (!from) { if (!plan.consume && plan.hold.state === 'RELEASED') return; throw new ConflictException('The source credit is allocated elsewhere'); }
    if (from !== to) {
      if (unit[from] !== 1) throw new ConflictException('Source credit changed; no correction was saved');
      const movement = { availableDelta: 0, heldDelta: 0, consumedDelta: 0, expiredDelta: 0 }; movement[`${from}Delta`] = -1; movement[`${to}Delta`] = 1;
      await tx.packCreditMovement.create({ data: { ...movement, packId: plan.hold.packId, holdId: plan.hold.id, kind: 'CORRECTION', creditOrdinal: plan.hold.creditOrdinal,
        adjustmentId, sourceKey: `pt-adjustment:${adjustmentId}:credit`, receiptId, actorIdentityId } });
    }
    await tx.sessionCreditHold.update({ where: { id: plan.hold.id, version: plan.hold.version }, data: { state: to === 'consumed' ? 'CONSUMED' : 'RELEASED', resolvedAt: plan.now, version: { increment: 1 } } });
  }

  private async adjustFinance(tx: Tx, access: Access, plan: Awaited<ReturnType<SessionExceptionsService['plan']>>, adjustmentId: string, intent: SessionExceptionIntent) {
    const { session } = plan;
    const originals = session.revenueRecords.filter(row => row.reversesId === null && !session.revenueRecords.some(other => other.reversesId === row.id) && (intent.kind !== 'REMEDY' || row.category === 'EXPIRED_UNUSED'));
    for (const original of originals) await tx.revenueRecord.create({ data: { sessionId: session.id, category: original.category, amount: amount(-decimalUnits(original.amount)), currency: original.currency,
      reversesId: original.id, sourceKey: `pt-adjustment:${adjustmentId}:reverse:${original.id}` } });
    let earning = originals[0] ?? null;
    if (intent.kind !== 'REMEDY' && plan.consume) earning = await tx.revenueRecord.create({ data: { sessionId: session.id, category: plan.target === 'COMPLETED' ? 'COMPLETED_SESSION' : plan.target === 'MISSED' ? 'MISSED_LATE' : 'LATE_CANCEL',
      amount: amount(plan.desiredRevenue), currency: session.currency, sourceKey: `pt-adjustment:${adjustmentId}:earning` } });
    const delta = plan.desiredPay - plan.netPay;
    if (delta === 0n && !plan.needsZeroPayFact) return;
    if (!earning) throw new ConflictException('The trainer adjustment has no source earning');
    let info = periodFor(session.scheduledStartAt, plan.policy.payPeriod, session.gymTimezone);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`trainer-pay-period:${access.gymId}:${info.cadence}:${info.start}`}, 0))`;
    let original = await tx.trainerPayPeriod.upsert({ where: { cadence_localStartDate: { cadence: info.cadence, localStartDate: new Date(`${info.start}T00:00:00Z`) } }, update: {},
      create: { cadence: info.cadence, localStartDate: new Date(`${info.start}T00:00:00Z`), localEndDateExclusive: new Date(`${info.end}T00:00:00Z`), timezone: info.timezone, utcStartAt: info.utcStart, utcEndAt: info.utcEnd } });
    await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id"=${original.id} FOR UPDATE`;
    original = await tx.trainerPayPeriod.findUniqueOrThrow({ where: { id: original.id } });
    if (plan.originalPeriod && (original.version !== plan.originalPeriod.version || original.state !== plan.originalPeriod.state)) throw new ConflictException('The pay period changed; review a new quote');
    let period = original;
    if (original.state !== 'OPEN') {
      const current = periodFor(plan.now, plan.policy.payPeriod, session.gymTimezone);
      info = current.utcStart > info.utcStart ? current : nextPeriod(info);
      for (let attempts = 0; attempts < 120; attempts++) {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`trainer-pay-period:${access.gymId}:${info.cadence}:${info.start}`}, 0))`;
        period = await tx.trainerPayPeriod.upsert({ where: { cadence_localStartDate: { cadence: info.cadence, localStartDate: new Date(`${info.start}T00:00:00Z`) } }, update: {},
          create: { cadence: info.cadence, localStartDate: new Date(`${info.start}T00:00:00Z`), localEndDateExclusive: new Date(`${info.end}T00:00:00Z`), timezone: info.timezone, utcStartAt: info.utcStart, utcEndAt: info.utcEnd } });
        await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id"=${period.id} FOR UPDATE`;
        period = await tx.trainerPayPeriod.findUniqueOrThrow({ where: { id: period.id } });
        if (period.state === 'OPEN') break; info = nextPeriod(info);
      }
    }
    if (period.state !== 'OPEN') throw new ConflictException('No open trainer adjustment period is available');
    if (!plan.payDestination || date(period.localStartDate) !== plan.payDestination.start || (plan.payDestination.periodId && (period.id !== plan.payDestination.periodId || period.version !== plan.payDestination.version))) throw new ConflictException('The correction period changed; review a new quote');
    await tx.trainerPayCorrection.create({ data: { sessionId: session.id, originalPeriodId: original.id, originalEarningId: earning.id, correctionPeriodId: period.id,
      amount: amount(delta), currency: session.currency, reason: intent.reason, actorIdentityId: access.identityId, sourcePeriodState: original.state, sourcePeriodVersion: original.version,
      sourcePeriodApprovedAt: original.approvedAt, sourcePeriodApprovedByIdentityId: original.approvedByIdentityId, sourceKey: `pt-adjustment:${adjustmentId}:pay` } });
    await tx.trainerPayPeriod.update({ where: { id: period.id, state: 'OPEN' }, data: { calculatedTotal: { increment: amount(delta) }, version: { increment: 1 } } });
  }
}
