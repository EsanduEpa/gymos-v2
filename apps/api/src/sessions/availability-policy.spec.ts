import { describe, expect, it } from 'vitest';
import { allowedStartMinutes, type AvailabilityRule } from './availability-policy.js';

const weekly = (startMinute: number, endMinute: number): AvailabilityRule => ({ kind: 'WEEKLY_WINDOW', weekday: 1, localDate: null,
  startMinute, endMinute, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveToExclusive: new Date('2027-01-01T00:00:00Z') });
const dated = (startMinute: number, endMinute: number): AvailabilityRule => ({ kind: 'DATED_WINDOW', weekday: null, localDate: new Date('2026-11-09T00:00:00Z'),
  startMinute, endMinute, effectiveFrom: null, effectiveToExclusive: null });
describe('PT availability candidate starts', () => {
  it('requires the full 60 minutes and uses a 15-minute local grid', () => {
    expect(allowedStartMinutes('2026-11-09', [weekly(600, 660)], 1)).toEqual([600]);
    expect(allowedStartMinutes('2026-11-09', [weekly(600, 659)], 1)).toEqual([]);
    expect(allowedStartMinutes('2026-11-09', [weekly(600, 720)], 1)).toEqual([600, 615, 630, 645, 660]);
  });
  it('lets dated windows replace weekly windows and subtracts blocks', () => {
    const rules = [weekly(600, 780), dated(720, 900), { ...dated(765, 795), kind: 'BLOCK' as const }];
    expect(allowedStartMinutes('2026-11-09', rules, 1)).toEqual([795, 810, 825, 840]);
  });
  it('treats a gym closure as unavailable even when a dated window exists', () => {
    const rules: AvailabilityRule[] = [dated(600, 720), { kind: 'GYM_CLOSURE', weekday: null, localDate: new Date('2026-11-09T00:00:00Z'), startMinute: null, endMinute: null, effectiveFrom: null, effectiveToExclusive: null }];
    expect(allowedStartMinutes('2026-11-09', rules, 1)).toEqual([]);
  });
});
