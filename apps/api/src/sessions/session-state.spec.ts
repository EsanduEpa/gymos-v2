import { describe, expect, it } from 'vitest';
import { allocatedPackCreditMinorUnits, derivePackCreditBalance, minorUnitsDecimal, selectEligibleSessionPack, sessionIntervalsOverlap, transitionSession, requestCanBeAccepted, requestExpiryInstant } from './session-state.js';

describe('session state and credit invariants', () => {
  it('expires requests at the earlier of creation plus 12 hours or start minus one hour, with cutoff inclusive for expiry', () => {
    const created = new Date('2026-11-06T00:00:00.000Z');
    expect(requestExpiryInstant(created, new Date('2026-11-06T08:00:00.000Z')).toISOString()).toBe('2026-11-06T07:00:00.000Z');
    expect(requestExpiryInstant(created, new Date('2026-11-06T20:00:00.000Z')).toISOString()).toBe('2026-11-06T12:00:00.000Z');
    const expiry = requestExpiryInstant(created, new Date('2026-11-06T08:00:00.000Z'));
    expect(requestCanBeAccepted(new Date(expiry.getTime() - 1), expiry)).toBe(true);
    expect(requestCanBeAccepted(expiry, expiry)).toBe(false);
    expect(requestCanBeAccepted(new Date(expiry.getTime() + 1), expiry)).toBe(false);
  });
  it('allows only named transitions and requires ACTIVE before completion', () => {
    expect(transitionSession({ state: null, command: 'OWNER_BOOK', actorRole: 'OWNER' })).toBe('SCHEDULED');
    expect(transitionSession({ state: null, command: 'MEMBER_REQUEST', actorRole: 'MEMBER' })).toBe('PENDING_CONFIRMATION');
    expect(transitionSession({ state: 'PENDING_CONFIRMATION', command: 'TRAINER_ACCEPT', actorRole: 'TRAINER' })).toBe('SCHEDULED');
    expect(transitionSession({ state: 'PENDING_CONFIRMATION', command: 'SYSTEM_EXPIRE_REQUEST', actorRole: 'SYSTEM' })).toBe('EXPIRED');
    expect(transitionSession({ state: 'EXPIRED', command: 'TRAINER_ACCEPT', actorRole: 'TRAINER' })).toBeNull();
    expect(transitionSession({ state: 'SCHEDULED', command: 'COMPLETE', actorRole: 'OWNER' })).toBeNull();
    expect(transitionSession({ state: 'ACTIVE', command: 'COMPLETE', actorRole: 'TRAINER' })).toBe('COMPLETED');
    expect(transitionSession({ state: 'COMPLETED', command: 'CANCEL', actorRole: 'OWNER' })).toBeNull();
  });

  it('uses half-open intervals so touching boundaries can book', () => {
    expect(sessionIntervalsOverlap({ start: 10, end: 20 }, { start: 20, end: 30 })).toBe(false);
    expect(sessionIntervalsOverlap({ start: 10, end: 20 }, { start: 19, end: 30 })).toBe(true);
    expect(() => sessionIntervalsOverlap({ start: 10, end: 10 }, { start: 11, end: 12 })).toThrow(RangeError);
  });

  it('conserves issued credits through hold, consume, release and expiry movements', () => {
    const balance = derivePackCreditBalance(3, [
      { available: 3, held: 0, consumed: 0, expired: 0 },
      { available: -1, held: 1, consumed: 0, expired: 0 },
      { available: 0, held: -1, consumed: 1, expired: 0 },
      { available: -1, held: 0, consumed: 0, expired: 1 },
    ]);
    expect(balance).toEqual({ available: 1, held: 0, consumed: 1, expired: 1 });
    expect(() => derivePackCreditBalance(1, [{ available: -1, held: 0, consumed: 0, expired: 0 }])).toThrow(/conservation/);
    expect(() => derivePackCreditBalance(1, [{ available: 0, held: -1, consumed: 0, expired: 0 }])).toThrow(/conservation/);
  });

  it('selects eligible packs by approved expiry and stable tie-break, honoring explicit selection', () => {
    const packs = [
      { id: 'late', startDate: '2026-11-01', endDateExclusive: '2027-01-01', createdAt: new Date('2026-10-01T00:00:00Z'), availableCredits: 1 },
      { id: 'early-b', startDate: '2026-11-01', endDateExclusive: '2026-12-01', createdAt: new Date('2026-10-02T00:00:00Z'), availableCredits: 1 },
      { id: 'early-a', startDate: '2026-11-01', endDateExclusive: '2026-12-01', createdAt: new Date('2026-10-01T00:00:00Z'), availableCredits: 1 },
      { id: 'empty', startDate: '2026-11-01', endDateExclusive: '2026-11-20', createdAt: new Date('2026-09-01T00:00:00Z'), availableCredits: 0 },
    ];
    expect(selectEligibleSessionPack(packs, '2026-11-03')?.id).toBe('early-a');
    expect(selectEligibleSessionPack(packs, '2026-11-03', 'late')?.id).toBe('late');
    expect(selectEligibleSessionPack(packs, '2027-01-01')).toBeNull();
    expect(selectEligibleSessionPack(packs, '2026-11-03', 'empty')).toBeNull();
  });

  it('allocates pack price minor-unit remainders by stable credit ordinal', () => {
    const values = [1, 2, 3].map(ordinal => allocatedPackCreditMinorUnits({ baseMinorUnits: 3333n, remainderMinorUnits: 1,
      issuedCredits: 3, ordinal }));
    expect(values).toEqual([3334n, 3333n, 3333n]);
    expect(values.reduce((sum, value) => sum + value, 0n)).toBe(10000n);
    expect(minorUnitsDecimal(values[0]!)).toBe('33.34');
    expect(() => allocatedPackCreditMinorUnits({ baseMinorUnits: 0n, remainderMinorUnits: 2, issuedCredits: 2, ordinal: 1 })).toThrow(RangeError);
  });
});
