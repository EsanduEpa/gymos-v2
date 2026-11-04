import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('gyms/:slug/dashboard')
@UseGuards(GymAccessGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get()
  owner(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Owner dashboard is owner-only');
    return this.dashboard.owner(access);
  }
}
