import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { idempotencyKeySchema, mealPlanCreateSchema, mealPlanUpdateSchema, memberWorkoutPlansQuerySchema, trainerClientQuerySchema, workoutPlanCreateSchema, workoutPlanUpdateSchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { CoachingService } from './coaching.service.js';

@Controller('gyms/:slug/me')
@UseGuards(GymAccessGuard)
export class CoachingController {
  constructor(private readonly coaching: CoachingService) {}

  @Get('clients')
  listClients(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = trainerClientQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid client filters and page details');
    return this.coaching.listClients(access, parsed.data);
  }

  @Get('clients/:memberId')
  clientProfile(@Req() request: GymRequest, @Param('memberId') memberId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.coaching.clientProfile(access, memberId);
  }

  @Get('clients/:memberId/workout-plans')
  trainerWorkoutPlans(@Req() request: GymRequest, @Param('memberId') memberId: string, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = memberWorkoutPlansQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid workout plan page details');
    return this.coaching.trainerWorkoutPlans(access, memberId, parsed.data);
  }

  @Get('clients/:memberId/workout-plans/:planId')
  trainerWorkoutPlan(@Req() request: GymRequest, @Param('memberId') memberId: string, @Param('planId') planId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.coaching.trainerWorkoutPlan(access, memberId, planId);
  }

  @Post('clients/:memberId/workout-plans')
  createWorkoutPlan(@Req() request: GymRequest, @Param('memberId') memberId: string, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = workoutPlanCreateSchema.safeParse(body);
    const idempotencyKey = idempotencyKeySchema.safeParse(key);
    if (!parsed.success || !idempotencyKey.success) throw new UnprocessableEntityException('Provide a valid workout plan and idempotency key');
    return this.coaching.createWorkoutPlan(access, memberId, idempotencyKey.data, parsed.data);
  }

  @Get('clients/:memberId/meal-plans')
  trainerMealPlans(@Req() request: GymRequest, @Param('memberId') memberId: string, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = memberWorkoutPlansQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid meal plan page details');
    return this.coaching.trainerMealPlans(access, memberId, parsed.data);
  }

  @Get('clients/:memberId/meal-plans/:planId')
  trainerMealPlan(@Req() request: GymRequest, @Param('memberId') memberId: string, @Param('planId') planId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.coaching.trainerMealPlan(access, memberId, planId);
  }

  @Patch('clients/:memberId/workout-plans/:planId')
  updateWorkoutPlan(@Req() request: GymRequest, @Param('memberId') memberId: string, @Param('planId') planId: string,
    @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = workoutPlanUpdateSchema.safeParse(body);
    const idempotencyKey = idempotencyKeySchema.safeParse(key);
    if (!parsed.success || !idempotencyKey.success) throw new UnprocessableEntityException('Provide a valid workout plan update and idempotency key');
    return this.coaching.updateWorkoutPlan(access, memberId, planId, idempotencyKey.data, parsed.data);
  }

  @Post('clients/:memberId/meal-plans')
  createMealPlan(@Req() request: GymRequest, @Param('memberId') memberId: string, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = mealPlanCreateSchema.safeParse(body);
    const idempotencyKey = idempotencyKeySchema.safeParse(key);
    if (!parsed.success || !idempotencyKey.success) throw new UnprocessableEntityException('Provide a valid meal plan and idempotency key');
    return this.coaching.createMealPlan(access, memberId, idempotencyKey.data, parsed.data);
  }

  @Patch('clients/:memberId/meal-plans/:planId')
  updateMealPlan(@Req() request: GymRequest, @Param('memberId') memberId: string, @Param('planId') planId: string,
    @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = mealPlanUpdateSchema.safeParse(body);
    const idempotencyKey = idempotencyKeySchema.safeParse(key);
    if (!parsed.success || !idempotencyKey.success) throw new UnprocessableEntityException('Provide a valid meal plan update and idempotency key');
    return this.coaching.updateMealPlan(access, memberId, planId, idempotencyKey.data, parsed.data);
  }

  @Get('workout-plans')
  memberWorkoutPlans(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = memberWorkoutPlansQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid workout plan page details');
    return this.coaching.memberWorkoutPlans(access, parsed.data);
  }

  @Get('meal-plans')
  memberMealPlans(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = memberWorkoutPlansQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid meal plan page details');
    return this.coaching.memberMealPlans(access, parsed.data);
  }
}
