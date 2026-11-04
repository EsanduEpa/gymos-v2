import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '../generated/tenant/client.js';
import { DatabaseService } from '../database.service.js';
import { withGymAccessFence, type GymAccessFenceTarget } from '../identity/gym-access-fence.js';
import { appendTenantNotification } from '../notifications.service.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { canonicalJson, OperationConflictError, tenantAuditKey } from '../operations/primitives.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { resolveSessionCreditHold } from './credit-holds.js';
import { retrySessionTransaction } from './session-transactions.js';
import { derivePackCreditBalance, transitionSession, minorUnitsDecimal } from './session-state.js';
import {
  sessionCancelInputSchema, sessionCancelResultSchema, sessionCompleteResultSchema, sessionLifecycleCommandInputSchema,
  sessionLifecycleQuoteSchema, sessionNoShowInputSchema, sessionNoShowResultSchema, sessionNotesInputSchema,
  sessionNotesResultSchema, sessionStartResultSchema,
} from '@gymos/contracts';

type Access = TenantGateContext & { identityId: string; identityVersion: number; accessVersion: number; role: string; slug: string; actor: { kind: 'MEMBER' | 'TRAINER'; id: string; registrationOperationId: string } | null };
type PeriodInfo = { cadence: 'WEEKLY' | 'MONTHLY'; start: string; end: string; timezone: string; utcStart: Date; utcEnd: Date };
const QUOTE_TTL_MS = 2 * 60_000;
type QuoteAction = 'CANCEL' | 'NO_SHOW';
type QuoteConsequence = 'PENDING_WITHDRAWAL' | 'FREE_CANCELLATION' | 'LATE_CANCELLATION' | 'NO_SHOW';
export function cancellationConsequence(now: number, scheduledStart: number, cancellationWindowMinutes: number, deductionEnabled: boolean) {
  return now > scheduledStart - cancellationWindowMinutes * 60_000 && deductionEnabled ? 'LATE_CANCELLATION' as const : 'FREE_CANCELLATION' as const;
}
export function noShowIsEligible(now: number, scheduledStart: number) { return now >= scheduledStart + 15 * 60_000; }
type QuoteClaims = { v: 1; gymId: string; sessionId: string; actorIdentityId: string; actorRole: string; sessionVersion: number;
  policyVersion: number; action: QuoteAction; consequence: QuoteConsequence; creditOrdinal: number | null;
  creditValueMinorUnits: string | null; currency: string | null; exp: number };
