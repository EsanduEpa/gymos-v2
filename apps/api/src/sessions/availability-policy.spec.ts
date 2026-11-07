import { describe, expect, it } from 'vitest';
import { allowedStartMinutes, resolvedStartSlots, type AvailabilityRule } from './availability-policy.js';

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

describe('gym-local PT slots', () => {
  it('keeps fractional UTC offsets when booking from a local clock', () => {
    const slots = resolvedStartSlots('2026-11-09', [540], 'Asia/Kathmandu');
    expect(slots.map(slot => ({ start: slot.start.toISOString(), offset: slot.offset }))).toEqual([
      { start: '2026-11-09T03:15:00.000Z', offset: '+05:45' },
    ]);
  });
  it('omits a daylight-saving gap and offers both instants in a repeated hour', () => {
    expect(resolvedStartSlots('2026-03-08', [150], 'America/New_York')).toEqual([]);
    const repeated = resolvedStartSlots('2026-11-01', [90], 'America/New_York');
    expect(repeated.map(slot => ({ start: slot.start.toISOString(), offset: slot.offset }))).toEqual([
      { start: '2026-11-01T05:30:00.000Z', offset: '-04:00' },
      { start: '2026-11-01T06:30:00.000Z', offset: '-05:00' },
    ]);
  });
});
