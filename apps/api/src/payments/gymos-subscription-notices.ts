import type { Prisma as MasterPrisma } from '../generated/master/client.js';
import type { PrismaClient as TenantClient } from '../generated/tenant/client.js';
import { appendTenantNotification } from '../notifications.service.js';

/**
 * Called by the existing scheduled worker after verifying the tenant binding.
 * Period and recipient locks are held through the tenant notification commit.
 */
export async function sweepGymosSubscriptionNotice(tenant: TenantClient, master: MasterPrisma.TransactionClient, gymId: string) {
  const [gym] = await master.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Gym" WHERE id = ${gymId} AND status = 'ACTIVE' FOR SHARE`;
  if (!gym) return;
  const [period] = await master.$queryRaw<{ paidThrough: Date; now: Date }[]>`
    SELECT o."paidThrough", clock_timestamp() AS now
    FROM "GymosSubscriptionOrder" o
    WHERE o."gymId" = ${gymId} AND o."paidThrough" IS NOT NULL AND o."providerSubscriptionId" IS NOT NULL
      AND EXISTS (SELECT 1 FROM "GymosSubscriptionPayment" p WHERE p."orderId" = o.id)
    ORDER BY o."createdAt" DESC, o.id DESC
    LIMIT 1 FOR SHARE OF o`;
  if (!period || period.now < period.paidThrough) return;

  const owners = await master.$queryRaw<{ userId: string }[]>`
    SELECT ga."userId"
    FROM "GymAccess" ga
    WHERE ga."gymId" = ${gymId} AND ga.role = 'OWNER' AND ga."linkStatus" = 'ACTIVE'
      AND ga."actorKind" IS NULL AND ga."tenantActorId" IS NULL
    ORDER BY ga."userId" FOR SHARE OF ga`;
  if (!owners.length) return;

  await tenant.$transaction(async tx => {
    for (const owner of owners) {
      await appendTenantNotification(tx, {
        masterGymId: gymId,
        receiptId: `gymos-billing:${period.paidThrough.getTime()}`,
        eventCode: 'GYMOS_SUBSCRIPTION_PAYMENT_DUE',
        resourceId: gymId,
        recipientIdentityId: owner.userId,
      });
    }
  });
}
