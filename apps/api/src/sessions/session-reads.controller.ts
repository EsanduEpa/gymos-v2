import { Controller, ForbiddenException, Get, Param, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { sessionReadQuerySchema } from '@gymos/contracts';
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

  @Get('members/:memberId/recent-sessions')
  recentMember(@Req() request: GymRequest, @Param('memberId') memberId: string) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Gym access is required');
    return this.reads.recentMember(access, memberId);
  }
}
