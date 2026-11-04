import { describe, expect, it } from 'vitest';
import { allocateMembershipMinorUnits, allocatePackCreditMinorUnits } from './finance-arithmetic.js';
import { csvCell, csvDocument } from './finance-csv.js';
import { shiftHours } from '../analytics/analytics.service.js';

describe('finance earning allocations', () => {
  it('conserves a pack price and assigns residual minor units to earlier ordinals', () => {
    const shares = [1, 2, 3].map(ordinal => allocatePackCreditMinorUnits(3333n, 1, 3, ordinal));
    expect(shares).toEqual([3334n, 3333n, 3333n]);
    expect(shares.reduce((sum, value) => sum + value, 0n)).toBe(10_000n);
  });

  it('conserves membership price across every covered date, including leap-year terms', () => {
    const termDays = 366;
    const days = Array.from({ length: termDays }, (_, index) => allocateMembershipMinorUnits(100_001n, termDays, index));
    expect(days.slice(0, 5)).toEqual([274n, 274n, 274n, 274n, 274n]);
    expect(days.reduce((sum, value) => sum + value, 0n)).toBe(100_001n);
    expect(() => allocateMembershipMinorUnits(1n, 0, 0)).toThrow(RangeError);
  });

  it('supports zero and partial daily allocations without floating point', () => {
    expect(allocateMembershipMinorUnits(0n, 31, 30)).toBe(0n);
    const partial = [0, 1, 2].map(index => allocateMembershipMinorUnits(10n, 3, index));
    expect(partial).toEqual([4n, 3n, 3n]);
    expect(partial.slice(0, 2).reduce((sum, value) => sum + value, 0n)).toBe(7n);
  });
});

describe('CSV and analytics helpers', () => {
  it('quotes UTF-8 values, escapes quotes and line breaks, and neutralizes spreadsheet formulas', () => {
    expect(csvCell(' café, "x"\r\ny')).toBe('" café, ""x""\r\ny"');
    for (const formula of ['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1', '   =1']) expect(csvCell(formula)).toBe(`"'${formula}"`);
    expect(csvDocument(['name'], [['東京']])).toBe('\uFEFF"name"\r\n"東京"\r\n');
  });

  it('uses the documented default trainer shift and wraps overnight shifts', () => {
    expect(shiftHours(null, '17:00')).toBe(8);
    expect(shiftHours('22:00', '06:00')).toBe(8);
    expect(shiftHours('09:30', '17:00')).toBe(7.5);
  });
});
