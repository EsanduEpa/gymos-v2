import { Controller, ForbiddenException, Get, Param, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { sessionDetailQuerySchema, sessionAttentionQuerySchema, sessionReadQuerySchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { SessionReadsService } from './session-reads.service.js';

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class SessionReadsController {
  constructor(private readonly reads: SessionReadsService) {}

  @Get('sessions')
  listOwner(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('The gym session ledger is owner-only');
    const parsed = sessionReadQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session date, filters and page details');
    return this.reads.list(access, parsed.data);
  }

  @Get('me/sessions')
  listMine(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || !['MEMBER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Member or trainer access is required');
    const parsed = sessionReadQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session date, filters and page details');
    return this.reads.list(access, parsed.data);
  }

  @Get('sessions/attention')
  attention(@Req() request: GymRequest, @Query() query: unknown) {
    if (!request.gymAccess || request.gymAccess.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    const parsed = sessionAttentionQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid attention queue paging');
    return this.reads.attention(request.gymAccess, parsed.data);
  }

  @Get('sessions/:sessionId')
  detail(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Query() query: unknown) {
    if (!request.gymAccess) throw new ForbiddenException('Gym access is required');
    const parsed = sessionDetailQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid timeline page');
    return this.reads.detail(request.gymAccess, sessionId, parsed.data.timelinePage);
  }

  @Get('members/:memberId/recent-sessions')
  recentMember(@Req() request: GymRequest, @Param('memberId') memberId: string) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Gym access is required');
    return this.reads.recentMember(access, memberId);
  }
}
