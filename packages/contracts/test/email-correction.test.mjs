import test from 'node:test';
import assert from 'node:assert/strict';
import { emailCorrectionSubmitSchema, emailCorrectionItemSchema, emailCorrectionAdminItemSchema } from '../dist/index.js';

test('email correction requires a valid address and current password, normalizes address, and rejects extra identity claims', () => {
  const parsed = emailCorrectionSubmitSchema.parse({ requestedEmail: ' Person@Example.test ', currentPassword: 'Sensitive-value' });
  assert.equal(parsed.requestedEmail, 'person@example.test');
  assert.equal(emailCorrectionSubmitSchema.safeParse({ ...parsed, identityId: 'other_user' }).success, false);
  assert.equal(emailCorrectionSubmitSchema.safeParse({ requestedEmail: 'invalid', currentPassword: 'x' }).success, false);
});

test('safe correction DTOs are allowlisted and distinguish request record from admin identity data', () => {
  const item = { id: 'request_1', requestedEmail: 'person@example.test', state: 'PENDING', resolution: null, version: 0,
    submittedAt: '2026-11-06T00:00:00.000Z', resolvedAt: null };
  assert.equal(emailCorrectionItemSchema.parse(item).state, 'PENDING');
  assert.equal(emailCorrectionItemSchema.safeParse({ ...item, currentPassword: 'secret' }).success, false);
  assert.equal(emailCorrectionAdminItemSchema.safeParse({ ...item, identityId: 'user_1', currentEmail: 'old@example.test', displayName: null }).success, true);
});
