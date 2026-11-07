import test from 'node:test';
import assert from 'node:assert/strict';
import {
  memberApplicationDecisionSchema, memberApplicationStatusSchema,
  publicMemberApplicationInputSchema, notificationHref,
} from '../dist/index.js';

test('public member applications normalize email and require explicit consent and shared password policy', () => {
  const parsed = publicMemberApplicationInputSchema.parse({ slug: 'gym-alpha', fullName: 'Synthetic Member',
    email: ' Person@Example.test ', phone: '+94110000000', password: 'Synthetic-pass-8', consent: true });
  assert.equal(parsed.email, 'person@example.test');
  assert.equal(publicMemberApplicationInputSchema.safeParse({ ...parsed, consent: false }).success, false);
  assert.equal(publicMemberApplicationInputSchema.safeParse({ ...parsed, password: 'lettersOnly' }).success, false);
  assert.equal(publicMemberApplicationInputSchema.safeParse({ ...parsed, role: 'OWNER' }).success, false);
});

test('application decisions are strict, versioned, and owner rejection details are separately bounded', () => {
  assert.equal(memberApplicationDecisionSchema.safeParse({ decision: 'APPROVE', expectedVersion: 0,
    membershipPlanId: 'plan_1', dateOfBirth: '1990-01-01', privateNote: 'injected' }).success, false);
  assert.equal(memberApplicationDecisionSchema.safeParse({ decision: 'REJECT', expectedVersion: 2,
    applicantReason: 'Contact us', privateNote: 'staff only' }).success, true);
  assert.equal(memberApplicationDecisionSchema.safeParse({ decision: 'REJECT', expectedVersion: -1 }).success, false);
});

test('applicant status exposes no credentials and application target routing is typed', () => {
  const status = { id: 'application_1', gymSlug: 'gym-alpha', gymName: 'Gym Alpha', fullName: 'Synthetic Member',
    state: 'PROCESSING', createdAt: '2026-11-06T00:00:00.000Z', applicantReason: null, canWithdraw: false,
    enrollmentOperationId: 'operation_1', consentRecorded: false, membershipPlanId: 'plan_1', dateOfBirth: '1990-01-01',
    membershipPlanName: 'Monthly', membershipPrice: '1250.00', membershipCurrency: 'LKR', membershipDurationDays: 30 };
  assert.equal(memberApplicationStatusSchema.parse(status).state, 'PROCESSING');
  assert.equal(memberApplicationStatusSchema.safeParse({ ...status, passwordHash: 'secret' }).success, false);
  assert.equal(notificationHref('gym-alpha', { linkKind: 'MEMBER_APPLICATIONS', resourceId: 'application_1' }),
    '/applications#application_1');
  assert.equal(notificationHref('gym-alpha', { linkKind: 'OWNER_APPLICATIONS', resourceId: null }),
    '/gyms/gym-alpha/owner/applications');
});
