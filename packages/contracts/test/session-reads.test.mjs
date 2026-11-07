import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionReadQuerySchema, sessionReadPageSchema, sessionDetailSchema, sessionDetailQuerySchema, sessionAttentionQuerySchema } from '../dist/session-reads.js';

test('session read filters accept only one local date range and bounded paging', () => {
  assert.deepEqual(sessionReadQuerySchema.parse({ month: '2026-09', page: '2', pageSize: '50' }), {
    month: '2026-09', page: 2, pageSize: 50,
  });
  assert.equal(sessionReadQuerySchema.safeParse({ date: '2026-09-01', month: '2026-09' }).success, false);
  assert.equal(sessionReadQuerySchema.safeParse({ from: '2026-09-02' }).success, false);
  assert.equal(sessionReadQuerySchema.safeParse({ month: '2026-13' }).success, false);
  assert.equal(sessionReadQuerySchema.safeParse({ pageSize: '101' }).success, false);
  assert.equal(sessionReadQuerySchema.safeParse({ surprise: 'ignored' }).success, false);
});

test('session page schema validates the role-safe projection shape and summary totals', () => {
  const item = { id: 'session-1', memberId: 'member-1', memberName: 'Member One', trainerId: 'trainer-1', trainerName: 'Trainer One',
    state: 'SCHEDULED', type: 'IN_PERSON', version: 0, scheduledStartAt: '2026-09-01T00:00:00.000Z', scheduledEndAt: '2026-09-01T00:30:00.000Z',
    gymTimeZone: 'Asia/Colombo', startedAt: null, endedAt: null, confirmedAt: null, requestExpiresAt: null, createdAt: '2026-08-31T00:00:00.000Z', fee: '100', currency: 'LKR',
    notes: null, declineReason: null, trainerPay: null, commandAffordances: [] };
  const page = { items: [item], page: 1, pageSize: 25, totalCount: 1, totalPages: 1, asOf: '2026-09-01T00:00:00.000Z',
    timeZone: 'Asia/Colombo', rangeStart: null, rangeEndExclusive: null, filterTotal: 1,
    summary: { monthBookings: null, lifetimePackCredits: null } };
  assert.equal(sessionReadPageSchema.safeParse(page).success, true);
  assert.equal(sessionReadPageSchema.safeParse({ ...page, items: [{ ...item, trainerPay: '2' }] }).success, true);
  assert.equal(sessionReadPageSchema.safeParse({ ...page, pageSize: 0 }).success, false);
  assert.equal(sessionReadPageSchema.safeParse({ ...page, summary: { ...page.summary, lifetimePackCredits: { available: -1, held: 0, consumed: 0, expired: 0 } } }).success, false);
});


test('detail and attention paging reject actor injection and timeline internals', () => {
  assert.deepEqual(sessionDetailQuerySchema.parse({ timelinePage: '2' }), { timelinePage: 2 });
  assert.equal(sessionDetailQuerySchema.safeParse({ memberId: 'another-member' }).success, false);
  assert.equal(sessionAttentionQuerySchema.safeParse({ pageSize: 101 }).success, false);
  assert.equal(sessionAttentionQuerySchema.safeParse({ page: 0 }).success, false);
  assert.equal(sessionDetailSchema.shape.timeline.safeParse([{ from: null, to: 'SCHEDULED', at: '2026-11-06T00:00:00Z', notesUpdated: false, adjustmentKind: null }]).success, true);
  assert.equal(sessionDetailSchema.shape.timeline.safeParse([{ from: null, to: 'SCHEDULED', at: '2026-11-06T00:00:00Z', notesUpdated: false, adjustmentKind: null, actorIdentityId: 'private' }]).success, false);
  assert.equal(sessionDetailSchema.shape.timeline.safeParse(Array.from({ length: 51 }, () => ({ from: null, to: 'SCHEDULED', at: '2026-11-06T00:00:00Z', notesUpdated: false, adjustmentKind: null }))).success, false);
});
