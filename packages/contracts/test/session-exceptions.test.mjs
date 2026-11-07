import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionExceptionIntentSchema, sessionExceptionCommitSchema } from '../dist/index.js';
const base = { expectedVersion: 2, sourceEventId: 'source-event', reason: 'Owner checked actual delivery evidence' };
test('owner corrections require a source event, bounded reason and named outcome without arbitrary state/credit editing', () => {
  const input = { ...base, kind: 'CORRECTION', target: 'FREE_CANCELLED' };
  assert.equal(sessionExceptionIntentSchema.safeParse(input).success, true);
  for (const changed of [{ ...input, target: 'SCHEDULED' }, { ...input, sourceEventId: '' }, { ...input, reason: '' }, { ...input, creditDelta: 100 }, { ...input, actorIdentityId: 'another-owner' }]) assert.equal(sessionExceptionIntentSchema.safeParse(changed).success, false);
});
test('rescheduling records initiating party and remedies accept only an explicit date, never pack-wide value changes', () => {
  assert.equal(sessionExceptionIntentSchema.safeParse({ ...base, kind: 'RESCHEDULE', initiatedBy: 'MEMBER', localDate: '2026-11-10', localTime: '15:00' }).success, true);
  assert.equal(sessionExceptionIntentSchema.safeParse({ ...base, kind: 'CANCEL', initiatedBy: 'OWNER' }).success, false);
  assert.equal(sessionExceptionIntentSchema.safeParse({ ...base, kind: 'REMEDY', newEndDateExclusive: '2026-11-20', credits: 2 }).success, false);
  assert.equal(sessionExceptionIntentSchema.safeParse({ ...base, kind: 'REMEDY', newEndDateExclusive: '2026-11-31' }).success, false);
});
test('exception commits require the reviewed token and a stable printable key and reject unrelated authority fields', () => {
  const input = { intent: { ...base, kind: 'REMEDY', newEndDateExclusive: '2026-11-20' }, quoteToken: 'synthetic-reviewed-token-over-thirty-two-bytes', idempotencyKey: 'original-request-key-123' };
  assert.equal(sessionExceptionCommitSchema.safeParse(input).success, true);
  assert.equal(sessionExceptionCommitSchema.safeParse({ ...input, quoteToken: '' }).success, false);
  assert.equal(sessionExceptionCommitSchema.safeParse({ ...input, idempotencyKey: 'new key with spaces' }).success, false);
  assert.equal(sessionExceptionCommitSchema.safeParse({ ...input, gymId: 'another-gym' }).success, false);
});
