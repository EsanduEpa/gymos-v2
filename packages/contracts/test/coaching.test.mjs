import test from 'node:test';
import assert from 'node:assert/strict';
import { memberMealPlanPageSchema, memberWorkoutPlansQuerySchema, mealPlanCreateSchema, mealPlanUpdateSchema, mealPlanViewSchema, trainerClientPageSchema, trainerClientProfileSchema, trainerClientQuerySchema, workoutPlanCreateSchema, workoutPlanUpdateSchema } from '../dist/coaching.js';

test('trainer client queries are strict and page bounds are enforced', () => {
  assert.deepEqual(trainerClientQuerySchema.parse({ q: '  alpha ', page: '2', projection: 'options' }), {
    q: 'alpha', page: 2, pageSize: 25, projection: 'options',
  });
  assert.equal(trainerClientQuerySchema.safeParse({ pageSize: '101' }).success, false);
  assert.equal(trainerClientQuerySchema.safeParse({ page: '0' }).success, false);
  assert.equal(trainerClientQuerySchema.safeParse({ role: 'OWNER' }).success, false);
});

test('trainer roster is a bounded privacy-minimized projection with truthful totals', () => {
  const page = { items: [{ id: 'member-1', fullName: 'Member Alpha', email: 'member@example.test', phone: null, status: 'ACTIVE',
    latestSession: { id: 'session-1', state: 'COMPLETED', scheduledStartAt: '2026-09-01T00:00:00.000Z', scheduledEndAt: '2026-09-01T01:00:00.000Z' },
    usablePackBalance: { available: 2, held: 1 } }], page: 1, pageSize: 25, totalCount: 1, totalPages: 1,
    asOf: '2026-09-01T00:00:00.000Z', timeZone: 'Asia/Colombo' };
  assert.equal(trainerClientPageSchema.safeParse(page).success, true);
  assert.equal(trainerClientPageSchema.safeParse({ ...page, items: [{ ...page.items[0], healthNotes: 'private' }] }).success, false);
  assert.equal(trainerClientPageSchema.safeParse({ ...page, totalCount: -1 }).success, false);
});

test('trainer profile admits bounded private fields only in the authorized profile projection', () => {
  const profile = { client: { id: 'member-1', fullName: 'Member Alpha', email: 'member@example.test', phone: null, dateOfBirth: null,
      emergencyContact: null, healthNotes: 'Only for this related trainer', status: 'ACTIVE' },
    packSummary: { available: 2, held: 0, consumed: 1, expired: 0 },
    recentSessions: { items: [{ id: 'session-1', state: 'COMPLETED', scheduledStartAt: '2026-09-01T00:00:00.000Z',
      scheduledEndAt: '2026-09-01T01:00:00.000Z', notes: null }], limit: 10, totalCount: 1, hasMore: false },
    workouts: { items: [], limit: 2, totalCount: 0, hasMore: false }, meals: { items: [], limit: 2, totalCount: 0, hasMore: false },
    asOf: '2026-09-01T00:00:00.000Z', timeZone: 'Asia/Colombo' };
  assert.equal(trainerClientProfileSchema.safeParse(profile).success, true);
  assert.equal(trainerClientProfileSchema.safeParse({ ...profile, client: { ...profile.client, credentialHash: 'secret' } }).success, false);
  assert.equal(trainerClientProfileSchema.safeParse({ ...profile, workouts: { ...profile.workouts, items: Array(3).fill({}) } }).success, false);
});

test('workout assignment preserves explicit zero, bounds nested rows and member reads cannot select another actor', () => {
  const plan = { name: 'Strength A', description: null, exercises: [
    { name: 'Squat', sets: 3, reps: null, weightKg: '0', durationMinutes: null, notes: null },
  ] };
  assert.equal(workoutPlanCreateSchema.safeParse(plan).success, true);
  assert.equal(workoutPlanCreateSchema.safeParse({ ...plan, exercises: [] }).success, false);
  assert.equal(workoutPlanCreateSchema.safeParse({ ...plan, exercises: [{ ...plan.exercises[0], sets: 101 }] }).success, false);
  assert.equal(workoutPlanCreateSchema.safeParse({ ...plan, exercises: [{ ...plan.exercises[0], weightKg: '1000.001' }] }).success, false);
  assert.equal(workoutPlanCreateSchema.safeParse({ ...plan, internal: 'not allowed' }).success, false);
  assert.equal(workoutPlanUpdateSchema.safeParse({ ...plan, expectedRevision: `d1:${'a'.repeat(64)}` }).success, true);
  assert.equal(workoutPlanUpdateSchema.safeParse({ ...plan, expectedRevision: 'stale' }).success, false);
  assert.equal(memberWorkoutPlansQuerySchema.safeParse({ memberId: 'someone-else' }).success, false);
});

test('meal plan validates Monday-Sunday rows, exact macros, totals and strict member paging', () => {
  const input = { name: 'Nutrition week', entries: [
    { dayOfWeek: 1, mealType: 'Breakfast', foodItem: 'Oats', calories: 0, proteinGrams: '0', carbsGrams: '12.50', fatsGrams: null },
  ] };
  assert.equal(mealPlanCreateSchema.safeParse(input).success, true);
  assert.equal(mealPlanCreateSchema.safeParse({ ...input, entries: [{ ...input.entries[0], dayOfWeek: 0 }] }).success, false);
  assert.equal(mealPlanCreateSchema.safeParse({ ...input, entries: [{ ...input.entries[0], proteinGrams: '10000.01' }] }).success, false);
  assert.equal(mealPlanCreateSchema.safeParse({ ...input, unexpected: true }).success, false);
  const plan = { id: 'meal-1', revision: `d1:${'b'.repeat(64)}`, name: 'Nutrition week', createdAt: '2026-09-01T00:00:00.000Z',
    entries: [{ id: 'entry-1', ...input.entries[0] }], totals: { calories: 0, proteinGrams: '0', carbsGrams: '12.5', fatsGrams: null } };
  assert.equal(mealPlanUpdateSchema.safeParse({ ...input, expectedRevision: plan.revision }).success, true);
  assert.equal(mealPlanUpdateSchema.safeParse({ ...input, expectedRevision: 'stale' }).success, false);
  assert.equal(mealPlanViewSchema.safeParse(plan).success, true);
  assert.equal(mealPlanViewSchema.safeParse({ ...plan, totals: { calories: 10_000_000, proteinGrams: '1000000', carbsGrams: '1000000', fatsGrams: '1000000' } }).success, true);
  assert.equal(memberMealPlanPageSchema.safeParse({ items: [plan], page: 1, pageSize: 20, totalCount: 1, totalPages: 1,
    hasMore: false, asOf: '2026-09-01T00:00:00.000Z', timeZone: 'Asia/Colombo' }).success, true);
  assert.equal(memberWorkoutPlansQuerySchema.safeParse({ memberId: 'substitute' }).success, false);
});

test('trainer history preserves every session outcome without breaking the profile', () => {
  for (const state of ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'EXPIRED']) {
    const history = { items: [{ id: 'history-1', state, scheduledStartAt: '2026-11-07T00:00:00.000Z',
      scheduledEndAt: '2026-11-07T01:00:00.000Z', notes: null }], limit: 10, totalCount: 1, hasMore: false };
    assert.equal(trainerClientProfileSchema.shape.recentSessions.safeParse(history).success, true, state);
    assert.equal(trainerClientProfileSchema.shape.recentSessions.safeParse({ ...history, items: [{ ...history.items[0], state: 'UNKNOWN' }] }).success, false);
  }
});
