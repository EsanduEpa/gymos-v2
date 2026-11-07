import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { auditQuerySchema, auditPageSchema, notificationListQuerySchema, notificationListSchema,
  ptScheduledWorkHealthSchema, notificationReadAllInputSchema, notificationReadAllSchema, notificationReadSchema } from '@gymos/contracts';
import type { Prisma } from './generated/tenant/client.js';
import { notificationHistoryQuerySchema, notificationHistorySchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';

const AVAILABLE_ACTION_TYPES = [
  'TRAINER_SHIFT_APPROVED', 'TRAINER_DEACTIVATED', 'TRAINER_REACTIVATED', 'MEMBER_STATUS_CHANGED', 'MEMBER_SESSION_PACK_ISSUED',
  'WORKOUT_PLAN_ASSIGNED', 'WORKOUT_PLAN_UPDATED', 'MEAL_PLAN_ASSIGNED', 'MEAL_PLAN_UPDATED',
  'PT_SESSION_BOOKED', 'PT_SESSION_REQUESTED', 'PT_SESSION_ACCEPTED', 'PT_SESSION_DECLINED', 'PT_SESSION_STARTED',
  'PT_SESSION_COMPLETED', 'PT_SESSION_MISSED', 'PT_SESSION_CANCELLED',
  'PT_SESSION_NOTES_UPDATED', 'PT_SESSION_RESCHEDULED', 'PT_SESSION_CORRECTED', 'PT_CREDIT_REMEDY_APPROVED', 'PT_SESSION_EXPIRED', 'PT_SESSION_EXPIRY_SKIPPED',
  'EXPENSE_CREATED', 'BUDGET_SET', 'PAY_PERIOD_CLOSED', 'PAY_PERIOD_APPROVED', 'CSV_EXPORTED',
] as const;

function invalid(message: string): never { throw new UnprocessableEntityException(message); }
function safeTransition(value: Prisma.JsonValue) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  const result: { from?: string; to?: string; version?: number } = {};
  if (typeof value.from === 'string' && value.from.length <= 80) result.from = value.from;
  if (typeof value.to === 'string' && value.to.length <= 80) result.to = value.to;
  if (typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version >= 0) result.version = value.version;
  return result;
}

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class NotificationsController {
  constructor(private readonly tenantGate: TenantSchemaGateService) {}

  @Get('me/notifications')
  async list(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER', 'MEMBER'].includes(access.role)) throw new ForbiddenException('Gym access is required');
    const parsed = notificationListQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid('Enter a valid notification limit');
    return this.tenantGate.withVerifiedTenant(access, async tenant => tenant.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const recipientIdentityId = access.identityId;
      const [items, unreadCount, clock] = await Promise.all([
        tx.notification.findMany({ where: { recipientIdentityId, supersededAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: parsed.data.limit,
          select: { id: true, eventCode: true, title: true, message: true, linkKind: true, resourceId: true, readAt: true, createdAt: true } }),
        tx.notification.count({ where: { recipientIdentityId, readAt: null, supersededAt: null } }),
        tx.$queryRaw<{ asOf: Date }[]>`SELECT clock_timestamp() AS "asOf"`,
      ]);
      return notificationListSchema.parse({ items: items.map(item => ({ ...item, readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() })),
        unreadCount, asOf: clock[0]!.asOf.toISOString() });
    }));
  }

  @Get('me/notification-history')
  async history(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER', 'MEMBER'].includes(access.role)) throw new ForbiddenException('Gym access is required');
    const parsed = notificationHistoryQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid('Enter valid notification page filters');
    const cursor = (() => {
      if (!parsed.data.cursor) return null;
      try {
        const value = JSON.parse(Buffer.from(parsed.data.cursor, 'base64url').toString('utf8')) as { asOf?: unknown; createdAt?: unknown; id?: unknown; filter?: unknown };
        if (typeof value.asOf !== 'string' || !Number.isFinite(Date.parse(value.asOf)) || typeof value.createdAt !== 'string'
          || !Number.isFinite(Date.parse(value.createdAt)) || typeof value.id !== 'string' || !/^[A-Za-z0-9_:-]{1,128}$/.test(value.id)
          || value.filter !== parsed.data.filter) invalid('Notification cursor is invalid');
        return { asOf: new Date(value.asOf), createdAt: new Date(value.createdAt), id: value.id };
      } catch { invalid('Notification cursor is invalid'); }
    })();
    return this.tenantGate.withVerifiedTenant(access, async tenant => tenant.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const [clock] = cursor ? [null] : await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const asOf = cursor?.asOf ?? clock!.now;
      const where = { recipientIdentityId: access.identityId, supersededAt: null, createdAt: { lte: asOf },
        ...(parsed.data.filter === 'UNREAD' ? { readAt: null } : {}),
        ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}) };
      const [rows, unreadCount] = await Promise.all([
        tx.notification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: parsed.data.pageSize + 1,
          select: { id: true, eventCode: true, title: true, message: true, linkKind: true, resourceId: true, readAt: true, createdAt: true } }),
        tx.notification.count({ where: { recipientIdentityId: access.identityId, readAt: null, supersededAt: null } }),
      ]);
      const hasMore = rows.length > parsed.data.pageSize;
      const items = rows.slice(0, parsed.data.pageSize);
      const last = items.at(-1);
      const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ asOf: asOf.toISOString(), createdAt: last.createdAt.toISOString(), id: last.id,
        filter: parsed.data.filter })).toString('base64url') : null;
      return notificationHistorySchema.parse({ items: items.map(item => ({ ...item, readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() })),
        unreadCount, asOf: asOf.toISOString(), filter: parsed.data.filter, pageSize: parsed.data.pageSize, nextCursor });
    }));
  }

  @Post('me/notifications/:notificationId/read')
  async markOne(@Req() request: GymRequest, @Param('notificationId') notificationId: string) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Gym access is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => tenant.$transaction(async tx => {
      const [clock] = await tx.$queryRaw<{ asOf: Date }[]>`SELECT clock_timestamp() AS "asOf"`;
      await tx.notification.updateMany({ where: { id: notificationId, recipientIdentityId: access.identityId, readAt: null, supersededAt: null }, data: { readAt: clock!.asOf } });
      const owned = await tx.notification.findFirst({ where: { id: notificationId, recipientIdentityId: access.identityId }, select: { id: true } });
      if (!owned) throw new NotFoundException('Notification not found');
      const unreadCount = await tx.notification.count({ where: { recipientIdentityId: access.identityId, readAt: null, supersededAt: null } });
      return notificationReadSchema.parse({ notificationId: owned.id, isRead: true, unreadCount, asOf: clock!.asOf.toISOString() });
    }));
  }

  @Post('me/notifications/read-all')
  async markAll(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Gym access is required');
    const parsed = notificationReadAllInputSchema.safeParse(body ?? {});
    if (!parsed.success) invalid('Enter a valid read-through instant');
    return this.tenantGate.withVerifiedTenant(access, async tenant => tenant.$transaction(async tx => {
      const [clock] = await tx.$queryRaw<{ asOf: Date }[]>`SELECT clock_timestamp() AS "asOf"`;
      const through = parsed.data.through ? new Date(parsed.data.through) : clock!.asOf;
      if (through > clock!.asOf) invalid('Read-through instant cannot be in the future');
      const changed = await tx.notification.updateMany({ where: { recipientIdentityId: access.identityId, readAt: null, supersededAt: null, createdAt: { lte: through } }, data: { readAt: clock!.asOf } });
      const unreadCount = await tx.notification.count({ where: { recipientIdentityId: access.identityId, readAt: null, supersededAt: null } });
      return notificationReadAllSchema.parse({ changedCount: changed.count, unreadCount, asOf: clock!.asOf.toISOString(), through: through.toISOString() });
    }));
  }

  @Get('sessions/scheduled-work-health')
  async scheduledWorkHealth(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Scheduled work health is owner-only');
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const [status, pending, retrying, oldest, expiredRequestsDue, oldestExpiry] = await Promise.all([
        tx.pTScheduledWorkStatus.findUnique({ where: { id: 'current' } }),
        tx.pTSessionReminder.count({ where: { status: 'PENDING', dueAt: { lte: clock!.now } } }),
        tx.pTSessionReminder.count({ where: { status: 'PENDING', attempts: { gt: 0 } } }),
        tx.pTSessionReminder.findFirst({ where: { status: 'PENDING', dueAt: { lte: clock!.now } }, orderBy: { dueAt: 'asc' }, select: { dueAt: true } }),
        tx.pTSession.count({ where: { state: 'PENDING_CONFIRMATION', requestExpiresAt: { lte: clock!.now } } }),
        tx.pTSession.findFirst({ where: { state: 'PENDING_CONFIRMATION', requestExpiresAt: { lte: clock!.now } }, orderBy: { requestExpiresAt: 'asc' }, select: { requestExpiresAt: true } }),
      ]);
      return ptScheduledWorkHealthSchema.parse({ enabled: process.env.PT_EXPIRY_RUNNER_ENABLED !== 'false' && process.env.NODE_ENV !== 'test',
        lastAttemptAt: status?.lastAttemptAt.toISOString() ?? null, lastSuccessAt: status?.lastSuccessAt?.toISOString() ?? null,
        totalFailures: status?.totalFailures ?? 0, lastError: status?.lastError ?? null, overdue: pending, retrying, expiredRequestsDue,
        expiryLagSeconds: oldestExpiry?.requestExpiresAt ? Math.max(0, Math.floor((clock!.now.getTime() - oldestExpiry.requestExpiresAt.getTime()) / 1000)) : 0,
        lagSeconds: oldest ? Math.max(0, Math.floor((clock!.now.getTime() - oldest.dueAt.getTime()) / 1000)) : 0, asOf: clock!.now.toISOString() });
    }));
  }

  @Get('audit')
  async audit(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Audit history is owner-only');
    const parsed = auditQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid('Enter valid audit filters and page details');
    const { page, pageSize, actionType } = parsed.data;
    const where: Prisma.AuditLogWhereInput = {
      eventCode: actionType ?? { in: [...AVAILABLE_ACTION_TYPES] },
    };
    return this.tenantGate.withVerifiedTenant(access, async tenant => tenant.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [totalCount, rows, clock] = await Promise.all([
        tx.auditLog.count({ where }),
        tx.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, eventCode: true, actorIdentityId: true, originalActorIdentityId: true, resourceType: true, resourceId: true, transition: true, createdAt: true } }),
        tx.$queryRaw<{ asOf: Date }[]>`SELECT clock_timestamp() AS "asOf"`,
      ]);
      return auditPageSchema.parse({ items: rows.map(row => ({ ...row, transition: safeTransition(row.transition), createdAt: row.createdAt.toISOString() })),
        page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize), availableActionTypes: AVAILABLE_ACTION_TYPES,
        asOf: clock[0]!.asOf.toISOString() });
    }));
  }
}
