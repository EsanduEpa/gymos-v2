import test from 'node:test';
import assert from 'node:assert/strict';
import { trainerLifecycleResultSchema, trainerStatusInputSchema } from '../dist/trainers.js';

test('trainer status command requires a strict target, version and reason', () => {
  const value = { targetStatus: 'DEACTIVATED', expectedVersion: 4, reason: 'Role ended' };
  assert.deepEqual(trainerStatusInputSchema.parse(value), value);
  for (const invalid of [
    { ...value, expectedVersion: -1 }, { ...value, targetStatus: 'SUSPENDED' }, { ...value, reason: ' ' },
    { ...value, reason: 'x'.repeat(501) }, { ...value, trainerId: 'injected' },
  ]) assert.equal(trainerStatusInputSchema.safeParse(invalid).success, false);
});

test('trainer lifecycle result exposes only safe operation and resource status', () => {
  const value = { operationId: 'operation-1', gymId: 'gym-1', trainerId: 'trainer-1', targetStatus: 'DEACTIVATED',
    state: 'TENANT_COMMITTED', version: 3, retryable: true };
  assert.deepEqual(trainerLifecycleResultSchema.parse(value), value);
  assert.equal(trainerLifecycleResultSchema.safeParse({ ...value, databaseName: 'private-db' }).success, false);
});
