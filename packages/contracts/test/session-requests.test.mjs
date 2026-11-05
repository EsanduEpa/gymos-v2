import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionDecisionInputSchema, sessionRequestInputSchema, sessionRequestOptionsSchema, sessionRequestResultSchema } from '../dist/index.js';

test('member session request requires strict local-time input and stable key', () => {
  const value = { trainerId: 'trainer', localDate: '2026-12-01', localTime: '09:30', timeZone: 'Asia/Colombo', type: 'IN_PERSON', durationMinutes: 60,
    idempotencyKey: 'member-session-request-key' };
  assert.equal(sessionRequestInputSchema.parse(value).localDate, value.localDate);
  assert.equal(sessionRequestInputSchema.safeParse({ ...value, creditPackId: 'untrusted' }).success, false);
  assert.equal(sessionRequestInputSchema.safeParse({ ...value, durationMinutes: 14 }).success, false);
});

test('trainer decision normalizes an optional member-visible decline reason', () => {
  const key = 'trainer-session-decision-key';
  assert.equal(sessionDecisionInputSchema.parse({ action: 'ACCEPT', expectedVersion: 0, idempotencyKey: key }).action, 'ACCEPT');
  assert.equal(sessionDecisionInputSchema.safeParse({ action: 'ACCEPT', expectedVersion: 0, reason: 'no', idempotencyKey: key }).success, false);
  assert.equal(sessionDecisionInputSchema.parse({ action: 'DECLINE', expectedVersion: 0, reason: 'Unavailable\r\n today ', idempotencyKey: key }).reason, 'Unavailable\n today');
  assert.equal(sessionDecisionInputSchema.parse({ action: 'DECLINE', expectedVersion: 0, idempotencyKey: key }).action, 'DECLINE');
  assert.equal(sessionDecisionInputSchema.safeParse({ action: 'DECLINE', expectedVersion: 0, reason: 'x'.repeat(501), idempotencyKey: key }).success, false);
});

test('request options exclude private trainer fields', () => {
  const safe = { trainerId: 'trainer', trainerName: 'Trainer Name', level: 'LEVEL_1', specialisations: ['Strength'], shiftStart: '08:00', shiftEnd: '17:00', timeZone: 'Asia/Colombo',
    minimumDurationMinutes: 60, maximumDurationMinutes: 60, currency: 'LKR', availableCredits: 3, heldCredits: 1, expiredCredits: 2, activeMembershipToday: true, asOf: '2026-11-03T10:00:00Z' };
  assert.equal(sessionRequestOptionsSchema.parse(safe).trainerName, safe.trainerName);
  assert.equal(sessionRequestOptionsSchema.safeParse({ ...safe, phone: '+100000' }).success, false);
});

test('request replay outcome binds a stable event id to a selected gym recipient', () => {
  const result = { receiptId: 'receipt', replayed: true, session: { id: 'session', memberId: 'member', trainerId: 'trainer', state: 'PENDING_CONFIRMATION', type: 'IN_PERSON',
    scheduledStartAt: '2026-12-01T04:00:00Z', scheduledEndAt: '2026-12-01T05:00:00Z', timeZone: 'Asia/Colombo', durationMinutes: 60, notes: null, version: 0 },
    notificationOutcome: { eventId: 'notification', recipient: { role: 'TRAINER', actorId: 'trainer' }, gymSlug: 'sample-gym', state: 'AVAILABLE', retryable: false } };
  assert.equal(sessionRequestResultSchema.parse(result).notificationOutcome.eventId, 'notification');
  assert.equal(sessionRequestResultSchema.safeParse({ ...result, notificationOutcome: { ...result.notificationOutcome, href: '/unsafe' } }).success, false);
});
