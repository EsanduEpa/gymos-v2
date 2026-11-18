import { Body, Controller, Delete, ForbiddenException, Get, Header, Headers, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UnprocessableEntityException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { idempotencyKeySchema, mealPlanCreateSchema, mealPlanUpdateSchema, memberWorkoutPlansQuerySchema, memberWorkoutScheduleQuerySchema, trainerClientQuerySchema, workoutCompletionInputSchema, workoutPlanCreateSchema, workoutPlanUpdateSchema } from '@gymos/contracts';
import { bodyMeasurementInputSchema, dietaryProfileUpdateSchema, progressPhotoDateSchema, progressPhotoLinkQuerySchema, progressReportQuerySchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { CoachingService } from './coaching.service.js';
import { MAX_PROFILE_PHOTO_BYTES } from '../profile-photo.js';

@Controller('gyms/:slug/me')
@UseGuards(GymAccessGuard)
export class CoachingController {
  constructor(private readonly coaching: CoachingService) {}

  @Get('training-journal')
  trainingJournal(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Member access is required');
    return this.coaching.trainingJournal(access, query);
  }

  @Post('training-journal')
  saveTrainingJournal(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Member access is required');
    return this.coaching.saveTrainingJournal(access, body);
  }

  @Get('progress')
  @Header('Cache-Control', 'private, no-store')
  memberProgress(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = progressReportQuerySchema.safeParse(query);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid report date');
    return this.coaching.memberProgress(access, parsed.data);
  }

  @Post('progress/measurements')
  saveMeasurement(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = bodyMeasurementInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Provide a date and at least one valid measurement');
    return this.coaching.saveBodyMeasurement(access, parsed.data);
  }

  @Get('clients/:memberId/progress')
  @Header('Cache-Control', 'private, no-store')
  trainerProgress(@Req() request: GymRequest, @Param('memberId') memberId: string, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = progressReportQuerySchema.safeParse(query);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid report date');
    return this.coaching.trainerProgress(access, memberId, parsed.data);
  }

  @Post('clients/:memberId/progress/measurements')
  saveClientMeasurement(@Req() request: GymRequest, @Param('memberId') memberId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = bodyMeasurementInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Provide a date and at least one valid measurement');
    return this.coaching.saveClientBodyMeasurement(access, memberId, parsed.data);
  }

  @Post('progress/photos')
  @HttpCode(204)
  @UseInterceptors(FileInterceptor('photo', { limits: { files: 1, fields: 1, fieldSize: 32, fileSize: MAX_PROFILE_PHOTO_BYTES } }))
  uploadProgressPhoto(@Req() request: GymRequest, @Body('takenOn') value: unknown, @UploadedFile() file?: { buffer: Buffer }) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const takenOn = progressPhotoDateSchema.safeParse(value);
    if (!takenOn.success || !file) throw new UnprocessableEntityException('Choose a photo and enter its date');
    return this.coaching.addProgressPhoto(access, takenOn.data, file.buffer);
  }

  @Delete('progress/photos/:photoId')
  @HttpCode(204)
  deleteProgressPhoto(@Req() request: GymRequest, @Param('photoId', ParseUUIDPipe) photoId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    return this.coaching.deleteProgressPhoto(access, photoId);
  }

  @Get('progress/photos/:photoId')
  @Header('Cache-Control', 'private, no-store')
  memberProgressPhoto(@Req() request: GymRequest, @Param('photoId', ParseUUIDPipe) photoId: string, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const link = progressPhotoLinkQuerySchema.safeParse(query);
    if (!link.success) throw new UnprocessableEntityException('Use a valid progress photo link');
    return this.coaching.memberProgressPhoto(access, photoId, link.data);
  }

  @Get('clients/:memberId/progress/photos/:photoId')
  @Header('Cache-Control', 'private, no-store')
  trainerProgressPhoto(@Req() request: GymRequest, @Param('memberId') memberId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const link = progressPhotoLinkQuerySchema.safeParse(query);
    if (!link.success) throw new UnprocessableEntityException('Use a valid progress photo link');
    return this.coaching.trainerProgressPhoto(access, memberId, photoId, link.data);
  }

  @Get('dietary-profile')
  memberDietaryProfile(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER') throw new ForbiddenException('Member access is required');
    return this.coaching.memberDietaryProfile(access);
  }

  @Get('clients/:memberId/dietary-profile')
  trainerDietaryProfile(@Req() request: GymRequest, @Param('memberId') memberId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.coaching.trainerDietaryProfile(access, memberId);
  }

  @Patch('clients/:memberId/dietary-profile')
  saveDietaryProfile(@Req() request: GymRequest, @Param('memberId') memberId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = dietaryProfileUpdateSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Provide the current profile version and valid dietary entries');
    return this.coaching.saveDietaryProfile(access, memberId, parsed.data);
  }

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

  @Post('clients/:memberId/workout-plans/:planId/template')
  saveWorkoutTemplate(@Req() request: GymRequest, @Param('memberId') memberId: string, @Param('planId') planId: string) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Trainer access is required');
    return this.coaching.saveWorkoutTemplate(access, memberId, planId);
  }

  @Get('workout-templates')
  workoutTemplates(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Trainer access is required');
    return this.coaching.workoutTemplates(access, query);
  }

  @Get('workout-templates/:id')
  workoutTemplate(@Req() request: GymRequest, @Param('id') id: string) {
    const access = request.gymAccess;
    if (!access) throw new ForbiddenException('Trainer access is required');
    return this.coaching.workoutTemplate(access, id);
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
    const parsed = memberWorkoutScheduleQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid workout plan page details');
    return this.coaching.memberWorkoutPlans(access, parsed.data);
  }

  @Post('workout-plans/:planId/completion')
  recordWorkoutCompletion(@Req() request: GymRequest, @Param('planId') planId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = workoutCompletionInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Provide a workout date and a valid exercise');
    return this.coaching.recordWorkoutCompletion(access, planId, parsed.data);
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
