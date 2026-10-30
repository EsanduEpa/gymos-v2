import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards, UnprocessableEntityException } from '@nestjs/common';
import { idempotencyKeySchema, operationRetrySchema, provisioningInputSchema } from '@gymos/contracts/platform';
import { DatabaseService } from './database.service.js';
import { SuperAdminGuard, type PlatformRequest } from './super-admin.guard.js';
import { ProvisioningReservationService } from './platform/provisioning-reservation.service.js';

@Controller('admin')
@UseGuards(SuperAdminGuard)
export class AdminController {
  constructor(private readonly reservations: ProvisioningReservationService, private readonly database: DatabaseService) {}
  @Get('gyms')
  gyms() {
    return this.database.master.gym.findMany({ select: { id: true, name: true, slug: true, status: true }, orderBy: { createdAt: 'desc' } });
  }
  @Post('gyms')
  @HttpCode(202)
  create(@Req() request: PlatformRequest, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const input = provisioningInputSchema.safeParse(body); const parsedKey = idempotencyKeySchema.safeParse(key);
    if (!input.success || !parsedKey.success) throw new UnprocessableEntityException('Enter valid gym, owner, currency, timezone and request key');
    const actor = request.platformIdentity!;
    return this.reservations.reserve(actor.identityId, actor.authVersion, parsedKey.data, input.data);
  }
  @Get('operations/:id')
  status(@Req() request: PlatformRequest, @Param('id') id: string) { return this.reservations.status(request.platformIdentity!.identityId, id); }
  @Post('operations/:id/retry')
  @HttpCode(202)
  retry(@Req() request: PlatformRequest, @Param('id') id: string, @Body() body: unknown) {
    const parsed = operationRetrySchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Provide the current operation version');
    return this.reservations.retry(request.platformIdentity!.identityId, id, parsed.data.expectedVersion);
  }
}
