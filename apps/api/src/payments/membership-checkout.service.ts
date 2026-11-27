import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { membershipCheckoutSchema, membershipCheckoutStatusSchema, type MembershipCheckoutInput } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import type { MemberPaymentKind, MemberPaymentOrder, Prisma } from '../generated/tenant/client.js';
import type { GymRequest } from '../gym-access.guard.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { issueMembershipPtAllowance } from '../membership-pt-allowance.js';
import { addLocalDays, asDate, dateString, gymLocalDate } from '../membership-rules.js';
import { requestDigest } from '../operations/primitives.js';
import { appendTenantAudit } from '../operations/transaction-audit.js';
import { decimalToMinorUnits } from '../sessions/session-state.js';
import { TenantSchemaGateService } from '../tenancy/tenant-schema-gate.service.js';
import { payHereSandboxCheckoutConfig } from './payhere-sandbox.js';
import { buildPayHereCheckout, type verifyPayHereNotification } from './payhere.js';

type PayHereNotification = NonNullable<ReturnType<typeof verifyPayHereNotification>>;
export type MemberCheckoutAccess = NonNullable<GymRequest['gymAccess']> & { actor: NonNullable<NonNullable<GymRequest['gymAccess']>['actor']> };
type CheckoutDetails = Omit<MembershipCheckoutInput, 'planId'>;
type CheckoutItem = { kind: 'MEMBERSHIP'; planId: string } | { kind: 'PT_PACK'; offerId: string };
const checkoutLifetimeMs = 30 * 60_000;

async function lockOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "MemberPaymentOrder" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
  return tx.memberPaymentOrder.findUniqueOrThrow({ where: { id: orderId } });
}

async function findCheckoutItem(tx: Prisma.TransactionClient, item: CheckoutItem) {
  if (item.kind === 'MEMBERSHIP') {
    await tx.$queryRaw`SELECT "id" FROM "MembershipPlan" WHERE "id" = ${item.planId} FOR SHARE`;
    const plan = await tx.membershipPlan.findUnique({ where: { id: item.planId } });
    if (!plan || plan.status !== 'ACTIVE') throw new NotFoundException('Membership plan not found');
    return { itemName: plan.name, price: plan.price, currency: plan.currency, durationDays: plan.durationDays, credits: plan.includedPtCredits };
  }
  await tx.$queryRaw`SELECT "id" FROM "PtPackOffer" WHERE "id" = ${item.offerId} FOR SHARE`;
  const offer = await tx.ptPackOffer.findUnique({ where: { id: item.offerId } });
  if (!offer || offer.status !== 'ACTIVE') throw new NotFoundException('PT pack offer not found');
  return { itemName: offer.name, price: offer.price, currency: offer.currency, durationDays: offer.validityDays, credits: offer.credits };
}

