import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, NotFoundException, Param, Post, Put, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import type { Prisma, PrismaClient } from './generated/tenant/client.js';
import { idempotencyKeySchema, trainerListQuerySchema, trainerListSchema, memberTrainerDirectorySchema, memberTrainerDirectoryQuerySchema, memberTrainerProfileSchema, trainerProfileSchema, trainerShiftInputSchema, trainerShiftResultSchema, trainerStatusInputSchema } from '@gymos/contracts';
import { appendTenantAudit } from './operations/transaction-audit.js';
import { requestDigest } from './operations/primitives.js';
import { DatabaseService } from './database.service.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { withGymAccessFence } from './identity/gym-access-fence.js';
import { TrainerLifecycleService } from './trainer-lifecycle.service.js';

type TrainerRow = {
  id: string; fullName: string; email: string | null; phone: string | null; level: 'LEVEL_1' | 'LEVEL_2' | null;
  specialisations: string[]; yearsExperience: number | null; shiftStart: string | null; shiftEnd: string | null;
  bio: string | null; status: 'ACTIVE' | 'DEACTIVATED'; registrationState: 'PENDING' | 'COMPLETE' | 'FAILED';
  version: number; createdAt: Date; identityId?: string | null; enrollmentOperationId?: string | null;
};
function trainerDto(row: TrainerRow) {
  const { identityId: _identityId, enrollmentOperationId: _enrollmentOperationId, ...safe } = row;
  return { ...safe, createdAt: row.createdAt.toISOString() };
}
function invalid(message: string): never { throw new UnprocessableEntityException(message); }
function zStrictEmpty(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
}

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class TrainersController {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService,
    private readonly trainerLifecycle: TrainerLifecycleService) {}

  private async publishedTrainerBindings(tenant: PrismaClient, gymId: string, activeOnly: boolean) {
    const links = await this.database.master.gymAccess.findMany({ where: { gymId, role: 'TRAINER', actorKind: 'TRAINER',
      linkStatus: activeOnly ? 'ACTIVE' : { in: ['ACTIVE', 'REVOKED'] }, tenantActorId: { not: null }, enrollmentOperationId: { not: null } },
      select: { userId: true, tenantActorId: true, enrollmentOperationId: true } });
    if (!links.length) return [];
    const operations = await this.database.master.operation.findMany({ where: { id: { in: links.map(link => link.enrollmentOperationId!) },
      gymId, kind: 'REGISTER_TRAINER', state: 'COMPLETE', tenantCommandReceiptId: { not: null } },
      select: { id: true, actorIdentityId: true, subjectIdentityId: true, tenantActorId: true, tenantCommandReceiptId: true } });
    if (!operations.length) return [];
    const receipts = await tenant.commandReceipt.findMany({ where: { sourceMasterOperationId: { in: operations.map(operation => operation.id) },
      state: 'COMMITTED', commandKind: 'REGISTER_TRAINER', resourceType: 'TRAINER' },
      select: { id: true, sourceMasterOperationId: true, actorIdentityId: true, resourceId: true } });
    const receiptByOperationId = new Map(receipts.map(receipt => [receipt.sourceMasterOperationId, receipt]));
    const operationById = new Map(operations.map(operation => [operation.id, operation]));
    return links.flatMap(link => {
      const operation = operationById.get(link.enrollmentOperationId!);
      const receipt = operation ? receiptByOperationId.get(operation.id) : null;
      return operation && operation.subjectIdentityId === link.userId && operation.tenantActorId === link.tenantActorId
        && operation.tenantCommandReceiptId === receipt?.id && receipt?.actorIdentityId === operation.actorIdentityId && receipt.resourceId === link.tenantActorId
        ? [{ id: link.tenantActorId!, identityId: link.userId, operationId: link.enrollmentOperationId! }] : [];
    });
  }

  @Get('trainers')
  async list(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Trainer roster is owner-only');
    const parsed = trainerListQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid('Enter valid trainer filters and page details');
    const { q, status, level, page, pageSize } = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const bindings = await this.publishedTrainerBindings(tenant, access.gymId, false);
      const where: Prisma.TrainerWhereInput = { registrationState: 'COMPLETE', OR: bindings.map(binding => ({ id: binding.id, identityId: binding.identityId, enrollmentOperationId: binding.operationId })),
        ...(status ? { status } : {}), ...(level ? { level } : {}),
        ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}) };
      const [totalCount, rows] = await Promise.all([
        tenant.trainer.count({ where }),
        tenant.trainer.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, fullName: true, email: true, phone: true, level: true, specialisations: true, yearsExperience: true, shiftStart: true, shiftEnd: true, bio: true, status: true, registrationState: true, version: true, createdAt: true, identityId: true, enrollmentOperationId: true } }),
      ]);
      return trainerListSchema.parse({ items: rows.map(row => trainerDto(row as TrainerRow)), page, pageSize,
        totalCount, totalPages: Math.ceil(totalCount / pageSize), asOf: new Date().toISOString() });
    });
  }

  @Get('trainers/:trainerId')
  async profile(@Req() request: GymRequest, @Param('trainerId') trainerId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Trainer profiles are owner-only');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const bindings = await this.publishedTrainerBindings(tenant, access.gymId, false);
      if (!bindings.some(candidate => candidate.id === trainerId)) throw new NotFoundException('Trainer not found');
      const trainer = await tenant.trainer.findFirst({ where: { id: trainerId, registrationState: 'COMPLETE' },
        select: { id: true, fullName: true, email: true, phone: true, level: true, specialisations: true, yearsExperience: true, shiftStart: true, shiftEnd: true, bio: true, status: true, registrationState: true, version: true, createdAt: true, identityId: true, enrollmentOperationId: true } });
      if (!trainer) throw new NotFoundException('Trainer not found');
      if (!bindings.some(candidate => candidate.id === trainer.id && candidate.identityId === trainer.identityId && candidate.operationId === trainer.enrollmentOperationId)) throw new NotFoundException('Trainer not found');
      const [totalSessions, totalCompleted, relatedMembers, recentRows, configuration] = await Promise.all([
        tenant.pTSession.count({ where: { trainerId } }),
        tenant.pTSession.count({ where: { trainerId, state: 'COMPLETED' } }),
        tenant.pTSession.groupBy({ by: ['memberId'], where: { trainerId, state: { in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] } } }),
        tenant.pTSession.findMany({ where: { trainerId }, orderBy: [{ scheduledStartAt: 'desc' }, { id: 'desc' }], take: 10,
          select: { id: true, state: true, type: true, scheduledStartAt: true, scheduledEndAt: true, createdAt: true } }),
        tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } }),
      ]);
      if (!configuration?.timezone) throw new NotFoundException('Gym time zone is unavailable');
      const recentSessions = recentRows.map(session => ({ ...session,
        scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(), createdAt: session.createdAt.toISOString() }));
      return trainerProfileSchema.parse({ trainer: trainerDto(trainer as TrainerRow),
        profile: { email: trainer.email, phone: trainer.phone, biography: trainer.bio, joinedAt: trainer.createdAt.toISOString() },
        gymTimeZone: configuration.timezone,
        recentSessions: { items: recentSessions, limit: 10, totalCount: totalSessions, hasMore: totalSessions > recentSessions.length },
        stats: { relatedClientCount: relatedMembers.length, completedInLoadedWindow: recentRows.filter(session => session.state === 'COMPLETED').length,
          totalCompleted, rating: null }, asOf: new Date().toISOString() });
    });
  }

  @Get('me/trainer-directory')
  async memberDirectory(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER' || !access.actor || access.actor.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = memberTrainerDirectoryQuerySchema.safeParse(query ?? {});
    if (!parsed.success) invalid('Enter valid directory filters and page details');
    const { q, page, pageSize } = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const bindings = await this.publishedTrainerBindings(tenant, access.gymId, true);
      const where: Prisma.TrainerWhereInput = { status: 'ACTIVE', registrationState: 'COMPLETE', OR: bindings.map(binding => ({ id: binding.id, identityId: binding.identityId, enrollmentOperationId: binding.operationId })),
        ...(q ? { fullName: { contains: q, mode: 'insensitive' } } : {}) };
      const [totalCount, rows] = await Promise.all([
        tenant.trainer.count({ where }),
        tenant.trainer.findMany({ where, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, fullName: true, level: true, specialisations: true, bio: true, shiftStart: true, shiftEnd: true } }),
      ]);
      return memberTrainerDirectorySchema.parse({ items: rows.map(row => ({ ...row, rating: null })), page, pageSize,
        totalCount, totalPages: Math.ceil(totalCount / pageSize), asOf: new Date().toISOString() });
    });
  }

  @Get('me/trainers/:trainerId/profile')
  async memberTrainerProfile(@Req() request: GymRequest, @Param('trainerId') trainerId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const binding = (await this.publishedTrainerBindings(tenant, access.gymId, true)).find(item => item.id === trainerId);
      if (!binding) throw new NotFoundException('Trainer not found');
      const trainer = await tenant.trainer.findFirst({ where: { id: trainerId, identityId: binding.identityId,
        enrollmentOperationId: binding.operationId, registrationState: 'COMPLETE', status: 'ACTIVE' },
        select: { id: true, fullName: true, level: true, specialisations: true, bio: true, yearsExperience: true,
          shiftStart: true, shiftEnd: true } });
      if (!trainer) throw new NotFoundException('Trainer not found');
      const completedSessions = await tenant.pTSession.count({ where: { trainerId, state: 'COMPLETED' } });
      return memberTrainerProfileSchema.parse({ trainer: { ...trainer, rating: null }, completedSessions, asOf: new Date().toISOString() });
    });
  }

  @Put('trainers/:trainerId/shift')
  async updateShift(@Req() request: GymRequest, @Param('trainerId') trainerId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can approve trainer shifts');
    const parsed = trainerShiftInputSchema.safeParse(body);
    if (!parsed.success) invalid('Enter a valid shift and current trainer version');
    const { start, end, overnight, expectedVersion } = parsed.data;
    const startMinute = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
    const endMinute = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
    const actualOvernight = endMinute <= startMinute;
    const duration = (endMinute - startMinute + 1440) % 1440;
    if (overnight !== actualOvernight || duration < 15 || duration > 960) invalid('Shift duration must be 15 to 960 minutes and overnight must match the entered times');

    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const binding = (await this.publishedTrainerBindings(tenant, access.gymId, false)).find(item => item.id === trainerId);
      if (!binding) throw new NotFoundException('Trainer not found');
      return withGymAccessFence(this.database.master, [
        { identityId: access.identityId, gymId: access.gymId, role: 'OWNER' },
        { identityId: binding.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: trainerId },
      ], async () => tenant.$transaction(async tx => {
      await this.assertCurrentOwner(access);
      await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${trainerId} FOR UPDATE`;
      const trainer = await tx.trainer.findFirst({ where: { id: trainerId, registrationState: 'COMPLETE' } });
      if (!trainer) throw new NotFoundException('Trainer not found');
      const idempotencyKey = `shift:${trainerId}:v${expectedVersion + 1}`;
      const digest = requestDigest({ start, end, overnight, expectedVersion });
      const previous = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
        actorIdentityId: access.identityId, commandKind: 'APPROVE_TRAINER_SHIFT', idempotencyKey,
      } } });
      if (previous) {
        if (previous.requestDigest !== digest || previous.resourceId !== trainerId || previous.state !== 'COMMITTED') throw new ConflictException('Shift request conflicts with an earlier command');
        return trainerShiftResultSchema.parse(previous.safeResult);
      }
      if (trainer.version !== expectedVersion) throw new ConflictException('Trainer profile changed; reload before approving this shift');
      const [configuration, updated] = await Promise.all([
        tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } }),
        tx.trainer.update({ where: { id: trainerId, version: expectedVersion }, data: { shiftStart: start, shiftEnd: end, version: { increment: 1 } } }),
      ]);
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new ConflictException('Gym timezone is unavailable');
      const result = trainerShiftResultSchema.parse({ trainerId, shift: { start, end, overnight }, timeZone: configuration.timezone, version: updated.version });
      const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'APPROVE_TRAINER_SHIFT', idempotencyKey,
        requestDigest: digest, resourceType: 'TRAINER', resourceId: trainerId, state: 'COMMITTED', safeResult: result, committedAt: new Date() } });
      await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
        eventCode: 'TRAINER_SHIFT_APPROVED', resourceType: 'TRAINER', resourceId: trainerId,
        transition: { from: String(trainer.version), to: String(updated.version), version: updated.version } });
      return result;
      }));
    });
  }

  @Post('trainers/:trainerId/status')
  @HttpCode(200)
  updateStatus(@Req() request: GymRequest, @Param('trainerId') trainerId: string,
    @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Trainer status is owner-only');
    const parsed = trainerStatusInputSchema.safeParse(body);
    const parsedKey = idempotencyKeySchema.safeParse(key);
    if (!parsed.success || !parsedKey.success) invalid('Provide a target status, current version, reason and stable idempotency key');
    return this.trainerLifecycle.execute(access, trainerId, parsedKey.data, parsed.data);
  }

  @Get('trainer-lifecycle/:operationId')
  lifecycleStatus(@Req() request: GymRequest, @Param('operationId') operationId: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Trainer lifecycle history is owner-only');
    return this.trainerLifecycle.status(access, operationId);
  }

  @Post('trainer-lifecycle/:operationId/resume')
  @HttpCode(200)
  resumeLifecycle(@Req() request: GymRequest, @Param('operationId') operationId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Trainer lifecycle recovery is owner-only');
    if (!zStrictEmpty(body)) invalid('Resume uses the original immutable status intent');
    return this.trainerLifecycle.resume(access, operationId);
  }

  private async assertCurrentOwner(access: NonNullable<GymRequest['gymAccess']>) {
    const [user, link, gym, now] = await Promise.all([
      this.database.master.user.findUnique({ where: { id: access.identityId }, select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
      this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } }, select: { role: true, linkStatus: true, version: true } }),
      this.database.master.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
      this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`,
    ]);
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword || (user.credentialExpiresAt && user.credentialExpiresAt <= now[0]!.now)
      || link?.role !== 'OWNER' || link.linkStatus !== 'ACTIVE' || link.version !== access.accessVersion || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Gym access changed; reload and try again');
    }
  }
}
