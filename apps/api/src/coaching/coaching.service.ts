import { creditTotals } from '../sessions/credit-unit-projection.js';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '../generated/tenant/client.js';
import {
  trainerClientPageSchema,
  trainerClientProfileSchema,
  trainerClientQuerySchema,
  workoutPlanCreateSchema,
  workoutPlanCreateResultSchema,
  workoutPlanViewSchema,
  mealPlanCreateSchema,
  mealPlanCreateResultSchema,
  mealPlanViewSchema,
  memberMealPlanPageSchema,
  memberWorkoutPlanPageSchema,
  memberWorkoutPlansQuerySchema,
  type TrainerClientQuery,
  type WorkoutPlanCreate,
  workoutPlanUpdateSchema,
  type WorkoutPlanUpdate,
  type MealPlanCreate,
  mealPlanUpdateSchema,
  type MealPlanUpdate,
} from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { TenantSchemaGateService, type TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import { appendTenantAudit } from '../operations/transaction-audit.js';
import { requestDigest } from '../operations/primitives.js';

type Access = TenantGateContext & { identityId: string; role: string; actor?: { kind: string; id: string; registrationOperationId?: string } | null };
type MemberBinding = { id: string; identityId: string; operationId: string };
type MemberWhere = Prisma.MemberWhereInput;
type MemberCandidate = { id: string; identityId: string | null; enrollmentOperationId: string | null; fullName: string; email: string | null };
type WorkoutPlanWithExercises = Prisma.WorkoutPlanGetPayload<{ include: { exercises: true } }>;
type MealPlanWithEntries = Prisma.MealPlanGetPayload<{ include: { entries: true } }>;

function invalid(message: string): never { throw new UnprocessableEntityException(message); }

function relationPredicate(trainerId: string, now: Date): Prisma.PTSessionWhereInput {
  return {
    trainerId,
    OR: [
      { state: 'ACTIVE' },
      { state: 'SCHEDULED', confirmedAt: { not: null }, scheduledStartAt: { gt: now } },
      { state: 'COMPLETED', endedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
    ],
  };
}

function relationshipWhere(trainerId: string, now: Date, q?: string): MemberWhere {
  return {
    registrationState: 'COMPLETE', status: 'ACTIVE',
    AND: [
      { sessionsAsMember: { some: relationPredicate(trainerId, now) } },
      ...(q ? [{ OR: [
      { fullName: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
      ] }] : []),
    ],
  };
}

function workoutPlanDto(plan: WorkoutPlanWithExercises) {
  const exercises = [...plan.exercises].sort((a, b) => a.sortOrder - b.sortOrder).map(exercise => ({
    name: exercise.name, sets: exercise.sets, reps: exercise.reps,
    weightKg: exercise.weightKg?.toString() ?? null, durationMinutes: exercise.durationMinutes, notes: exercise.notes,
  }));
  return { id: plan.id, name: plan.name, description: plan.description, createdAt: plan.createdAt.toISOString(),
    revision: requestDigest({ name: plan.name, description: plan.description, exercises }),
    exercises: plan.exercises.sort((a, b) => a.sortOrder - b.sortOrder).map(exercise => ({
      id: exercise.id, order: exercise.sortOrder, name: exercise.name, sets: exercise.sets, reps: exercise.reps,
      weightKg: exercise.weightKg?.toString() ?? null, durationMinutes: exercise.durationMinutes, notes: exercise.notes,
    })) };
}

function decimalHundredths(value: Prisma.Decimal | null): bigint | null {
  if (value === null) return null;
  const [whole, fraction = ''] = value.toString().split('.');
  return BigInt(whole!) * 100n + BigInt((fraction + '00').slice(0, 2));
}
function hundredthsString(value: bigint): string {
  const whole = value / 100n;
  const fraction = String(value % 100n).padStart(2, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}
function mealPlanDto(plan: MealPlanWithEntries) {
  const entries = [...plan.entries].sort((a, b) => a.sortOrder - b.sortOrder);
  const totals = { calories: 0, proteinGrams: 0n, carbsGrams: 0n, fatsGrams: 0n };
  let proteinHasValue = false; let carbsHasValue = false; let fatsHasValue = false;
  for (const entry of entries) {
    totals.calories += entry.calories ?? 0;
    const protein = decimalHundredths(entry.proteinGrams); if (protein !== null) { totals.proteinGrams += protein; proteinHasValue = true; }
    const carbs = decimalHundredths(entry.carbsGrams); if (carbs !== null) { totals.carbsGrams += carbs; carbsHasValue = true; }
    const fats = decimalHundredths(entry.fatsGrams); if (fats !== null) { totals.fatsGrams += fats; fatsHasValue = true; }
  }
  if (!Number.isSafeInteger(totals.calories) || totals.calories > 10_000_000) invalid('Meal plan calorie total exceeds the safe range');
  const revision = requestDigest({ name: plan.name, entries: entries.map(entry => ({ dayOfWeek: entry.dayOfWeek, mealType: entry.mealType,
    foodItem: entry.foodItem, calories: entry.calories, proteinGrams: entry.proteinGrams?.toString() ?? null,
    carbsGrams: entry.carbsGrams?.toString() ?? null, fatsGrams: entry.fatsGrams?.toString() ?? null })) });
  return mealPlanViewSchema.parse({ id: plan.id, revision, name: plan.name, createdAt: plan.createdAt.toISOString(),
    entries: entries.map(entry => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, mealType: entry.mealType, foodItem: entry.foodItem,
      calories: entry.calories, proteinGrams: entry.proteinGrams?.toString() ?? null,
      carbsGrams: entry.carbsGrams?.toString() ?? null, fatsGrams: entry.fatsGrams?.toString() ?? null })),
    totals: { calories: totals.calories, proteinGrams: proteinHasValue ? hundredthsString(totals.proteinGrams) : null,
      carbsGrams: carbsHasValue ? hundredthsString(totals.carbsGrams) : null, fatsGrams: fatsHasValue ? hundredthsString(totals.fatsGrams) : null } });
}

@Injectable()
export class CoachingService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  async listClients(access: Access, queryInput: unknown) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = trainerClientQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) invalid('Enter valid client filters and page details');
    const query: TrainerClientQuery = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client view unavailable');
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        return this.withTrainerFence(access, async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const candidatesWhere = relationshipWhere(trainer.id, now, query.q);
          const pageStart = (query.page - 1) * query.pageSize;
          const pageIds: string[] = [];
          let totalCount = 0;
          let cursor: { fullName: string; id: string } | null = null;
          while (true) {
            const rows: MemberCandidate[] = await tx.member.findMany({
              where: cursor ? { AND: [candidatesWhere, { OR: [{ fullName: { gt: cursor.fullName } }, { fullName: cursor.fullName, id: { gt: cursor.id } }] }] } : candidatesWhere,
              orderBy: [{ fullName: 'asc' }, { id: 'asc' }], take: 200,
              select: { id: true, identityId: true, enrollmentOperationId: true, fullName: true, email: true },
            });
            if (!rows.length) break;
            cursor = { fullName: rows[rows.length - 1]!.fullName, id: rows[rows.length - 1]!.id };
            const batchBindings = await this.publishedMemberBindings(tx, access.gymId, rows.flatMap(row =>
              row.identityId && row.enrollmentOperationId ? [{ id: row.id, identityId: row.identityId, operationId: row.enrollmentOperationId }] : []));
            const validIds = new Set(batchBindings.map(binding => binding.id));
            for (const row of rows) {
              if (!validIds.has(row.id)) continue;
              if (totalCount >= pageStart && totalCount < pageStart + query.pageSize) pageIds.push(row.id);
              totalCount++;
            }
            if (rows.length < 200) break;
          }
          const rows = pageIds.length ? await tx.member.findMany({ where: { id: { in: pageIds } },
            select: { id: true, fullName: true, email: true, phone: true, status: true,
              sessionsAsMember: { where: relationPredicate(trainer.id, now), orderBy: [{ scheduledStartAt: 'desc' }, { id: 'desc' }], take: 1,
                select: { id: true, state: true, scheduledStartAt: true, scheduledEndAt: true } },
            } }) : [];
          const rowById = new Map(rows.map(row => [row.id, row]));
          const orderedRows = pageIds.flatMap(id => rowById.has(id) ? [rowById.get(id)!] : []);
          const today = await this.localDate(tx, now, configuration.timezone!);
          const packSummaries = await this.packSummaries(tx, orderedRows.map(row => row.id), today);
          return trainerClientPageSchema.parse({ items: orderedRows.map(row => {
            const session = row.sessionsAsMember[0];
            const balance = packSummaries.get(row.id);
            return { id: row.id, fullName: row.fullName, email: row.email, phone: row.phone, status: row.status,
              latestSession: session ? { id: session.id, state: session.state, scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString() } : null,
              usablePackBalance: { available: balance?.available ?? 0, held: balance?.held ?? 0 } };
          }), page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize),
            asOf: now.toISOString(), timeZone: configuration.timezone });
        });
      });
    });
  }

  async clientProfile(access: Access, memberId: string) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client not found');
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        const targetActor = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE' },
          select: { id: true, identityId: true, enrollmentOperationId: true } });
        const target = targetActor?.identityId && targetActor.enrollmentOperationId
          ? { id: targetActor.id, identityId: targetActor.identityId, operationId: targetActor.enrollmentOperationId } : null;
        const initialBindings = target ? await this.publishedMemberBindings(tx, access.gymId, [target]) : [];
        if (!target || !initialBindings.some(binding => binding.id === target.id && binding.identityId === target.identityId && binding.operationId === target.operationId)) throw new NotFoundException('Client not found');
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: target.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: target.id },
        ], async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const bindings = await this.publishedMemberBindings(tx, access.gymId, [target]);
          if (!bindings.some(binding => binding.id === memberId && binding.identityId === target.identityId)) throw new NotFoundException('Client not found');
          const member = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE', sessionsAsMember: { some: relationPredicate(trainer.id, now) } },
            select: { id: true, identityId: true, enrollmentOperationId: true, fullName: true, email: true, phone: true, dateOfBirth: true,
              emergencyContact: true, healthNotes: true, status: true,
              sessionsAsMember: { where: { trainerId: trainer.id }, orderBy: [{ scheduledStartAt: 'desc' }, { id: 'desc' }], take: 10,
                select: { id: true, state: true, scheduledStartAt: true, scheduledEndAt: true, notes: true } },
            workoutPlans: { where: { trainerId: trainer.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 2,
              include: { exercises: { orderBy: { sortOrder: 'asc' } } } },
            mealPlans: { where: { trainerId: trainer.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 2,
              include: { entries: { orderBy: { sortOrder: 'asc' } } } },
            } });
          if (!member || !bindings.some(binding => binding.id === member.id && binding.identityId === member.identityId && binding.operationId === member.enrollmentOperationId)) throw new NotFoundException('Client not found');
          const today = await this.localDate(tx, now, configuration.timezone!);
          const packSummary = (await this.packSummaries(tx, [member.id], today)).get(member.id)
            ?? { available: 0, held: 0, consumed: 0, expired: 0 };
          const [totalCount, workoutCount, mealCount] = await Promise.all([
            tx.pTSession.count({ where: { memberId, trainerId: trainer.id } }),
            tx.workoutPlan.count({ where: { memberId, trainerId: trainer.id } }),
            tx.mealPlan.count({ where: { memberId, trainerId: trainer.id } }),
          ]);
          return trainerClientProfileSchema.parse({
            client: { id: member.id, fullName: member.fullName, email: member.email, phone: member.phone,
              dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null,
              emergencyContact: member.emergencyContact, healthNotes: member.healthNotes, status: member.status },
            packSummary,
            recentSessions: { items: member.sessionsAsMember.map(session => ({ id: session.id, state: session.state,
              scheduledStartAt: session.scheduledStartAt.toISOString(), scheduledEndAt: session.scheduledEndAt.toISOString(), notes: session.notes })),
              limit: 10, totalCount, hasMore: totalCount > member.sessionsAsMember.length },
            workouts: { items: member.workoutPlans.map(workoutPlanDto), limit: 2, totalCount: workoutCount, hasMore: workoutCount > member.workoutPlans.length },
            meals: { items: member.mealPlans.map(mealPlanDto), limit: 2, totalCount: mealCount, hasMore: mealCount > member.mealPlans.length },
            asOf: now.toISOString(), timeZone: configuration.timezone,
          });
        });
      });
    });
  }

  async createWorkoutPlan(access: Access, memberId: string, idempotencyKey: string, input: unknown) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = workoutPlanCreateSchema.safeParse(input);
    if (!parsed.success) invalid('Enter a valid workout plan with one to 100 exercise rows');
    const body: WorkoutPlanCreate = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } });
      if (!configuration || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client not found');
      return tenant.$transaction(async tx => {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        const memberActor = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE' },
          select: { id: true, identityId: true, enrollmentOperationId: true } });
        if (!memberActor?.identityId || !memberActor.enrollmentOperationId) throw new NotFoundException('Client not found');
        const candidate = { id: memberActor.id, identityId: memberActor.identityId, operationId: memberActor.enrollmentOperationId };
        const published = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
        if (!published.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: candidate.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: candidate.id },
        ], async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const freshBindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
          if (!freshBindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: candidate.identityId, enrollmentOperationId: candidate.operationId,
            registrationState: 'COMPLETE', status: 'ACTIVE', sessionsAsMember: { some: relationPredicate(trainer.id, now) } }, select: { id: true } });
          if (!member) throw new NotFoundException('Client not found');
          const digest = requestDigest({ memberId, ...body });
          const lockKey = `workout-plan:${access.identityId}:${idempotencyKey}`;
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const previous = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'ASSIGN_WORKOUT_PLAN', idempotencyKey,
          } } });
          if (previous) {
            if (previous.requestDigest !== digest || previous.resourceType !== 'WORKOUT_PLAN' || previous.state !== 'COMMITTED' || !previous.safeResult) {
              throw new ConflictException('This idempotency key is already bound to another workout plan request');
            }
            const result = workoutPlanCreateResultSchema.safeParse(previous.safeResult);
            if (!result.success || result.data.plan.id !== previous.resourceId) throw new Error('Stored workout plan receipt failed integrity verification');
            return workoutPlanCreateResultSchema.parse({ ...result.data, replayed: true });
          }
          const plan = await tx.workoutPlan.create({ data: { memberId, trainerId: trainer.id, name: body.name, description: body.description ?? null,
            exercises: { create: body.exercises.map((exercise, sortOrder) => ({ sortOrder, name: exercise.name, sets: exercise.sets,
              reps: exercise.reps ?? null, weightKg: exercise.weightKg ?? null, durationMinutes: exercise.durationMinutes ?? null, notes: exercise.notes ?? null })) } },
            include: { exercises: { orderBy: { sortOrder: 'asc' } } } });
          const result = workoutPlanCreateResultSchema.parse({ plan: workoutPlanDto(plan), replayed: false });
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'ASSIGN_WORKOUT_PLAN', idempotencyKey,
            requestDigest: digest, resourceType: 'WORKOUT_PLAN', resourceId: plan.id, state: 'COMMITTED', safeResult: result, committedAt: now } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'WORKOUT_PLAN_ASSIGNED', resourceType: 'WORKOUT_PLAN', resourceId: plan.id,
            transition: { to: 'ASSIGNED', version: 0 } });
          await this.notifyPlan(tx, { receiptId: receipt.id, recipientIdentityId: candidate.identityId, planId: plan.id, type: 'WORKOUT', updated: false });
          return result;
        });
      }, { isolationLevel: 'Serializable' });
    });
  }

  async updateWorkoutPlan(access: Access, memberId: string, planId: string, idempotencyKey: string, input: unknown) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = workoutPlanUpdateSchema.safeParse(input);
    if (!parsed.success) invalid('Enter a valid workout plan and current revision');
    const body: WorkoutPlanUpdate = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } });
      if (!configuration || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client not found');
      return tenant.$transaction(async tx => {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        const memberActor = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE' },
          select: { id: true, identityId: true, enrollmentOperationId: true } });
        if (!memberActor?.identityId || !memberActor.enrollmentOperationId) throw new NotFoundException('Client not found');
        const candidate = { id: memberActor.id, identityId: memberActor.identityId, operationId: memberActor.enrollmentOperationId };
        const bindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
        if (!bindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: candidate.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: candidate.id },
        ], async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const freshBindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
          if (!freshBindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: candidate.identityId, enrollmentOperationId: candidate.operationId,
            registrationState: 'COMPLETE', status: 'ACTIVE', sessionsAsMember: { some: relationPredicate(trainer.id, now) } }, select: { id: true } });
          if (!member) throw new NotFoundException('Client not found');
          const digest = requestDigest({ memberId, planId, ...body });
          const lockKey = `update-workout-plan:${access.identityId}:${planId}`;
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const prior = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'UPDATE_WORKOUT_PLAN', idempotencyKey,
          } } });
          if (prior) {
            if (prior.requestDigest !== digest || prior.resourceType !== 'WORKOUT_PLAN' || prior.resourceId !== planId || prior.state !== 'COMMITTED' || !prior.safeResult) throw new ConflictException('This idempotency key is already bound to another workout plan update');
            const result = workoutPlanCreateResultSchema.safeParse(prior.safeResult);
            if (!result.success || result.data.plan.id !== planId) throw new Error('Stored workout update receipt failed integrity verification');
            return workoutPlanCreateResultSchema.parse({ ...result.data, replayed: true });
          }
          const current = await tx.workoutPlan.findFirst({ where: { id: planId, memberId, trainerId: trainer.id }, include: { exercises: { orderBy: { sortOrder: 'asc' } } } });
          if (!current) throw new NotFoundException('Workout plan not found');
          if (workoutPlanDto(current).revision !== body.expectedRevision) throw new ConflictException('Workout plan changed; reload before editing');
          const updated = await tx.workoutPlan.update({ where: { id: planId }, data: { name: body.name, description: body.description ?? null } });
          await tx.workoutExercise.deleteMany({ where: { planId } });
          await tx.workoutExercise.createMany({ data: body.exercises.map((exercise, sortOrder) => ({ planId, sortOrder, name: exercise.name,
            sets: exercise.sets, reps: exercise.reps ?? null, weightKg: exercise.weightKg ?? null,
            durationMinutes: exercise.durationMinutes ?? null, notes: exercise.notes ?? null })) });
          const plan = await tx.workoutPlan.findUniqueOrThrow({ where: { id: updated.id }, include: { exercises: { orderBy: { sortOrder: 'asc' } } } });
          const result = workoutPlanCreateResultSchema.parse({ plan: workoutPlanDto(plan), replayed: false });
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'UPDATE_WORKOUT_PLAN', idempotencyKey,
            requestDigest: digest, resourceType: 'WORKOUT_PLAN', resourceId: planId, state: 'COMMITTED', safeResult: result, committedAt: now } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'WORKOUT_PLAN_UPDATED', resourceType: 'WORKOUT_PLAN', resourceId: planId,
            transition: { from: body.expectedRevision, to: result.plan.revision } });
          await this.notifyPlan(tx, { receiptId: receipt.id, recipientIdentityId: candidate.identityId, planId, type: 'WORKOUT', updated: true });
          return result;
        });
      }, { isolationLevel: 'Serializable' });
    });
  }

  async memberWorkoutPlans(access: Access, queryInput: unknown) {
    if (access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = memberWorkoutPlansQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) invalid('Enter valid workout plan page details');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Workout plans unavailable');
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const member = await tx.member.findFirst({ where: { id: access.actor!.id, identityId: access.identityId,
          enrollmentOperationId: access.actor!.registrationOperationId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } });
        if (!member) throw new ForbiddenException('Member workout plan access is unavailable');
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: member.id },
        ], async () => {
          const current = await tx.member.findFirst({ where: { id: member.id, identityId: access.identityId,
            enrollmentOperationId: access.actor!.registrationOperationId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } });
          if (!current) throw new ForbiddenException('Member workout plan access is unavailable');
          const where = { memberId: current.id };
          const [totalCount, plans] = await Promise.all([
            tx.workoutPlan.count({ where }),
            tx.workoutPlan.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (parsed.data.page - 1) * parsed.data.pageSize,
              take: parsed.data.pageSize, include: { exercises: { orderBy: { sortOrder: 'asc' } } } }),
          ]);
          return memberWorkoutPlanPageSchema.parse({ items: plans.map(workoutPlanDto), page: parsed.data.page, pageSize: parsed.data.pageSize,
            totalCount, totalPages: Math.ceil(totalCount / parsed.data.pageSize), hasMore: parsed.data.page * parsed.data.pageSize < totalCount,
            asOf: now.toISOString(), timeZone: configuration.timezone });
        });
      }, { isolationLevel: 'RepeatableRead' });
    });
  }

  async trainerWorkoutPlans(access: Access, memberId: string, queryInput: unknown) {
    const parsed = memberWorkoutPlansQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) invalid('Enter valid workout plan page details');
    return this.withRelatedMember(access, memberId, async (tx, member, trainer, now, timeZone) => {
      const where = { memberId: member.id, trainerId: trainer.id };
      const [totalCount, plans] = await Promise.all([
        tx.workoutPlan.count({ where }),
        tx.workoutPlan.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (parsed.data.page - 1) * parsed.data.pageSize,
          take: parsed.data.pageSize, include: { exercises: { orderBy: { sortOrder: 'asc' } } } }),
      ]);
      return memberWorkoutPlanPageSchema.parse({ items: plans.map(workoutPlanDto), page: parsed.data.page, pageSize: parsed.data.pageSize,
        totalCount, totalPages: Math.ceil(totalCount / parsed.data.pageSize), hasMore: parsed.data.page * parsed.data.pageSize < totalCount,
        asOf: now.toISOString(), timeZone });
    });
  }

  async trainerWorkoutPlan(access: Access, memberId: string, planId: string) {
    return this.withRelatedMember(access, memberId, async (tx, member, trainer) => {
      const plan = await tx.workoutPlan.findFirst({ where: { id: planId, memberId: member.id, trainerId: trainer.id }, include: { exercises: { orderBy: { sortOrder: 'asc' } } } });
      if (!plan) throw new NotFoundException('Workout plan not found');
      return workoutPlanViewSchema.parse(workoutPlanDto(plan));
    });
  }

  async trainerMealPlans(access: Access, memberId: string, queryInput: unknown) {
    const parsed = memberWorkoutPlansQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) invalid('Enter valid meal plan page details');
    return this.withRelatedMember(access, memberId, async (tx, member, trainer, now, timeZone) => {
      const where = { memberId: member.id, trainerId: trainer.id };
      const [totalCount, plans] = await Promise.all([
        tx.mealPlan.count({ where }),
        tx.mealPlan.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (parsed.data.page - 1) * parsed.data.pageSize,
          take: parsed.data.pageSize, include: { entries: { orderBy: { sortOrder: 'asc' } } } }),
      ]);
      return memberMealPlanPageSchema.parse({ items: plans.map(mealPlanDto), page: parsed.data.page, pageSize: parsed.data.pageSize,
        totalCount, totalPages: Math.ceil(totalCount / parsed.data.pageSize), hasMore: parsed.data.page * parsed.data.pageSize < totalCount,
        asOf: now.toISOString(), timeZone });
    });
  }

  async trainerMealPlan(access: Access, memberId: string, planId: string) {
    return this.withRelatedMember(access, memberId, async (tx, member, trainer) => {
      const plan = await tx.mealPlan.findFirst({ where: { id: planId, memberId: member.id, trainerId: trainer.id }, include: { entries: { orderBy: { sortOrder: 'asc' } } } });
      if (!plan) throw new NotFoundException('Meal plan not found');
      return mealPlanViewSchema.parse(mealPlanDto(plan));
    });
  }

  async createMealPlan(access: Access, memberId: string, idempotencyKey: string, input: unknown) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = mealPlanCreateSchema.safeParse(input);
    if (!parsed.success) invalid('Enter a valid meal plan with one to 100 entries');
    const body: MealPlanCreate = parsed.data;
    const calories = body.entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
    if (!Number.isSafeInteger(calories) || calories > 10_000_000) invalid('Meal plan calorie total exceeds the safe range');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } });
      if (!configuration || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client not found');
      return tenant.$transaction(async tx => {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        const memberActor = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE' },
          select: { id: true, identityId: true, enrollmentOperationId: true } });
        if (!memberActor?.identityId || !memberActor.enrollmentOperationId) throw new NotFoundException('Client not found');
        const candidate = { id: memberActor.id, identityId: memberActor.identityId, operationId: memberActor.enrollmentOperationId };
        const published = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
        if (!published.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: candidate.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: candidate.id },
        ], async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const freshBindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
          if (!freshBindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: candidate.identityId, enrollmentOperationId: candidate.operationId,
            registrationState: 'COMPLETE', status: 'ACTIVE', sessionsAsMember: { some: relationPredicate(trainer.id, now) } }, select: { id: true } });
          if (!member) throw new NotFoundException('Client not found');
          const digest = requestDigest({ memberId, ...body });
          const lockKey = `meal-plan:${access.identityId}:${idempotencyKey}`;
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const previous = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'ASSIGN_MEAL_PLAN', idempotencyKey,
          } } });
          if (previous) {
            if (previous.requestDigest !== digest || previous.resourceType !== 'MEAL_PLAN' || previous.state !== 'COMMITTED' || !previous.safeResult) throw new ConflictException('This idempotency key is already bound to another meal plan request');
            const result = mealPlanCreateResultSchema.safeParse(previous.safeResult);
            if (!result.success || result.data.plan.id !== previous.resourceId) throw new Error('Stored meal plan receipt failed integrity verification');
            return mealPlanCreateResultSchema.parse({ ...result.data, replayed: true });
          }
          const plan = await tx.mealPlan.create({ data: { memberId, trainerId: trainer.id, name: body.name,
            entries: { create: body.entries.map((entry, sortOrder) => ({ sortOrder, dayOfWeek: entry.dayOfWeek, mealType: entry.mealType,
              foodItem: entry.foodItem, calories: entry.calories ?? null, proteinGrams: entry.proteinGrams ?? null,
              carbsGrams: entry.carbsGrams ?? null, fatsGrams: entry.fatsGrams ?? null })) } },
            include: { entries: { orderBy: { sortOrder: 'asc' } } } });
          const result = mealPlanCreateResultSchema.parse({ plan: mealPlanDto(plan), replayed: false });
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'ASSIGN_MEAL_PLAN', idempotencyKey,
            requestDigest: digest, resourceType: 'MEAL_PLAN', resourceId: plan.id, state: 'COMMITTED', safeResult: result, committedAt: now } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'MEAL_PLAN_ASSIGNED', resourceType: 'MEAL_PLAN', resourceId: plan.id, transition: { to: 'ASSIGNED', version: 0 } });
          await this.notifyPlan(tx, { receiptId: receipt.id, recipientIdentityId: candidate.identityId, planId: plan.id, type: 'MEAL', updated: false });
          return result;
        });
      }, { isolationLevel: 'Serializable' });
    });
  }

  async updateMealPlan(access: Access, memberId: string, planId: string, idempotencyKey: string, input: unknown) {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    const parsed = mealPlanUpdateSchema.safeParse(input);
    if (!parsed.success) invalid('Enter a valid meal plan and current revision');
    const body: MealPlanUpdate = parsed.data;
    const calories = body.entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
    if (!Number.isSafeInteger(calories) || calories > 10_000_000) invalid('Meal plan calorie total exceeds the safe range');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } });
      if (!configuration || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client not found');
      return tenant.$transaction(async tx => {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        const memberActor = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE' },
          select: { id: true, identityId: true, enrollmentOperationId: true } });
        if (!memberActor?.identityId || !memberActor.enrollmentOperationId) throw new NotFoundException('Client not found');
        const candidate = { id: memberActor.id, identityId: memberActor.identityId, operationId: memberActor.enrollmentOperationId };
        const bindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
        if (!bindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: candidate.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: candidate.id },
        ], async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const freshBindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
          if (!freshBindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: candidate.identityId, enrollmentOperationId: candidate.operationId,
            registrationState: 'COMPLETE', status: 'ACTIVE', sessionsAsMember: { some: relationPredicate(trainer.id, now) } }, select: { id: true } });
          if (!member) throw new NotFoundException('Client not found');
          const digest = requestDigest({ memberId, planId, ...body });
          const lockKey = `update-meal-plan:${access.identityId}:${planId}`;
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const prior = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'UPDATE_MEAL_PLAN', idempotencyKey,
          } } });
          if (prior) {
            if (prior.requestDigest !== digest || prior.resourceType !== 'MEAL_PLAN' || prior.resourceId !== planId || prior.state !== 'COMMITTED' || !prior.safeResult) throw new ConflictException('This idempotency key is already bound to another meal plan update');
            const result = mealPlanCreateResultSchema.safeParse(prior.safeResult);
            if (!result.success || result.data.plan.id !== planId) throw new Error('Stored meal update receipt failed integrity verification');
            return mealPlanCreateResultSchema.parse({ ...result.data, replayed: true });
          }
          const current = await tx.mealPlan.findFirst({ where: { id: planId, memberId, trainerId: trainer.id }, include: { entries: { orderBy: { sortOrder: 'asc' } } } });
          if (!current) throw new NotFoundException('Meal plan not found');
          if (mealPlanDto(current).revision !== body.expectedRevision) throw new ConflictException('Meal plan changed; reload before editing');
          await tx.mealPlan.update({ where: { id: planId }, data: { name: body.name } });
          await tx.mealPlanEntry.deleteMany({ where: { planId } });
          await tx.mealPlanEntry.createMany({ data: body.entries.map((entry, sortOrder) => ({ planId, sortOrder, dayOfWeek: entry.dayOfWeek,
            mealType: entry.mealType, foodItem: entry.foodItem, calories: entry.calories ?? null,
            proteinGrams: entry.proteinGrams ?? null, carbsGrams: entry.carbsGrams ?? null, fatsGrams: entry.fatsGrams ?? null })) });
          const plan = await tx.mealPlan.findUniqueOrThrow({ where: { id: planId }, include: { entries: { orderBy: { sortOrder: 'asc' } } } });
          const result = mealPlanCreateResultSchema.parse({ plan: mealPlanDto(plan), replayed: false });
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'UPDATE_MEAL_PLAN', idempotencyKey,
            requestDigest: digest, resourceType: 'MEAL_PLAN', resourceId: planId, state: 'COMMITTED', safeResult: result, committedAt: now } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'MEAL_PLAN_UPDATED', resourceType: 'MEAL_PLAN', resourceId: planId,
            transition: { from: body.expectedRevision, to: result.plan.revision } });
          await this.notifyPlan(tx, { receiptId: receipt.id, recipientIdentityId: candidate.identityId, planId, type: 'MEAL', updated: true });
          return result;
        });
      }, { isolationLevel: 'Serializable' });
    });
  }

  async memberMealPlans(access: Access, queryInput: unknown) {
    if (access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') throw new ForbiddenException('Member access is required');
    const parsed = memberWorkoutPlansQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) invalid('Enter valid meal plan page details');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Meal plans unavailable');
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const member = await tx.member.findFirst({ where: { id: access.actor!.id, identityId: access.identityId,
          enrollmentOperationId: access.actor!.registrationOperationId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } });
        if (!member) throw new ForbiddenException('Member meal plan access is unavailable');
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = clock!.now;
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: member.id },
        ], async () => {
          const current = await tx.member.findFirst({ where: { id: member.id, identityId: access.identityId,
            enrollmentOperationId: access.actor!.registrationOperationId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } });
          if (!current) throw new ForbiddenException('Member meal plan access is unavailable');
          const where = { memberId: current.id };
          const [totalCount, plans] = await Promise.all([
            tx.mealPlan.count({ where }),
            tx.mealPlan.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (parsed.data.page - 1) * parsed.data.pageSize,
              take: parsed.data.pageSize, include: { entries: { orderBy: { sortOrder: 'asc' } } } }),
          ]);
          return memberMealPlanPageSchema.parse({ items: plans.map(mealPlanDto), page: parsed.data.page, pageSize: parsed.data.pageSize,
            totalCount, totalPages: Math.ceil(totalCount / parsed.data.pageSize), hasMore: parsed.data.page * parsed.data.pageSize < totalCount,
            asOf: now.toISOString(), timeZone: configuration.timezone });
        });
      }, { isolationLevel: 'RepeatableRead' });
    });
  }

  private async verifiedTrainer(tx: Prisma.TransactionClient, access: Access) {
    const trainer = await tx.trainer.findFirst({ where: { id: access.actor!.id, identityId: access.identityId,
      enrollmentOperationId: access.actor!.registrationOperationId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true } });
    if (!trainer) throw new ForbiddenException('Trainer access is unavailable');
    return trainer;
  }

  private async withRelatedMember<Result>(access: Access, memberId: string,
    work: (tx: Prisma.TransactionClient, member: { id: string }, trainer: { id: string }, now: Date, timeZone: string) => Promise<Result>): Promise<Result> {
    if (access.role !== 'TRAINER' || access.actor?.kind !== 'TRAINER') throw new ForbiddenException('Trainer access is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
      if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new NotFoundException('Client not found');
      return tenant.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const targetActor = await tx.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE', status: 'ACTIVE' },
          select: { id: true, identityId: true, enrollmentOperationId: true } });
        if (!targetActor?.identityId || !targetActor.enrollmentOperationId) throw new NotFoundException('Client not found');
        const candidate = { id: targetActor.id, identityId: targetActor.identityId, operationId: targetActor.enrollmentOperationId };
        const bindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
        if (!bindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
        return withGymAccessFence(this.database.master, [
          { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
          { identityId: candidate.identityId, gymId: access.gymId, role: 'MEMBER', tenantActorId: candidate.id },
        ], async () => {
          const trainer = await this.verifiedTrainer(tx, access);
          const freshBindings = await this.publishedMemberBindings(tx, access.gymId, [candidate]);
          if (!freshBindings.some(binding => binding.id === candidate.id && binding.identityId === candidate.identityId && binding.operationId === candidate.operationId)) throw new NotFoundException('Client not found');
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: candidate.identityId, enrollmentOperationId: candidate.operationId,
            registrationState: 'COMPLETE', status: 'ACTIVE', sessionsAsMember: { some: relationPredicate(trainer.id, clock!.now) } }, select: { id: true } });
          if (!member) throw new NotFoundException('Client not found');
          return work(tx, member, trainer, clock!.now, configuration.timezone!);
        });
      }, { isolationLevel: 'RepeatableRead' });
    });
  }

  private async notifyPlan(tx: Prisma.TransactionClient, input: { receiptId: string; recipientIdentityId: string; planId: string; type: 'WORKOUT' | 'MEAL'; updated: boolean }) {
    const label = input.type === 'WORKOUT' ? 'workout' : 'meal';
    const eventCode = `${input.type}_PLAN_${input.updated ? 'UPDATED' : 'ASSIGNED'}`;
    const sourceEventKey = `plan:${input.receiptId}:${eventCode}`;
    await tx.notification.create({ data: { recipientIdentityId: input.recipientIdentityId, sourceEventKey, eventCode,
      title: input.updated ? `${label === 'workout' ? 'Workout' : 'Meal'} plan updated` : `New ${label} plan`,
      message: input.updated ? `Your trainer updated a ${label} plan. Review your ${label} plans.` : `Your trainer assigned a ${label} plan. Review your ${label} plans.`,
      linkKind: input.type === 'WORKOUT' ? 'MEMBER_WORKOUT_PLANS' : 'MEMBER_MEAL_PLANS', resourceId: input.planId } });
  }

  private async withTrainerFence<Result>(access: Access, work: () => Promise<Result>) {
    return withGymAccessFence(this.database.master, [
      { identityId: access.identityId, gymId: access.gymId, role: 'TRAINER', tenantActorId: access.actor!.id },
    ], async () => work());
  }

  private async publishedMemberBindings(tx: Prisma.TransactionClient, gymId: string, candidates: MemberBinding[]): Promise<MemberBinding[]> {
    if (!candidates.length) return [];
    const links = await this.database.master.gymAccess.findMany({ where: { gymId, role: 'MEMBER', actorKind: 'MEMBER', linkStatus: 'ACTIVE',
      OR: candidates.map(candidate => ({ userId: candidate.identityId, tenantActorId: candidate.id, enrollmentOperationId: candidate.operationId })) },
      select: { userId: true, tenantActorId: true, enrollmentOperationId: true } });
    if (!links.length) return [];
    const operations = await this.database.master.operation.findMany({ where: { id: { in: links.map(link => link.enrollmentOperationId!) },
      gymId, kind: 'REGISTER_MEMBER', state: 'COMPLETE', tenantCommandReceiptId: { not: null } },
      select: { id: true, actorIdentityId: true, subjectIdentityId: true, tenantActorId: true, tenantCommandReceiptId: true } });
    if (!operations.length) return [];
    const receipts = await tx.commandReceipt.findMany({ where: { sourceMasterOperationId: { in: operations.map(operation => operation.id) },
      state: 'COMMITTED', commandKind: 'REGISTER_MEMBER', resourceType: 'MEMBER' },
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

  private async localDate(tx: Prisma.TransactionClient, now: Date, timeZone: string) {
    const [row] = await tx.$queryRaw<{ today: string }[]>`SELECT to_char(${now}::timestamptz AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS today`;
    return row!.today;
  }

  private async packSummaries(tx: Prisma.TransactionClient, memberIds: string[], localDate: string) {
    const totals = await creditTotals(tx, memberIds, localDate, true);
    return new Map([...totals].map(([id, total]) => [id, { available: total.available, held: total.held, consumed: total.consumed, expired: total.expired }]));
  }
}
