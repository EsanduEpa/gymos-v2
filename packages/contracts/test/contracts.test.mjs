import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  actorLinkSchema, commandSchema, decimalStringSchema, failureSchema,
  gymAccessKeySchema, gymRoleSchema, identitySummarySchema, idempotencyKeySchema, localDateSchema,
  moneySchema, pageQuerySchema, pageSchema, readSchema, signedMoneySchema,
} from '../dist/index.js';
import { existingEndpointContracts } from '../dist/legacy.js';
import { changePasswordInputSchema, credentialAcknowledgementInputSchema, credentialAcknowledgementResultSchema, credentialIssueInputSchema,
  credentialReissueInputSchema, credentialReissueResultSchema, recoveryIssueInputSchema, operatorRecoveryIssueInputSchema,
  recoveryCompleteInputSchema, recoveryIssueResultSchema } from '../dist/credentials.js';
import { createMembershipPlanSchema, gymConfigurationSchema, updateGymThemeSchema } from '../dist/configuration.js';
import { memberEnrollmentConsentInputSchema, memberEnrollmentConsentResultSchema, memberListQuerySchema, memberListSchema,
  memberRegistrationInputSchema, memberRegistrationResultSchema } from '../dist/members.js';

const asOf = '2026-10-23T00:00:00.000Z';
const identity = {
  identityId: 'identity-1', displayName: 'Synthetic owner', email: 'owner@example.test',
  globalRole: 'USER', mustChangePassword: false,
};
const gym = { id: 'gym-1', name: 'Synthetic Gym', slug: 'test-a', status: 'ACTIVE' };
const theme = { primaryColor: '#123456', logoUrl: 'https://example.test/logo.svg' };
const member = { id: 'member-1', fullName: 'Synthetic Member', email: null, status: 'ACTIVE' };
const fixtures = {
  E01: { accessToken: 'fixture-only-token', tokenType: 'Bearer', expiresIn: 900, sessionId: 'session-1', refreshToken: 'A'.repeat(43),
    refreshExpiresAt: asOf, absoluteExpiresAt: asOf, deviceClass: 'SHARED', deviceLabel: 'Chrome on Linux',
    globalRole: 'USER', mustChangePassword: false, gyms: [{ id: gym.id, name: gym.name, slug: gym.slug, role: 'OWNER' }] },
  E02: [gym], E03: gym, E04: { slug: gym.slug, name: gym.name, theme },
  E05: { slug: gym.slug, theme: { ...theme, version: 1 } }, E06: { gymId: gym.id, slug: gym.slug, role: 'OWNER' },
  E07: [member], E08: { ...member, createdAt: asOf },
};

