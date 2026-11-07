import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { ServiceUnavailableException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { MemberApplicationsService } from '../../src/member-applications.service.js';
import { GymAccessGuard } from '../../src/gym-access.guard.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';

let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let master: MasterClient;
const password = 'Synthetic-Applicant-7!';
const jwtSecret = 'member-applications-test-secret-at-least-32-bytes';
let previousJwtSecret: string | undefined;

beforeAll(async () => {
  previousJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = jwtSecret;
  run = await createDisposablePostgresRun();
  await run.migrate(run.masterName, 'master');
  master = new MasterClient({ adapter: new PrismaPg({ connectionString: run.masterUrl, max: 4 }) });
}, 120_000);
afterAll(async () => {
  await master?.$disconnect();
  if (run) console.info('[member-applications-owned-run]', JSON.stringify({ runId: run.runId, cleanup: await run.cleanup() }));
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousJwtSecret;
}, 120_000);

it('preserves self-created credentials, normalizes duplicate submissions, scopes status, serializes decisions, and recovers approval after outage', async () => {
  const gym = await master.gym.create({ data: { name: 'Synthetic Applications Gym', slug: 'applications-'+run.runId,
    databaseName: run.tenantNames[0]!, status: 'ACTIVE' } });
  const owner = await master.user.create({ data: { email: 'owner-'+run.runId+'@example.test',
    passwordHash: await argon2.hash('Owner-Synthetic-8!', { type: argon2.argon2id }) } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const ownerAccess = { identityId: owner.id, gymId: gym.id, role: 'OWNER' as const, identityVersion: 0, accessVersion: 0,
    slug: gym.slug, gymStatus: 'ACTIVE' as const, databaseName: run.tenantNames[0]!, expectedTenantSchemaVersion: null,
    expectedTenantManifestDigest: null, expectedTenantOperationId: null, expectedTenantOperationState: null,
    observedTenantSchemaVersion: null, observedTenantManifestDigest: null };
  const plan = { id: 'synthetic-plan', name: 'Monthly', price: { toString: () => '1250.00' }, currency: 'LKR',
    durationDays: 30, status: 'ACTIVE', version: 3 };
  const tenant = { gymConfiguration: { findUnique: async () => ({ currency: 'LKR', timezone: 'Asia/Colombo' }) },
    membershipPlan: { findUnique: async () => plan }, $queryRaw: async () => [{ now: new Date('2026-11-06T00:00:00.000Z') }] };
  const tenantGate = { withVerifiedTenant: async (_access: unknown, work: (value: typeof tenant) => unknown) => work(tenant) };
  let enrollmentCalls = 0;
  const enrollment = { enroll: async (_access: unknown, _input: unknown, applicationId: string) => {
    enrollmentCalls++;
    const current = await master.memberApplication.findUniqueOrThrow({ where: { id: applicationId } });
    if (!current.enrollmentOperationId) {
      await master.memberApplication.update({ where: { id: applicationId },
        data: { enrollmentOperationId: 'operation-'+applicationId, version: { increment: 1 } } });
      throw new ServiceUnavailableException('Synthetic tenant outage');
    }
    return { operationId: current.enrollmentOperationId, status: 'COMPLETE', replayed: true,
      memberId: 'synthetic-member', term: { id: 'synthetic-term', planName: 'Monthly', startDate: '2026-11-06',
        endDateExclusive: '2026-12-06', agreedPrice: '1250.00', currency: 'LKR' } };
  } };
  const service = new MemberApplicationsService({ master } as never, enrollment as never, tenantGate as never);
  const submission = { slug: gym.slug, fullName: 'Synthetic Applicant', email: 'Applicant-'+run.runId+'@Example.test',
    phone: '+94110000001', password, consent: true as const };
  expect(await service.publicApply(submission)).toEqual({ submitted: true });
  expect(await service.publicApply({ ...submission, email: ' applicant-'+run.runId+'@example.test ' })).toEqual({ submitted: true });
  const identity = await master.user.findUniqueOrThrow({ where: { email: 'applicant-'+run.runId+'@example.test' } });
  expect(await argon2.verify(identity.passwordHash, password)).toBe(true);
  expect(await master.gymAccess.count({ where: { userId: identity.id, gymId: gym.id } })).toBe(0);
  const token = await new SignJWT({ authVersion: identity.authVersion }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(identity.id).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m')
    .sign(new TextEncoder().encode(jwtSecret));
  const guard = new GymAccessGuard({ master } as never, {} as never);
  const requestContext = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${token}` }, params: { slug: gym.slug } }) }) };
  await expect(guard.canActivate(requestContext as never)).rejects.toMatchObject({ status: 403 });
  expect(await master.memberApplication.count({ where: { identityId: identity.id, gymId: gym.id } })).toBe(1);
  const status = await service.ownApplications(identity.id, identity.authVersion);
  expect(status).toHaveLength(1);
  expect(status[0]?.state).toBe('PENDING');
  await expect(service.ownApplications(owner.id, owner.authVersion)).resolves.toHaveLength(0);
  expect((await service.applicantNotices(identity.id, identity.authVersion)).items[0]?.eventCode).toBe('APPLICANT_SUBMITTED');
  expect((await service.ownerNotices(ownerAccess as never)).items[0]?.eventCode).toBe('OWNER_NEW_APPLICATION');

  const firstQueue = await service.ownerQueue(ownerAccess as never, 1, 25);
  const application = firstQueue.items[0]!;
  const decision = { decision: 'APPROVE' as const, expectedVersion: application.version, membershipPlanId: plan.id, dateOfBirth: '1990-01-02' };
  await expect(service.decide(ownerAccess as never, application.id, decision)).rejects.toBeInstanceOf(ServiceUnavailableException);
  const pending = await master.memberApplication.findUniqueOrThrow({ where: { id: application.id } });
  expect(pending.state).toBe('PROCESSING');
  expect(pending.enrollmentOperationId).toBeTruthy();
  expect(await master.gymAccess.count({ where: { userId: identity.id, gymId: gym.id } })).toBe(0);
  expect(await argon2.verify((await master.user.findUniqueOrThrow({ where: { id: identity.id } })).passwordHash, password)).toBe(true);

  const retry = (await service.ownerQueue(ownerAccess as never, 1, 25)).items[0]!;
  const completed = await service.decide(ownerAccess as never, retry.id, { ...decision, expectedVersion: retry.version });
  expect(completed.state).toBe('APPROVED');
  expect(enrollmentCalls).toBe(2);
  expect(await master.gymAccess.count({ where: { userId: identity.id, gymId: gym.id } })).toBe(0);
  expect((await service.applicantNotices(identity.id, identity.authVersion)).items.some(item => item.eventCode === 'APPLICANT_APPROVED')).toBe(true);
});

it('allows one concurrent rejection and keeps private owner notes out of applicant status', async () => {
  const gym = await master.gym.create({ data: { name: 'Synthetic Reject Gym', slug: 'reject-'+run.runId,
    databaseName: run.tenantNames[1]!, status: 'ACTIVE' } });
  const owner = await master.user.create({ data: { email: 'reject-owner-'+run.runId+'@example.test',
    passwordHash: await argon2.hash('Owner-Synthetic-9!', { type: argon2.argon2id }) } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const applicant = await master.user.create({ data: { email: 'reject-applicant-'+run.runId+'@example.test',
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  await master.memberApplication.create({ data: { gymId: gym.id, identityId: applicant.id, fullName: 'Review Applicant',
    phone: '+94110000002', consentedAt: new Date() } });
  const access = { identityId: owner.id, gymId: gym.id, role: 'OWNER' as const, identityVersion: 0, accessVersion: 0 };
  const service = new MemberApplicationsService({ master } as never, {} as never, {} as never);
  const item = (await service.ownerQueue(access as never, 1, 25)).items[0]!;
  const input = { decision: 'REJECT' as const, expectedVersion: item.version, applicantReason: 'Please contact the gym.',
    privateNote: 'Synthetic owner-only note.' };
  const outcomes = await Promise.allSettled([service.decide(access as never, item.id, input), service.decide(access as never, item.id, input)]);
  expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect((await service.ownerQueue(access as never, 1, 25)).items[0]?.privateNote).toBe('Synthetic owner-only note.');
  const applicantRead = await service.ownApplications(applicant.id, applicant.authVersion);
  expect(applicantRead[0]?.applicantReason).toBe('Please contact the gym.');
  expect(JSON.stringify(applicantRead)).not.toContain('Synthetic owner-only note.');
  expect((await service.applicantNotices(applicant.id, applicant.authVersion)).items.some(item => item.eventCode === 'APPLICANT_REJECTED')).toBe(true);
  await service.authenticatedApply(gym.slug, applicant.id, applicant.authVersion, { fullName: 'Review Applicant', phone: '+94110000002' });
  expect(await master.memberApplication.count({ where: { identityId: applicant.id, gymId: gym.id } })).toBe(2);
  const other = await master.user.create({ data: { email: 'foreign-'+run.runId+'@example.test', passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  expect((await service.applicantNotices(other.id, other.authVersion)).items).toHaveLength(0);
  await expect(service.markNoticeRead(other.id, other.authVersion, (await service.applicantNotices(applicant.id, applicant.authVersion)).items[0]!.id))
    .rejects.toMatchObject({ status: 404 });
  expect(await master.gymAccess.count({ where: { userId: applicant.id } })).toBe(0);
});

it('requires an authenticated account to apply for an existing identity and preserves its credential hash', async () => {
  const gym = await master.gym.create({ data: { name: 'Synthetic Existing Gym', slug: 'existing-' + run.runId,
    databaseName: 'synthetic_existing_' + run.runId, status: 'ACTIVE' } });
  const existingHash = await argon2.hash('Applicant-Existing-4!', { type: argon2.argon2id });
  const existing = await master.user.create({ data: { email: 'existing-' + run.runId + '@example.test', passwordHash: existingHash } });
  const service = new MemberApplicationsService({ master } as never, {} as never, {} as never);
  const submitted = await service.authenticatedApply(gym.slug, existing.id, existing.authVersion,
    { fullName: 'Existing Member', phone: '+94110000003' });
  expect(submitted).toEqual({ submitted: true });
  expect(await master.gymAccess.count({ where: { userId: existing.id, gymId: gym.id } })).toBe(0);
  const after = await master.user.findUniqueOrThrow({ where: { id: existing.id } });
  expect(after.passwordHash).toBe(existingHash);
  await expect(service.authenticatedApply(gym.slug, existing.id, existing.authVersion,
    { fullName: 'Existing Member', phone: '+94110000003' })).resolves.toEqual({ submitted: true });
  expect(await master.memberApplication.count({ where: { identityId: existing.id, gymId: gym.id } })).toBe(1);
  const firstApplication = await master.memberApplication.findFirstOrThrow({ where: { identityId: existing.id, gymId: gym.id } });
  await expect(service.withdraw(existing.id, existing.authVersion, firstApplication.id)).resolves.toMatchObject({ state: 'WITHDRAWN' });
  await service.authenticatedApply(gym.slug, existing.id, existing.authVersion, { fullName: 'Existing Member', phone: '+94110000003' });
  expect(await master.memberApplication.count({ where: { identityId: existing.id, gymId: gym.id } })).toBe(2);
  await expect(service.authenticatedApply(gym.slug, existing.id, existing.authVersion + 1,
    { fullName: 'Existing Member', phone: '+94110000003' })).rejects.toMatchObject({ status: 403 });
});

it('serializes competing approval and rejection without producing both applicant outcomes', async () => {
  const gym = await master.gym.create({ data: { name: 'Synthetic Decision Race', slug: 'decision-race-' + run.runId,
    databaseName: 'synthetic_decision_' + run.runId, status: 'ACTIVE' } });
  const owner = await master.user.create({ data: { email: 'decision-owner-' + run.runId + '@example.test',
    passwordHash: await argon2.hash('Owner-Synthetic-11!', { type: argon2.argon2id }) } });
  await master.gymAccess.create({ data: { userId: owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
  const applicant = await master.user.create({ data: { email: 'decision-applicant-' + run.runId + '@example.test',
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  const application = await master.memberApplication.create({ data: { gymId: gym.id, identityId: applicant.id,
    fullName: 'Decision Applicant', phone: '+94110000004', consentedAt: new Date() } });
  const access = { identityId: owner.id, gymId: gym.id, role: 'OWNER' as const, identityVersion: 0, accessVersion: 0 };
  const plan = { id: 'race-plan', name: 'Race Plan', price: { toString: () => '10.00' }, currency: 'LKR', durationDays: 30, status: 'ACTIVE', version: 0 };
  const tenant = { gymConfiguration: { findUnique: async () => ({ currency: 'LKR', timezone: 'Asia/Colombo' }) },
    membershipPlan: { findUnique: async () => plan }, $queryRaw: async () => [{ now: new Date('2026-11-06T00:00:00.000Z') }] };
  const tenantGate = { withVerifiedTenant: async (_access: unknown, work: (value: typeof tenant) => unknown) => work(tenant) };
  const enrollment = { enroll: async (_access: unknown, _input: unknown, applicationId: string) => {
    const operationId = 'race-operation-' + applicationId;
    await master.memberApplication.update({ where: { id: applicationId }, data: { enrollmentOperationId: operationId } });
    return { operationId, status: 'PENDING', replayed: false, consentRequired: true };
  } };
  const service = new MemberApplicationsService({ master } as never, enrollment as never, tenantGate as never);
  const input = { expectedVersion: application.version };
  const outcomes = await Promise.allSettled([
    service.decide(access as never, application.id, { ...input, decision: 'REJECT' }),
    service.decide(access as never, application.id, { ...input, decision: 'APPROVE', membershipPlanId: plan.id, dateOfBirth: '1990-01-02' }),
  ]);
  expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(1);
  const final = await master.memberApplication.findUniqueOrThrow({ where: { id: application.id } });
  expect(['REJECTED', 'PROCESSING']).toContain(final.state);
  const events = await master.memberApplicationNotice.findMany({ where: { applicationId: application.id }, select: { event: true } });
  expect(events.filter(event => event.event === 'APPLICANT_REJECTED' || event.event === 'APPLICANT_APPROVED'))
    .toHaveLength(final.state === 'REJECTED' ? 1 : 0);
  expect(await master.gymAccess.count({ where: { userId: applicant.id, gymId: gym.id } })).toBe(0);
});
