import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('gyms/:slug/analytics')
@UseGuards(GymAccessGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get()
  read(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Analytics are owner-only');
    return this.analytics.gym(access, query ?? {});
  }
}
