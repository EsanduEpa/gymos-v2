import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetWriteSchema, expenseCreateSchema, financeReadQuerySchema, financeRevenueSchema, ownerDashboardSchema } from '../dist/finance.js';

test('finance reads require a bounded ordered local date window and normalize page query strings', () => {
  assert.deepEqual(financeReadQuerySchema.parse({ from: '2026-02-01', to: '2026-02-28', page: '2', pageSize: '50' }),
    { from: '2026-02-01', to: '2026-02-28', page: 2, pageSize: 50 });
  assert.equal(financeReadQuerySchema.safeParse({ from: '2026-02-28', to: '2026-02-01' }).success, false);
  assert.equal(financeReadQuerySchema.safeParse({ from: '2025-01-01', to: '2026-02-01' }).success, false);
});

test('expense and budget commands reject extra fields, invalid precision and unsupported currency', () => {
  const expense = { category: 'RENT', amount: '100.00', currency: 'LKR', accountingDate: '2026-11-03', recurring: true, idempotencyKey: 'expense-contract-key-1' };
  assert.equal(expenseCreateSchema.parse(expense).recurring, true);
  for (const value of [{ ...expense, amount: '1.001' }, { ...expense, amount: '-1.00' }, { ...expense, currency: 'EUR' }, { ...expense, extra: true }]) {
    assert.equal(expenseCreateSchema.safeParse(value).success, false);
  }
  assert.equal(budgetWriteSchema.safeParse({ category: 'OTHER', month: '2026-11', amount: '0', currency: 'LKR', expectedVersion: null,
    idempotencyKey: 'budget-contract-key-001', extra: 1 }).success, false);
});

test('operational revenue cannot claim money received and exposes complete page totals', () => {
  const base = { gymSlug: 'test-gym', from: '2026-11-01', to: '2026-11-03', rangeStart: '2026-10-31T18:30:00.000Z',
    rangeEndExclusive: '2026-11-03T18:30:00.000Z', currency: 'LKR', asOf: '2026-11-03T10:00:00.000Z',
    recognitionBasis: 'operational earning; not money received', cashReceived: null, lines: [], page: 1, pageSize: 25, totalCount: 0,
    totals: { completedSession: '0.0000', missedLate: '0.0000', lateCancel: '0.0000', membership: '0.0000', expiredUnusedSeparate: '0.0000', totalOperational: '0.0000' },
    deferred: { membershipUnrecognized: '0.00', packAvailable: '0.00', packHeld: '0.00', expiredPackUnused: '0.00' } };
  assert.equal(financeRevenueSchema.safeParse(base).success, true);
  assert.equal(financeRevenueSchema.safeParse({ ...base, cashReceived: '0.00' }).success, false);
  assert.equal(financeRevenueSchema.safeParse({ ...base, totals: { ...base.totals, totalOperational: 'NaN' } }).success, false);
});

test('owner dashboard requires a local window and bounded honest metrics', () => {
  const metric = { value: 0, definition: 'PT session records; not physical attendance', numerator: 0, denominator: null, sourceCount: 0 };
  const base = { gymSlug: 'harbor-gym', date: '2026-11-04', timeZone: 'Asia/Colombo', rangeStart: '2026-11-03T18:30:00Z',
    rangeEndExclusive: '2026-11-04T18:30:00Z', asOf: '2026-11-04T10:00:00Z', currency: 'LKR',
    metrics: { membersInGym: metric, activeSessions: metric, trainersOnFloor: metric,
      todayOperationalEarning: { value: '0.0000', definition: 'Operational earning; not cash received', numerator: '0.0000', denominator: null, sourceCount: 0, currency: 'LKR' }, pendingRequests: metric },
    earningChart: Array.from({ length: 8 }, (_, i) => ({ startHour: 6 + i * 2, endHour: 8 + i * 2, amount: '0.0000', sourceCount: 0 })), sessions: [], activeSessionItems: [], trainerCards: [] };
  assert.equal(ownerDashboardSchema.safeParse(base).success, true);
  assert.equal(ownerDashboardSchema.safeParse({ ...base, activeSessionItems: [{ id: 'session-1', startedAt: '2026-11-03T12:00:00Z', scheduledStartAt: '2026-11-03T11:00:00Z', memberName: 'Member One', trainerName: 'Trainer One' }] }).success, true);
  assert.equal(ownerDashboardSchema.safeParse({ ...base, sessions: Array.from({ length: 11 }, () => ({})) }).success, false);
});