for (const [id, contract] of Object.entries(existingEndpointContracts)) {
  test(`${id} preserves the existing unprefixed response shape`, () => {
    assert.deepEqual(contract.response.parse(fixtures[id]), fixtures[id]);
    assert.ok(contract.path.startsWith('/') && !contract.path.startsWith('/v1'));
  });
}
test('legacy response schemas reject accidentally serialized database secrets', () => {
  for (const [id, contract] of Object.entries(existingEndpointContracts)) {
    const fixture = fixtures[id];
    const injected = Array.isArray(fixture)
      ? [{ ...fixture[0], passwordHash: 'not-a-real-hash' }]
      : { ...fixture, databaseName: 'private-database' };
    assert.equal(contract.response.safeParse(injected).success, false, id);
  }
});
test('legacy parsers preserve currently valid slugs longer than the future common cap', () => {
  const slug = 'a'.repeat(101);
  assert.ok(existingEndpointContracts.E03.response.safeParse({ ...gym, slug }).success);
  assert.ok(existingEndpointContracts.E06.response.safeParse({ gymId: gym.id, slug, role: 'OWNER' }).success);
});
test('identity projection rejects password, database and private health properties', () => {
  assert.deepEqual(identitySummarySchema.parse(identity), identity);
  for (const name of ['passwordHash', 'password', 'accessToken', 'databaseName', 'healthNotes']) {
    assert.equal(identitySummarySchema.safeParse({ ...identity, [name]: 'private' }).success, false);
  }
});
test('roles, actor kinds and composite access keys do not conflate identities and profiles', () => {
  assert.equal(gymRoleSchema.safeParse('GYM_OWNER').success, false);
  assert.deepEqual(actorLinkSchema.parse({ kind: 'MEMBER', memberId: 'member-1' }), { kind: 'MEMBER', memberId: 'member-1' });
  assert.equal(actorLinkSchema.safeParse({ kind: 'TRAINER', memberId: 'member-1' }).success, false);
  assert.equal(actorLinkSchema.safeParse({ kind: 'OWNER', trainerId: 'trainer-1' }).success, false);
  assert.equal(gymAccessKeySchema.safeParse({ identityId: 'i', gymId: 'g', id: 'invented-access-id' }).success, false);
});
test('money uses exact strings and leaves precision/currency support to domain contracts', () => {
  for (const amount of ['0', '0.00', '12345678901234567890.123456789']) {
    assert.equal(moneySchema.parse({ amount, currency: 'LKR' }).amount, amount);
  }
  for (const amount of [10.1, NaN, Infinity, '1e3', '01.00', '+1', '.1', '-1', '-0.00', '1.']) {
    assert.equal(moneySchema.safeParse({ amount, currency: 'LKR' }).success, false);
  }
  assert.equal(moneySchema.safeParse({ amount: '1', currency: 'lkr' }).success, false);
  assert.equal(signedMoneySchema.parse({ amount: '-1.25', currency: 'LKR' }).amount, '-1.25');
  assert.equal(decimalStringSchema.safeParse('-0').success, false);
});
test('configuration contracts keep exact zero, distinguish blank from null, and reject unknown or unsafe values', () => {
  const config = { version: 2, currency: 'LKR', timezone: 'Asia/Colombo', address: '', phone: null, email: null, payPeriod: 'MONTHLY',
    defaultSessionFee: '0', level2SessionFee: null, introSessionFee: '0.00', level1BaseRate: '0', level2BaseRate: '1', offShiftPremium: '0.1',
    cancellationWindowMinutes: 0, lateCancelDeduction: false, minimumSessionDurationMinutes: 15 };
  assert.deepEqual(gymConfigurationSchema.parse(config), config);
  assert.equal(gymConfigurationSchema.safeParse({ ...config, currency: 'EUR' }).success, false);
  assert.equal(gymConfigurationSchema.safeParse({ ...config, defaultSessionFee: 0 }).success, false);
  assert.equal(createMembershipPlanSchema.safeParse({ expectedVersion: 2, name: 'Free', price: '0.00', durationDays: 1 }).success, true);
  assert.equal(createMembershipPlanSchema.safeParse({ expectedVersion: 2, name: 'bad', price: '0', durationDays: 1, gymId: 'foreign' }).success, false);
  assert.equal(updateGymThemeSchema.safeParse({ expectedVersion: 1, primaryColor: '#123456', logoUrl: 'http://example.test/logo.png' }).success, false);
  assert.equal(updateGymThemeSchema.safeParse({ expectedVersion: 1, logoUrl: null }).success, true);
});
test('date and metadata validation rejects malformed calendar dates and private fields', () => {
  assert.equal(localDateSchema.safeParse('2026-02-30').success, false);
  assert.equal(localDateSchema.parse('2024-02-29'), '2024-02-29');
  const schema = readSchema(z.strictObject({ count: z.number().int() }));
  const valid = { data: { count: 0 }, meta: { requestId: 'req-1', asOf, gymSlug: 'test-a', timeZone: 'Asia/Colombo' } };
  assert.deepEqual(schema.parse(valid), valid);
  assert.equal(schema.safeParse({ ...valid, meta: { ...valid.meta, timeZone: 'not/a-zone' } }).success, false);
  assert.equal(schema.safeParse({ ...valid, meta: { ...valid.meta, databaseUrl: 'private' } }).success, false);
});
test('pagination preserves full-filter totals, zero rows and out-of-range pages', () => {
  assert.deepEqual(pageQuerySchema.parse({}), { page: 1, pageSize: 25 });
  assert.deepEqual(pageQuerySchema.parse({ page: '2', pageSize: '20' }), { page: 2, pageSize: 20 });
  for (const query of [{ page: 0 }, { pageSize: 101 }, { page: 1.1 }, { page: 'NaN' }, { skip: 10 },
    { page: true }, { page: [2] }, { page: '0x10' }, { page: '1e2' }, { page: ' 2' }]) {
    assert.equal(pageQuerySchema.safeParse(query).success, false);
  }
  const schema = pageSchema(z.string());
  assert.ok(schema.safeParse({ items: ['row'], page: 5, pageSize: 25, totalCount: 101, totalPages: 5, asOf }).success);
  assert.ok(schema.safeParse({ items: [], page: 6, pageSize: 25, totalCount: 101, totalPages: 5, asOf }).success);
  assert.ok(schema.safeParse({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0, asOf }).success);
  assert.equal(schema.safeParse({ items: [], page: 1, pageSize: 25, totalCount: 101, totalPages: 1, asOf }).success, false);
});
test('member enrollment and paged projections enforce strict profile bounds and safe monetary strings', () => {
  const input = { fullName: 'Synthetic Member', email: 'member@example.test', phone: '+94112223344', dateOfBirth: '1995-06-15',
    emergencyContact: null, healthNotes: 'Synthetic note', membershipPlanId: 'plan-1', idempotencyKey: 'member-enrollment-001' };
  assert.deepEqual(memberRegistrationInputSchema.parse(input), input);
  assert.equal(memberRegistrationInputSchema.safeParse({ ...input, dateOfBirth: '2026-02-30' }).success, false);
  assert.equal(memberRegistrationInputSchema.safeParse({ ...input, healthNotes: 'x'.repeat(4001) }).success, false);
  assert.equal(memberRegistrationInputSchema.safeParse({ ...input, passwordHash: 'never accepted' }).success, false);
  assert.deepEqual(memberListQuerySchema.parse({ page: '2', q: '  alex  ', status: 'ACTIVE' }), { page: 2, pageSize: 25, q: 'alex', status: 'ACTIVE' });
  const pendingEnrollment = { operationId: 'operation-123', status: 'PENDING', replayed: false, consentRequired: true };
  assert.deepEqual(memberRegistrationResultSchema.parse(pendingEnrollment), pendingEnrollment);
  assert.equal(memberRegistrationResultSchema.safeParse({ ...pendingEnrollment, memberId: 'member-123' }).success, false);
  const consentInput = { decision: 'ACCEPT', currentPassword: 'private-current-password' };
  assert.deepEqual(memberEnrollmentConsentInputSchema.parse(consentInput), consentInput);
  assert.equal(memberEnrollmentConsentInputSchema.safeParse({ ...consentInput, token: 'not-accepted' }).success, false);
  assert.deepEqual(memberEnrollmentConsentResultSchema.parse({ operationId: 'operation-123', status: 'CONSENT_RECORDED', replayed: true }),
    { operationId: 'operation-123', status: 'CONSENT_RECORDED', replayed: true });
  const data = { items: [{ id: 'member-1', fullName: 'Synthetic Member', email: null, status: 'ACTIVE', registrationState: 'COMPLETE',
    accountState: 'OPERATIONAL', createdAt: asOf, currentTerm: { id: 'term-1', planName: 'Monthly', startDate: '2026-10-01', endDateExclusive: '2026-11-01',
      agreedPrice: '0.00', currency: 'LKR' } }], page: 1, pageSize: 25, totalCount: 1, totalPages: 1, asOf, summary: { basic: 0, operational: 1, historical: 0, pendingEnrollments: 0, statuses: { ACTIVE: 1, INACTIVE: 0, SUSPENDED: 0 } } };
  assert.deepEqual(memberListSchema.parse(data), data);
  assert.equal(memberListSchema.safeParse({ ...data, items: [{ ...data.items[0], password: 'secret' }] }).success, false);
  assert.equal(memberListSchema.safeParse({ ...data, totalCount: 100, totalPages: 4 }).success, false);
});
test('command results and errors have safe allowlisted envelopes', () => {
  const schema = commandSchema(z.strictObject({ id: z.string() }));
  const result = { ok: true, operationId: 'op-1', data: { id: 'member-1' }, replayed: true,
    effects: { changedResourceIds: ['member-1'], refreshScopes: ['people:member-1'] } };
  assert.deepEqual(schema.parse(result), result);
  assert.equal(schema.safeParse({ ...result, temporaryPassword: 'private' }).success, false);
  const failure = { ok: false, code: 'CONFLICT', message: 'State changed', requestId: 'r-1', retryable: false };
  assert.deepEqual(failureSchema.parse(failure), failure);
  assert.equal(failureSchema.safeParse({ ...failure, details: { passwordHash: 'private' } }).success, false);
  assert.equal(failureSchema.safeParse({ ...failure, code: 'ARBITRARY_ERROR' }).success, false);
  assert.ok(failureSchema.safeParse({ ...failure, code: 'PASSWORD_CHANGE_REQUIRED' }).success);
});
test('idempotency keys implement the approved16–128 printable nonwhitespace ASCII boundary', () => {
  assert.equal(idempotencyKeySchema.parse('intent-0123456789/~'), 'intent-0123456789/~');
  for (const key of ['short', 'x'.repeat(129), 'intent-0123456789\n', 'intent-0123456789 space', 'é'.repeat(16)]) {
    assert.equal(idempotencyKeySchema.safeParse(key).success, false);
  }
});

