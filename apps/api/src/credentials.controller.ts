import { BadRequestException, Body, Controller, ForbiddenException, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { changePasswordInputSchema, credentialAcknowledgementInputSchema, credentialIssueInputSchema, credentialReissueInputSchema } from '@gymos/contracts/credentials';
import { identityFromAuthorization } from './auth-token.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { CredentialService } from './identity/credential.service.js';

@Controller('auth')
export class CredentialsController {
  constructor(private readonly credentials: CredentialService) {}

  @Post('change-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(@Req() request: Request, @Body() body: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const parsed = changePasswordInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Check the password requirements and confirmation');
    if (!identity.userId) throw new UnauthorizedException('Invalid token');
    return this.credentials.changePassword({
      identityId: identity.userId,
      authVersion: identity.authVersion,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  }

}

@Controller('gyms')
export class CredentialReissueController {
  constructor(private readonly credentials: CredentialService) {}

  @Post(':slug/enrollments/:operationId/credentials/issue')
  @UseGuards(GymAccessGuard)
  async issue(@Req() request: GymRequest, @Param('operationId') operationId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access required');
    const parsed = credentialIssueInputSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException('Credential issuance request must be empty');
    return this.credentials.issueTemporaryCredential({
      actorIdentityId: access.identityId,
      gymId: access.gymId,
      operationId,
    });
  }

  @Post(':slug/enrollments/:operationId/credentials/reissue')
  @UseGuards(GymAccessGuard)
  async reissue(@Req() request: GymRequest, @Param('operationId') operationId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access required');
    const parsed = credentialReissueInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Enter a valid credential reissue request');
    return this.credentials.reissueForOperation({
      actorIdentityId: access.identityId,
      gymId: access.gymId,
      operationId,
      ...parsed.data,
    });
  }

  @Post(':slug/enrollments/:operationId/credentials/acknowledge')
  @UseGuards(GymAccessGuard)
  async acknowledge(@Req() request: GymRequest, @Param('operationId') operationId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access required');
    const parsed = credentialAcknowledgementInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Enter a valid credential handoff acknowledgement');
    return this.credentials.acknowledgeTemporaryCredential({
      actorIdentityId: access.identityId,
      gymId: access.gymId,
      operationId,
      ...parsed.data,
    });
  }
}
