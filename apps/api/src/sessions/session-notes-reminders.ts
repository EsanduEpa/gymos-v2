import { ForbiddenException } from '@nestjs/common';
import type { PrismaClient as MasterClient } from '../generated/master/client.js';
import type { PrismaClient as TenantClient } from '../generated/tenant/client.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { appendTenantNotification } from '../notifications.service.js';

const eventCode = 'SESSION_NOTES_MISSING_24H';
const dayMs = 86_400_000;

/** Called by the scheduled worker only after verifying the gym and tenant binding. */
export async function sweepMissingSessionNotes(tenant: TenantClient, master: MasterClient, gymId: string, controlledNow?: Date) {
  const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const cutoff = new Date((controlledNow ?? clock!.now).getTime() - dayMs);
  const access = await master.gymAccess.findMany({
    where: { gymId, role: 'TRAINER', linkStatus: 'ACTIVE', actorKind: 'TRAINER', tenantActorId: { not: null } },
    select: { userId: true, tenantActorId: true },
  });
  if (!access.length) return { sent: 0, failed: 0 };

  const candidates = await tenant.$queryRaw<{ id: string; trainerId: string; identityId: string }[]>`
    SELECT s.id, s."trainerId", t."identityId"
    FROM "PTSession" s JOIN "Trainer" t ON t.id = s."trainerId"
    JOIN jsonb_to_recordset(${JSON.stringify(access)}::jsonb) AS a("userId" text, "tenantActorId" text)
      ON a."userId" = t."identityId" AND a."tenantActorId" = t.id
    WHERE s.state = 'COMPLETED' AND s."endedAt" <= ${cutoff} AND t.status = 'ACTIVE'
      AND COALESCE(s.notes, '') !~ '[^[:space:]]'
      AND NOT EXISTS (
        SELECT 1 FROM "Notification" n WHERE n."resourceId" = s.id AND n."eventCode" = ${eventCode}
      )
    ORDER BY s."endedAt", s.id
    LIMIT 25`;

  let sent = 0;
  let failed = 0;
  for (const session of candidates) {
    try {
      const added = await withGymAccessFence(master, [{
        gymId, identityId: session.identityId, role: 'TRAINER', tenantActorId: session.trainerId,
      }], () => tenant.$transaction(async tx => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT s.id FROM "PTSession" s JOIN "Trainer" t ON t.id = s."trainerId"
          WHERE s.id = ${session.id} AND s.state = 'COMPLETED' AND s."endedAt" <= ${cutoff}
            AND s."trainerId" = ${session.trainerId} AND t."identityId" = ${session.identityId}
            AND t.status = 'ACTIVE' AND COALESCE(s.notes, '') !~ '[^[:space:]]'
          FOR UPDATE OF s SKIP LOCKED`;
        if (!locked.length || await tx.notification.findFirst({ where: { eventCode, resourceId: session.id }, select: { id: true } })) return false;
        await appendTenantNotification(tx, {
          masterGymId: gymId, receiptId: 'missing-notes', eventCode, resourceId: session.id,
          recipientIdentityId: session.identityId,
        });
        return true;
      }));
      if (added) sent++;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) failed++;
    }
  }
  return { sent, failed };
}
