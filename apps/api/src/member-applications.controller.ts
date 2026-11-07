import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  memberApplicationDecisionResultSchema, memberApplicationDecisionSchema, memberApplicationInputSchema,
  memberApplicationListQuerySchema, memberApplicationNoticeListSchema, memberApplicationNoticeReadSchema,
  memberApplicationQueueSchema, memberApplicationStatusSchema,
  memberApplicationSubmittedSchema, publicMemberApplicationInputSchema,
} from '@gymos/contracts';
import { identityFromAuthorization } from './auth-token.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { MemberApplicationsService } from './member-applications.service.js';
function invalid(): never { throw new UnprocessableEntityException('Enter valid application details'); }
@Controller('gyms')
export class MemberApplicationsController {
  constructor(private readonly applications: MemberApplicationsService) {}

  @Post('applications')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async publicApply(@Body() body: unknown) {
    const parsed = publicMemberApplicationInputSchema.safeParse(body);
    if (!parsed.success) invalid();
    return memberApplicationSubmittedSchema.parse(await this.applications.publicApply(parsed.data));
  }

  @Post(':slug/me/applications')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async authenticatedApply(@Req() request: Request, @Param('slug') slug: string, @Body() body: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const parsed = memberApplicationInputSchema.safeParse(body);
    if (!parsed.success) invalid();
    return memberApplicationSubmittedSchema.parse(await this.applications.authenticatedApply(slug, identity.userId, identity.authVersion, parsed.data, identity.gymAccountId));
  }

  @Get('me/applications')
  async ownApplications(@Req() request: Request) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    return memberApplicationStatusSchema.array().max(50).parse(await this.applications.ownApplications(identity.userId, identity.authVersion, identity.gymAccountId));
  }

  @Get('me/application-notifications')
  async applicantNotices(@Req() request: Request) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    return memberApplicationNoticeListSchema.parse(await this.applications.applicantNotices(identity.userId, identity.authVersion, identity.gymAccountId));
  }

  @Post('me/application-notifications/:noticeId/read')
  async readApplicantNotice(@Req() request: Request, @Param('noticeId') noticeId: string) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const result = await this.applications.markNoticeRead(identity.userId, identity.authVersion, noticeId, undefined, identity.gymAccountId);
    return memberApplicationNoticeReadSchema.parse(result);
  }

  @Post('me/applications/:applicationId/withdraw')
  async withdraw(@Req() request: Request, @Param('applicationId') applicationId: string) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!/^[A-Za-z0-9_:-]{1,128}$/.test(applicationId)) throw new ForbiddenException('Application unavailable');
    return this.applications.withdraw(identity.userId, identity.authVersion, applicationId, identity.gymAccountId);
  }

  @Get(':slug/owner/applications')
  @UseGuards(GymAccessGuard)
  async ownerQueue(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    const parsed = memberApplicationListQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid();
    return memberApplicationQueueSchema.parse(await this.applications.ownerQueue(access, parsed.data.page, parsed.data.pageSize));
  }

  @Get(':slug/owner/application-notifications')
  @UseGuards(GymAccessGuard)
  async ownerNotices(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    return memberApplicationNoticeListSchema.parse(await this.applications.ownerNotices(access));
  }

  @Post(':slug/owner/application-notifications/:noticeId/read')
  @UseGuards(GymAccessGuard)
  async readOwnerNotice(@Req() request: GymRequest, @Param('noticeId') noticeId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    const result = await this.applications.markNoticeRead(access.identityId, access.identityVersion, noticeId, access.gymId);
    return memberApplicationNoticeReadSchema.parse(result);
  }

  @Post(':slug/owner/applications/:applicationId/reject')
  @UseGuards(GymAccessGuard)
  async reject(@Req() request: GymRequest, @Param('applicationId') applicationId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    const parsed = memberApplicationDecisionSchema.safeParse(body);
    if (!parsed.success || parsed.data.decision !== 'REJECT') invalid();
    return memberApplicationDecisionResultSchema.parse(await this.applications.decide(access, applicationId, parsed.data));
  }

  @Post(':slug/owner/applications/:applicationId/approve')
  @UseGuards(GymAccessGuard)
  async approve(@Req() request: GymRequest, @Param('applicationId') applicationId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    const parsed = memberApplicationDecisionSchema.safeParse(body);
    if (!parsed.success || parsed.data.decision !== 'APPROVE') invalid();
    return memberApplicationDecisionResultSchema.parse(await this.applications.decide(access, applicationId, parsed.data));
  }
}