function quoteKey() {
  const root = process.env.JWT_SECRET;
  if (!root || root.length < 32) throw new ConflictException('Session acknowledgment signing is unavailable');
  return createHmac('sha256', root).update('gymos-v2/session-cancel-quote/v1').digest();
}
function signQuote(claims: QuoteClaims) {
  const payload = Buffer.from(canonicalJson(claims)).toString('base64url');
  const signature = createHmac('sha256', quoteKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function verifyQuote(token: string, expected: QuoteClaims, now: number) {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const actual = Buffer.from(signature, 'base64url');
  const calculated = createHmac('sha256', quoteKey()).update(payload).digest();
  if (actual.length !== calculated.length || !timingSafeEqual(actual, calculated)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as QuoteClaims;
    const { exp: parsedExp, ...parsedBound } = parsed;
    const { exp: _expectedExp, ...expectedBound } = expected;
    return canonicalJson(parsedBound) === canonicalJson(expectedBound) && parsedExp > now && parsedExp <= now + QUOTE_TTL_MS;
  } catch { return false; }
}
function quoteTokenDigest(token: string | null | undefined) {
  return token ? createHash('sha256').update(token).digest('hex') : null;
}
function parseAccessRole(role: string): 'OWNER' | 'TRAINER' | 'MEMBER' {
  if (role === 'OWNER' || role === 'TRAINER' || role === 'MEMBER') return role;
  throw new ForbiddenException('This role cannot change a session');
}

function localParts(instant: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const p = Object.fromEntries(values.map(v => [v.type, v.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour), minute: Number(p.minute), second: Number(p.second) };
}
function localDateAt(instant: Date, zone: string) {
  const p = localParts(instant, zone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
function addLocalDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
function localMidnight(date: string, zone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const target = { year: year!, month: month!, day: day!, hour: 0, minute: 0, second: 0 };
  const naive = Date.UTC(target.year, target.month - 1, target.day);
  const exact: Date[] = [];
  const sameDay: Date[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 1) {
    const candidate = new Date(naive - offset * 60_000);
    const p = localParts(candidate, zone);
    if (p.year === target.year && p.month === target.month && p.day === target.day) {
      sameDay.push(candidate);
      if (p.hour === 0 && p.minute === 0 && p.second === 0) exact.push(candidate);
    }
  }
  const selected = exact.length ? exact.sort((a, b) => a.getTime() - b.getTime())[0] : sameDay.sort((a, b) => a.getTime() - b.getTime())[0];
  if (!selected) throw new UnprocessableEntityException('The pay-period local boundary cannot be resolved');
  return selected;
}
function periodFor(startAt: Date, cadence: 'WEEKLY' | 'MONTHLY', zone: string): PeriodInfo {
  const local = localDateAt(startAt, zone);
  const [year, month, day] = local.split('-').map(Number);
  let start: string; let end: string;
  if (cadence === 'MONTHLY') {
    start = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    end = nextMonth;
  } else {
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    start = addLocalDays(local, -mondayOffset); end = addLocalDays(start, 7);
  }
  return { cadence, start, end, timezone: zone, utcStart: localMidnight(start, zone), utcEnd: localMidnight(end, zone) };
}
function nextPeriod(info: PeriodInfo): PeriodInfo {
  const start = info.end;
  const end = info.cadence === 'WEEKLY' ? addLocalDays(start, 7)
    : (() => { const [y, m] = start.split('-').map(Number); return m === 12 ? `${y! + 1}-01-01` : `${y}-${String(m! + 1).padStart(2, '0')}-01`; })();
  return { ...info, start, end, utcStart: localMidnight(start, info.timezone), utcEnd: localMidnight(end, info.timezone) };
}
function dateValue(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function toDecimal(value: { toString(): string } | string) { return typeof value === 'string' ? value : value.toString(); }
function rateMicro(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0') || '0');
}
function payAmountMinor(creditMinor: bigint, rate: string) {
  const product = creditMinor * rateMicro(rate);
  return (product + 500_000n) / 1_000_000n;
}
function eventCodeFor(command: 'START' | 'COMPLETE' | 'UPDATE_NOTES') {
  return command === 'START' ? 'PT_SESSION_STARTED' : command === 'COMPLETE' ? 'PT_SESSION_COMPLETED' : 'PT_SESSION_NOTES_UPDATED';
}
function conflict(error: unknown): never {
  if (error instanceof OperationConflictError) throw new ConflictException('Idempotency key was used for a different session command');
  const e = error as { code?: string; meta?: { code?: string } };
  if (e?.code === 'P2002' || e?.meta?.code === 'P2002') throw new ConflictException('This session lifecycle effect already exists');
  throw error;
}

@Injectable()
export class SessionLifecycleService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  private async verifyPublishedActor(tenant: PrismaClient, access: Access, role: 'MEMBER' | 'TRAINER', actor: { id: string; identityId: string | null; enrollmentOperationId: string | null; registrationState: string }) {
    const link = await this.database.master.gymAccess.findFirst({ where: { gymId: access.gymId, role, actorKind: role, linkStatus: 'ACTIVE',
      tenantActorId: actor.id, enrollmentOperationId: { not: null } }, select: { userId: true, tenantActorId: true, enrollmentOperationId: true } });
    if (!link?.enrollmentOperationId || link.tenantActorId !== actor.id || actor.identityId !== link.userId || actor.enrollmentOperationId !== link.enrollmentOperationId
      || actor.registrationState !== 'COMPLETE') throw new NotFoundException('Session not found');
    const operation = await this.database.master.operation.findUnique({ where: { id: link.enrollmentOperationId }, select: {
      kind: true, state: true, gymId: true, subjectIdentityId: true, tenantActorId: true, tenantCommandReceiptId: true,
    } });
    const receipt = operation?.tenantCommandReceiptId ? await tenant.commandReceipt.findUnique({ where: { id: operation.tenantCommandReceiptId },
      select: { state: true, sourceMasterOperationId: true, actorIdentityId: true, commandKind: true, resourceId: true, resourceType: true } }) : null;
    if (operation?.kind !== `REGISTER_${role}` || operation.state !== 'COMPLETE' || operation.gymId !== access.gymId
      || operation.subjectIdentityId !== link.userId || operation.tenantActorId !== actor.id || !operation.tenantCommandReceiptId
      || receipt?.state !== 'COMMITTED' || receipt.sourceMasterOperationId !== link.enrollmentOperationId
      || receipt.commandKind !== `REGISTER_${role}` || receipt.resourceId !== actor.id || receipt.resourceType !== role) {
      throw new NotFoundException('Session not found');
    }
    return link.userId;
  }

  private async context(access: Access, sessionId: string, tenant: PrismaClient, allowMember = false) {
    const session = await tenant.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true } });
    if (!session) throw new NotFoundException('Session not found');
    if (!session.member.identityId || !session.trainer.identityId) throw new NotFoundException('Session access is unavailable');
    const [memberIdentity, trainerIdentity] = await Promise.all([
      this.verifyPublishedActor(tenant, access, 'MEMBER', session.member),
      this.verifyPublishedActor(tenant, access, 'TRAINER', session.trainer),
    ]);
    if (memberIdentity !== session.member.identityId || trainerIdentity !== session.trainer.identityId) throw new NotFoundException('Session not found');
    const targets: GymAccessFenceTarget[] = [
      { identityId: trainerIdentity, gymId: access.gymId, role: 'TRAINER', tenantActorId: session.trainerId },
      { identityId: memberIdentity, gymId: access.gymId, role: 'MEMBER', tenantActorId: session.memberId },
      ...(access.role === 'OWNER' ? [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' as const }] : []),
    ];
    if (access.role === 'TRAINER' && (access.actor?.kind !== 'TRAINER' || access.actor.id !== session.trainerId || access.identityId !== session.trainer.identityId)) {
      throw new ForbiddenException('Only the assigned trainer can change this session');
    }
    if (access.role === 'MEMBER' && (!allowMember || access.actor?.kind !== 'MEMBER' || access.actor.id !== session.memberId || access.identityId !== session.member.identityId)) {
      throw new ForbiddenException('Only the session member can change this session');
    }
    if (!['OWNER', 'TRAINER'].includes(access.role) && !(allowMember && access.role === 'MEMBER')) throw new ForbiddenException('Trainer or owner access is required');
    return { session, targets };
  }

  private async currentPolicy(tenant: PrismaClient, session: { configurationVersion: number }) {
    const policy = await tenant.gymConfigurationVersion.findUnique({ where: { gymConfigurationId_configurationVersion: {
      gymConfigurationId: 'current', configurationVersion: session.configurationVersion,
    } } });
    if (!policy || policy.configurationVersion !== session.configurationVersion) throw new ConflictException('Booked session policy snapshot is unavailable');
    return { policy, policyVersion: session.configurationVersion };
  }

  private buildQuote(access: Access, session: any, policy: any, hold: any, now: Date, action: QuoteAction) {
    const actorRole = parseAccessRole(access.role);
    const cancelCutoff = new Date(session.scheduledStartAt.getTime() - policy.cancellationWindowMinutes * 60_000);
    const noShowAt = new Date(session.scheduledStartAt.getTime() + 15 * 60_000);
    let consequence: QuoteConsequence | null = null;
    let eligible = false;
    let eligibleAt: Date | null = null;
    let requiresAcknowledgment = false;
    if (action === 'CANCEL') {
      if (session.state === 'PENDING_CONFIRMATION' && actorRole === 'MEMBER') {
        consequence = 'PENDING_WITHDRAWAL'; eligible = true;
      } else if (session.state === 'SCHEDULED') {
        consequence = cancellationConsequence(now.getTime(), session.scheduledStartAt.getTime(), policy.cancellationWindowMinutes, policy.lateCancelDeduction);
        eligible = hold?.state === 'HELD'; requiresAcknowledgment = consequence === 'LATE_CANCELLATION';
      }
    } else if (session.state === 'SCHEDULED' && session.startedAt === null) {
      consequence = 'NO_SHOW'; eligible = hold?.state === 'HELD' && noShowIsEligible(now.getTime(), session.scheduledStartAt.getTime());
      eligibleAt = noShowAt; requiresAcknowledgment = true;
    }
    const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS);
    const claims: QuoteClaims | null = requiresAcknowledgment && eligible && consequence ? { v: 1, gymId: access.gymId, sessionId: session.id,
      actorIdentityId: access.identityId, actorRole, sessionVersion: session.version, policyVersion: policy.configurationVersion,
      action, consequence, creditOrdinal: hold?.state === 'HELD' ? hold.creditOrdinal : null,
      creditValueMinorUnits: hold?.state === 'HELD' ? hold.creditValueMinorUnits.toString() : null,
      currency: hold?.state === 'HELD' ? session.currency : null, exp: expiresAt.getTime() } : null;
    return sessionLifecycleQuoteSchema.parse({ sessionId: session.id, action, state: session.state, sessionVersion: session.version,
      policyVersion: policy.configurationVersion, asOf: now.toISOString(), expiresAt: expiresAt.toISOString(), eligible, eligibleAt: eligibleAt?.toISOString() ?? null,
      cancellationCutoff: action === 'CANCEL' && session.state === 'SCHEDULED' ? cancelCutoff.toISOString() : null,
      consequence, requiresAcknowledgment, acknowledgmentToken: claims ? signQuote(claims) : null,
      creditValue: hold?.state === 'HELD' ? minorUnitsDecimal(hold.creditValueMinorUnits, 2) : null,
      currency: hold?.state === 'HELD' ? session.currency : null, creditOrdinal: hold?.state === 'HELD' ? hold.creditOrdinal : null });
  }

  async quote(access: Access, sessionId: string, action: QuoteAction) {
    parseAccessRole(access.role);
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const { session, targets } = await this.context(access, sessionId, tenant, action === 'CANCEL');
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== targets.length) throw new ForbiddenException('Session access changed; reload and try again');
        const [policy, hold, clock] = await Promise.all([
          this.currentPolicy(tenant, session), tenant.sessionCreditHold.findUnique({ where: { sessionId } }),
          tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`,
        ]);
        return this.buildQuote(access, session, policy.policy, hold, clock[0]!.now, action);
      });
    });
  }

  async cancel(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionCancelInputSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session cancellation details');
    const role = parseAccessRole(access.role);
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const { targets } = await this.context(access, sessionId, tenant, true);
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== targets.length) throw new ForbiddenException('Session access changed; reload and try again');
        try {
          const command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({
            masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'CANCEL_PT_SESSION',
            idempotencyKey: parsed.data.idempotencyKey, normalizedIntent: { sessionId, expectedVersion: parsed.data.expectedVersion,
              policyVersion: parsed.data.policyVersion, ackDigest: quoteTokenDigest(parsed.data.acknowledgmentToken) },
          }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
            const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: true } });
            if (!session) throw new NotFoundException('Session not found');
            const { policy, policyVersion } = await this.currentPolicy(tx as unknown as PrismaClient, session);
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            const now = clock!.now;
            const freshQuote = this.buildQuote(access, session, policy, session.creditHold, now, 'CANCEL');
            if (session.version !== parsed.data.expectedVersion || policyVersion !== parsed.data.policyVersion) {
              throw new ConflictException({ code: 'STALE_QUOTE', message: 'Session or cancellation policy changed; review the refreshed quote', quote: freshQuote });
            }
            if (!freshQuote.eligible || !freshQuote.consequence) throw new ConflictException('This session cannot be cancelled in its current state');
            if (role === 'TRAINER' && (session.trainerId !== access.actor?.id || session.trainer.status !== 'ACTIVE')) throw new ForbiddenException('Only the assigned active trainer can cancel this session');
            if (role === 'MEMBER' && (session.memberId !== access.actor?.id || session.member.identityId !== access.identityId)) throw new ForbiddenException('Only the session member can cancel this session');
            const next = transitionSession({ state: session.state, command: session.state === 'PENDING_CONFIRMATION' ? 'MEMBER_WITHDRAW' : 'CANCEL', actorRole: role });
            if (next !== 'CANCELLED') throw new ConflictException('This session state cannot be cancelled by this role');
            const consequence = freshQuote.consequence as Exclude<QuoteConsequence, 'NO_SHOW'>;
            const claims: QuoteClaims = { v: 1, gymId: access.gymId, sessionId, actorIdentityId: access.identityId, actorRole: role,
              sessionVersion: session.version, policyVersion, action: 'CANCEL', consequence,
              creditOrdinal: session.creditHold?.state === 'HELD' ? session.creditHold.creditOrdinal : null,
              creditValueMinorUnits: session.creditHold?.state === 'HELD' ? session.creditHold.creditValueMinorUnits.toString() : null,
              currency: session.creditHold?.state === 'HELD' ? session.currency : null, exp: new Date(freshQuote.expiresAt).getTime() };
            if (freshQuote.requiresAcknowledgment && !parsed.data.acknowledgmentToken) {
              throw new ConflictException({ code: 'ACKNOWLEDGMENT_REQUIRED', message: 'Confirm the current late-cancellation consequence', quote: freshQuote });
            }
            if (freshQuote.requiresAcknowledgment && !verifyQuote(parsed.data.acknowledgmentToken!, claims, now.getTime())) {
              throw new ConflictException({ code: 'STALE_QUOTE', message: 'The cancellation acknowledgment is invalid or expired; review the refreshed quote', quote: freshQuote });
            }
            if (!freshQuote.requiresAcknowledgment && parsed.data.acknowledgmentToken && !verifyQuote(parsed.data.acknowledgmentToken, claims, now.getTime())) {
              throw new ConflictException({ code: 'STALE_QUOTE', message: 'The supplied acknowledgment is invalid or expired', quote: freshQuote });
            }
            const charged = consequence === 'LATE_CANCELLATION';
            if (session.state === 'SCHEDULED' && (!session.creditHold || session.creditHold.state !== 'HELD')) throw new ConflictException('Session has no held credit');
            if (session.state === 'PENDING_CONFIRMATION' && session.creditHold) throw new ConflictException('Pending requests cannot have a credit hold');
            const localDate = localDateAt(now, session.gymTimezone);
            const resolution = session.creditHold ? await resolveSessionCreditHold(tx, { masterGymId: access.gymId, sessionId, receiptId: receipt.id,
              actorIdentityId: access.identityId, resolution: charged ? 'CONSUME' : 'RELEASE', gymLocalDate: localDate }) : null;
            const creditMinor = resolution?.creditValueMinorUnits ?? 0n;
            const amount = minorUnitsDecimal(creditMinor, 2);
            const ended = await tx.pTSession.update({ where: { id: sessionId, version: session.version }, data: { state: 'CANCELLED', endedAt: now, version: { increment: 1 } } });
            const eventCode = 'PT_SESSION_CANCELLED';
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId, eventOrdinal: ended.version });
            await tx.sessionStateEvent.create({ data: { sessionId, fromState: session.state, toState: 'CANCELLED', committedVersion: ended.version,
              actorIdentityId: access.identityId, receiptId: receipt.id, eventKey, createdAt: now } });
            const settlement = await tx.sessionSettlement.create({ data: { sessionId, kind: consequence === 'PENDING_WITHDRAWAL' ? 'WITHDRAWN' : charged ? 'LATE_CANCELLED' : 'FREE_CANCELLED',
              creditConsumed: charged, creditValue: amount, currency: session.currency, sourceReceiptId: receipt.id } });
            if (charged) await tx.revenueRecord.create({ data: { sessionId, category: 'LATE_CANCEL', amount, currency: session.currency,
              sourceKey: `pt-session:${access.gymId}:${sessionId}:late-cancel` } });
            const memberCancels = role === 'MEMBER';
            const recipientIdentityId = memberCancels ? session.trainer.identityId : session.member.identityId;
            if (!recipientIdentityId) throw new ConflictException('Session notification recipient is unavailable');
            const notice = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_CANCELLED', resourceId: sessionId,
              recipientIdentityId, eventOrdinal: ended.version, ...(memberCancels ? { linkKind: 'TRAINER_SCHEDULE' as const } : {}) });
            return { result: { resourceIds: [sessionId, settlement.id, notice.id], version: ended.version, notificationState: 'AVAILABLE' }, resourceType: 'PT_SESSION', resourceId: sessionId,
              audits: [{ actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId,
                transition: { from: session.state, to: 'CANCELLED', version: ended.version } }] };
          }));
          return this.cancelResult(tenant, access, command.receiptId, command.result.resourceIds ?? [], command.result.version ?? 0,
            command.result.notificationState ?? 'FAILED', command.replayed);
        } catch (error) { return conflict(error); }
      });
    });
  }

  async noShow(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionNoShowInputSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid no-show details');
    const role = parseAccessRole(access.role);
    if (role === 'MEMBER') throw new ForbiddenException('Members cannot mark a session as missed');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const { targets } = await this.context(access, sessionId, tenant);
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== targets.length) throw new ForbiddenException('Session access changed; reload and try again');
        try {
          const command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({
            masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'MARK_PT_SESSION_NO_SHOW',
            idempotencyKey: parsed.data.idempotencyKey, normalizedIntent: { sessionId, expectedVersion: parsed.data.expectedVersion,
              policyVersion: parsed.data.policyVersion, ackDigest: quoteTokenDigest(parsed.data.acknowledgmentToken) },
          }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
            const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: true } });
            if (!session) throw new NotFoundException('Session not found');
            const { policy, policyVersion } = await this.currentPolicy(tx as unknown as PrismaClient, session);
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            const now = clock!.now;
            const freshQuote = this.buildQuote(access, session, policy, session.creditHold, now, 'NO_SHOW');
            if (session.version !== parsed.data.expectedVersion || policyVersion !== parsed.data.policyVersion) {
              throw new ConflictException({ code: 'STALE_QUOTE', message: 'Session or policy changed; review the refreshed quote', quote: freshQuote });
            }
            if (role === 'TRAINER' && (session.trainerId !== access.actor?.id || session.trainer.status !== 'ACTIVE')) throw new ForbiddenException('Only the assigned active trainer can mark this session missed');
            if (!freshQuote.eligible || freshQuote.consequence !== 'NO_SHOW') throw new UnprocessableEntityException('No-show is available at scheduled start plus 15 minutes');
            const claims: QuoteClaims = { v: 1, gymId: access.gymId, sessionId, actorIdentityId: access.identityId, actorRole: role,
              sessionVersion: session.version, policyVersion, action: 'NO_SHOW', consequence: 'NO_SHOW',
              creditOrdinal: session.creditHold?.state === 'HELD' ? session.creditHold.creditOrdinal : null,
              creditValueMinorUnits: session.creditHold?.state === 'HELD' ? session.creditHold.creditValueMinorUnits.toString() : null,
              currency: session.creditHold?.state === 'HELD' ? session.currency : null, exp: new Date(freshQuote.expiresAt).getTime() };
            if (!verifyQuote(parsed.data.acknowledgmentToken, claims, now.getTime())) throw new ConflictException({
              code: 'STALE_QUOTE', message: 'The no-show acknowledgment is invalid or expired; review the refreshed quote', quote: freshQuote });
            if (!session.creditHold || session.creditHold.state !== 'HELD') throw new ConflictException('Session has no held credit');
            if (transitionSession({ state: session.state, command: 'NO_SHOW', actorRole: role }) !== 'MISSED' || session.startedAt) throw new ConflictException('Only scheduled, not-started sessions can be marked missed');
            const localDate = localDateAt(now, session.gymTimezone);
            const resolution = await resolveSessionCreditHold(tx, { masterGymId: access.gymId, sessionId, receiptId: receipt.id,
              actorIdentityId: access.identityId, resolution: 'CONSUME', gymLocalDate: localDate });
            const amount = minorUnitsDecimal(resolution.creditValueMinorUnits, 2);
            const updated = await tx.pTSession.update({ where: { id: sessionId, version: session.version }, data: { state: 'MISSED', endedAt: now, version: { increment: 1 } } });
            const eventCode = 'PT_SESSION_MISSED';
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId, eventOrdinal: updated.version });
            await tx.sessionStateEvent.create({ data: { sessionId, fromState: 'SCHEDULED', toState: 'MISSED', committedVersion: updated.version,
              actorIdentityId: access.identityId, receiptId: receipt.id, eventKey, createdAt: now } });
            const settlement = await tx.sessionSettlement.create({ data: { sessionId, kind: 'MISSED', creditConsumed: true, creditValue: amount,
              currency: session.currency, sourceReceiptId: receipt.id } });
            const revenue = await tx.revenueRecord.create({ data: { sessionId, category: 'MISSED_LATE', amount, currency: session.currency,
              sourceKey: `pt-session:${access.gymId}:${sessionId}:missed-late` } });
            const notice = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_MISSED', resourceId: sessionId,
              recipientIdentityId: session.member.identityId!, eventOrdinal: updated.version });
            return { result: { resourceIds: [sessionId, settlement.id, revenue.id, notice.id], version: updated.version, notificationState: 'AVAILABLE' }, resourceType: 'PT_SESSION', resourceId: sessionId,
              audits: [{ actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId,
                transition: { from: 'SCHEDULED', to: 'MISSED', version: updated.version } }] };
          }));
          return this.noShowResult(tenant, access, command.receiptId, command.result.resourceIds ?? [], command.result.version ?? 0,
            command.result.notificationState ?? 'FAILED', command.replayed);
        } catch (error) { return conflict(error); }
      });
    });
  }

  private async cancelResult(tenant: PrismaClient, access: Access, receiptId: string, ids: string[], version: number,
    notificationState: 'AVAILABLE' | 'QUEUED' | 'FAILED', replayed: boolean) {
    const [sessionId, settlementId, notificationId] = ids;
    if (!sessionId || !settlementId || !notificationId) throw new ConflictException('Cancellation receipt is missing persisted effects');
    const [session, event, settlement, notification, hold] = await Promise.all([
      tenant.pTSession.findUnique({ where: { id: sessionId } }), tenant.sessionStateEvent.findFirst({ where: { receiptId, sessionId, toState: 'CANCELLED' } }),
      tenant.sessionSettlement.findUnique({ where: { id: settlementId } }), tenant.notification.findUnique({ where: { id: notificationId } }),
      tenant.sessionCreditHold.findUnique({ where: { sessionId } }),
    ]);
    const revenue = await tenant.revenueRecord.findFirst({ where: { sessionId, category: 'LATE_CANCEL' } });
    if (!session || !event || event.committedVersion !== version || !settlement || settlement.sourceReceiptId !== receiptId || !notification
      || notification.eventCode !== 'SESSION_CANCELLED' || !['CANCELLED'].includes(session.state) || (hold && settlement.creditConsumed !== (hold.state === 'CONSUMED'))
      || (!hold && settlement.kind !== 'WITHDRAWN')) throw new ConflictException('Cancellation receipt references incomplete persisted effects');
    const policy = await tenant.gymConfigurationVersion.findUnique({ where: { gymConfigurationId_configurationVersion: { gymConfigurationId: 'current', configurationVersion: session.configurationVersion } } });
    const cutoff = policy && event?.fromState === 'SCHEDULED' ? new Date(session.scheduledStartAt.getTime() - policy.cancellationWindowMinutes * 60_000) : null;
    const charged = settlement.kind === 'LATE_CANCELLED';
    if (charged !== Boolean(revenue) || (revenue && revenue.amount.toString() !== settlement.creditValue.toString())) throw new ConflictException('Cancellation earning does not match settlement');
    let balance: number | null = null;
    if (hold) {
      const movements = await tenant.packCreditMovement.findMany({ where: { packId: hold.packId }, select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } });
      const issued = await tenant.sessionPack.findUnique({ where: { id: hold.packId }, select: { issuedCredits: true } });
      if (!issued) throw new ConflictException('Cancellation credit pack is missing');
      balance = derivePackCreditBalance(issued.issuedCredits, movements.map(row => ({ available: row.availableDelta, held: row.heldDelta, consumed: row.consumedDelta, expired: row.expiredDelta }))).available;
    }
    const member = await tenant.member.findUnique({ where: { id: session.memberId }, select: { identityId: true } });
    const trainer = await tenant.trainer.findUnique({ where: { id: session.trainerId }, select: { identityId: true } });
    const memberCancelled = event.actorIdentityId === member?.identityId;
    const expectedRecipient = memberCancelled ? trainer?.identityId : member?.identityId;
    if (!expectedRecipient || notification.recipientIdentityId !== expectedRecipient) throw new ConflictException('Cancellation notification recipient does not match the session action');
    const isLateCancel = cutoff !== null && event?.fromState === 'SCHEDULED' && event.createdAt.getTime() > cutoff.getTime();
    return sessionCancelResultSchema.parse({ receiptId, replayed, session: { id: session.id, memberId: session.memberId, trainerId: session.trainerId, state: 'CANCELLED',
      scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(), startedAt: null,
      endedAt: session.endedAt?.toISOString() ?? event.createdAt.toISOString(), version },
      consequence: settlement.kind === 'WITHDRAWN' ? 'PENDING_WITHDRAWAL' : charged ? 'LATE_CANCELLATION' : 'FREE_CANCELLATION', isLateCancel,
      deductedCredits: charged ? 1 : 0, creditEffect: { holdId: hold?.id ?? null, packId: hold?.packId ?? null,
        creditOrdinal: hold?.creditOrdinal ?? null, resolution: !hold ? 'NONE' : charged ? 'CONSUMED' : 'RELEASED',
        creditValue: settlement.creditValue.toString(), balance }, recognizedRevenue: { recordId: revenue?.id ?? null,
        amount: revenue?.amount.toString() ?? '0', currency: session.currency }, cutoff: cutoff?.toISOString() ?? null,
      policyVersion: policy?.configurationVersion ?? session.configurationVersion,
      notificationOutcome: { eventId: notification.id, recipient: { role: memberCancelled ? 'TRAINER' : 'MEMBER',
        actorId: memberCancelled ? session.trainerId : session.memberId }, gymSlug: access.slug, state: notificationState, retryable: false }, auditState: 'AVAILABLE' });
  }

  private async noShowResult(tenant: PrismaClient, access: Access, receiptId: string, ids: string[], version: number,
    notificationState: 'AVAILABLE' | 'QUEUED' | 'FAILED', replayed: boolean) {
    const [sessionId, settlementId, revenueId, notificationId] = ids;
    if (!sessionId || !settlementId || !revenueId || !notificationId) throw new ConflictException('No-show receipt is missing persisted effects');
    const [session, event, settlement, revenue, notification, hold] = await Promise.all([
      tenant.pTSession.findUnique({ where: { id: sessionId } }), tenant.sessionStateEvent.findFirst({ where: { receiptId, sessionId, toState: 'MISSED' } }),
      tenant.sessionSettlement.findUnique({ where: { id: settlementId } }), tenant.revenueRecord.findUnique({ where: { id: revenueId } }),
      tenant.notification.findUnique({ where: { id: notificationId } }), tenant.sessionCreditHold.findUnique({ where: { sessionId } }),
    ]);
    const member = session ? await tenant.member.findUnique({ where: { id: session.memberId }, select: { identityId: true } }) : null;
    if (!session || !event || event.committedVersion !== version || !settlement || settlement.sourceReceiptId !== receiptId || !revenue || revenue.category !== 'MISSED_LATE'
      || !notification || notification.eventCode !== 'SESSION_MISSED' || !hold || hold.state !== 'CONSUMED' || !member?.identityId
      || notification.recipientIdentityId !== member.identityId || revenue.amount.toString() !== settlement.creditValue.toString()
      || settlement.kind !== 'MISSED' || !settlement.creditConsumed) throw new ConflictException('No-show receipt references incomplete persisted effects');
    const pack = await tenant.sessionPack.findUnique({ where: { id: hold.packId }, select: { issuedCredits: true } });
    const movements = await tenant.packCreditMovement.findMany({ where: { packId: hold.packId }, select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } });
    if (!pack) throw new ConflictException('No-show credit pack is missing');
    const balance = derivePackCreditBalance(pack.issuedCredits, movements.map(row => ({ available: row.availableDelta, held: row.heldDelta, consumed: row.consumedDelta, expired: row.expiredDelta })));
    return sessionNoShowResultSchema.parse({ receiptId, replayed, session: { id: session.id, memberId: session.memberId, trainerId: session.trainerId, state: 'MISSED',
      scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(), startedAt: null,
      endedAt: session.endedAt?.toISOString() ?? event.createdAt.toISOString(), version },
      creditEffect: { holdId: hold.id, packId: hold.packId, creditOrdinal: hold.creditOrdinal, resolution: 'CONSUMED',
        creditValue: minorUnitsDecimal(hold.creditValueMinorUnits, 2), balance: balance.available },
      recognizedRevenue: { recordId: revenue.id, amount: revenue.amount.toString(), currency: revenue.currency },
      noShowAt: new Date(session.scheduledStartAt.getTime() + 15 * 60_000).toISOString(), policyVersion: session.configurationVersion,
      notificationOutcome: { eventId: notification.id, recipient: { role: 'MEMBER', actorId: session.memberId }, gymSlug: access.slug,
        state: notificationState, retryable: false }, auditState: 'AVAILABLE' });
  }

  async start(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionLifecycleCommandInputSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session start details');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const { targets } = await this.context(access, sessionId, tenant);
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== targets.length) throw new ForbiddenException('Session access changed; reload and try again');
        try {
          const command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({
            masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'START_PT_SESSION',
            idempotencyKey: parsed.data.idempotencyKey, normalizedIntent: { sessionId, expectedVersion: parsed.data.expectedVersion },
          }, async (tx, receipt) => {
            const base = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: true } });
            if (!base) throw new NotFoundException('Session not found');
            if (base.trainer.status !== 'ACTIVE' || base.trainer.registrationState !== 'COMPLETE' || base.trainer.identityId !== targets.find(t => t.role === 'TRAINER')?.identityId) throw new ForbiddenException('Assigned trainer is inactive');
            if (access.role === 'TRAINER' && base.trainerId !== access.actor!.id) throw new ForbiddenException('Only the assigned trainer can change this session');
            if (!base.creditHold || base.creditHold.state !== 'HELD') throw new ConflictException('Session has no held credit');
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`session-start-trainer:${access.gymId}:${base.trainerId}`}, 0))`;
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
            const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: true } });
            if (!session || session.version !== parsed.data.expectedVersion) throw new ConflictException('Session changed; refresh and try again');
            if (!session.creditHold || session.creditHold.state !== 'HELD') throw new ConflictException('Session has no held credit');
            if (transitionSession({ state: session.state, command: 'START', actorRole: access.role as 'OWNER' | 'TRAINER' }) !== 'ACTIVE') throw new ConflictException('Only scheduled sessions can start');
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            const now = clock!.now;
            if (now.getTime() < session.scheduledStartAt.getTime() - 15 * 60_000 || now.getTime() > session.scheduledEndAt.getTime()) {
              throw new UnprocessableEntityException('Session can start from 15 minutes before its scheduled start through its scheduled end');
            }
            const active = await tx.pTSession.count({ where: { trainerId: session.trainerId, state: 'ACTIVE', id: { not: session.id } } });
            if (active) throw new ConflictException('Trainer already has an active session');
            const updated = await tx.pTSession.update({ where: { id: session.id, version: session.version }, data: { state: 'ACTIVE', startedAt: now, version: { increment: 1 } } });
            const eventCode = eventCodeFor('START');
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: updated.version });
            await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: 'SCHEDULED', toState: 'ACTIVE', committedVersion: updated.version,
              actorIdentityId: access.identityId, receiptId: receipt.id, eventKey } });
            const notice = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_STARTED', resourceId: session.id,
              recipientIdentityId: session.member.identityId!, eventOrdinal: updated.version });
            return { result: { resourceIds: [session.id, notice.id], version: updated.version, notificationState: 'AVAILABLE' }, resourceType: 'PT_SESSION', resourceId: session.id,
              audits: [{ actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, transition: { from: 'SCHEDULED', to: 'ACTIVE', version: updated.version } }] };
          }));
          return this.startResult(tenant, access, command.receiptId, command.result.resourceIds ?? [], command.result.version ?? 0, command.result.notificationState ?? 'FAILED', command.replayed);
        } catch (error) { return conflict(error); }
      });
    });
  }

  private async startResult(tenant: PrismaClient, access: Access, receiptId: string, ids: string[], version: number, state: 'AVAILABLE' | 'QUEUED' | 'FAILED', replayed: boolean) {
    const [sessionId, notificationId] = ids;
    if (!sessionId || !notificationId) throw new ConflictException('Start receipt is missing its session or notification');
    const session = await tenant.pTSession.findUnique({ where: { id: sessionId } });
    const event = await tenant.sessionStateEvent.findFirst({ where: { receiptId, sessionId, toState: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    const notification = await tenant.notification.findUnique({ where: { id: notificationId } });
    if (!session || !event || event.committedVersion !== version || !session.startedAt || !notification) throw new ConflictException('Start receipt references incomplete persisted effects');
    const member = await tenant.member.findUnique({ where: { id: session!.memberId }, select: { identityId: true } });
    if (!member?.identityId || notification!.recipientIdentityId !== member.identityId || notification.eventCode !== 'SESSION_STARTED') throw new ConflictException('Start receipt notification does not match the session member');
    return sessionStartResultSchema.parse({ receiptId, replayed, session: { id: session!.id, memberId: session!.memberId, trainerId: session!.trainerId,
      state: 'ACTIVE', scheduledStartAt: session!.scheduledStartAt.toISOString(), scheduledEndAt: session!.scheduledEndAt.toISOString(),
      startedAt: session!.startedAt!.toISOString(), endedAt: null, version }, notificationOutcome: { eventId: notification!.id,
      recipient: { role: 'MEMBER', actorId: session!.memberId }, gymSlug: access.slug, state, retryable: false } });
  }

  async updateNotes(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionNotesInputSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid shared session notes');
    const notes = parsed.data.notes === null ? null : parsed.data.notes.replace(/\r\n?/g, '\n');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const { targets } = await this.context(access, sessionId, tenant);
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== targets.length) throw new ForbiddenException('Session access changed; reload and try again');
        try {
          const command = await new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
            commandKind: 'UPDATE_PT_SESSION_NOTES', idempotencyKey: parsed.data.idempotencyKey,
            normalizedIntent: { sessionId, notes, expectedVersion: parsed.data.expectedVersion } }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
            const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { trainer: true } });
            if (!session) throw new NotFoundException('Session not found');
            if (access.role === 'TRAINER' && (session.trainerId !== access.actor!.id || session.trainer.identityId !== access.identityId || session.trainer.status !== 'ACTIVE')) throw new ForbiddenException('Only the assigned active trainer can edit notes');
            if (session.version !== parsed.data.expectedVersion) throw new ConflictException('Session changed; refresh and try again');
            if (transitionSession({ state: session.state, command: 'UPDATE_NOTES', actorRole: access.role as 'OWNER' | 'TRAINER' }) !== 'COMPLETED') throw new ConflictException('Notes can only be edited on completed sessions');
            const updated = await tx.pTSession.update({ where: { id: session.id, version: session.version }, data: { notes, version: { increment: 1 } } });
            const eventCode = eventCodeFor('UPDATE_NOTES');
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: updated.version });
            await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: 'COMPLETED', toState: 'COMPLETED', committedVersion: updated.version,
              actorIdentityId: access.identityId, receiptId: receipt.id, eventKey } });
            return { result: { resourceIds: [session.id], version: updated.version, notesSnapshot: notes }, resourceType: 'PT_SESSION', resourceId: session.id,
              audits: [{ actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, transition: { from: 'COMPLETED', to: 'COMPLETED', version: updated.version } }] };
          });
          return sessionNotesResultSchema.parse({ receiptId: command.receiptId, replayed: command.replayed, sessionId: command.result.resourceIds?.[0],
            notes: command.result.notesSnapshot ?? null, version: command.result.version });
        } catch (error) { return conflict(error); }
      });
    });
  }

  async complete(access: Access, sessionId: string, raw: unknown) {
    const parsed = sessionLifecycleCommandInputSchema.safeParse(raw);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session completion details');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const { targets } = await this.context(access, sessionId, tenant);
      return withGymAccessFence(this.database.master, targets, async locked => {
        if (locked.length !== targets.length) throw new ForbiddenException('Session access changed; reload and try again');
        try {
          const command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId,
            actorIdentityId: access.identityId, commandKind: 'COMPLETE_PT_SESSION', idempotencyKey: parsed.data.idempotencyKey,
            normalizedIntent: { sessionId, expectedVersion: parsed.data.expectedVersion } }, async (tx, receipt) => {
            const preflight = await tx.pTSession.findUnique({ where: { id: sessionId }, select: { scheduledStartAt: true, gymTimezone: true, configurationVersion: true } });
            if (!preflight) throw new NotFoundException('Session not found');
            const version = await tx.gymConfigurationVersion.findFirst({ where: { gymConfigurationId: 'current', configurationVersion: preflight.configurationVersion } });
            if (!version) throw new ConflictException('The session confirmation policy snapshot is unavailable');
            const originalInfo = periodFor(preflight.scheduledStartAt, version.payPeriod, preflight.gymTimezone);
            const periodLock = `trainer-pay-period:${access.gymId}:${originalInfo.cadence}:${originalInfo.start}`;
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${periodLock}, 0))`;
            let period = await tx.trainerPayPeriod.upsert({ where: { cadence_localStartDate: { cadence: originalInfo.cadence, localStartDate: dateValue(originalInfo.start) } },
              create: { cadence: originalInfo.cadence, localStartDate: dateValue(originalInfo.start), localEndDateExclusive: dateValue(originalInfo.end), timezone: originalInfo.timezone,
                utcStartAt: originalInfo.utcStart, utcEndAt: originalInfo.utcEnd }, update: {} });
            await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id" = ${period.id} FOR UPDATE`;
            period = (await tx.trainerPayPeriod.findUnique({ where: { id: period.id } }))!;
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
            const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: true, trainer: true, creditHold: { include: { pack: true } } } });
            if (!session) throw new NotFoundException('Session not found');
            if (session.version !== parsed.data.expectedVersion) throw new ConflictException('Session changed; refresh and try again');
            if (access.role === 'TRAINER' && (session.trainerId !== access.actor?.id || session.trainer.identityId !== access.identityId || session.trainer.status !== 'ACTIVE')) throw new ForbiddenException('Only the assigned active trainer can complete this session');
            if (transitionSession({ state: session.state, command: 'COMPLETE', actorRole: access.role as 'OWNER' | 'TRAINER' }) !== 'COMPLETED' || !session.startedAt) throw new ConflictException('Only started active sessions can be completed');
            if (!session.creditHold || session.creditHold.state !== 'HELD') throw new UnprocessableEntityException('Session has no valid held credit');
            if (session.confirmationRate === null || session.confirmationLevel === null) throw new ConflictException('The confirmation pay policy snapshot is incomplete');
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            const now = clock!.now;
            if (now.getTime() - session.startedAt.getTime() < version.minimumSessionDurationMinutes * 60_000) throw new UnprocessableEntityException(`Session must run for at least ${version.minimumSessionDurationMinutes} minutes`);
            if (period.state !== 'OPEN') {
              let next = nextPeriod(originalInfo);
              for (let attempt = 0; attempt < 120; attempt += 1) {
                const correctionLock = `trainer-pay-period:${access.gymId}:${next.cadence}:${next.start}`;
                await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${correctionLock}, 0))`;
                const candidate = await tx.trainerPayPeriod.findUnique({ where: { cadence_localStartDate: { cadence: next.cadence, localStartDate: dateValue(next.start) } } });
                if (!candidate || candidate.state === 'OPEN') {
                  period = candidate ?? await tx.trainerPayPeriod.create({ data: { cadence: next.cadence, localStartDate: dateValue(next.start), localEndDateExclusive: dateValue(next.end), timezone: next.timezone,
                    utcStartAt: next.utcStart, utcEndAt: next.utcEnd } });
                  await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id" = ${period.id} FOR UPDATE`;
                  period = (await tx.trainerPayPeriod.findUnique({ where: { id: period.id } }))!;
                  if (period.state !== 'OPEN') { next = nextPeriod(next); continue; }
                  break;
                }
                next = nextPeriod(next);
              }
              if (period.state !== 'OPEN' || period.id === (await tx.trainerPayPeriod.findUnique({ where: { cadence_localStartDate: { cadence: originalInfo.cadence, localStartDate: dateValue(originalInfo.start) } }, select: { id: true } }))?.id) {
                throw new ConflictException('No open correction period is available');
              }
              await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id" = ${period.id} FOR UPDATE`;
            }
            const [currentClock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            const localDate = localDateAt(currentClock!.now, session.gymTimezone);
            const resolution = await resolveSessionCreditHold(tx, { masterGymId: access.gymId, sessionId: session.id, receiptId: receipt.id,
              actorIdentityId: access.identityId, resolution: 'CONSUME', gymLocalDate: localDate });
            const eventCode = eventCodeFor('COMPLETE');
            const eventKey = tenantAuditKey({ masterGymId: access.gymId, receiptId: receipt.id, eventCode, resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: session.version + 1 });
            const updated = await tx.pTSession.update({ where: { id: session.id, version: session.version }, data: { state: 'COMPLETED', endedAt: now, version: { increment: 1 } } });
            await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: 'ACTIVE', toState: 'COMPLETED', committedVersion: updated.version,
              actorIdentityId: access.identityId, receiptId: receipt.id, eventKey } });
            const amount = minorUnitsDecimal(resolution.creditValueMinorUnits, 2);
            const settlement = await tx.sessionSettlement.create({ data: { sessionId: session.id, kind: 'COMPLETED', creditConsumed: true, creditValue: amount,
              currency: session.currency, sourceReceiptId: receipt.id } });
            const revenue = await tx.revenueRecord.create({ data: { sessionId: session.id, category: 'COMPLETED_SESSION', amount, currency: session.currency,
              sourceKey: `pt-session:${access.gymId}:${session.id}:completed` } });
            const payMinor = payAmountMinor(resolution.creditValueMinorUnits, toDecimal(session.confirmationRate));
            const pay = minorUnitsDecimal(payMinor, 2);
            let payId: string;
            if (period.id !== (await tx.trainerPayPeriod.findUnique({ where: { cadence_localStartDate: { cadence: originalInfo.cadence, localStartDate: dateValue(originalInfo.start) } }, select: { id: true } }))?.id) {
              const original = await tx.trainerPayPeriod.findUnique({ where: { cadence_localStartDate: { cadence: originalInfo.cadence, localStartDate: dateValue(originalInfo.start) } } });
              if (!original || original.state === 'OPEN') throw new ConflictException('Original pay period changed while completing the session');
              const correction = await tx.trainerPayCorrection.create({ data: { sessionId: session.id, originalPeriodId: original.id, originalEarningId: revenue.id,
                correctionPeriodId: period.id, amount: pay, currency: session.currency, reason: 'Completed session settled after its scheduled pay period was closed',
                actorIdentityId: access.identityId, sourcePeriodState: original.state, sourcePeriodVersion: original.version,
                sourcePeriodApprovedAt: original.approvedAt, sourcePeriodApprovedByIdentityId: original.approvedByIdentityId,
                sourceKey: `pt-session:${access.gymId}:${session.id}:pay-correction` } });
              payId = correction.id;
              await tx.trainerPayPeriod.update({ where: { id: period.id, state: 'OPEN' }, data: { calculatedTotal: { increment: pay } } });
            } else {
              const payRecord = await tx.payRecord.create({ data: { sessionId: session.id, periodId: period.id, amount: pay, currency: session.currency,
                sourceKey: `pt-session:${access.gymId}:${session.id}:completed-pay`, confirmationRate: session.confirmationRate, confirmationLevel: session.confirmationLevel } });
              payId = payRecord.id;
              await tx.trainerPayPeriod.update({ where: { id: period.id, state: 'OPEN' }, data: { calculatedTotal: { increment: pay } } });
            }
            const notice = await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_COMPLETED', resourceId: session.id,
              recipientIdentityId: session.member.identityId!, eventOrdinal: updated.version });
            return { result: { resourceIds: [session.id, settlement.id, revenue.id, payId, period.id, notice.id],
                version: updated.version, notificationState: 'AVAILABLE' }, resourceType: 'PT_SESSION', resourceId: session.id,
              audits: [{ actorIdentityId: access.identityId, eventCode, resourceType: 'PT_SESSION', resourceId: session.id,
                transition: { from: 'ACTIVE', to: 'COMPLETED', version: updated.version } }] };
          }));
          return this.completeResult(tenant, access, command.receiptId, command.result.resourceIds ?? [], command.result.version ?? 0,
            command.result.notificationState ?? 'FAILED', command.replayed);
        } catch (error) { return conflict(error); }
      });
    });
  }

  private async completeResult(tenant: PrismaClient, access: Access, receiptId: string, ids: string[], version: number, state: 'AVAILABLE' | 'QUEUED' | 'FAILED', replayed: boolean) {
    const [sessionId, settlementId, revenueId, payId, periodId, notificationId] = ids;
    if (!sessionId || !settlementId || !revenueId || !payId || !periodId || !notificationId) throw new ConflictException('Completion receipt is missing persisted effects');
    const [session, event, settlement, revenue, pay, period, notification, hold] = await Promise.all([
      tenant.pTSession.findUnique({ where: { id: sessionId } }),
      tenant.sessionStateEvent.findFirst({ where: { receiptId, sessionId, toState: 'COMPLETED' } }),
      tenant.sessionSettlement.findUnique({ where: { id: settlementId } }),
      tenant.revenueRecord.findUnique({ where: { id: revenueId } }),
      tenant.payRecord.findUnique({ where: { id: payId } }),
      tenant.trainerPayPeriod.findUnique({ where: { id: periodId } }),
      tenant.notification.findUnique({ where: { id: notificationId } }),
      tenant.sessionCreditHold.findUnique({ where: { sessionId } }),
    ]);
    const correction = pay ? null : await tenant.trainerPayCorrection.findUnique({ where: { id: payId } });
    const member = session ? await tenant.member.findUnique({ where: { id: session.memberId }, select: { identityId: true } }) : null;
    if (!session || !event || event.committedVersion !== version || !session.endedAt || !settlement || !revenue || (!pay && !correction) || !period || !notification || !hold || !member?.identityId
      || notification.recipientIdentityId !== member.identityId || notification.eventCode !== 'SESSION_COMPLETED' || settlement.sessionId !== session.id
      || settlement.sourceReceiptId !== receiptId || revenue.sessionId !== session.id || revenue.category !== 'COMPLETED_SESSION' || hold.state !== 'CONSUMED'
      || (!correction && (!pay || pay.id !== payId || pay.sessionId !== session.id || pay.periodId !== periodId))
      || (correction && (correction.id !== payId || correction.sessionId !== session.id || correction.originalEarningId !== revenue.id
        || correction.correctionPeriodId !== periodId || correction.correctionPeriodId !== period.id))) throw new ConflictException('Completion receipt references incomplete persisted effects');
    const payable = correction ?? pay;
    if (!payable) throw new ConflictException('Completion receipt has no persisted trainer earning');
    const payPeriodId = correction?.correctionPeriodId ?? pay?.periodId;
    if (!payPeriodId) throw new ConflictException('Completion receipt has no trainer pay period');
    const pack = await tenant.sessionPack.findUnique({ where: { id: hold.packId }, include: { creditMovements: { select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } } } });
    if (!pack) throw new ConflictException('Completion credit pack is missing');
    const balance = derivePackCreditBalance(pack.issuedCredits, pack.creditMovements.map(movement => ({ available: movement.availableDelta, held: movement.heldDelta,
      consumed: movement.consumedDelta, expired: movement.expiredDelta })));
    const result = sessionCompleteResultSchema.parse({ receiptId, replayed, session: { id: session.id, memberId: session.memberId, trainerId: session.trainerId,
      state: 'COMPLETED', scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(),
      startedAt: session.startedAt!.toISOString(), endedAt: session.endedAt.toISOString(), version },
      creditEffect: { holdId: hold.id, packId: hold.packId, creditOrdinal: hold.creditOrdinal, delta: -1 as const,
        creditValue: minorUnitsDecimal(hold.creditValueMinorUnits, 2), balance: balance.available },
      recognizedRevenue: { recordId: revenue.id, amount: revenue.amount.toString(), currency: revenue.currency },
      trainerPay: { recordId: payable.id, amount: payable.amount.toString(), currency: payable.currency, periodId: payPeriodId },
      notificationOutcome: { eventId: notification.id, recipient: { role: 'MEMBER', actorId: session.memberId }, gymSlug: access.slug, state, retryable: false }, auditState: 'AVAILABLE' });
    return result;
  }
}