@Injectable()
export class MembershipCheckoutService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  async start(access: MemberCheckoutAccess, item: CheckoutItem, input: CheckoutDetails) {
    if (item.kind === 'PT_PACK' && process.env.GYMOS_STANDALONE_PT_PACKS_ENABLED !== '1') throw new ForbiddenException('PT credits are included with membership');
    const gateway = payHereSandboxCheckoutConfig(item.kind);
    const order = await this.tenantGate.withVerifiedTenant(access, tenant => withGymAccessFence(this.database.master, [{
      identityId: access.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: access.actor.id,
    }], () => tenant.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${access.actor.id} FOR UPDATE`;
      const member = await tx.member.findUnique({ where: { id: access.actor.id }, select: {
        status: true, registrationState: true, identityId: true, enrollmentOperationId: true,
      } });
      if (!member || member.status !== 'ACTIVE' || member.registrationState !== 'COMPLETE' || member.identityId !== access.identityId
        || member.enrollmentOperationId !== access.actor.registrationOperationId) {
        throw new ForbiddenException('Membership checkout is unavailable for this member');
      }
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const now = clock!.now;
      const prior = await tx.memberPaymentOrder.findUnique({ where: { identityId_idempotencyKey: {
        identityId: access.identityId, idempotencyKey: input.idempotencyKey,
      } } });
      if (prior) {
        const sameItem = prior.kind === item.kind && (item.kind === 'MEMBERSHIP' ? prior.planId === item.planId : prior.offerId === item.offerId);
        if (!sameItem || prior.memberId !== access.actor.id
          || prior.enrollmentOperationId !== access.actor.registrationOperationId || prior.merchantId !== gateway.merchantId
          || prior.status !== 'PENDING' || prior.expiresAt <= now) {
          throw new ConflictException('Start a new checkout for this purchase');
        }
        return prior;
      }
      const catalogue = await findCheckoutItem(tx, item);
      const configuration = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, currency: true, version: true } });
      if (!configuration?.timezone || catalogue.currency !== configuration.currency || !['LKR', 'USD'].includes(catalogue.currency)
        || catalogue.price.lte(0) || catalogue.price.decimalPlaces() > 2) {
        throw new UnprocessableEntityException('This item is unavailable for online checkout');
      }
      return tx.memberPaymentOrder.create({ data: {
        id: randomUUID(), identityId: access.identityId, memberId: access.actor.id, enrollmentOperationId: access.actor.registrationOperationId,
        idempotencyKey: input.idempotencyKey, kind: item.kind, ...(item.kind === 'MEMBERSHIP' ? { planId: item.planId } : { offerId: item.offerId }),
        itemName: catalogue.itemName, durationDays: catalogue.durationDays, credits: catalogue.credits,
        amount: catalogue.price, currency: catalogue.currency, configurationVersion: configuration.version,
        timeZone: configuration.timezone, merchantId: gateway.merchantId, expiresAt: new Date(now.getTime() + checkoutLifetimeMs),
      } });
    })));
    const gym = encodeURIComponent(access.slug);
    const paymentKind = order.kind === 'PT_PACK' ? '&paymentKind=PT_PACK' : '';
    const returnUrl = `${gateway.webOrigin}/gyms/${gym}/member/membership?paymentOrder=${order.id}${paymentKind}`;
    const notifyPath = order.kind === 'PT_PACK' ? 'pt-pack-notify' : 'membership-notify';
    const currency = order.currency as 'LKR' | 'USD'; // Constrained by the persisted checkout schema.
    return membershipCheckoutSchema.parse(buildPayHereCheckout(gateway, {
      orderId: order.id, amount: order.amount.toFixed(2), currency, items: order.itemName,
      returnUrl, cancelUrl: returnUrl, notifyUrl: `${gateway.apiOrigin}/gyms/${gym}/payments/payhere/${notifyPath}`,
      customer: { firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone,
        address: input.address, city: input.city, country: input.country },
    }));
  }

  async status(access: MemberCheckoutAccess, kind: MemberPaymentKind, orderId: string) {
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const order = await tenant.memberPaymentOrder.findFirst({
        where: { id: orderId, kind, memberId: access.actor.id, identityId: access.identityId,
          enrollmentOperationId: access.actor.registrationOperationId },
      });
      if (!order) throw new NotFoundException('Membership checkout not found');
      return membershipCheckoutStatusSchema.parse({ orderId, status: order.status, planName: order.itemName,
        amount: order.amount.toFixed(2), currency: order.currency });
    });
  }

  async acceptNotification(slug: string, kind: MemberPaymentKind, notification: PayHereNotification) {
    if (kind === 'PT_PACK' && process.env.GYMOS_STANDALONE_PT_PACKS_ENABLED !== '1') throw new ForbiddenException('PT credits are included with membership');
    const gym = await this.database.master.gym.findUnique({ where: { slug }, include: { expectedTenantOperation: true } });
    if (!gym) throw new NotFoundException('Membership checkout not found');
    return this.tenantGate.withVerifiedTenant({
      gymId: gym.id, databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
      expectedTenantManifestDigest: gym.expectedTenantManifestDigest, expectedTenantOperationId: gym.expectedTenantOperationId,
      expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null,
      observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
      observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null,
    }, async tenant => {
      const order = await tenant.memberPaymentOrder.findFirst({ where: { id: notification.orderId, kind } });
      if (!order) throw new NotFoundException('Checkout not found');
      if (order.merchantId !== notification.merchantId || order.amount.toFixed(2) !== notification.amount
        || order.currency !== notification.currency) {
        throw new UnprocessableEntityException('PayHere amount or currency does not match this checkout');
      }
      if (notification.statusCode !== '2') {
        await tenant.$transaction(async tx => {
          const current = await lockOrder(tx, order.id);
          if (notification.statusCode === '-3') {
            await tx.memberPaymentOrder.update({ where: { id: order.id }, data: { status: 'CHARGEBACK' } });
          } else if (current.status === 'PENDING' && (notification.statusCode === '-1' || notification.statusCode === '-2')) {
            await tx.memberPaymentOrder.update({ where: { id: order.id },
              data: { status: notification.statusCode === '-1' ? 'CANCELLED' : 'FAILED' } });
          }
        });
        return;
      }
      try {
        await withGymAccessFence(this.database.master, [{ identityId: order.identityId, gymId: gym.id, role: 'MEMBER',
          tenantActorId: order.memberId }], () => tenant.$transaction(tx => this.confirm(tx, order, gym.id, true)));
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
        // Money can be received after the gym/member loses access. Preserve
        // the verified payment for reconciliation without granting a term.
        await tenant.$transaction(tx => this.confirm(tx, order, gym.id, false));
      }
    });
  }

  private async confirm(tx: Prisma.TransactionClient, order: MemberPaymentOrder, gymId: string, activeAccess: boolean) {
    const current = await lockOrder(tx, order.id);
    if (current.confirmedAt || current.status === 'CHARGEBACK' || current.status === 'REVIEW_REQUIRED') return;
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const now = clock!.now;
    if (!activeAccess || order.expiresAt <= now) {
      await tx.memberPaymentOrder.update({ where: { id: order.id }, data: { status: 'REVIEW_REQUIRED' } });
      return;
    }
    await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${order.memberId} FOR UPDATE`;
    const member = await tx.member.findUniqueOrThrow({ where: { id: order.memberId } });
    if (member.status !== 'ACTIVE' || member.registrationState !== 'COMPLETE' || member.identityId !== order.identityId
      || member.enrollmentOperationId !== order.enrollmentOperationId) {
      await tx.memberPaymentOrder.update({ where: { id: order.id }, data: { status: 'REVIEW_REQUIRED' } });
      return;
    }
    const today = gymLocalDate(order.timeZone, now);
    if (order.kind === 'PT_PACK') {
      await this.fulfillPack(tx, order, gymId, today, now);
      return;
    }
    await this.fulfillMembership(tx, order, gymId, today, now, member.version + 1);
  }

  private async fulfillMembership(tx: Prisma.TransactionClient, order: MemberPaymentOrder, gymId: string, today: string, now: Date, memberVersion: number) {
    if (!order.planId) throw new Error('Membership order has no plan');
    const latest = await tx.membershipTerm.findFirst({
      where: { memberId: order.memberId, planId: order.planId },
      orderBy: { endDateExclusive: 'desc' }, select: { endDateExclusive: true },
    });
    const latestEnd = latest ? dateString(latest.endDateExclusive) : null;
    const start = latestEnd && latestEnd > today ? latestEnd : today;
    const end = addLocalDays(start, order.durationDays);
    const idempotencyKey = `payhere-membership:${order.id}`;
    const digest = requestDigest({ orderId: order.id, memberId: order.memberId, planId: order.planId,
      amount: order.amount.toFixed(2), currency: order.currency });
    const term = await tx.membershipTerm.create({ data: {
      memberId: order.memberId, planId: order.planId, startDate: asDate(start), endDateExclusive: asDate(end),
      agreedPrice: order.amount, currency: order.currency, planNameSnapshot: order.itemName,
      includedPtCredits: order.credits, configurationVersion: order.configurationVersion,
      actorIdentityId: order.identityId, idempotencyKey, requestDigest: digest,
    } });
    await tx.member.update({ where: { id: order.memberId }, data: { version: { increment: 1 } } });
    const receipt = await tx.commandReceipt.create({ data: {
      actorIdentityId: order.identityId, commandKind: 'CONFIRM_MEMBERSHIP_CHECKOUT', idempotencyKey, requestDigest: digest,
      state: 'COMMITTED', resourceType: 'MEMBERSHIP_TERM', resourceId: term.id,
      safeResult: { resourceIds: [term.id] }, committedAt: now,
    } });
    await appendTenantAudit(tx, { masterGymId: gymId, receiptId: receipt.id, actorIdentityId: order.identityId,
      eventCode: 'MEMBERSHIP_RENEWED', resourceType: 'MEMBERSHIP_TERM', resourceId: term.id, transition: { version: memberVersion } });
    const allowanceAudit = await issueMembershipPtAllowance(tx, term, receipt.id);
    if (allowanceAudit) await appendTenantAudit(tx, { ...allowanceAudit, masterGymId: gymId, receiptId: receipt.id });
    await tx.memberPaymentOrder.update({ where: { id: order.id }, data: { status: 'CONFIRMED', confirmedAt: now, termId: term.id } });
  }

  private async fulfillPack(tx: Prisma.TransactionClient, order: MemberPaymentOrder, gymId: string, today: string, now: Date) {
    const { id, memberId, identityId: actorIdentityId, currency, amount, credits, durationDays: validityDays, offerId } = order;
    const idempotencyKey = `payhere-pt-pack:${id}`;
    const digest = requestDigest({ orderId: id, memberId, offerId, amount: amount.toFixed(2), currency });
    const receiptId = randomUUID();
    const packId = randomUUID();
    const totalMinorUnits = decimalToMinorUnits(amount.toFixed(2));
    await tx.commandReceipt.create({ data: {
      id: receiptId, actorIdentityId, commandKind: 'CONFIRM_PT_PACK_CHECKOUT', idempotencyKey, requestDigest: digest,
      state: 'COMMITTED', resourceType: 'SESSION_PACK', resourceId: packId, safeResult: { resourceIds: [packId] }, committedAt: now,
    } });
    await tx.sessionPack.create({ data: {
      id: packId, memberId, issuedCredits: credits, price: amount, currency, validityDays,
      totalMinorUnits, creditBaseMinorUnits: totalMinorUnits / BigInt(credits), creditRemainder: Number(totalMinorUnits % BigInt(credits)),
      creditAllocationPolicyVersion: 'DEC-06-v1', startDate: asDate(today), endDateExclusive: asDate(addLocalDays(today, validityDays)),
      commandReceiptId: receiptId, actorIdentityId, idempotencyKey, requestDigest: digest,
    } });
    await tx.packCreditMovement.create({ data: { packId, kind: 'ISSUE', availableDelta: credits, heldDelta: 0, consumedDelta: 0,
      expiredDelta: 0, sourceKey: idempotencyKey, receiptId, actorIdentityId } });
    await appendTenantAudit(tx, { masterGymId: gymId, receiptId, actorIdentityId, eventCode: 'MEMBER_SESSION_PACK_ISSUED',
      resourceType: 'SESSION_PACK', resourceId: packId, transition: { to: 'ISSUED', version: 0 } });
    await tx.memberPaymentOrder.update({ where: { id }, data: { status: 'CONFIRMED', confirmedAt: now, packId } });
  }
}
