import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from './generated/master/client.js';
import { z } from 'zod';
import { accountNotificationPageSchema, accountNotificationReadAllInputSchema, accountNotificationReadAllResultSchema,
  accountNotificationReadInputSchema, accountNotificationReadResultSchema, accountNotificationQuerySchema } from '@gymos/contracts';
import { identityFromAuthorization } from './auth-token.js';
import { DatabaseService } from './database.service.js';

const cursorDataSchema = z.strictObject({ asOf: z.iso.datetime({ offset: true }), createdAt: z.iso.datetime({ offset: true }),
  kind: z.enum(['APPLICATION', 'SECURITY']), id: z.string().min(1).max(128), filter: z.enum(['ALL', 'UNREAD']) });
type CursorData = z.infer<typeof cursorDataSchema>;
type AccountRow = { id: string; kind: 'APPLICATION'|'SECURITY'; event_code: string; title: string; message: string; target_kind: string;
  gym_slug: string|null; application_id: string|null; read_at: Date|null; created_at: Date };

function invalid(): never { throw new UnprocessableEntityException('Enter valid notification paging or read details'); }
function decodeCursor(value?: string): CursorData|undefined {
  if (!value) return undefined;
  try { const decoded = cursorDataSchema.safeParse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))); if (decoded.success) return decoded.data; }
  catch { /* Return the same bounded validation response for malformed opaque cursors. */ }
  invalid();
}
function encodeCursor(value: CursorData) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

function sourceRows(identityId: string, asOf: Date, gymId?: string, gymAccountId?: string) {
  return Prisma.sql`
    SELECT n."id", 'APPLICATION'::text AS kind, n."event"::text AS event_code,
      CASE n."event" WHEN 'APPLICANT_SUBMITTED' THEN 'Application received' WHEN 'APPLICANT_APPROVED' THEN 'Enrollment approved'
        WHEN 'APPLICANT_REJECTED' THEN 'Application update' WHEN 'APPLICANT_WITHDREW' THEN 'Application withdrawn'
        WHEN 'OWNER_NEW_APPLICATION' THEN 'New member application' ELSE 'Application withdrawn' END AS title,
      CASE n."event" WHEN 'APPLICANT_SUBMITTED' THEN 'Your application is waiting for the gym owner to review.'
        WHEN 'APPLICANT_APPROVED' THEN 'Your membership enrollment is complete. Gym access is available.'
        WHEN 'APPLICANT_REJECTED' THEN 'The gym owner has updated your application. Review its status for details.'
        WHEN 'APPLICANT_WITHDREW' THEN 'Your application has been withdrawn.'
        WHEN 'OWNER_NEW_APPLICATION' THEN 'A prospective member has applied to join your gym.'
        ELSE 'An applicant withdrew their request to join your gym.' END AS message,
      CASE WHEN n."event"::text LIKE 'OWNER_%' THEN 'OWNER_APPLICATION_QUEUE' ELSE 'APPLICATION_STATUS' END AS target_kind,
      g."slug" AS gym_slug, n."applicationId" AS application_id, n."readAt" AS read_at, n."createdAt" AS created_at
    FROM "MemberApplicationNotice" n JOIN "Gym" g ON g."id" = n."gymId"
    WHERE n."recipientId" = ${identityId} AND n."createdAt" <= ${asOf} AND (${gymId ?? null}::text IS NULL OR n."gymId" = ${gymId ?? null})
      AND (n."event"::text NOT LIKE 'OWNER_%' OR EXISTS (
        SELECT 1 FROM "GymAccess" ga JOIN "Gym" active_gym ON active_gym."id" = ga."gymId"
        WHERE ga."userId" = n."recipientId" AND ga."gymId" = n."gymId" AND ga."role" = 'OWNER' AND ga."linkStatus" = 'ACTIVE' AND active_gym."status" = 'ACTIVE'))
    UNION ALL
    SELECT e."id", 'SECURITY'::text AS kind, e."event"::text AS event_code,
      CASE e."event" WHEN 'PASSWORD_CHANGED' THEN 'Password changed' WHEN 'PASSWORD_RECOVERED' THEN 'Password recovered' ELSE 'Sessions signed out' END AS title,
      CASE e."event" WHEN 'PASSWORD_CHANGED' THEN 'Your GymOS account password was changed.'
        WHEN 'PASSWORD_RECOVERED' THEN 'Your account password was reset through the recovery process.'
        ELSE 'One or more active sessions were signed out.' END AS message,
      'ACCOUNT_SECURITY'::text AS target_kind, NULL::text AS gym_slug, NULL::text AS application_id, r."readAt" AS read_at, e."createdAt" AS created_at
    FROM "IdentitySecurityEvent" e LEFT JOIN "IdentitySecurityEventRead" r ON r."securityEventId" = e."id" AND r."identityId" = e."identityId"
    WHERE e."identityId" = ${identityId} AND e."createdAt" <= ${asOf}
      AND e."gymAccountId" IS NOT DISTINCT FROM ${gymAccountId ?? null}`;
}

