import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, Res, UseGuards, UnprocessableEntityException } from '@nestjs/common';
import type { Response } from 'express';
import { idempotencyKeySchema, operationRetrySchema, provisioningInputSchema, registryQuerySchema } from '@gymos/contracts/platform';
import { credentialIssueInputSchema, credentialReissueInputSchema, credentialAcknowledgementInputSchema } from '@gymos/contracts/credentials';
import { CredentialService } from './identity/credential.service.js';
import { SuperAdminGuard, type PlatformRequest } from './super-admin.guard.js';
import { ProvisioningReservationService } from './platform/provisioning-reservation.service.js';
import { PlatformRegistryService } from './platform/platform-registry.service.js';

@Controller('admin')
@UseGuards(SuperAdminGuard)
export class AdminController {
  constructor(private readonly reservations: ProvisioningReservationService, private readonly credentials: CredentialService, private readonly registry: PlatformRegistryService) {}
  @Get('gyms')
  gyms(@Req() request: PlatformRequest, @Query() query: unknown) {
    const input = registryQuerySchema.safeParse(query);
    if (!input.success) throw new UnprocessableEntityException('Invalid registry page');
    return this.registry.page(request.platformIdentity!.identityId, input.data.cursor);
  }
  @Post('gyms')
  @HttpCode(202)
  async create(@Req() request: PlatformRequest, @Headers('idempotency-key') key: unknown, @Body() body: unknown, @Res({passthrough:true}) response: Response) {
    const input = provisioningInputSchema.safeParse(body); const parsedKey = idempotencyKeySchema.safeParse(key);
    if (!input.success || !parsedKey.success) throw new UnprocessableEntityException('Enter valid gym, owner, currency, timezone and request key');
    const actor = request.platformIdentity!;
    const result = await this.reservations.reserve(actor.identityId, actor.authVersion, parsedKey.data, input.data);
    response.status(result.state === 'COMPLETE' ? 200 : 202);
    return result;
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
  private async credentialContext(request: PlatformRequest, id: string) {
    const status = await this.reservations.status(request.platformIdentity!.identityId, id);
    return { actorIdentityId: request.platformIdentity!.identityId, operationId: id, gymId: status.gym.id };
  }
  @Post('operations/:id/credentials/issue')
  @HttpCode(200)
  async issue(@Req() request: PlatformRequest, @Param('id') id: string, @Body() body: unknown) {
    if (!credentialIssueInputSchema.safeParse(body ?? {}).success) throw new UnprocessableEntityException('Credential request must be empty');
    return this.credentials.issueTemporaryCredential(await this.credentialContext(request, id));
  }
  @Post('operations/:id/credentials/reissue')
  @HttpCode(200)
  async reissue(@Req() request: PlatformRequest, @Param('id') id: string, @Body() body: unknown) {
    const input = credentialReissueInputSchema.safeParse(body);
    if (!input.success) throw new UnprocessableEntityException('Provide a valid credential reissue request');
    return this.credentials.reissueForOperation({ ...await this.credentialContext(request, id), ...input.data });
  }
  @Post('operations/:id/credentials/acknowledge')
  @HttpCode(200)
  async acknowledge(@Req() request: PlatformRequest, @Param('id') id: string, @Body() body: unknown) {
    const input = credentialAcknowledgementInputSchema.safeParse(body);
    if (!input.success) throw new UnprocessableEntityException('Provide the current handoff version');
    return this.credentials.acknowledgeTemporaryCredential({ ...await this.credentialContext(request, id), ...input.data });
  }
}
