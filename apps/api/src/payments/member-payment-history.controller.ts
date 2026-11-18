import { Controller, ForbiddenException, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { memberPaymentHistorySchema, memberPaymentReceiptSchema, membershipCheckoutOrderIdSchema, ownerPaymentHistorySchema } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import type { MemberPaymentOrder } from '../generated/tenant/client.js';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { TenantSchemaGateService } from '../tenancy/tenant-schema-gate.service.js';

function accessFor(request: GymRequest, role: 'OWNER' | 'MEMBER') {
  const access = request.gymAccess;
  if (access?.role !== role || (role === 'MEMBER' && access.actor?.kind !== 'MEMBER')) {
    throw new ForbiddenException('Payment history access denied');
  }
  return access;
}

function scope(access: NonNullable<GymRequest['gymAccess']>) {
  return access.actor ? { memberId: access.actor.id, identityId: access.identityId, enrollmentOperationId: access.actor.registrationOperationId } : {};
}

function summary(order: MemberPaymentOrder) {
  return { orderId: order.id, status: order.status, kind: order.kind, itemName: order.itemName, amount: order.amount.toFixed(2),
    currency: order.currency, createdAt: order.createdAt.toISOString(), confirmedAt: order.confirmedAt?.toISOString() ?? null };
}

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class MemberPaymentHistoryController {
  constructor(private readonly db: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  @Get('me/payments')
  async memberHistory(@Req() request: GymRequest) {
    const access = accessFor(request, 'MEMBER');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const rows = await tenant.memberPaymentOrder.findMany({ where: scope(access), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 });
      return memberPaymentHistorySchema.parse({ items: rows.map(summary) });
    });
  }

  @Get('payments')
  async ownerHistory(@Req() request: GymRequest) {
    const access = accessFor(request, 'OWNER');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const rows = await tenant.memberPaymentOrder.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
        include: { member: { select: { fullName: true } } } });
      return ownerPaymentHistorySchema.parse({ items: rows.map(row => ({ ...summary(row), memberId: row.memberId, memberName: row.member.fullName })) });
    });
  }

  @Get('me/payments/:orderId/receipt')
  memberReceipt(@Req() request: GymRequest, @Param('orderId') orderId: string) {
    return this.receipt(accessFor(request, 'MEMBER'), orderId);
  }

  @Get('payments/:orderId/receipt')
  ownerReceipt(@Req() request: GymRequest, @Param('orderId') orderId: string) {
    return this.receipt(accessFor(request, 'OWNER'), orderId);
  }

  private async receipt(access: NonNullable<GymRequest['gymAccess']>, id: string) {
    if (!membershipCheckoutOrderIdSchema.safeParse(id).success) throw new NotFoundException('Receipt not found');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const order = await tenant.memberPaymentOrder.findFirst({
        where: { id, ...scope(access), confirmedAt: { not: null } }, include: { member: { select: { fullName: true } } },
      });
      if (!order) throw new NotFoundException('Receipt not found');
      const gym = await this.db.master.gym.findUniqueOrThrow({ where: { id: access.gymId }, select: { name: true } });
      return memberPaymentReceiptSchema.parse({ ...summary(order), gymName: gym.name,
        memberName: order.member.fullName, provider: 'PAYHERE_SANDBOX' });
    });
  }
}
