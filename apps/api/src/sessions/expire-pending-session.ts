import type { PrismaClient } from '../generated/tenant/client.js';
import { appendTenantNotification } from '../notifications.service.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { applySessionCommand } from './session-commands.js';
import { retrySessionTransaction } from './session-transactions.js';

export const PT_EXPIRY_SYSTEM_ACTOR = 'system:pt-expiry';

/** Commits the one allowed terminal transition for a due request; callers may race safely. */
export async function expirePendingSession(tenant: PrismaClient, masterGymId: string, sessionId: string) {
  return retrySessionTransaction(async () => new CommandReceiptFoundationService(tenant).execute({ masterGymId,
    actorIdentityId: PT_EXPIRY_SYSTEM_ACTOR, commandKind: 'EXPIRE_PT_REQUEST', idempotencyKey: `expiry:${sessionId}`,
    normalizedIntent: { gymId: masterGymId, sessionId, policy: 'REQUEST_EXPIRY_V1' } }, async (tx, receipt) => {
    const preflight = await tx.pTSession.findUnique({ where: { id: sessionId }, select: { memberId: true, trainerId: true, version: true } });
    if (!preflight) return { result: { resourceIds: [sessionId], requestOutcome: 'SKIPPED' }, resourceType: 'PT_SESSION', resourceId: sessionId,
      audits: [{ actorIdentityId: PT_EXPIRY_SYSTEM_ACTOR, eventCode: 'PT_SESSION_EXPIRY_SKIPPED', resourceType: 'PT_SESSION', resourceId: sessionId,
        transition: { from: 'PENDING_CONFIRMATION', to: 'MISSING' } }] };
    await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${preflight.memberId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${preflight.trainerId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${sessionId} FOR UPDATE`;
    const current = await tx.pTSession.findUnique({ where: { id: sessionId }, include: { member: { select: { identityId: true } }, trainer: { select: { identityId: true } } } });
    const [now] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    if (!current || current.state !== 'PENDING_CONFIRMATION' || !current.requestExpiresAt || current.requestExpiresAt > now!.now) {
      return { result: { resourceIds: [sessionId], requestOutcome: 'SKIPPED' }, resourceType: 'PT_SESSION', resourceId: sessionId,
        audits: [{ actorIdentityId: PT_EXPIRY_SYSTEM_ACTOR, eventCode: 'PT_SESSION_EXPIRY_SKIPPED', resourceType: 'PT_SESSION', resourceId: sessionId,
          transition: { from: 'PENDING_CONFIRMATION', to: current?.state ?? 'MISSING', version: current?.version ?? preflight.version } }] };
    }
    const updated = await applySessionCommand(tx, { masterGymId, sessionId, receiptId: receipt.id, actorIdentityId: PT_EXPIRY_SYSTEM_ACTOR,
      actorRole: 'SYSTEM', command: 'SYSTEM_EXPIRE_REQUEST', expectedVersion: current.version });
    if (!current.member.identityId || !current.trainer.identityId) throw new Error('Expiry notification recipient binding is unavailable');
    await appendTenantNotification(tx, { masterGymId, receiptId: receipt.id, eventCode: 'SESSION_EXPIRED', resourceId: current.id, recipientIdentityId: current.member.identityId });
    await appendTenantNotification(tx, { masterGymId, receiptId: receipt.id, eventCode: 'SESSION_EXPIRED', resourceId: current.id, recipientIdentityId: current.trainer.identityId, linkKind: 'TRAINER_REQUESTS' });
    return { result: { resourceIds: [current.id], requestOutcome: 'EXPIRED' }, resourceType: 'PT_SESSION', resourceId: current.id,
      audits: [{ actorIdentityId: PT_EXPIRY_SYSTEM_ACTOR, eventCode: 'PT_SESSION_EXPIRED', resourceType: 'PT_SESSION', resourceId: current.id,
        transition: { from: 'PENDING_CONFIRMATION', to: 'EXPIRED', version: updated.version } }] };
  }));
}
