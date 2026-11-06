import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const gymSlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoInstantSchema = z.iso.datetime({ offset: true });

export const notificationLinkKindSchema = z.enum(['OWNER_SESSIONS', 'TRAINER_SCHEDULE', 'MEMBER_SESSIONS', 'TRAINER_REQUESTS', 'MEMBER_PROFILE', 'MEMBER_APPLICATIONS', 'OWNER_APPLICATIONS']);
export const notificationSchema = z.strictObject({
  id: idSchema,
  eventCode: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  message: z.string().max(500),
  linkKind: notificationLinkKindSchema,
  resourceId: idSchema.nullable(),
  readAt: isoInstantSchema.nullable(),
  createdAt: isoInstantSchema,
});
export const notificationListSchema = z.strictObject({
  items: z.array(notificationSchema).max(100),
  unreadCount: z.number().int().nonnegative(),
  asOf: isoInstantSchema,
});
export const notificationListQuerySchema = z.strictObject({
  limit: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1).max(100)).default(5),
});
export const notificationReadSchema = z.strictObject({
  notificationId: idSchema,
  isRead: z.literal(true),
  unreadCount: z.number().int().nonnegative(),
  asOf: isoInstantSchema,
});
export const notificationReadAllInputSchema = z.strictObject({ through: isoInstantSchema.optional() });
export const notificationReadAllSchema = z.strictObject({
  changedCount: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
  asOf: isoInstantSchema,
  through: isoInstantSchema.nullable(),
});

export const notificationFilterSchema = z.enum(['ALL', 'UNREAD']);
const cursorSchema = z.string().min(16).max(512).regex(/^[A-Za-z0-9_-]+$/);
export const notificationHistoryQuerySchema = z.strictObject({
  filter: notificationFilterSchema.default('ALL'),
  pageSize: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1).max(50)).default(20),
  cursor: cursorSchema.optional(),
});
export const notificationHistorySchema = z.strictObject({
  items: z.array(notificationSchema).max(50), unreadCount: z.number().int().nonnegative(), asOf: isoInstantSchema,
  filter: notificationFilterSchema, pageSize: z.number().int().min(1).max(50), nextCursor: cursorSchema.nullable(),
});

export const notificationTargetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('SESSION_DETAIL'), gymSlug: gymSlugSchema, sessionId: idSchema }),
  z.strictObject({ kind: z.literal('APPLICATION_STATUS'), applicationId: idSchema }),
  z.strictObject({ kind: z.literal('OWNER_APPLICATION_QUEUE'), gymSlug: gymSlugSchema, applicationId: idSchema }),
  z.strictObject({ kind: z.literal('ACCOUNT_PROFILE') }),
  z.strictObject({ kind: z.literal('ACCOUNT_SECURITY') }),
]);
export type NotificationTarget = z.infer<typeof notificationTargetSchema>;

export const accountNotificationKindSchema = z.enum(['APPLICATION', 'SECURITY']);
export const accountNotificationSchema = z.strictObject({
  id: idSchema, sourceId: idSchema, kind: accountNotificationKindSchema,
  eventCode: z.enum(['APPLICANT_SUBMITTED','APPLICANT_APPROVED','APPLICANT_REJECTED','APPLICANT_WITHDREW','OWNER_NEW_APPLICATION','OWNER_APPLICATION_WITHDREW','PASSWORD_CHANGED','PASSWORD_RECOVERED','SESSIONS_REVOKED']),
  title: z.string().min(1).max(120), message: z.string().max(300), target: notificationTargetSchema,
  readAt: isoInstantSchema.nullable(), createdAt: isoInstantSchema,
});
export const accountNotificationQuerySchema = notificationHistoryQuerySchema;
export const accountNotificationPageSchema = z.strictObject({
  items: z.array(accountNotificationSchema).max(50), unreadCount: z.number().int().nonnegative(), asOf: isoInstantSchema,
  filter: notificationFilterSchema, pageSize: z.number().int().min(1).max(50), nextCursor: cursorSchema.nullable(),
});
export const accountNotificationReadInputSchema = z.strictObject({ source: accountNotificationKindSchema, id: idSchema });
export const accountNotificationReadResultSchema = z.strictObject({ id: idSchema, readAt: isoInstantSchema, unreadCount: z.number().int().nonnegative() });
export const accountNotificationReadAllInputSchema = z.strictObject({ through: isoInstantSchema });
export const accountNotificationReadAllResultSchema = z.strictObject({ changedCount: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative(), through: isoInstantSchema, asOf: isoInstantSchema });

