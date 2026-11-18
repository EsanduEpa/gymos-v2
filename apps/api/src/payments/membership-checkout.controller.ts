import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, NotFoundException, Param, Post, Req,
  UnprocessableEntityException, UnsupportedMediaTypeException, UseGuards } from '@nestjs/common';
import { gymSlugSchema, membershipCheckoutInputSchema, membershipCheckoutOrderIdSchema, ptPackCheckoutInputSchema } from '@gymos/contracts';
import type { MemberPaymentKind } from '../generated/tenant/client.js';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { MembershipCheckoutService } from './membership-checkout.service.js';
import { payHereSandboxMerchantConfig } from './payhere-sandbox.js';
import { verifyPayHereNotification } from './payhere.js';

function memberAccess(request: GymRequest) {
  const access = request.gymAccess;
  if (access?.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') {
    throw new ForbiddenException('Member access is required for membership checkout');
  }
  return { ...access, actor: access.actor };
}

@Controller('gyms/:slug/me')
@UseGuards(GymAccessGuard)
export class MembershipCheckoutController {
  constructor(private readonly checkouts: MembershipCheckoutService) {}

  @Post('membership-checkouts')
  start(@Req() request: GymRequest, @Body() body: unknown) {
    const access = memberAccess(request);
    const input = membershipCheckoutInputSchema.safeParse(body);
    if (!input.success) throw new UnprocessableEntityException('Enter the plan and checkout billing details');
    return this.checkouts.start(access, { kind: 'MEMBERSHIP', planId: input.data.planId }, input.data);
  }

  @Get('membership-checkouts/:orderId')
  status(@Req() request: GymRequest, @Param('orderId') orderId: string) {
    const access = memberAccess(request);
    if (!membershipCheckoutOrderIdSchema.safeParse(orderId).success) throw new NotFoundException('Membership checkout not found');
    return this.checkouts.status(access, 'MEMBERSHIP', orderId);
  }

  @Post('pt-pack-checkouts')
  startPtPack(@Req() request: GymRequest, @Body() body: unknown) {
    const access = memberAccess(request);
    const input = ptPackCheckoutInputSchema.safeParse(body);
    if (!input.success) throw new UnprocessableEntityException('Enter the PT pack and checkout billing details');
    return this.checkouts.start(access, { kind: 'PT_PACK', offerId: input.data.offerId }, input.data);
  }

  @Get('pt-pack-checkouts/:orderId')
  ptPackStatus(@Req() request: GymRequest, @Param('orderId') orderId: string) {
    const access = memberAccess(request);
    if (!membershipCheckoutOrderIdSchema.safeParse(orderId).success) throw new NotFoundException('PT pack checkout not found');
    return this.checkouts.status(access, 'PT_PACK', orderId);
  }
}

@Controller('gyms/:slug/payments/payhere')
export class PayHereMembershipNotificationController {
  constructor(private readonly checkouts: MembershipCheckoutService) {}

  @Post('membership-notify')
  @HttpCode(204)
  notify(@Param('slug') slug: string, @Headers('content-type') contentType: string | undefined, @Body() body: unknown) {
    return this.accept('MEMBERSHIP', slug, contentType, body);
  }

  @Post('pt-pack-notify')
  @HttpCode(204)
  notifyPtPack(@Param('slug') slug: string, @Headers('content-type') contentType: string | undefined, @Body() body: unknown) {
    return this.accept('PT_PACK', slug, contentType, body);
  }

  private async accept(kind: MemberPaymentKind, slug: string, contentType: string | undefined, body: unknown) {
    if (contentType?.split(';')[0]?.trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
      throw new UnsupportedMediaTypeException('PayHere notifications use form encoding');
    }
    const notification = verifyPayHereNotification(payHereSandboxMerchantConfig(), body);
    if (!notification) throw new ForbiddenException('PayHere payment signature is invalid');
    if (!gymSlugSchema.safeParse(slug).success || !membershipCheckoutOrderIdSchema.safeParse(notification.orderId).success) {
      throw new NotFoundException('Membership checkout not found');
    }
    await this.checkouts.acceptNotification(slug, kind, notification);
  }
}
