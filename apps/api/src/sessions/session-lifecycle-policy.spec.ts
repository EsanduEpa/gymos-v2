import { describe, expect, it } from 'vitest';
import { cancellationConsequence, noShowIsEligible } from './session-lifecycle.service.js';

describe('DEC-07 cancellation and no-show boundaries', () => {
  const start = Date.UTC(2026, 10, 3, 4, 0, 0);
  const cutoff = start - 24 * 60 * 60_000;
  const grace = start + 15 * 60_000;

  it('keeps cancellation at cutoff free and turns one millisecond later into late cancellation', () => {
    expect(cancellationConsequence(cutoff - 1, start, 1440, true)).toBe('FREE_CANCELLATION');
    expect(cancellationConsequence(cutoff, start, 1440, true)).toBe('FREE_CANCELLATION');
    expect(cancellationConsequence(cutoff + 1, start, 1440, true)).toBe('LATE_CANCELLATION');
    expect(cancellationConsequence(cutoff + 1, start, 1440, false)).toBe('FREE_CANCELLATION');
    expect(cancellationConsequence(start, start, 0, true)).toBe('FREE_CANCELLATION');
    expect(cancellationConsequence(start + 1, start, 0, true)).toBe('LATE_CANCELLATION');
  });

  it('allows no-show at exactly fifteen minutes after start, inclusive', () => {
    expect(noShowIsEligible(grace - 1, start)).toBe(false);
    expect(noShowIsEligible(grace, start)).toBe(true);
    expect(noShowIsEligible(grace + 1, start)).toBe(true);
  });
});
