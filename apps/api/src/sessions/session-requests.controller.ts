import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { SessionRequestsService } from './session-requests.service.js';

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class SessionRequestsController {
  constructor(private readonly requests: SessionRequestsService) {}

  @Get('me/session-request-options')
  async options(@Req() request: GymRequest, @Query('trainerId') trainerId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    return this.requests.options(access, trainerId);
  }

  @Get('me/session-requests')
  async pendingForTrainer(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.requests.pendingForTrainer(access);
  }

  @Post('me/session-requests')
  async request(@Req() request: GymRequest, @Body() body: unknown, @Headers('idempotency-key') headerKey?: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const bodyKey = typeof body === 'object' && body !== null && !Array.isArray(body) && 'idempotencyKey' in body ? (body as { idempotencyKey?: unknown }).idempotencyKey : undefined;
    if (headerKey && bodyKey !== headerKey) throw new ConflictException('Idempotency header and request key differ');
    return this.requests.request(access, body);
  }

  @Post('sessions/:sessionId/respond')
  @HttpCode(200)
  async decide(@Req() request: GymRequest, @Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') headerKey?: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const bodyKey = typeof body === 'object' && body !== null && !Array.isArray(body) && 'idempotencyKey' in body ? (body as { idempotencyKey?: unknown }).idempotencyKey : undefined;
    if (headerKey && bodyKey !== headerKey) throw new ConflictException('Idempotency header and request key differ');
    return this.requests.decide(access, sessionId, body);
  }
}
