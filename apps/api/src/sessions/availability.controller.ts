import { Body, ConflictException, Controller, ForbiddenException, Get, Param, Put, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { availabilityQuerySchema, availabilitySlotsQuerySchema, availabilityUpdateSchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { SessionAvailabilityService } from './availability.service.js';

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class SessionAvailabilityController {
  constructor(private readonly availability: SessionAvailabilityService) {}
  @Get('me/availability')
  ownRead(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = availabilityQuerySchema.safeParse(query);
    if (!parsed.success) throw new UnprocessableEntityException('Enter an availability date range no longer than 60 days');
    return this.availability.read(access, access.actor.id, parsed.data);
  }
  @Put('me/availability')
  ownUpdate(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = availabilityUpdateSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid availability windows and the current version');
    return this.availability.update(access, access.actor.id, parsed.data);
  }
  @Get('trainers/:trainerId/availability')
  read(@Req() request: GymRequest, @Param('trainerId') trainerId: string, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Trainer or owner access is required');
    const parsed = availabilityQuerySchema.safeParse(query);
    if (!parsed.success) throw new UnprocessableEntityException('Enter an availability date range no longer than 60 days');
    return this.availability.read(access, trainerId, parsed.data);
  }
  @Put('trainers/:trainerId/availability')
  update(@Req() request: GymRequest, @Param('trainerId') trainerId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Trainer or owner access is required');
    const parsed = availabilityUpdateSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid availability windows and the current version');
    if (access.role === 'TRAINER' && access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.availability.update(access, trainerId, parsed.data);
  }
  @Get('session-slots')
  slots(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'MEMBER'].includes(access.role)) throw new ForbiddenException('Member or owner access is required');
    const parsed = availabilitySlotsQuerySchema.safeParse(query);
    if (!parsed.success) throw new UnprocessableEntityException('Choose a trainer and gym-local date');
    return this.availability.slots(access, parsed.data);
  }
}
