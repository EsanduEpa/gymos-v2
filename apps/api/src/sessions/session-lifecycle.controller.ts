import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { SessionLifecycleService } from './session-lifecycle.service.js';

@Controller('gyms/:slug/sessions/:sessionId')
@UseGuards(GymAccessGuard)
export class SessionLifecycleController {
  constructor(private readonly lifecycle: SessionLifecycleService) {}

  private access(request: GymRequest) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Trainer or owner gym access is required');
    return access;
  }

  private cancellationAccess(request: GymRequest) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER', 'MEMBER'].includes(access.role)) throw new ForbiddenException('Session access is required');
    return access;
  }

  private assertIdempotencyKey(body: unknown, header?: string) {
    if (header !== undefined && (!body || typeof body !== 'object' || !('idempotencyKey' in body) || body.idempotencyKey !== header)) {
      throw new UnprocessableEntityException('Idempotency header and request key must match');
    }
  }

  @Post('start')
  async start(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) {
    const access = this.access(request);
    this.assertIdempotencyKey(body, key);
    return this.lifecycle.start(access, sessionId, body);
  }

  @Patch('notes')
  async updateNotes(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) {
    const access = this.access(request);
    this.assertIdempotencyKey(body, key);
    return this.lifecycle.updateNotes(access, sessionId, body);
  }

  @Post('complete')
  async complete(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) {
    const access = this.access(request);
    this.assertIdempotencyKey(body, key);
    return this.lifecycle.complete(access, sessionId, body);
  }

  @Get('quote')
  async quote(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Query('action') action?: string) {
    const access = this.cancellationAccess(request);
    if (action !== 'CANCEL' && action !== 'NO_SHOW') throw new UnprocessableEntityException('Quote action must be CANCEL or NO_SHOW');
    return this.lifecycle.quote(access, sessionId, action);
  }

  @Post('cancel')
  async cancel(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) {
    const access = this.cancellationAccess(request);
    this.assertIdempotencyKey(body, key);
    return this.lifecycle.cancel(access, sessionId, body);
  }

  @Post('no-show')
  async noShow(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) {
    const access = this.access(request);
    this.assertIdempotencyKey(body, key);
    return this.lifecycle.noShow(access, sessionId, body);
  }
}
