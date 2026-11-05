import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { DatabaseService } from '../../src/database.service.js';
import { CoachingService } from '../../src/coaching/coaching.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;

beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[coaching-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

async function contextFor(gymIndex: number, role: 'OWNER' | 'TRAINER' | 'MEMBER') {
  const gymRef = fixture.gyms[gymIndex]!;
  const gym = await fixture.master.gym.findUniqueOrThrow({ where: { id: gymRef.id }, include: { expectedTenantOperation: true } });
  const identity = role === 'OWNER' ? gymIndex === 0 ? fixture.users.ownerA : fixture.users.ownerB
    : role === 'TRAINER' ? fixture.users.trainerUser : fixture.users.memberUser;
  const actor = role === 'OWNER' ? null : role === 'TRAINER'
    ? { kind: 'TRAINER', id: (await fixture.tenants[gymIndex]!.trainer.findUniqueOrThrow({ where: { identityId: identity.id } })).id,
      registrationOperationId: (await fixture.tenants[gymIndex]!.trainer.findUniqueOrThrow({ where: { identityId: identity.id } })).enrollmentOperationId! }
    : { kind: 'MEMBER', id: (await fixture.tenants[gymIndex]!.member.findUniqueOrThrow({ where: { identityId: identity.id } })).id };
  const tenant = fixture.tenants[gymIndex]!;
  const gate = new TenantSchemaGateService({ withDatabase: async (_name: string, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as never);
  const service = new CoachingService({ master: fixture.master } as unknown as DatabaseService, gate);
  return { service, tenant, gym, access: { identityId: identity.id, gymId: gym.id, slug: gym.slug, role, actor,
    databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion, expectedTenantManifestDigest: gym.expectedTenantManifestDigest,
    expectedTenantOperationId: gym.expectedTenantOperationId, expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null,
    observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
    observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null } };
}

async function createBoundMember(gymIndex: number, fullName: string) {
  const tenant = fixture.tenants[gymIndex]!;
  const gym = fixture.gyms[gymIndex]!;
  const owner = gymIndex === 0 ? fixture.users.ownerA : fixture.users.ownerB;
  const unique = randomUUID();
  const identity = await fixture.master.user.create({ data: { email: `client-${unique}@example.test`, passwordHash: 'test-only-not-a-login-hash', displayName: fullName } });
  const operationId = `coach_${unique.replaceAll('-', '')}`;
  const receiptId = `receipt_${operationId}`;
  const member = await tenant.member.create({ data: { fullName, email: identity.email, identityId: identity.id, registrationState: 'COMPLETE',
    enrollmentOperationId: operationId, healthNotes: `private-${fullName}` } });
  const idempotencyKey = randomUUID();
  const requestDigest = `d1:${'a'.repeat(64)}`;
  await tenant.commandReceipt.create({ data: { id: receiptId, actorIdentityId: owner.id, commandKind: 'REGISTER_MEMBER', idempotencyKey, requestDigest,
    resourceType: 'MEMBER', resourceId: member.id, sourceMasterOperationId: operationId, state: 'COMMITTED', committedAt: new Date(), safeResult: { resourceId: member.id } } });
  await fixture.master.operation.create({ data: { id: operationId, kind: 'REGISTER_MEMBER', actorIdentityId: owner.id, scopeKey: `gym:${gym.id}`,
    idempotencyKey, requestDigest, gymId: gym.id, subjectIdentityId: identity.id, tenantActorId: member.id,
    tenantCommandReceiptId: receiptId, state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { resourceId: member.id } } });
  await fixture.master.gymAccess.create({ data: { userId: identity.id, gymId: gym.id, role: 'MEMBER', linkStatus: 'ACTIVE', actorKind: 'MEMBER',
    tenantActorId: member.id, enrollmentOperationId: operationId } });
  return { member, identity };
}

async function addSession(input: { memberId: string; trainerId: string; state: 'PENDING_CONFIRMATION' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'; endedAt?: Date; startAt?: Date }) {
  const now = new Date();
  const start = input.startAt ?? (input.endedAt ? new Date(input.endedAt.getTime() - 60 * 60_000) : new Date(now.getTime() + 24 * 60 * 60_000));
  const confirmed = input.state !== 'PENDING_CONFIRMATION';
  return fixture.tenants[0]!.pTSession.create({ data: { id: `coach-session-${randomUUID()}`, memberId: input.memberId, trainerId: input.trainerId,
    state: input.state, type: 'IN_PERSON', scheduledStartAt: start, scheduledEndAt: new Date(start.getTime() + 60 * 60_000), requestExpiresAt: confirmed ? null : new Date(Date.now() + 12 * 60 * 60_000), gymTimezone: 'Asia/Colombo',
    fee: '100.0000', currency: 'LKR', confirmationRate: confirmed ? '0.4' : null, confirmationLevel: confirmed ? 'LEVEL_1' : null, configurationVersion: 0,
    confirmedAt: confirmed ? new Date() : null,
    startedAt: input.state === 'ACTIVE' || input.state === 'COMPLETED' ? start : null,
    endedAt: input.endedAt ?? null, notes: 'approved profile note', createdByIdentityId: fixture.users.ownerA.id } });
}

it('rechecks confirmed relationships, paginates truthful results and keeps health data profile-only', async () => {
  const { service, tenant, access, gym } = await contextFor(0, 'TRAINER');
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { id: access.actor!.id } });
  const active = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const scheduled = await createBoundMember(0, 'Eligible Scheduled');
  const recent = await createBoundMember(0, 'Eligible Recent');
  const pending = await createBoundMember(0, 'Pending Only');
  const inactive = await createBoundMember(0, 'Inactive Client');
  const expired = await createBoundMember(0, 'Exactly Expired');
  const stale = await createBoundMember(0, 'Old Completed');
  const unrelated = await createBoundMember(0, 'Unrelated Client');
  await tenant.member.update({ where: { id: inactive.member.id }, data: { status: 'INACTIVE' } });
  const [databaseNow] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;

  await addSession({ memberId: active.id, trainerId: trainer.id, state: 'ACTIVE', startAt: new Date(Date.now() - 15 * 60_000) });
  await addSession({ memberId: scheduled.member.id, trainerId: trainer.id, state: 'SCHEDULED', startAt: new Date(Date.now() + 24 * 60 * 60_000) });
  await addSession({ memberId: recent.member.id, trainerId: trainer.id, state: 'COMPLETED', endedAt: new Date(Date.now() - 89 * 24 * 60 * 60_000) });
  await addSession({ memberId: pending.member.id, trainerId: trainer.id, state: 'PENDING_CONFIRMATION', startAt: new Date(Date.now() + 2 * 24 * 60 * 60_000) });
  await addSession({ memberId: inactive.member.id, trainerId: trainer.id, state: 'ACTIVE', startAt: new Date(Date.now() + 3 * 24 * 60 * 60_000) });
  await addSession({ memberId: expired.member.id, trainerId: trainer.id, state: 'COMPLETED', endedAt: new Date(databaseNow!.now.getTime() - 90 * 24 * 60 * 60_000) });
  await addSession({ memberId: stale.member.id, trainerId: trainer.id, state: 'COMPLETED', endedAt: new Date(Date.now() - 90 * 24 * 60 * 60_000 - 1000) });

  const before = { sessions: await tenant.pTSession.count(), events: await tenant.sessionStateEvent.count(), movements: await tenant.packCreditMovement.count() };
  const first = await service.listClients(access, { page: 1, pageSize: 1 });
  const second = await service.listClients(access, { page: 2, pageSize: 1 });
  expect(first).toMatchObject({ totalCount: 3, totalPages: 3, page: 1, pageSize: 1, timeZone: 'Asia/Colombo' });
  expect(second).toMatchObject({ totalCount: 3, totalPages: 3, page: 2, pageSize: 1 });
  expect(first.items).toHaveLength(1);
  expect(second.items).toHaveLength(1);
  const all = await service.listClients(access, { q: 'Eligible', pageSize: 10 });
  expect(all.totalCount).toBe(2);
  expect((await service.listClients(access, { projection: 'options', pageSize: 10 })).items).not.toHaveLength(0);
  const exposed = JSON.stringify(all);
  expect(exposed).not.toMatch(/healthNotes|private-Eligible|identityId|passwordHash|databaseName/);
  const profile = await service.clientProfile(access, scheduled.member.id);
  expect(profile.client.healthNotes).toBe('private-Eligible Scheduled');
  expect(profile.recentSessions.items[0]?.notes).toBe('approved profile note');
  await expect(service.clientProfile(access, pending.member.id)).rejects.toBeInstanceOf(NotFoundException);
  await expect(service.clientProfile(access, stale.member.id)).rejects.toBeInstanceOf(NotFoundException);
  await expect(service.clientProfile(access, expired.member.id)).rejects.toBeInstanceOf(NotFoundException);
  await expect(service.clientProfile(access, inactive.member.id)).rejects.toBeInstanceOf(NotFoundException);
  await expect(service.clientProfile(access, unrelated.member.id)).rejects.toBeInstanceOf(NotFoundException);
  await expect(service.listClients({ ...access, role: 'MEMBER', actor: { kind: 'MEMBER', id: active.id } }, {})).rejects.toBeInstanceOf(ForbiddenException);
  expect(gym.id).toBe(access.gymId);
  expect(await tenant.pTSession.count()).toBe(before.sessions);
  expect(await tenant.sessionStateEvent.count()).toBe(before.events);
  expect(await tenant.packCreditMovement.count()).toBe(before.movements);
}, 60_000);

it('hides clients bound only in another gym and denies access after trainer/member revocation', async () => {
  const a = await contextFor(0, 'TRAINER');
  const b = await contextFor(1, 'OWNER');
  const foreign = await b.tenant.member.create({ data: { fullName: 'Foreign Private', healthNotes: 'foreign-health', status: 'ACTIVE' } });
  await expect(a.service.clientProfile(a.access, foreign.id)).rejects.toBeInstanceOf(NotFoundException);
  const local = await createBoundMember(0, 'Revoked Client');
  const trainer = await a.tenant.trainer.findUniqueOrThrow({ where: { id: a.access.actor!.id } });
  await addSession({ memberId: local.member.id, trainerId: trainer.id, state: 'ACTIVE', startAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) });
  const link = await fixture.master.gymAccess.findFirstOrThrow({ where: { userId: local.identity.id, gymId: a.gym.id } });
  await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: link.userId, gymId: link.gymId } }, data: { linkStatus: 'REVOKED' } });
  await expect(a.service.clientProfile(a.access, local.member.id)).rejects.toBeInstanceOf(NotFoundException);
  await expect(a.service.clientProfile({ ...a.access, actor: { ...a.access.actor!, registrationOperationId: 'wrong' } }, local.member.id)).rejects.toThrow();
});

