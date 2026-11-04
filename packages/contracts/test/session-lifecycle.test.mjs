import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionCancelInputSchema, sessionCancelResultSchema, sessionCompleteResultSchema, sessionLifecycleCommandInputSchema,
  sessionLifecycleQuoteSchema, sessionNoShowInputSchema, sessionNoShowResultSchema, sessionNotesInputSchema, sessionNotesResultSchema, sessionStartResultSchema } from '../dist/session-lifecycle.js';

const key = 'session-lifecycle-command-key';
const notificationOutcome = { eventId: 'notification-1', recipient: { role: 'MEMBER', actorId: 'member-1' }, gymSlug: 'sample-gym', state: 'AVAILABLE', retryable: false };
const activeSession = { id: 'session-1', memberId: 'member-1', trainerId: 'trainer-1', state: 'ACTIVE', scheduledStartAt: '2026-11-03T04:00:00Z',
  scheduledEndAt: '2026-11-03T05:00:00Z', startedAt: '2026-11-03T03:45:00Z', endedAt: null, version: 2 };

test('lifecycle commands require a safe stable key and version', () => {
  assert.equal(sessionLifecycleCommandInputSchema.parse({ expectedVersion: 2, idempotencyKey: key }).expectedVersion, 2);
  assert.equal(sessionLifecycleCommandInputSchema.safeParse({ expectedVersion: -1, idempotencyKey: key }).success, false);
  assert.equal(sessionLifecycleCommandInputSchema.safeParse({ expectedVersion: 0, idempotencyKey: 'short' }).success, false);
});

test('notes accept at most 4,000 Unicode codepoints and reject extra fields', () => {
  assert.equal(sessionNotesInputSchema.safeParse({ notes: '🟢'.repeat(4000), expectedVersion: 1, idempotencyKey: key }).success, true);
  assert.equal(sessionNotesInputSchema.safeParse({ notes: '🟢'.repeat(4001), expectedVersion: 1, idempotencyKey: key }).success, false);
  assert.equal(sessionNotesInputSchema.safeParse({ notes: 'ok', expectedVersion: 1, idempotencyKey: key, private: true }).success, false);
});

test('start and notes results are strict and bind notifications to the member', () => {
  assert.equal(sessionStartResultSchema.parse({ receiptId: 'receipt-1', replayed: false, session: activeSession, notificationOutcome }).session.state, 'ACTIVE');
  assert.equal(sessionStartResultSchema.safeParse({ receiptId: 'receipt-1', replayed: false, session: activeSession,
    notificationOutcome: { ...notificationOutcome, recipient: { role: 'TRAINER', actorId: 'trainer-1' } } }).success, false);
  assert.equal(sessionNotesResultSchema.parse({ receiptId: 'receipt-1', replayed: true, sessionId: 'session-1', notes: 'Shared note', version: 4 }).version, 4);
});

test('complete result exposes immutable credit, revenue and snapshot pay outcomes', () => {
  const result = { receiptId: 'receipt-2', replayed: false,
    session: { ...activeSession, state: 'COMPLETED', endedAt: '2026-11-03T04:30:00Z', version: 3 },
    creditEffect: { holdId: 'hold-1', packId: 'pack-1', creditOrdinal: 2, delta: -1, creditValue: '33.33', balance: 0 },
    recognizedRevenue: { recordId: 'revenue-1', amount: '33.33', currency: 'LKR' },
    trainerPay: { recordId: 'pay-1', amount: '13.33', currency: 'LKR', periodId: 'period-1' }, notificationOutcome, auditState: 'AVAILABLE' };
  assert.equal(sessionCompleteResultSchema.parse(result).trainerPay.amount, '13.33');
  assert.equal(sessionCompleteResultSchema.safeParse({ ...result, trainerPay: { ...result.trainerPay, paid: true } }).success, false);
});

test('cancellation/no-show quotes and commands stay strict and require consequence acknowledgment', () => {
  const quote = { sessionId: 'session-1', action: 'CANCEL', state: 'SCHEDULED', sessionVersion: 3, policyVersion: 4,
    asOf: '2026-11-03T04:00:00Z', expiresAt: '2026-11-03T04:02:00Z', eligible: true, eligibleAt: null,
    cancellationCutoff: '2026-11-04T04:00:00Z', consequence: 'FREE_CANCELLATION', requiresAcknowledgment: false,
    acknowledgmentToken: null, creditValue: '100.00', currency: 'LKR', creditOrdinal: 1 };
  assert.equal(sessionLifecycleQuoteSchema.parse(quote).consequence, 'FREE_CANCELLATION');
  assert.equal(sessionLifecycleQuoteSchema.safeParse({ ...quote, secret: 'no' }).success, false);
  assert.equal(sessionCancelInputSchema.safeParse({ expectedVersion: 3, policyVersion: 4, idempotencyKey: key }).success, true);
  assert.equal(sessionCancelInputSchema.safeParse({ expectedVersion: 3, policyVersion: 4, idempotencyKey: key, unexpected: true }).success, false);
  assert.equal(sessionNoShowInputSchema.safeParse({ expectedVersion: 3, policyVersion: 4, idempotencyKey: key }).success, false);
  assert.equal(sessionNoShowInputSchema.safeParse({ expectedVersion: 3, policyVersion: 4, idempotencyKey: key,
    acknowledgmentToken: 'x'.repeat(32) }).success, true);
  const cancelResult = { receiptId: 'receipt-cancel', replayed: false, session: { id: 'session-1', memberId: 'member-1', trainerId: 'trainer-1', state: 'CANCELLED',
    scheduledStartAt: '2026-11-04T04:00:00Z', scheduledEndAt: '2026-11-04T05:00:00Z', startedAt: null, endedAt: '2026-11-03T04:00:00Z', version: 4 },
    consequence: 'FREE_CANCELLATION', isLateCancel: false, deductedCredits: 0,
    creditEffect: { holdId: 'hold-1', packId: 'pack-1', creditOrdinal: 1, resolution: 'RELEASED', creditValue: '100.00', balance: 1 },
    recognizedRevenue: { recordId: null, amount: '0', currency: 'LKR' }, cutoff: quote.cancellationCutoff, policyVersion: 4,
    notificationOutcome: { eventId: 'notice-1', recipient: { role: 'MEMBER', actorId: 'member-1' }, gymSlug: 'gym-a', state: 'AVAILABLE', retryable: false }, auditState: 'AVAILABLE' };
  assert.equal(sessionCancelResultSchema.parse(cancelResult).deductedCredits, 0);
  const noShowResult = { receiptId: 'receipt-missed', replayed: false, session: { id: 'session-1', memberId: 'member-1', trainerId: 'trainer-1', state: 'MISSED',
    scheduledStartAt: '2026-11-03T04:00:00Z', scheduledEndAt: '2026-11-03T05:00:00Z', startedAt: null, endedAt: '2026-11-03T04:16:00Z', version: 4 },
    creditEffect: { holdId: 'hold-1', packId: 'pack-1', creditOrdinal: 1, resolution: 'CONSUMED', creditValue: '100.00', balance: 0 },
    recognizedRevenue: { recordId: 'revenue-1', amount: '100', currency: 'LKR' }, noShowAt: '2026-11-03T04:15:00Z', policyVersion: 4,
    notificationOutcome, auditState: 'AVAILABLE' };
  assert.equal(sessionNoShowResultSchema.parse(noShowResult).session.state, 'MISSED');
});
