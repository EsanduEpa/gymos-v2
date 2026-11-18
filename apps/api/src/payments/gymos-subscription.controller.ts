import { Body, Controller, ForbiddenException, Get, Header, Headers, HttpCode, NotFoundException, Param, Post, Req,
  UnprocessableEntityException, UnsupportedMediaTypeException, UseGuards } from '@nestjs/common';
import { gymosSubscriptionCheckoutInputSchema, gymSlugSchema, membershipCheckoutOrderIdSchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { GymosSubscriptionService } from './gymos-subscription.service.js';
import { payHereSandboxMerchantConfig } from './payhere-sandbox.js';
import { verifyPayHereNotification } from './payhere.js';

function owner(request: GymRequest) {
  const access = request.gymAccess;
  if (access?.role !== 'OWNER') throw new ForbiddenException('Owner access is required for GymOS billing');
  return access;
}

@Controller('gyms/:slug/gymos-subscription')
@UseGuards(GymAccessGuard)
export class GymosSubscriptionController {
  constructor(private readonly subscriptions: GymosSubscriptionService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  status(@Req() request: GymRequest) {
    return this.subscriptions.status(owner(request));
  }

  @Post('checkout')
  @Header('Cache-Control', 'private, no-store')
  start(@Req() request: GymRequest, @Body() body: unknown) {
    const access = owner(request);
    const input = gymosSubscriptionCheckoutInputSchema.safeParse(body);
    if (!input.success) throw new UnprocessableEntityException('Choose a tier and enter valid billing details');
    return this.subscriptions.start(access, input.data);
  }

  @Post('stop')
  @HttpCode(204)
  stop(@Req() request: GymRequest) {
    return this.subscriptions.stop(owner(request));
  }
}

@Controller('gyms/:slug/payments/payhere')
export class PayHereSubscriptionNotificationController {
  constructor(private readonly subscriptions: GymosSubscriptionService) {}

  @Post('subscription-notify')
  @HttpCode(204)
  notify(@Param('slug') slug: string, @Headers('content-type') contentType: string | undefined, @Body() body: unknown) {
    if (contentType?.split(';')[0]?.trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
      throw new UnsupportedMediaTypeException('PayHere notifications use form encoding');
    }
    const notification = verifyPayHereNotification(payHereSandboxMerchantConfig(), body);
    if (!notification) throw new ForbiddenException('PayHere payment signature is invalid');
    if (!gymSlugSchema.safeParse(slug).success || !membershipCheckoutOrderIdSchema.safeParse(notification.orderId).success) {
      throw new NotFoundException('GymOS subscription order not found');
    }
    return this.subscriptions.acceptNotification(slug, notification);
  }
}