test('credential contracts enforce password policy and one-time reissue envelopes', () => {
  const validChange = { currentPassword: 'Temporary-42', newPassword: 'New-password-42', confirmPassword: 'New-password-42' };
  assert.deepEqual(changePasswordInputSchema.parse(validChange), validChange);
  for (const invalid of [
    { ...validChange, newPassword: 'LettersOnlyPassword', confirmPassword: 'LettersOnlyPassword' },
    { ...validChange, newPassword: 'ÉléphantOnly', confirmPassword: 'ÉléphantOnly' },
    { ...validChange, newPassword: ' New-password-42', confirmPassword: ' New-password-42' },
    { ...validChange, newPassword: validChange.currentPassword, confirmPassword: validChange.currentPassword },
    { ...validChange, extra: 'ignored fields are forbidden' },
  ]) assert.equal(changePasswordInputSchema.safeParse(invalid).success, false);
  const request = { reason: 'LOST_HANDOFF', expectedVersion: 0, idempotencyKey: 'request-0123456789' };
  assert.deepEqual(credentialIssueInputSchema.parse({}), {});
  assert.equal(credentialIssueInputSchema.safeParse({ identityId: 'must-be-derived-from-operation' }).success, false);
  assert.deepEqual(credentialReissueInputSchema.parse(request), request);
  assert.equal(credentialReissueInputSchema.safeParse({ ...request, idempotencyKey: 'short' }).success, false);
  assert.equal(credentialReissueResultSchema.safeParse({ status: 'ALREADY_ISSUED', deliveryVersion: 1 }).success, true);
  assert.equal(credentialReissueResultSchema.safeParse({ status: 'ISSUED', deliveryVersion: 1, temporaryPassword: 'one-time' }).success, true);
  assert.equal(credentialReissueResultSchema.safeParse({ status: 'ISSUED', deliveryVersion: 1, passwordHash: 'private' }).success, false);
  assert.deepEqual(credentialAcknowledgementInputSchema.parse({ deliveryVersion: 1 }), { deliveryVersion: 1 });
  assert.equal(credentialAcknowledgementInputSchema.safeParse({ deliveryVersion: -1 }).success, false);
  assert.deepEqual(credentialAcknowledgementResultSchema.parse({ status: 'ACKNOWLEDGED', deliveryVersion: 1 }), { status: 'ACKNOWLEDGED', deliveryVersion: 1 });
});

