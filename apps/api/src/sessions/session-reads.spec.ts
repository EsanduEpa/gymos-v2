import { expect, it } from 'vitest';
import { sessionCommandAffordances } from './session-reads.service.js';

it('keeps START available at the scheduled end instant and removes it immediately after', () => {
  const end = new Date('2026-11-04T10:00:00.000Z');
  const session = { state: 'SCHEDULED', scheduledStartAt: new Date(end.getTime() - 30 * 60_000), scheduledEndAt: end, startedAt: null };
  expect(sessionCommandAffordances(session, 'TRAINER', end)).toContain('START');
  expect(sessionCommandAffordances(session, 'TRAINER', new Date(end.getTime() + 1))).not.toContain('START');
});
