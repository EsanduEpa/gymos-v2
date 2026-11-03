import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { idempotencyKeySchema, memberStatusCommandSchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { MemberLifecycleService } from './member-lifecycle.service.js';

function empty(value: unknown) { return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0; }

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class MemberLifecycleController {
  constructor(private readonly lifecycle: MemberLifecycleService) {}

  @Post('members/:memberId/status')
  @HttpCode(200)
  updateStatus(@Param('memberId') memberId: string, @Headers('idempotency-key') key: unknown, @Body() body: unknown, @Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Member status is owner-only');
    const input = memberStatusCommandSchema.safeParse(body);
    const parsedKey = idempotencyKeySchema.safeParse(key);
    if (!input.success || !parsedKey.success) throw new UnprocessableEntityException('Provide a target status, current version, reason and stable idempotency key');
    return this.lifecycle.execute(access, memberId, parsedKey.data, input.data);
  }

  @Get('member-lifecycle/:operationId')
  status(@Param('operationId') operationId: string, @Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Member lifecycle history is owner-only');
    return this.lifecycle.status(access, operationId);
  }

  @Post('member-lifecycle/:operationId/resume')
  @HttpCode(200)
  resume(@Param('operationId') operationId: string, @Body() body: unknown, @Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Member lifecycle recovery is owner-only');
    if (!empty(body)) throw new ConflictException('Resume uses the original immutable status intent');
    return this.lifecycle.resume(access, operationId);
  }
}