test('staff recovery contracts require fresh verification and keep the one-time secret out of durable input projections', () => {
  const request = { verificationMethod: 'IN_PERSON', reason: 'Identity matched to the gym record.', currentPassword: 'Owner-password-42' };
  assert.deepEqual(recoveryIssueInputSchema.parse(request), request);
  assert.equal(recoveryIssueInputSchema.safeParse({ ...request, currentPassword: '' }).success, false);
  assert.equal(operatorRecoveryIssueInputSchema.safeParse({ email: 'member@example.test', ...request }).success, true);
  const completion = { credentialId: 'recovery-1', secret: 'A'.repeat(43), newPassword: 'Recovery-password-42', confirmPassword: 'Recovery-password-42' };
  assert.deepEqual(recoveryCompleteInputSchema.parse(completion), completion);
  assert.equal(recoveryCompleteInputSchema.safeParse({ ...completion, secret: 'short' }).success, false);
  assert.equal(recoveryIssueResultSchema.safeParse({ credentialId: 'r1', secret: 'A'.repeat(43), expiresAt: asOf, subjectLabel: 'Member' }).success, true);
  assert.equal(recoveryIssueResultSchema.safeParse({ credentialId: 'r1', secret: 'A'.repeat(43), expiresAt: asOf, subjectLabel: 'Member', passwordHash: 'secret' }).success, false);
});

