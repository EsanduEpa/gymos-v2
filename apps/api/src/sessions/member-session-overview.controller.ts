import { Controller, ForbiddenException, Get, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { memberSessionOverviewQuerySchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { MemberSessionOverviewService } from './member-session-overview.service.js';

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class MemberSessionOverviewController {
  constructor(private readonly overview: MemberSessionOverviewService) {}

  @Get('member-session-overview')
  read(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner access is required');
    const parsed = memberSessionOverviewQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid month, member search and page');
    return this.overview.read(access, parsed.data);
  }
}
