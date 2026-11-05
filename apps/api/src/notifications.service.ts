import { createHash } from 'node:crypto';
import type { Prisma as TenantPrisma } from './generated/tenant/client.js';
import { canonicalJson, OperationIntegrityError, reference } from './operations/primitives.js';

type NotificationEvent = 'HIRE_REQUEST' | 'SESSION_BOOKED' | 'SESSION_DECLINED' | 'SESSION_CANCELLED' | 'SESSION_MISSED' | 'SESSION_STARTED' | 'SESSION_COMPLETED' | 'SESSION_EXPIRED' | 'SESSION_RESCHEDULED' | 'SESSION_CORRECTED' | 'CREDIT_REMEDY_APPROVED' | 'CREDIT_REMEDY_REQUIRED';
type NotificationLink = 'OWNER_SESSIONS' | 'TRAINER_REQUESTS' | 'MEMBER_SESSIONS' | 'TRAINER_SCHEDULE';
const CONTENT: Readonly<Record<NotificationEvent, { title: string; message: string; linkKind: NotificationLink }>> = {
  HIRE_REQUEST: { title: 'New session request', message: 'A member requested a personal training session.', linkKind: 'TRAINER_REQUESTS' },
  SESSION_BOOKED: { title: 'Session confirmed', message: 'Your personal training session was confirmed.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_DECLINED: { title: 'Request declined', message: 'Your personal training session request was declined.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_CANCELLED: { title: 'Session cancelled', message: 'A personal training session was cancelled.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_MISSED: { title: 'Session marked missed', message: 'Your personal training session was marked as missed.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_STARTED: { title: 'Session started', message: 'Your personal training session has started.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_COMPLETED: { title: 'Session completed', message: 'Your personal training session is complete.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_RESCHEDULED: { title: 'PT session rescheduled', message: 'The personal training appointment has changed. Open its details for the replacement time.', linkKind: 'MEMBER_SESSIONS' },
  SESSION_CORRECTED: { title: 'PT outcome corrected', message: 'An owner corrected the training outcome. Open the booking for its current credit outcome.', linkKind: 'MEMBER_SESSIONS' },
  CREDIT_REMEDY_APPROVED: { title: 'PT credit restored', message: 'The owner approved a new expiry for the affected PT credit. Membership is still required when booking.', linkKind: 'MEMBER_SESSIONS' },
  CREDIT_REMEDY_REQUIRED: { title: 'PT credit needs owner review', message: 'The released credit has expired. Owner approval is needed before it can be used again.', linkKind: 'OWNER_SESSIONS' },
  SESSION_EXPIRED: { title: 'Session request expired', message: 'A personal training session request expired before confirmation.', linkKind: 'MEMBER_SESSIONS' },
};

export type AppendNotificationInput = {
  masterGymId: string;
  receiptId: string;
  eventCode: NotificationEvent;
  resourceId: string;
  recipientIdentityId: string;
  eventOrdinal?: number;
  linkKind?: NotificationLink;
};

export function notificationSourceEventKey(input: AppendNotificationInput): string {
  const event = CONTENT[input.eventCode];
  const linkKind = input.linkKind ?? event.linkKind;
  const canonical = canonicalJson([reference(input.masterGymId), reference(input.receiptId), input.eventCode,
    'PT_SESSION', reference(input.resourceId), input.eventOrdinal ?? 0, reference(input.recipientIdentityId), linkKind]);
  return `tn1:${createHash('sha256').update(canonical).digest('hex')}`;
}

/** Insert in the caller's business transaction; conflicting event content is an integrity failure. */
export async function appendTenantNotification(tx: TenantPrisma.TransactionClient, input: AppendNotificationInput) {
  const baseContent = CONTENT[input.eventCode];
  const content = { ...baseContent, linkKind: input.linkKind ?? baseContent.linkKind };
  const sourceEventKey = notificationSourceEventKey(input);
  const where = { recipientIdentityId_sourceEventKey: { recipientIdentityId: reference(input.recipientIdentityId), sourceEventKey } };
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${sourceEventKey}, 0))`;
  const existing = await tx.notification.findUnique({ where });
  if (existing) {
    if (existing.eventCode !== input.eventCode || existing.title !== content.title || existing.message !== content.message
      || existing.linkKind !== content.linkKind || existing.resourceId !== input.resourceId) {
      throw new OperationIntegrityError('Notification source key has different content');
    }
    return existing;
  }
  return tx.notification.create({ data: {
    recipientIdentityId: reference(input.recipientIdentityId), sourceEventKey, eventCode: input.eventCode,
    title: content.title, message: content.message, linkKind: content.linkKind, resourceId: reference(input.resourceId),
  } });
}