test('profile contracts keep global identity, self-service fields, and owner corrections field-scoped', async () => {
  const { updateAccountProfileSchema, updateSelfMemberProfileSchema, updateSelfTrainerProfileSchema, ownerMemberProfileCorrectionSchema } = await import('../dist/index.js');
  assert.equal(updateAccountProfileSchema.safeParse({ displayName: 'Synthetic account name', expectedVersion: 0, idempotencyKey: 'profile-0123456789' }).success, true);
  assert.equal(updateAccountProfileSchema.safeParse({ displayName: 'Changed', email: 'attacker@example.test', expectedVersion: 0, idempotencyKey: 'profile-0123456789' }).success, false);
  assert.equal(updateSelfMemberProfileSchema.safeParse({ phone: null, emergencyContact: null, expectedVersion: 0, idempotencyKey: 'member-profile-012345' }).success, true);
  assert.equal(updateSelfMemberProfileSchema.safeParse({ phone: null, emergencyContact: null, healthNotes: 'private', expectedVersion: 0, idempotencyKey: 'member-profile-012345' }).success, false);
  const trainer = { phone: null, biography: 'Synthetic biography', specialisations: ['Strength', 'Mobility'], yearsExperience: 8, expectedVersion: 1, idempotencyKey: 'trainer-profile-012345' };
  assert.equal(updateSelfTrainerProfileSchema.safeParse(trainer).success, true);
  assert.equal(updateSelfTrainerProfileSchema.safeParse({ ...trainer, specialisations: ['Strength', 'strength'] }).success, false);
  assert.equal(updateSelfTrainerProfileSchema.safeParse({ ...trainer, level: 'LEVEL_2' }).success, false);
  const correction = { fullName: 'Synthetic Corrected Name', dateOfBirth: null, phone: null, emergencyContact: null, expectedVersion: 2,
    reason: 'MEMBER_REQUEST', idempotencyKey: 'owner-profile-0123456' };
  assert.equal(ownerMemberProfileCorrectionSchema.safeParse(correction).success, true);
  assert.equal(ownerMemberProfileCorrectionSchema.safeParse({ ...correction, status: 'SUSPENDED' }).success, false);
});

test('shell session projection excludes credential and connection material', async () => {
  const { currentSessionSchema, logoutResultSchema } = await import('../dist/legacy.js');
  const session = { identityId: 'identity-1', displayName: 'Synthetic owner', globalRole: 'USER', mustChangePassword: false,
    sessionId: 'session-1', refreshExpiresAt: asOf, absoluteExpiresAt: asOf, deviceClass: 'SHARED', deviceLabel: 'Chrome on Linux',
    lastActivityAt: asOf, gyms: fixtures.E01.gyms };
  assert.deepEqual(currentSessionSchema.parse(session), session);
  assert.deepEqual(logoutResultSchema.parse({ revoked: true }), { revoked: true });
  assert.equal(logoutResultSchema.safeParse({ revoked: false }).success, false);
  assert.equal(logoutResultSchema.safeParse({ revoked: true, accessToken: 'fixture-only' }).success, false);
  for (const field of ['accessToken', 'refreshToken', 'passwordHash', 'databaseName', 'authVersion']) {
    assert.equal(currentSessionSchema.safeParse({ ...session, [field]: 'fixture-only' }).success, false);
  }
});
