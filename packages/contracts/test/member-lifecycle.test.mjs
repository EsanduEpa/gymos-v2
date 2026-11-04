import test from 'node:test';
import assert from 'node:assert/strict';
import { memberLifecycleResultSchema, memberStatusCommandSchema } from '../dist/member-lifecycle.js';

test('accepts the three explicit member statuses and bounded reason', () => {
  assert.deepEqual(memberStatusCommandSchema.parse({ targetStatus: 'SUSPENDED', expectedVersion: 2, reason: 'Access request' }),
    { targetStatus: 'SUSPENDED', expectedVersion: 2, reason: 'Access request' });
  assert.equal(memberStatusCommandSchema.safeParse({ targetStatus: 'EXPIRED', expectedVersion: 2, reason: 'x' }).success, false);
  assert.equal(memberStatusCommandSchema.safeParse({ targetStatus: 'INACTIVE', expectedVersion: 2, reason: 'x'.repeat(501) }).success, false);
  assert.equal(memberStatusCommandSchema.safeParse({ targetStatus: 'ACTIVE', expectedVersion: 2, reason: ' valid ', extra: true }).success, false);
});
test('returns only safe operation outcome fields', () => {
  assert.equal(memberLifecycleResultSchema.parse({ operationId: 'op-1', gymId: 'gym-1', memberId: 'member-1', targetStatus: 'INACTIVE',
    state: 'COMPLETE', version: 5, retryable: false, cancelledSessionCount: 3 }).cancelledSessionCount, 3);
});
