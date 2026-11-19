import { ConflictException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../generated/tenant/client.js';
import { appendTenantNotification } from '../notifications.service.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { tenantAuditKey } from '../operations/primitives.js';
import { resolveSessionCreditHold } from './credit-holds.js';
import { minorUnitsDecimal, transitionSession } from './session-state.js';
import { retrySessionTransaction } from './session-transactions.js';

export const PT_NO_SHOW_GRACE_MS = 15 * 60_000;

export function noShowIsEligible(now: number, scheduledStart: number) {
  return now >= scheduledStart + PT_NO_SHOW_GRACE_MS;
}

const include = { member: { select: { identityId: true } }, trainer: { select: { identityId: true, status: true } }, creditHold: true } as const;
type SettlementSession = Prisma.PTSessionGetPayload<{ include: typeof include }>;

/** Apply the same ledger effects for an acknowledged manual or scheduled no-show. */
export async function settleMissedSession(tx: Prisma.TransactionClient, {
  masterGymId, actorIdentityId, session, receiptId, now,
}: { masterGymId: string; actorIdentityId: string; session: SettlementSession; receiptId: string; now: Date }) {
  const sessionId = session.id;
  if (!session.creditHold || session.creditHold.state !== 'HELD') throw new ConflictException('Session has no held credit');
  if (!session.member.identityId || !session.trainer.identityId) throw new ConflictException('Session notification recipient is unavailable');
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: session.gymTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => date.find(value => value.type === type)?.value;
  const localDate = `${part('year')}-${part('month')}-${part('day')}`;
  const resolution = await resolveSessionCreditHold(tx, { masterGymId, sessionId, receiptId,
    actorIdentityId, resolution: 'CONSUME', gymLocalDate: localDate });
  const amount = minorUnitsDecimal(resolution.creditValueMinorUnits, 2);
  const updated = await tx.pTSession.update({ where: { id: sessionId, version: session.version }, data: { state: 'MISSED', endedAt: now, version: { increment: 1 } } });
  const eventCode = 'PT_SESSION_MISSED';
  const eventKey = tenantAuditKey({ masterGymId, receiptId, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId, eventOrdinal: updated.version });
  await tx.sessionStateEvent.create({ data: { sessionId, fromState: 'SCHEDULED', toState: 'MISSED', committedVersion: updated.version,
    actorIdentityId, receiptId, eventKey, createdAt: now } });
  const settlement = await tx.sessionSettlement.create({ data: { sessionId, kind: 'MISSED', creditConsumed: true, creditValue: amount,
    currency: session.currency, sourceReceiptId: receiptId } });
  const revenue = await tx.revenueRecord.create({ data: { sessionId, category: 'MISSED_LATE', amount, currency: session.currency,
    sourceKey: `pt-session:${masterGymId}:${sessionId}:missed-late` } });
  const notice = await appendTenantNotification(tx, { masterGymId, receiptId, eventCode: 'SESSION_MISSED', resourceId: sessionId,
    recipientIdentityId: session.member.identityId, eventOrdinal: updated.version });
  await appendTenantNotification(tx, { masterGymId, receiptId, eventCode: 'SESSION_MISSED', resourceId: sessionId,
    recipientIdentityId: session.trainer.identityId, eventOrdinal: updated.version, linkKind: 'TRAINER_SCHEDULE' });
  return { result: { resourceIds: [sessionId, settlement.id, revenue.id, notice.id], version: updated.version, notificationState: 'AVAILABLE' as const }, resourceType: 'PT_SESSION', resourceId: sessionId,
    audits: [{ actorIdentityId, eventCode, resourceType: 'PT_SESSION', resourceId: sessionId,
      transition: { from: 'SCHEDULED', to: 'MISSED', version: updated.version } }] };
}

class NoShowSuperseded extends Error {}

export async function markOverdueSessionMissed(tenant: PrismaClient, masterGymId: string, sessionId: string) {
  const actorIdentityId = 'system:pt-no-show';
  try {
    const command = await retrySessionTransaction(() => new CommandReceiptFoundationService(tenant).execute({
      masterGymId, actorIdentityId, commandKind: 'MARK_PT_SESSION_NO_SHOW',
      idempotencyKey: `auto-no-show:${sessionId}`, normalizedIntent: { sessionId, policy: 'AUTO_NO_SHOW_15_MIN_V1' },
    }, async (tx, receipt) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`pt-settlement:${masterGymId}`}, 0))`;
      const candidate = await tx.pTSession.findUnique({ where: { id: sessionId }, select: { trainerId: true } });
      if (!candidate) throw new NoShowSuperseded();
      await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${candidate.trainerId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
      const session = await tx.pTSession.findUnique({ where: { id: sessionId }, include });
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const now = clock!.now;
      if (!session || session.trainerId !== candidate.trainerId || session.trainer.status !== 'ACTIVE'
        || session.startedAt || transitionSession({ state: session.state, command: 'NO_SHOW', actorRole: 'SYSTEM' }) !== 'MISSED'
        || !noShowIsEligible(now.getTime(), session.scheduledStartAt.getTime())) throw new NoShowSuperseded();
      return settleMissedSession(tx, { masterGymId, actorIdentityId, session, receiptId: receipt.id, now });
    }));
    return !command.replayed;
  } catch (error) {
    if (error instanceof NoShowSuperseded) return false;
    throw error;
  }
}

export async function sweepOverdueSessions(tenant: PrismaClient, masterGymId: string) {
  const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const candidates = await tenant.pTSession.findMany({
    where: { state: 'SCHEDULED', startedAt: null, trainer: { status: 'ACTIVE' }, scheduledStartAt: { lte: new Date(clock!.now.getTime() - PT_NO_SHOW_GRACE_MS) } },
    select: { id: true }, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 25,
  });
  let missed = 0;
  let failed = 0;
  for (const { id } of candidates) {
    try {
      if (await markOverdueSessionMissed(tenant, masterGymId, id)) missed++;
    } catch { failed++; }
  }
  return { missed, failed };
}
