import {
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantDatabaseService } from './tenant-database.service.js';

@Controller('gyms')
export class GymsController {
  constructor(private readonly tenants: TenantDatabaseService) {}

  @Get(':slug/access')
  @UseGuards(GymAccessGuard)
  access(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }

    return { gymId: access.gymId, slug: access.slug, role: access.role };
  }

  @Get(':slug/members')
  @UseGuards(GymAccessGuard)
  members(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }

    if (access.role !== 'OWNER' && access.role !== 'TRAINER') {
      throw new ForbiddenException('Member list access denied');
    }

    return this.tenants.forDatabase(access.databaseName).member.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
