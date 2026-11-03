import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma as TenantPrisma } from '../generated/tenant/client.js';
import { appendTenantAudit } from '../operations/transaction-audit.js';
import { tenantAuditKey } from '../operations/primitives.js';
import { transitionSession, type SessionActorRole, type SessionCommand } from './session-state.js';

const EVENT_FOR_COMMAND = {
  TRAINER_ACCEPT: 'PT_SESSION_ACCEPTED',
  TRAINER_DECLINE: 'PT_SESSION_DECLINED',
  MEMBER_WITHDRAW: 'PT_SESSION_CANCELLED',
  START: 'PT_SESSION_STARTED',
  COMPLETE: 'PT_SESSION_COMPLETED',
  NO_SHOW: 'PT_SESSION_MISSED',
  CANCEL: 'PT_SESSION_CANCELLED',
  LIFECYCLE_RELEASE: 'PT_SESSION_CANCELLED',
  UPDATE_NOTES: 'PT_SESSION_NOTES_UPDATED',
} as const;

const EVENT_FOR_CREATE = {
  OWNER_BOOK: 'PT_SESSION_BOOKED',
  MEMBER_REQUEST: 'PT_SESSION_REQUESTED',
} as const;

export async function recordInitialSession(tx: TenantPrisma.TransactionClient, input: {
  masterGymId: string; sessionId: string; receiptId: string; actorIdentityId: string;
  command: keyof typeof EVENT_FOR_CREATE;
}) {
  const session = await tx.pTSession.findUnique({ where: { id: input.sessionId } });
  if (!session || (input.command === 'OWNER_BOOK' && session.state !== 'SCHEDULED')
    || (input.command === 'MEMBER_REQUEST' && session.state !== 'PENDING_CONFIRMATION')) {
    throw new ConflictException('Session creation state does not match its command');
  }
  const eventCode = EVENT_FOR_CREATE[input.command];
  const eventKey = tenantAuditKey({ masterGymId: input.masterGymId, receiptId: input.receiptId,
    eventCode, resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: session.version });
  await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: null, toState: session.state, committedVersion: session.version,
    actorIdentityId: input.actorIdentityId, receiptId: input.receiptId, eventKey } });
  await appendTenantAudit(tx, { masterGymId: input.masterGymId, receiptId: input.receiptId, actorIdentityId: input.actorIdentityId,
    eventCode, resourceType: 'PT_SESSION', resourceId: session.id, transition: { to: session.state, version: session.version } });
  return session;
}

export async function applySessionCommand(tx: TenantPrisma.TransactionClient, input: {
  masterGymId: string; sessionId: string; receiptId: string; actorIdentityId: string;
  actorRole: SessionActorRole; actorTenantId?: string; command: Exclude<SessionCommand, 'OWNER_BOOK' | 'MEMBER_REQUEST'>;
  expectedVersion: number; notes?: string | null;
  confirmationSnapshot?: { rate: string; level: 'LEVEL_1' | 'LEVEL_2'; shiftStart: string | null; shiftEnd: string | null; fee: string; currency: string; configurationVersion: number };
}) {
  await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${input.sessionId} FOR UPDATE`;
  const session = await tx.pTSession.findUnique({ where: { id: input.sessionId }, include: { member: true, trainer: true } });
  if (!session) throw new ConflictException('Session is no longer available');
  if (session.version !== input.expectedVersion) throw new ConflictException('Session changed; refresh and try again');
  if (input.actorRole === 'TRAINER' && (!input.actorTenantId || input.actorTenantId !== session.trainerId
    || session.trainer.identityId !== input.actorIdentityId || session.trainer.status !== 'ACTIVE')) throw new ForbiddenException('Assigned trainer access is required');
  if (input.actorRole === 'MEMBER' && (!input.actorTenantId || input.actorTenantId !== session.memberId
    || session.member.identityId !== input.actorIdentityId || session.member.status !== 'ACTIVE')) throw new ForbiddenException('Member session access is required');
  const toState = transitionSession({ state: session.state, command: input.command, actorRole: input.actorRole });
  if (!toState) throw new ConflictException('This session command is not allowed in its current state');
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new UnprocessableEntityException('Enter the current session version');

  const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
  const now = clock!.now;
  const data: TenantPrisma.PTSessionUpdateInput = { state: toState, version: { increment: 1 } };
  if (input.command === 'TRAINER_ACCEPT') {
    const snapshot = input.confirmationSnapshot;
    if (!snapshot || !Number.isSafeInteger(snapshot.configurationVersion) || snapshot.configurationVersion < 0
      || !/^(?:0|[1-2])(?:\.\d{1,6})?$/.test(snapshot.rate) || Number(snapshot.rate) > 2
      || !/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/.test(snapshot.fee) || !/^(?:LKR|USD)$/.test(snapshot.currency)
      || (snapshot.shiftStart === null) !== (snapshot.shiftEnd === null)) throw new UnprocessableEntityException('Confirmation snapshot is incomplete');
    data.confirmedAt = now; data.confirmationRate = snapshot.rate; data.confirmationLevel = snapshot.level;
    data.confirmationShiftStart = snapshot.shiftStart; data.confirmationShiftEnd = snapshot.shiftEnd;
    data.fee = snapshot.fee; data.currency = snapshot.currency; data.configurationVersion = snapshot.configurationVersion;
  }
  if (input.command === 'START') data.startedAt = now;
  if (['COMPLETE', 'NO_SHOW', 'CANCEL', 'MEMBER_WITHDRAW', 'LIFECYCLE_RELEASE'].includes(input.command)) data.endedAt = now;
  if (input.command === 'UPDATE_NOTES') {
    if (typeof input.notes !== 'string' && input.notes !== null) throw new UnprocessableEntityException('Notes must be text or null');
    const normalized = (input.notes ?? '').replace(/\r\n?/g, '\n');
    if (Array.from(normalized).length > 4000) throw new UnprocessableEntityException('Notes must be at most 4,000 characters');
    data.notes = normalized;
  }
  const updated = await tx.pTSession.update({ where: { id: session.id, version: input.expectedVersion }, data });
  const eventCode = EVENT_FOR_COMMAND[input.command];
  const eventKey = tenantAuditKey({ masterGymId: input.masterGymId, receiptId: input.receiptId,
    eventCode, resourceType: 'PT_SESSION', resourceId: session.id, eventOrdinal: updated.version });
  await tx.sessionStateEvent.create({ data: { sessionId: session.id, fromState: session.state, toState: updated.state, committedVersion: updated.version,
    actorIdentityId: input.actorIdentityId, receiptId: input.receiptId, eventKey } });
  await appendTenantAudit(tx, { masterGymId: input.masterGymId, receiptId: input.receiptId, actorIdentityId: input.actorIdentityId,
    eventCode, resourceType: 'PT_SESSION', resourceId: session.id,
    transition: { from: session.state, to: updated.state, version: updated.version } });
  return updated;
}
