import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { changePasswordInputSchema, credentialAcknowledgementInputSchema, credentialIssueInputSchema, credentialReissueInputSchema,
  recoveryCandidateListSchema, recoveryCompleteInputSchema, recoveryCompleteResultSchema, recoveryIssueInputSchema, recoveryIssueResultSchema,
  identitySecurityEventListSchema } from '@gymos/contracts/credentials';
import { operatorRecoveryIssueInputSchema } from '@gymos/contracts/credentials';
import { identityFromAuthorization } from './auth-token.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { CredentialService } from './identity/credential.service.js';
import { SuperAdminGuard, type PlatformRequest } from './super-admin.guard.js';

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

  @Get('security-events')
  async securityEvents(@Req() request: Request) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    return identitySecurityEventListSchema.parse(await this.credentials.securityEvents(identity.userId));
  }

  @Post('recovery/complete')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async completeRecovery(@Body() body: unknown) {
    const parsed = recoveryCompleteInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Check the recovery details and password requirements');
    return recoveryCompleteResultSchema.parse(await this.credentials.completeRecovery(parsed.data));
  }

}

@Controller('gyms')
export class AccountRecoveryController {
  constructor(private readonly credentials: CredentialService) {}

  @Get(':slug/owner/account-recovery/candidates')
  @UseGuards(GymAccessGuard)
  async candidates(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access required');
    return recoveryCandidateListSchema.parse(await this.credentials.recoveryCandidates(access.gymId));
  }

  @Post(':slug/owner/account-recovery/:identityId')
  @UseGuards(GymAccessGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async issue(@Req() request: GymRequest, @Param('identityId') identityId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access required');
    if (!/^[A-Za-z0-9_:-]{1,128}$/.test(identityId)) throw new ForbiddenException('Identity is not eligible for this recovery path');
    const parsed = recoveryIssueInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Record the identity verification method and reason');
    return recoveryIssueResultSchema.parse(await this.credentials.issueRecovery({ actorIdentityId: access.identityId,
      gymId: access.gymId, identityId, ...parsed.data }));
  }
}

@Controller('admin/account-recovery')
export class OperatorRecoveryController {
  constructor(private readonly credentials: CredentialService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async issue(@Req() request: PlatformRequest, @Body() body: unknown) {
    const actorIdentityId = request.platformIdentity?.identityId;
    const parsed = operatorRecoveryIssueInputSchema.safeParse(body);
    if (!actorIdentityId || !parsed.success) throw new BadRequestException('Enter a valid operator recovery attestation');
    return recoveryIssueResultSchema.parse(await this.credentials.issueOperatorRecovery({ actorIdentityId, ...parsed.data }));
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
