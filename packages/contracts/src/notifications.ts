import { z } from 'zod';
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const gymSlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoInstantSchema = z.iso.datetime({ offset: true });

export const notificationLinkKindSchema = z.enum(['OWNER_SESSIONS', 'TRAINER_SCHEDULE', 'MEMBER_SESSIONS', 'TRAINER_REQUESTS']);
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

const auditEventCodeSchema = z.enum([
  'TRAINER_SHIFT_APPROVED', 'TRAINER_DEACTIVATED', 'TRAINER_REACTIVATED', 'MEMBER_STATUS_CHANGED',
  'MEMBER_SESSION_PACK_ISSUED', 'PT_SESSION_BOOKED', 'PT_SESSION_REQUESTED', 'PT_SESSION_ACCEPTED',
  'PT_SESSION_DECLINED', 'PT_SESSION_STARTED', 'PT_SESSION_COMPLETED', 'PT_SESSION_MISSED', 'PT_SESSION_CANCELLED',
  'PT_SESSION_NOTES_UPDATED',
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
  if (item.linkKind === 'OWNER_SESSIONS') return `/gyms/${safeSlug}/owner/sessions`;
  if (item.linkKind === 'TRAINER_SCHEDULE') return `/gyms/${safeSlug}/trainer/schedule`;
  if (item.linkKind === 'TRAINER_REQUESTS') return `/gyms/${safeSlug}/trainer/requests`;
  return sessionId ? `/gyms/${safeSlug}/member/sessions?session=${sessionId}` : `/gyms/${safeSlug}/member/sessions`;
}

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;
