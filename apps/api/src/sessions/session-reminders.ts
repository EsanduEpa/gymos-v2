import { ForbiddenException } from '@nestjs/common';
import type { PrismaClient } from '../generated/tenant/client.js';
import type { PrismaClient as MasterClient } from '../generated/master/client.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { appendTenantNotification } from '../notifications.service.js';

/** The schedule revision is the booked start/end, never the editable session version. */
export function reminderDisposition(input: { state: string; kind: string; start: Date; now: Date; sameRevision: boolean }): 'SEND' | 'SKIPPED' | 'CANCELLED' {
  if (input.state !== 'SCHEDULED' || !input.sameRevision) return 'CANCELLED';
  if (input.now >= input.start || (input.kind === '24H' && input.now.getTime() >= input.start.getTime() - 3_600_000)) return 'SKIPPED';
  return 'SEND';
}

/** Internal controlled clock is for owned tests only; production always reads database time. */
export async function processSessionReminder(tenant: PrismaClient, master: MasterClient, gymId: string, id: string, controlledNow?: Date) {
  const binding = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } });
  if (binding?.masterGymId !== gymId) throw new Error('Reminder gym binding mismatch');
  const job = await tenant.pTSessionReminder.findUnique({ where: { id }, include: { session: { select: { memberId: true, trainerId: true } } } });
  if (!job || job.status !== 'PENDING') return 'UNCHANGED';
  try {
    return await withGymAccessFence(master, [{ identityId: job.recipientIdentityId, gymId,
      role: job.recipientRole === 'MEMBER' ? 'MEMBER' : 'TRAINER',
      tenantActorId: job.recipientRole === 'MEMBER' ? job.session.memberId : job.session.trainerId }], async () => tenant.$transaction(async tx => {
      // Same order as every state writer: session, then reminder. Skip a busy session until the next pass.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "PTSession" WHERE "id" = ${job.sessionId} FOR UPDATE SKIP LOCKED`;
      if (!locked.length) return 'BUSY';
      await tx.$queryRaw`SELECT "id" FROM "PTSessionReminder" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.pTSessionReminder.findUniqueOrThrow({ where: { id } });
      const session = await tx.pTSession.findUniqueOrThrow({ where: { id: job.sessionId }, include: { member: true, trainer: true } });
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const now = controlledNow ?? clock!.now;
      if (current.status !== 'PENDING' || current.dueAt > now || current.nextAttemptAt > now) return 'UNCHANGED';
      const participant = current.recipientRole === 'MEMBER' ? session.member : session.trainer;
      const validParticipant = participant.status === 'ACTIVE' && participant.identityId === current.recipientIdentityId
        && participant.id === (current.recipientRole === 'MEMBER' ? job.session.memberId : job.session.trainerId);
      const outcome = reminderDisposition({ state: session.state, kind: current.kind, start: session.scheduledStartAt, now,
        sameRevision: validParticipant && session.scheduledStartAt.getTime() === current.scheduledStartAt.getTime()
          && session.scheduledEndAt.getTime() === current.scheduledEndAt.getTime() });
      if (outcome !== 'SEND') {
        await tx.pTSessionReminder.update({ where: { id }, data: { status: outcome, finishedAt: now, lastError: outcome === 'SKIPPED' ? 'Reminder window passed' : 'Schedule or access changed' } });
        return outcome;
      }
      const notice = await appendTenantNotification(tx, { masterGymId: gymId, receiptId: `reminder:${id}`,
        eventCode: current.kind === '24H' ? 'SESSION_REMINDER_24H' : 'SESSION_REMINDER_1H', resourceId: session.id,
        recipientIdentityId: current.recipientIdentityId, linkKind: current.recipientRole === 'TRAINER' ? 'TRAINER_SCHEDULE' : 'MEMBER_SESSIONS' });
      await tx.pTSessionReminder.update({ where: { id }, data: { status: 'SENT', finishedAt: now, notificationId: notice.id, lastError: null } });
      return 'SENT';
    }));
  } catch (error) {
    const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const now = controlledNow ?? clock!.now;
    if (error instanceof ForbiddenException) {
      await tenant.pTSessionReminder.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED', finishedAt: now, lastError: 'Recipient access revoked' } });
      return 'CANCELLED';
    }
    // The failed business transaction rolled back the notification and SENT marker together.
    await tenant.pTSessionReminder.updateMany({ where: { id, status: 'PENDING' }, data: { attempts: { increment: 1 },
      nextAttemptAt: new Date(now.getTime() + Math.min(900_000, 30_000 * 2 ** Math.min(job.attempts, 5))), lastError: 'Reminder delivery failed; retry scheduled' } });
    return 'FAILED';
  }
}

export async function sweepSessionReminders(tenant: PrismaClient, master: MasterClient, gymId: string, controlledNow?: Date) {
  const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const now = controlledNow ?? clock!.now;
  const jobs = await tenant.pTSessionReminder.findMany({ where: { status: 'PENDING', dueAt: { lte: now }, nextAttemptAt: { lte: now } },
    orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 100, select: { id: true } });
  let sent = 0; let failed = 0;
  for (const job of jobs) {
    const outcome = await processSessionReminder(tenant, master, gymId, job.id, controlledNow);
    if (outcome === 'SENT') sent++;
    if (outcome === 'FAILED') failed++;
  }
  await tenant.pTScheduledWorkStatus.upsert({ where: { id: 'current' }, create: { id: 'current', lastAttemptAt: now,
    lastSuccessAt: failed ? null : now, totalFailures: failed, lastError: failed ? 'Reminder jobs awaiting retry' : null },
    update: { lastAttemptAt: now, ...(failed ? {} : { lastSuccessAt: now }), totalFailures: { increment: failed }, lastError: failed ? 'Reminder jobs awaiting retry' : null } });
  return { sent, failed };
}
