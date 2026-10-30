import { Body, Controller, HttpCode, Param, Post, Req, UnprocessableEntityException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import { identityFromAuthorization } from '../auth-token.js';
import { ProvisioningOwnerService } from './provisioning-owner.service.js';
const consentInput = z.strictObject({ currentPassword: z.string().min(1).max(1024) });
@Controller('auth/provisioning')
export class ProvisioningOwnerController {
  constructor(private readonly owners: ProvisioningOwnerService) {}
  @Post(':id/owner-consent')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async consent(@Req() request: Request, @Param('id') id: string, @Body() body: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const input = consentInput.safeParse(body);
    if (!input.success) throw new UnprocessableEntityException('Enter your current password');
    return this.owners.consent(identity.userId, identity.authVersion, id, input.data.currentPassword);
  }
}