async function unreadCount(tx: Prisma.TransactionClient, identityId: string, gymId?: string, gymAccountId?: string) {
  const [row] = await tx.$queryRaw<{ count: bigint }[]>(Prisma.sql`WITH source AS (${sourceRows(identityId, new Date('9999-12-31T23:59:59.999Z'), gymId, gymAccountId)}) SELECT count(*) AS count FROM source WHERE read_at IS NULL`);
  return Number(row?.count ?? 0n);
}

@Controller('auth/notifications')
export class AccountNotificationsController {
  constructor(private readonly database: DatabaseService) {}

  private async scopeGymId(identityId: string, accountId?: string) {
    if (!accountId) return undefined;
    const account = await this.database.master.gymAccount.findUnique({ where: { id: accountId }, select: { userId: true, gymId: true, status: true } });
    if (!account || account.userId !== identityId || account.status !== 'ACTIVE') throw new NotFoundException('Account notifications unavailable');
    return account.gymId;
  }

  @Get()
  async list(@Req() request: Request, @Query() query: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const gymId = await this.scopeGymId(identity.userId, identity.gymAccountId);
    const parsed = accountNotificationQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid();
    const cursor = decodeCursor(parsed.data.cursor);
    if (cursor && cursor.filter !== parsed.data.filter) invalid();
    return this.database.master.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const clock = cursor ? null : (await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`)[0]!.now;
      const asOf = cursor ? new Date(cursor.asOf) : clock!;
      const source = sourceRows(identity.userId, asOf, gymId, identity.gymAccountId);
      const rows = await tx.$queryRaw<AccountRow[]>(Prisma.sql`WITH source AS (${source}) SELECT * FROM source
          WHERE (${parsed.data.filter} = 'ALL' OR read_at IS NULL)
            AND (${cursor ? true : false} = false OR (created_at, kind, id) < (${cursor?.createdAt ?? null}::timestamptz, ${cursor?.kind ?? null}::text, ${cursor?.id ?? null}::text))
          ORDER BY created_at DESC, kind DESC, id DESC LIMIT ${parsed.data.pageSize + 1}`);
      const unread = await unreadCount(tx, identity.userId, gymId, identity.gymAccountId);
      const hasMore = rows.length > parsed.data.pageSize;
      const page = rows.slice(0, parsed.data.pageSize).map(row => ({ id: `${row.kind}:${row.id}`, sourceId: row.id, kind: row.kind, eventCode: row.event_code,
        title: row.title, message: row.message, target: row.target_kind === 'ACCOUNT_SECURITY' ? { kind: 'ACCOUNT_SECURITY' as const }
          : row.target_kind === 'OWNER_APPLICATION_QUEUE' ? { kind: 'OWNER_APPLICATION_QUEUE' as const, gymSlug: row.gym_slug!, applicationId: row.application_id! }
          : { kind: 'APPLICATION_STATUS' as const, applicationId: row.application_id! },
        readAt: row.read_at?.toISOString() ?? null, createdAt: row.created_at.toISOString() }));
      const last = rows[Math.min(rows.length, parsed.data.pageSize) - 1];
      const nextCursor = hasMore && last ? encodeCursor({ asOf: asOf.toISOString(), createdAt: last.created_at.toISOString(), kind: last.kind,
        id: last.id, filter: parsed.data.filter }) : null;
      return accountNotificationPageSchema.parse({ items: page, unreadCount: unread,
        asOf: asOf.toISOString(), filter: parsed.data.filter, pageSize: parsed.data.pageSize, nextCursor });
    });
  }

  @Post(':source/:id/read')
  async markOne(@Req() request: Request, @Param('source') source: string, @Param('id') id: string) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const gymId = await this.scopeGymId(identity.userId, identity.gymAccountId);
    const parsed = accountNotificationReadInputSchema.safeParse({ source, id });
    if (!parsed.success) invalid();
    return this.database.master.$transaction(async tx => {
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      let readAt: Date|undefined;
      if (parsed.data.source === 'APPLICATION') {
        const existing = await tx.memberApplicationNotice.findFirst({ where: { id: parsed.data.id, recipientId: identity.userId, ...(gymId ? { gymId } : {}) },
          select: { id: true, event: true, gymId: true, readAt: true } });
        if (!existing || (existing.event.startsWith('OWNER_') && !await tx.gymAccess.findFirst({ where: { userId: identity.userId, gymId: existing.gymId, role: 'OWNER', linkStatus: 'ACTIVE', gym: { status: 'ACTIVE' } }, select: { userId: true } }))) {
          throw new NotFoundException('Notification not found');
        }
        if (existing.readAt) readAt = existing.readAt;
        else {
          await tx.memberApplicationNotice.updateMany({ where: { id: existing.id, recipientId: identity.userId, readAt: null }, data: { readAt: clock!.now } });
          readAt = clock!.now;
        }
      } else {
        const event = await tx.identitySecurityEvent.findFirst({ where: { id: parsed.data.id, identityId: identity.userId,
          gymAccountId: identity.gymAccountId ?? null }, select: { id: true } });
        if (!event) throw new NotFoundException('Notification not found');
        await tx.identitySecurityEventRead.createMany({ data: [{ securityEventId: event.id, identityId: identity.userId, readAt: clock!.now }], skipDuplicates: true });
        readAt = (await tx.identitySecurityEventRead.findUniqueOrThrow({ where: { securityEventId: event.id }, select: { readAt: true } })).readAt;
      }
      return accountNotificationReadResultSchema.parse({ id: `${parsed.data.source}:${parsed.data.id}`, readAt: readAt!.toISOString(), unreadCount: await unreadCount(tx, identity.userId, gymId, identity.gymAccountId) });
    });
  }

  @Post('read-all')
  async markAll(@Req() request: Request, @Body() body: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const gymId = await this.scopeGymId(identity.userId, identity.gymAccountId);
    const parsed = accountNotificationReadAllInputSchema.safeParse(body);
    if (!parsed.success) invalid();
    return this.database.master.$transaction(async tx => {
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const through = new Date(parsed.data.through);
      if (through > clock!.now) invalid();
      const applicationChanged = await tx.$executeRaw`UPDATE "MemberApplicationNotice" n SET "readAt" = ${clock!.now}
        WHERE n."recipientId" = ${identity.userId} AND n."readAt" IS NULL AND n."createdAt" <= ${through}
          AND (${gymId ?? null}::text IS NULL OR n."gymId" = ${gymId ?? null})
          AND (n."event"::text NOT LIKE 'OWNER_%' OR EXISTS (SELECT 1 FROM "GymAccess" ga JOIN "Gym" g ON g."id" = ga."gymId"
            WHERE ga."userId" = n."recipientId" AND ga."gymId" = n."gymId" AND ga."role" = 'OWNER' AND ga."linkStatus" = 'ACTIVE' AND g."status" = 'ACTIVE'))`;
      const securityRows = await tx.$queryRaw<{ securityEventId: string }[]>(Prisma.sql`INSERT INTO "IdentitySecurityEventRead" ("id", "securityEventId", "identityId", "readAt")
        SELECT 'security_read_' || gen_random_uuid()::text, e."id", ${identity.userId}, ${clock!.now}
        FROM "IdentitySecurityEvent" e LEFT JOIN "IdentitySecurityEventRead" r ON r."securityEventId" = e."id"
        WHERE e."identityId" = ${identity.userId} AND e."createdAt" <= ${through}
          AND e."gymAccountId" IS NOT DISTINCT FROM ${identity.gymAccountId ?? null} AND r."securityEventId" IS NULL
        ON CONFLICT ("securityEventId") DO NOTHING RETURNING "securityEventId"`);
      return accountNotificationReadAllResultSchema.parse({ changedCount: applicationChanged + securityRows.length,
        unreadCount: await unreadCount(tx, identity.userId, gymId, identity.gymAccountId), through: through.toISOString(), asOf: clock!.now.toISOString() });
    });
  }
}