it('assigns a bounded workout once, preserves ordered zero values, and serves only the authenticated member', async () => {
  const trainerContext = await contextFor(0, 'TRAINER');
  const memberContext = await contextFor(0, 'MEMBER');
  const member = await trainerContext.tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await trainerContext.tenant.trainer.findUniqueOrThrow({ where: { id: trainerContext.access.actor!.id } });
  await addSession({ memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', startAt: new Date(Date.now() + 8 * 24 * 60 * 60_000) });
  const other = await createBoundMember(0, 'Other Member Own Plan View');
  const body = { name: 'Strength A', description: null, exercises: [
    { name: 'Squat', sets: 3, reps: 8, weightKg: '0', durationMinutes: null, notes: 'Body weight' },
    { name: 'Carry', sets: 2, reps: null, weightKg: '12.500', durationMinutes: 12, notes: null },
  ] };
  const key = randomUUID();
  const before = { plans: await trainerContext.tenant.workoutPlan.count(), rows: await trainerContext.tenant.workoutExercise.count(),
    receipts: await trainerContext.tenant.commandReceipt.count(), audits: await trainerContext.tenant.auditLog.count(),
    sessions: await trainerContext.tenant.pTSession.count(), movements: await trainerContext.tenant.packCreditMovement.count() };
  const saved = await trainerContext.service.createWorkoutPlan(trainerContext.access, member.id, key, body);
  expect(saved).toMatchObject({ replayed: false, plan: { name: 'Strength A', exercises: [
    { order: 0, name: 'Squat', sets: 3, reps: 8, weightKg: '0', durationMinutes: null, notes: 'Body weight' },
    { order: 1, name: 'Carry', reps: null, weightKg: '12.5', durationMinutes: 12 },
  ] } });
  const replay = await trainerContext.service.createWorkoutPlan(trainerContext.access, member.id, key, body);
  expect(replay).toMatchObject({ replayed: true, plan: { id: saved.plan.id } });
  const profile = await trainerContext.service.clientProfile(trainerContext.access, member.id);
  expect(profile.workouts).toMatchObject({ totalCount: 1, limit: 2, hasMore: false, items: [{ id: saved.plan.id }] });
  const ownPlans = await memberContext.service.memberWorkoutPlans(memberContext.access, { page: 1, pageSize: 5 });
  expect(ownPlans).toMatchObject({ totalCount: 1, hasMore: false, items: [{ id: saved.plan.id }] });
  expect(JSON.stringify(ownPlans)).not.toMatch(/trainerId|identityId|healthNotes|databaseName/);
  const otherPage = await memberContext.service.memberWorkoutPlans({ ...memberContext.access, identityId: other.identity.id,
    actor: { kind: 'MEMBER', id: other.member.id, registrationOperationId: other.member.enrollmentOperationId! } }, {});
  expect(otherPage).toMatchObject({ totalCount: 0, items: [] });
  await expect(trainerContext.service.createWorkoutPlan(trainerContext.access, other.member.id, randomUUID(), body)).rejects.toBeInstanceOf(NotFoundException);
  await expect(memberContext.service.memberWorkoutPlans(memberContext.access, { memberId: other.member.id })).rejects.toThrow();
  expect(await trainerContext.tenant.workoutPlan.count()).toBe(before.plans + 1);
  expect(await trainerContext.tenant.workoutExercise.count()).toBe(before.rows + 2);
  expect(await trainerContext.tenant.commandReceipt.count()).toBe(before.receipts + 1);
  expect(await trainerContext.tenant.auditLog.count()).toBe(before.audits + 1);
  expect(await trainerContext.tenant.pTSession.count()).toBe(before.sessions);
  expect(await trainerContext.tenant.packCreditMovement.count()).toBe(before.movements);
}, 60_000);

it('assigns meal entries once with server-computed totals and only exposes each member own plans', async () => {
  const trainerContext = await contextFor(0, 'TRAINER');
  const memberContext = await contextFor(0, 'MEMBER');
  const member = await trainerContext.tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await trainerContext.tenant.trainer.findUniqueOrThrow({ where: { id: trainerContext.access.actor!.id } });
  await addSession({ memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', startAt: new Date(Date.now() + 10 * 24 * 60 * 60_000) });
  const other = await createBoundMember(0, 'Meal Plan Other Member');
  const body = { name: 'Nutrition plan', entries: [
    { dayOfWeek: 1, mealType: 'Breakfast', foodItem: 'Oats', calories: 300, proteinGrams: '12.50', carbsGrams: '40', fatsGrams: '0' },
    { dayOfWeek: 7, mealType: 'Post-Workout', foodItem: 'Shake', calories: 200, proteinGrams: '25', carbsGrams: '10.25', fatsGrams: null },
  ] };
  const key = randomUUID();
  const before = { plans: await trainerContext.tenant.mealPlan.count(), entries: await trainerContext.tenant.mealPlanEntry.count(),
    receipts: await trainerContext.tenant.commandReceipt.count(), audits: await trainerContext.tenant.auditLog.count() };
  const saved = await trainerContext.service.createMealPlan(trainerContext.access, member.id, key, body);
  expect(saved).toMatchObject({ replayed: false, plan: { name: 'Nutrition plan', totals: {
    calories: 500, proteinGrams: '37.5', carbsGrams: '50.25', fatsGrams: '0',
  }, entries: [{ dayOfWeek: 1, mealType: 'Breakfast' }, { dayOfWeek: 7, mealType: 'Post-Workout' }] } });
  const replay = await trainerContext.service.createMealPlan(trainerContext.access, member.id, key, body);
  expect(replay).toMatchObject({ replayed: true, plan: { id: saved.plan.id } });
  const profile = await trainerContext.service.clientProfile(trainerContext.access, member.id);
  expect(profile.meals).toMatchObject({ totalCount: 1, limit: 2, hasMore: false, items: [{ id: saved.plan.id }] });
  const ownPlans = await memberContext.service.memberMealPlans(memberContext.access, { page: 1, pageSize: 20 });
  expect(ownPlans).toMatchObject({ totalCount: 1, items: [{ id: saved.plan.id }] });
  expect(JSON.stringify(ownPlans)).not.toMatch(/trainerId|identityId|healthNotes|databaseName/);
  const otherPlans = await memberContext.service.memberMealPlans({ ...memberContext.access, identityId: other.identity.id,
    actor: { kind: 'MEMBER', id: other.member.id, registrationOperationId: other.member.enrollmentOperationId! } }, {});
  expect(otherPlans).toMatchObject({ totalCount: 0, items: [] });
  await expect(trainerContext.service.createMealPlan(trainerContext.access, other.member.id, randomUUID(), body)).rejects.toBeInstanceOf(NotFoundException);
  expect(await trainerContext.tenant.mealPlan.count()).toBe(before.plans + 1);
  expect(await trainerContext.tenant.mealPlanEntry.count()).toBe(before.entries + 2);
  expect(await trainerContext.tenant.commandReceipt.count()).toBe(before.receipts + 1);
  expect(await trainerContext.tenant.auditLog.count()).toBe(before.audits + 1);
  await expect(trainerContext.service.createMealPlan(trainerContext.access, member.id, randomUUID(), { ...body, totalCalories: 500 })).rejects.toThrow();
  await expect(trainerContext.service.memberMealPlans({ ...memberContext.access, role: 'TRAINER' }, {})).rejects.toBeInstanceOf(ForbiddenException);
}, 60_000);
