import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from './generated/tenant/client.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantDatabaseService } from './tenant-database.service.js';

const createMemberInput = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
});

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

  @Post(':slug/members')
  @UseGuards(GymAccessGuard)
  async createMember(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }
    if (access.role !== 'OWNER') {
      throw new ForbiddenException('Only gym owners can create members');
    }

    const parsed = createMemberInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter a valid member name and email');
    }

    try {
      return await this.tenants.forDatabase(access.databaseName).member.create({
        data: parsed.data,
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Member email already exists in this gym');
      }
      throw error;
    }
  }
}
