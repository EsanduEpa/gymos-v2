import { expect, it } from 'vitest';
import { sessionCommandAffordances } from './session-reads.service.js';

it('replaces START with NO_SHOW exactly 15 minutes after the scheduled start', () => {
  const end = new Date('2026-11-04T10:00:00.000Z');
  const session = { state: 'SCHEDULED', scheduledStartAt: new Date(end.getTime() - 30 * 60_000), scheduledEndAt: end, startedAt: null };
  const cutoff = new Date('2026-11-04T09:45:00.000Z');
  const before = sessionCommandAffordances(session, 'TRAINER', new Date(cutoff.getTime() - 1));
  expect(before).toContain('START');
  expect(before).not.toContain('NO_SHOW');
  const atCutoff = sessionCommandAffordances(session, 'TRAINER', cutoff);
  expect(atCutoff).not.toContain('START');
  expect(atCutoff).toContain('NO_SHOW');
});
