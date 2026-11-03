import { Body, Controller, ForbiddenException, Get, Headers, Post, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { sessionBookingOptionsQuerySchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { SessionBookingService } from './booking.service.js';

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class SessionBookingController {
  constructor(private readonly bookings: SessionBookingService) {}

  @Get('session-booking-options')
  async options(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Session booking options are owner-only');
    const parsed = sessionBookingOptionsQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid session booking option filters');
    return this.bookings.options(access, parsed.data);
  }

  @Post('sessions/bookings')
  async book(@Req() request: GymRequest, @Body() body: unknown, @Headers('idempotency-key') idempotencyKey?: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can book sessions');
    return this.bookings.book(access, body, idempotencyKey);
  }
}
