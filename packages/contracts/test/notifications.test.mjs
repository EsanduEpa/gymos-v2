import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationHref, notificationListQuerySchema, notificationListSchema, notificationReadAllInputSchema } from '../dist/index.js';

test('notification list limit and output are bounded', () => {
  assert.equal(notificationListQuerySchema.parse({}).limit, 5);
  assert.equal(notificationListQuerySchema.parse({ limit: '100' }).limit, 100);
  assert.equal(notificationListQuerySchema.safeParse({ limit: 101 }).success, false);
  assert.equal(notificationListSchema.safeParse({ items: [], unreadCount: 0, asOf: '2026-11-03T00:00:00.000Z', extra: true }).success, false);
});

test('mark-all through instant is validated and hrefs are built from typed local destinations', () => {
  assert.deepEqual(notificationReadAllInputSchema.parse({}), {});
  assert.equal(notificationReadAllInputSchema.safeParse({ through: 'tomorrow' }).success, false);
  assert.equal(notificationHref('gym-alpha', { linkKind: 'MEMBER_SESSIONS', resourceId: 'session_1' }), '/gyms/gym-alpha/sessions/session_1');
  assert.equal(notificationHref('gym-alpha', { linkKind: 'TRAINER_REQUESTS', resourceId: 'session_1' }), '/gyms/gym-alpha/sessions/session_1');
  assert.throws(() => notificationHref('https://evil.test', { linkKind: 'MEMBER_SESSIONS', resourceId: null }));
});
