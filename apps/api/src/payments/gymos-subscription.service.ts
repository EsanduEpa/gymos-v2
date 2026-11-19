import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { gymosSubscriptionCheckoutSchema, gymosSubscriptionStatusSchema, gymosSubscriptionTiers,
  type gymosSubscriptionCheckoutInputSchema } from '@gymos/contracts';
import type { z } from 'zod';
import { DatabaseService } from '../database.service.js';
import type { GymosSubscriptionOrder, Prisma } from '../generated/master/client.js';
import { buildPayHereCheckout, type verifyPayHereNotification } from './payhere.js';
import { PayHereSandboxMerchantClient } from './payhere-merchant.js';
import { payHereSandboxCheckoutConfig } from './payhere-sandbox.js';

type Owner = { gymId: string; slug: string; identityId: string };
type Checkout = z.output<typeof gymosSubscriptionCheckoutInputSchema>;
type Notification = NonNullable<ReturnType<typeof verifyPayHereNotification>>;
const gracePeriodMs = 7 * 86_400_000;

function nextMonth(value: Date) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const endOfMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, endOfMonth));
  return result;
}

async function requireCurrentOwner(tx: Prisma.TransactionClient, owner: Owner) {
  const [gym] = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Gym" WHERE id = ${owner.gymId} AND status = 'ACTIVE' FOR UPDATE`;
  if (!gym) throw new ForbiddenException('Gym subscription is unavailable');
  const [access] = await tx.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "GymAccess"
    WHERE "gymId" = ${owner.gymId} AND "userId" = ${owner.identityId} AND role = 'OWNER' AND "linkStatus" = 'ACTIVE'
    FOR SHARE`;
  if (!access) throw new ForbiddenException('Owner access is required');
}

async function databaseNow(tx: Prisma.TransactionClient) {
  const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return clock!.now;
}

@Injectable()
export class GymosSubscriptionService {
  private merchantClient?: PayHereSandboxMerchantClient;

  constructor(private readonly database: DatabaseService) {}

  async status(owner: Owner) {
    return this.database.master.$transaction(async tx => {
      const [now, current, paid] = await Promise.all([
        databaseNow(tx),
        tx.gymosSubscriptionOrder.findFirst({ where: { gymId: owner.gymId, stoppedAt: null } }),
        tx.gymosSubscriptionOrder.findFirst({
          where: { gymId: owner.gymId, paidThrough: { not: null } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      ]);
      const paidThrough = paid?.paidThrough ?? null;
      const graceEndsAt = paidThrough ? new Date(paidThrough.getTime() + gracePeriodMs) : null;
      const status = paidThrough && graceEndsAt
        ? now < paidThrough ? 'ACTIVE' : now < graceEndsAt ? 'GRACE' : 'PAST_DUE'
        : current ? 'PENDING' : 'NOT_STARTED';
      return gymosSubscriptionStatusSchema.parse({
        tier: paid?.tier ?? current?.tier ?? null,
        status,
        paidThrough: paidThrough?.toISOString() ?? null,
        graceEndsAt: graceEndsAt?.toISOString() ?? null,
        pendingTier: current && !current.providerSubscriptionId ? current.tier : null,
        canStart: !current || !current.providerSubscriptionId,
        canStop: Boolean(current?.providerSubscriptionId),
      });
    }, { isolationLevel: 'RepeatableRead' });
  }

  async start(owner: Owner, input: Checkout) {
    const gateway = payHereSandboxCheckoutConfig('SUBSCRIPTION');
    this.merchant();
    const tier = gymosSubscriptionTiers.find(candidate => candidate.id === input.tier)!;
    const order = await this.database.master.$transaction(async tx => {
      await requireCurrentOwner(tx, owner);
      const prior = await tx.gymosSubscriptionOrder.findUnique({
        where: { gymId_idempotencyKey: { gymId: owner.gymId, idempotencyKey: input.idempotencyKey } },
      });
      const current = prior ?? await tx.gymosSubscriptionOrder.findFirst({ where: { gymId: owner.gymId, stoppedAt: null } });
      if (current) {
        if (current.ownerIdentityId !== owner.identityId || current.tier !== tier.id || current.merchantId !== gateway.merchantId
          || current.stoppedAt || current.providerSubscriptionId) {
          throw new ConflictException('Resolve the current PayHere subscription before starting another');
        }
        return current;
      }
      return tx.gymosSubscriptionOrder.create({ data: {
        id: randomUUID(), gymId: owner.gymId, ownerIdentityId: owner.identityId, idempotencyKey: input.idempotencyKey,
        tier: tier.id, amount: tier.amount, merchantId: gateway.merchantId,
      } });
    });
    const path = `/gyms/${encodeURIComponent(owner.slug)}`;
    const redirect = `${gateway.webOrigin}${path}/owner/subscription`;
    const { firstName, lastName, email, phone, address, city, country } = input;
    return gymosSubscriptionCheckoutSchema.parse(buildPayHereCheckout(gateway, {
      orderId: order.id, amount: order.amount.toFixed(2), currency: 'LKR', items: `GymOS ${tier.name}`,
      returnUrl: redirect, cancelUrl: redirect, notifyUrl: `${gateway.apiOrigin}${path}/payments/payhere/subscription-notify`,
      customer: { firstName, lastName, email, phone, address, city, country },
      recurring: { recurrence: '1 Month', duration: 'Forever' },
    }));
  }

  async stop(owner: Owner) {
    const order = await this.database.master.$transaction(async tx => {
      await requireCurrentOwner(tx, owner);
      return tx.gymosSubscriptionOrder.findFirst({ where: { gymId: owner.gymId, stoppedAt: null } });
    });
    if (!order) return;
    if (!order.providerSubscriptionId) throw new ConflictException('Complete the pending PayHere authorization first');
    const merchant = this.merchant();
    await merchant.stopSubscription(order.providerSubscriptionId, order.id).catch(() => {
      throw new ServiceUnavailableException('PayHere Sandbox could not confirm the stop request');
    });
    await this.database.master.gymosSubscriptionOrder.updateMany({
      where: { id: order.id, stoppedAt: null }, data: { stoppedAt: new Date() },
    });
  }

  async acceptNotification(slug: string, notification: Notification) {
    const order = await this.database.master.gymosSubscriptionOrder.findFirst({
      where: { id: notification.orderId, gym: { slug } },
    });
    if (!order) throw new NotFoundException('GymOS subscription order not found');
    if (order.merchantId !== notification.merchantId || notification.currency !== 'LKR' || order.amount.toFixed(2) !== notification.amount) {
      throw new UnprocessableEntityException('PayHere amount or currency does not match this subscription');
    }
    const providerId = notification.references.subscriptionId ?? order.providerSubscriptionId;
    if (!providerId) {
      if (notification.statusCode !== '2') return;
      throw new UnprocessableEntityException('PayHere subscription reference is required');
    }
    if (order.providerSubscriptionId && order.providerSubscriptionId !== providerId) {
      throw new ConflictException('This order already has a verified PayHere subscription');
    }
    const merchant = this.merchant();
    const [subscription, payments] = await Promise.all([
      merchant.getSubscription(providerId, order.id), merchant.getSubscriptionPayments(providerId, order.id),
    ]).catch(() => {
      throw new ServiceUnavailableException('PayHere Sandbox could not verify subscription payments');
    });
    if (!subscription) throw new ServiceUnavailableException('PayHere Sandbox subscription is awaiting verification');
    if (subscription.currency !== 'LKR' || subscription.amount !== order.amount.toFixed(2)) {
      throw new UnprocessableEntityException('Verified subscription details do not match the GymOS order');
    }
    const paid = payments.filter(payment => payment.status === 'RECEIVED'
      && payment.amount === order.amount.toFixed(2) && payment.currency === 'LKR');
    if (notification.statusCode === '2' && (!notification.references.paymentId
      || !paid.some(payment => payment.paymentId === notification.references.paymentId))) {
      throw new ServiceUnavailableException('PayHere Sandbox payment is awaiting verification');
    }
    await this.applyVerifiedPayments(order, providerId, subscription.status !== 'ACTIVE', paid.map(payment => payment.paymentId));
  }

  private async applyVerifiedPayments(order: GymosSubscriptionOrder, subscriptionId: string, stopped: boolean, paymentIds: string[]) {
    await this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "GymosSubscriptionOrder" WHERE id = ${order.id}::uuid FOR UPDATE`;
      const current = await tx.gymosSubscriptionOrder.findUniqueOrThrow({ where: { id: order.id } });
      if (current.providerSubscriptionId && current.providerSubscriptionId !== subscriptionId) {
        throw new ConflictException('This order already has a verified PayHere subscription');
      }
      const now = await databaseNow(tx);
      const { count } = await tx.gymosSubscriptionPayment.createMany({
        data: paymentIds.map(paymentId => ({ paymentId, orderId: order.id })),
        skipDuplicates: true,
      });
      let paidThrough = current.paidThrough;
      for (let index = 0; index < count; index++) {
        const periodStart = paidThrough && paidThrough.getTime() + gracePeriodMs > now.getTime() ? paidThrough : now;
        paidThrough = nextMonth(periodStart);
      }
      await tx.gymosSubscriptionOrder.update({ where: { id: order.id }, data: {
        providerSubscriptionId: subscriptionId,
        paidThrough,
        stoppedAt: current.stoppedAt ?? (stopped ? now : null),
      } });
    });
  }

  private merchant() {
    if (!this.merchantClient) {
      const appId = process.env.GYMOS_PAYHERE_SANDBOX_APP_ID;
      const appSecret = process.env.GYMOS_PAYHERE_SANDBOX_APP_SECRET;
      if (!appId || !appSecret) throw new ServiceUnavailableException('PayHere Sandbox merchant API is not configured');
      this.merchantClient = new PayHereSandboxMerchantClient({ appId, appSecret });
    }
    return this.merchantClient;
  }
}