export function notificationTargetHref(target: NotificationTarget): string {
  switch (target.kind) {
    case 'SESSION_DETAIL': return `/gyms/${encodeURIComponent(target.gymSlug)}/sessions/${encodeURIComponent(target.sessionId)}`;
    case 'APPLICATION_STATUS': return `/applications#${encodeURIComponent(target.applicationId)}`;
    case 'OWNER_APPLICATION_QUEUE': return `/gyms/${encodeURIComponent(target.gymSlug)}/owner/applications#${encodeURIComponent(target.applicationId)}`;
    case 'ACCOUNT_PROFILE': return '/account/profile';
    case 'ACCOUNT_SECURITY': return '/security';
  }
}

export const auditEventCodeSchema = z.enum([
  'TRAINER_SHIFT_APPROVED', 'TRAINER_DEACTIVATED', 'TRAINER_REACTIVATED', 'MEMBER_STATUS_CHANGED',
  'MEMBER_SESSION_PACK_ISSUED', 'PT_SESSION_BOOKED', 'PT_SESSION_REQUESTED', 'PT_SESSION_ACCEPTED',
  'PT_SESSION_DECLINED', 'PT_SESSION_STARTED', 'PT_SESSION_COMPLETED', 'PT_SESSION_MISSED', 'PT_SESSION_CANCELLED',
  'PT_SESSION_NOTES_UPDATED', 'PT_SESSION_RESCHEDULED', 'PT_SESSION_CORRECTED', 'PT_CREDIT_REMEDY_APPROVED', 'PT_SESSION_EXPIRED', 'PT_SESSION_EXPIRY_SKIPPED', 'EXPENSE_CREATED', 'BUDGET_SET', 'PAY_PERIOD_CLOSED', 'PAY_PERIOD_APPROVED', 'CSV_EXPORTED',
]);
export const auditQuerySchema = z.strictObject({
  actionType: auditEventCodeSchema.optional(),
  page: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1)).default(1),
  pageSize: z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)]).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
});
export const auditRowSchema = z.strictObject({
  id: idSchema,
  eventCode: auditEventCodeSchema,
  actorIdentityId: idSchema,
  originalActorIdentityId: idSchema.nullable(),
  resourceType: z.string().min(1).max(80),
  resourceId: idSchema,
  transition: z.strictObject({ from: z.string().max(80).optional(), to: z.string().max(80).optional(), version: z.number().int().nonnegative().optional() }),
  createdAt: isoInstantSchema,
});
export const auditPageSchema = z.strictObject({
  items: z.array(auditRowSchema).max(100),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  availableActionTypes: z.array(auditEventCodeSchema),
  asOf: isoInstantSchema,
});

export function notificationHref(slug: string, item: Pick<z.infer<typeof notificationSchema>, 'linkKind' | 'resourceId'>): string {
  const safeSlug = gymSlugSchema.parse(slug);
  const sessionId = item.resourceId ? encodeURIComponent(idSchema.parse(item.resourceId)) : null;
  if (item.linkKind === 'MEMBER_APPLICATIONS') return item.resourceId ? notificationTargetHref({ kind: 'APPLICATION_STATUS', applicationId: idSchema.parse(item.resourceId) }) : '/applications';
  if (item.linkKind === 'OWNER_APPLICATIONS') return item.resourceId ? notificationTargetHref({ kind: 'OWNER_APPLICATION_QUEUE', gymSlug: safeSlug, applicationId: idSchema.parse(item.resourceId) }) : `/gyms/${safeSlug}/owner/applications`;
  if (item.linkKind === 'MEMBER_PROFILE') return `/gyms/${safeSlug}/profile`;
  if (sessionId) return notificationTargetHref({ kind: 'SESSION_DETAIL', gymSlug: safeSlug, sessionId: item.resourceId! });
  if (item.linkKind === 'OWNER_SESSIONS') return `/gyms/${safeSlug}/owner/sessions`;
  if (item.linkKind === 'TRAINER_SCHEDULE') return `/gyms/${safeSlug}/trainer/schedule`;
  if (item.linkKind === 'TRAINER_REQUESTS') return `/gyms/${safeSlug}/trainer/requests`;
  return `/gyms/${safeSlug}/member/sessions`;
}

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;

export const ptScheduledWorkHealthSchema = z.strictObject({
  enabled: z.boolean(), lastAttemptAt: isoInstantSchema.nullable(), lastSuccessAt: isoInstantSchema.nullable(),
  totalFailures: z.number().int().nonnegative(), lastError: z.string().max(160).nullable(),
  expiredRequestsDue: z.number().int().nonnegative(), expiryLagSeconds: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(), retrying: z.number().int().nonnegative(), lagSeconds: z.number().int().nonnegative(), asOf: isoInstantSchema,
});
