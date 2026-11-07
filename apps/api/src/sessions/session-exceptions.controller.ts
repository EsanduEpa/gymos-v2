import { Body, Controller, ForbiddenException, Headers, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { SessionExceptionsService } from './session-exceptions.service.js';
@Controller('gyms/:slug/sessions/:sessionId')
@UseGuards(GymAccessGuard)
export class SessionExceptionsController {
  constructor(private readonly exceptions: SessionExceptionsService) {}
  private access(request: GymRequest) { if (!request.gymAccess || request.gymAccess.role !== 'OWNER') throw new ForbiddenException('Only owners can resolve PT exceptions'); return request.gymAccess; }
  @Post('exception-quote')
  quote(@Req() request: GymRequest, @Param('sessionId') id: string, @Body() input: unknown) { return this.exceptions.quote(this.access(request), id, input); }
  @Post('exceptions')
  commit(@Req() request: GymRequest, @Param('sessionId') id: string, @Body() input: unknown, @Headers('idempotency-key') key?: string) {
    if (key !== undefined && (!input || typeof input !== 'object' || !('idempotencyKey' in input) || input.idempotencyKey !== key)) throw new UnprocessableEntityException('Request keys must match');
    return this.exceptions.commit(this.access(request), id, input);
  }
}
