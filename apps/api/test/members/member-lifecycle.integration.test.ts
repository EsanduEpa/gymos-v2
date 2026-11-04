import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { MemberLifecycleService } from '../../src/member-lifecycle.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { reserveSessionCredit } from '../../src/sessions/credit-holds.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[member-lifecycle-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

it('revokes access before suspension, preserves operation replay, and reactivates without changing history', async () => {
  const master = fixture.master;
  const tenant = fixture.tenants[0]!;
  const betaTenant = fixture.tenants[1]!;
  const gym = fixture.gyms[0]!;
  const betaGym = fixture.gyms[1]!;
  const owner = fixture.users.ownerA;
  const memberIdentity = fixture.users.memberUser;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: memberIdentity.id } });
  const betaMemberOperationId = `member-beta-lifecycle-${run.runId}`;
  const betaMember = await betaTenant.member.create({ data: { id: `member-beta-lifecycle-${run.runId}`, fullName: 'Member Beta Same Identity', email: `member-beta-same-${run.runId}@example.test`,
    identityId: memberIdentity.id, registrationState: 'COMPLETE', enrollmentOperationId: betaMemberOperationId } });
  const betaReceipt = await betaTenant.commandReceipt.create({ data: { id: `receipt-beta-lifecycle-${run.runId}`, actorIdentityId: fixture.users.ownerB.id,
    commandKind: 'REGISTER_MEMBER', idempotencyKey: `beta-member-enroll-${run.runId}`, requestDigest: requestDigest({ betaMember: betaMember.id }),
    sourceMasterOperationId: betaMemberOperationId, resourceType: 'MEMBER', resourceId: betaMember.id, state: 'COMMITTED', committedAt: new Date(),
    safeResult: { operationId: betaMemberOperationId, state: 'COMPLETE', resourceIds: [betaMember.id] } } });
  await master.operation.create({ data: { id: betaMemberOperationId, kind: 'REGISTER_MEMBER', actorIdentityId: fixture.users.ownerB.id,
    scopeKey: `gym:${betaGym.id}`, idempotencyKey: `beta-member-operation-${run.runId}`, requestDigest: requestDigest({ betaMember: betaMember.id }), gymId: betaGym.id,
    subjectIdentityId: memberIdentity.id, tenantActorId: betaMember.id, tenantCommandReceiptId: betaReceipt.id, state: 'COMPLETE', step: 'MASTER_ACTIVATED',
    safeResult: { operationId: betaMemberOperationId, state: 'COMPLETE', resourceIds: [betaMember.id] } } });
  await master.gymAccess.create({ data: { userId: memberIdentity.id, gymId: betaGym.id, role: 'MEMBER', linkStatus: 'ACTIVE', actorKind: 'MEMBER',
    tenantActorId: betaMember.id, enrollmentOperationId: betaMemberOperationId } });
  const betaTrainer = await betaTenant.trainer.create({ data: { id: `trainer-beta-lifecycle-${run.runId}`, fullName: 'Trainer Beta Fixture',
    email: `trainer-beta-lifecycle-${run.runId}@example.test`, phone: '+94110000003', level: 'LEVEL_1', identityId: fixture.users.trainerUser.id, registrationState: 'COMPLETE',
    enrollmentOperationId: `trainer-beta-lifecycle-op-${run.runId}` } });
  const betaSessionId = `session-beta-lifecycle-${run.runId}`;
  const betaSessionStart = new Date(Date.now() + 24 * 60 * 60_000);
  await betaTenant.pTSession.create({ data: { id: betaSessionId, memberId: betaMember.id, trainerId: betaTrainer.id, state: 'PENDING_CONFIRMATION', type: 'IN_PERSON',
    scheduledStartAt: betaSessionStart, scheduledEndAt: new Date(betaSessionStart.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR',
    configurationVersion: 0, createdByIdentityId: fixture.users.ownerB.id } });
  const trainer = await tenant.trainer.findFirstOrThrow({ where: { registrationState: 'COMPLETE' } });
  const starts = new Date(Date.now() + 48 * 60 * 60_000);
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(starts);
  const date = new Date(`${localDate}T00:00:00.000Z`);
  const dateEnd = new Date(date.getTime() + 90 * 86_400_000);
  const suffix = run.runId;
  const plan = await tenant.membershipPlan.create({ data: { name: `Member lifecycle ${suffix}`, price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: date, endDateExclusive: dateEnd,
    agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: owner.id,
    idempotencyKey: `member-lifecycle-term-${suffix}`, requestDigest: requestDigest({ suffix, term: true }) } });
  const packReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: owner.id, commandKind: 'TEST_PACK_ISSUE', idempotencyKey: `member-lifecycle-issue-${suffix}`,
    requestDigest: requestDigest({ suffix, issue: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: 2, price: '100.0000', currency: 'LKR', validityDays: 90,
    totalMinorUnits: 10000n, creditBaseMinorUnits: 5000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', startDate: date,
    endDateExclusive: dateEnd, commandReceiptId: packReceipt.id, actorIdentityId: owner.id, idempotencyKey: `member-lifecycle-pack-${suffix}`, requestDigest: requestDigest({ suffix, pack: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 2, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `member-lifecycle-issue-${suffix}`, receiptId: packReceipt.id, actorIdentityId: owner.id } });
  const sessionId = `member-lifecycle-session-${suffix}`;
  await tenant.pTSession.create({ data: { id: sessionId, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: starts, scheduledEndAt: new Date(starts.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR',
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: new Date(), createdByIdentityId: owner.id } });
  const bookingReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: owner.id, commandKind: 'TEST_BOOKING', idempotencyKey: `member-lifecycle-booking-${suffix}`,
    requestDigest: requestDigest({ suffix, booking: true }), state: 'COMMITTED', committedAt: new Date(), resourceType: 'PT_SESSION', resourceId: sessionId,
    safeResult: { state: 'COMPLETE', resourceIds: [sessionId] } } });
  await tenant.$transaction(tx => reserveSessionCredit(tx, { masterGymId: gym.id, sessionId, memberId: member.id, trainerId: trainer.id,
    scheduledLocalDate: localDate, explicitPackId: pack.id, actorIdentityId: owner.id, receiptId: bookingReceipt.id }));
  const staleSessionId = `member-lifecycle-stale-session-${suffix}`;
  const staleStart = new Date(starts.getTime() + 3 * 60 * 60_000);
  await tenant.pTSession.create({ data: { id: staleSessionId, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: staleStart, scheduledEndAt: new Date(staleStart.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR',
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: new Date(), createdByIdentityId: owner.id } });
  const staleBookingReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: owner.id, commandKind: 'TEST_BOOKING', idempotencyKey: `member-lifecycle-stale-booking-${suffix}`,
    requestDigest: requestDigest({ suffix, staleBooking: true }), state: 'COMMITTED', committedAt: new Date(), resourceType: 'PT_SESSION', resourceId: staleSessionId,
    safeResult: { state: 'COMPLETE', resourceIds: [staleSessionId] } } });
  await tenant.$transaction(tx => reserveSessionCredit(tx, { masterGymId: gym.id, sessionId: staleSessionId, memberId: member.id, trainerId: trainer.id,
    scheduledLocalDate: localDate, explicitPackId: pack.id, actorIdentityId: owner.id, receiptId: staleBookingReceipt.id }));
  const completedId = `member-lifecycle-completed-${suffix}`;
  const completedStart = new Date(Date.now() - 7 * 86_400_000);
  await tenant.pTSession.create({ data: { id: completedId, memberId: member.id, trainerId: trainer.id, state: 'COMPLETED', type: 'IN_PERSON',
    scheduledStartAt: completedStart, scheduledEndAt: new Date(completedStart.getTime() + 60 * 60_000), startedAt: completedStart,
    endedAt: new Date(completedStart.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR', confirmationRate: '0.400000',
    confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: completedStart, createdByIdentityId: owner.id } });
  const link = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } } });
  const access = { identityId: owner.id, identityVersion: owner.authVersion, gymId: gym.id, slug: gym.slug, role: 'OWNER',
    databaseName: gym.databaseName, expectedTenantSchemaVersion: null, expectedTenantManifestDigest: null,
    expectedTenantOperationId: null, expectedTenantOperationState: 'COMPLETE', observedTenantSchemaVersion: null,
    observedTenantManifestDigest: null, accessVersion: link.version, actor: null } as const;
  const schemaGate = { withVerifiedTenant: async (_access: unknown, work: (client: TenantClient) => Promise<unknown>) => work(tenant) };
  const service = new MemberLifecycleService({ master } as never, schemaGate as unknown as TenantSchemaGateService);
  const key = `member-suspend-${run.runId}`;
  await expect(service.execute(access as never, member.id, `member-stale-${run.runId}`, { targetStatus: 'SUSPENDED', expectedVersion: member.version + 1, reason: 'Stale version' }))
    .rejects.toMatchObject({ status: 409 });
  expect(await master.operation.count({ where: { gymId: gym.id, kind: 'CHANGE_MEMBER_STATUS', memberLifecycleIntent: { is: { memberId: member.id } } } })).toBe(0);
  expect(await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ status: 'ACTIVE', version: member.version });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: memberIdentity.id, gymId: gym.id } } })).toMatchObject({ linkStatus: 'ACTIVE', version: 0 });
  expect(await betaTenant.member.findUniqueOrThrow({ where: { id: betaMember.id } })).toMatchObject({ identityId: memberIdentity.id, status: 'ACTIVE', version: 0 });
  expect(await betaTenant.pTSession.findUniqueOrThrow({ where: { id: betaSessionId } })).toMatchObject({ state: 'PENDING_CONFIRMATION', version: 0 });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: memberIdentity.id, gymId: betaGym.id } } })).toMatchObject({
    role: 'MEMBER', linkStatus: 'ACTIVE', tenantActorId: betaMember.id, enrollmentOperationId: betaMemberOperationId, version: 0 });
  await tenant.$executeRawUnsafe(`CREATE FUNCTION fail_member_lifecycle_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."resourceId" = '${sessionId}' AND NEW."eventCode" = 'SESSION_CANCELLED' THEN RAISE EXCEPTION 'injected member lifecycle interruption'; END IF; RETURN NEW; END $$`);
  await tenant.$executeRawUnsafe('CREATE TRIGGER fail_member_lifecycle_notification BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION fail_member_lifecycle_notification()');
  await expect(service.execute(access as never, member.id, key, { targetStatus: 'SUSPENDED', expectedVersion: member.version, reason: 'Test suspension' }))
    .rejects.toMatchObject({ status: 503 });
  await tenant.$executeRawUnsafe('DROP TRIGGER fail_member_lifecycle_notification ON "Notification"');
  await tenant.$executeRawUnsafe('DROP FUNCTION fail_member_lifecycle_notification()');
  const operation = await master.operation.findFirstOrThrow({ where: { gymId: gym.id, kind: 'CHANGE_MEMBER_STATUS', memberLifecycleIntent: { is: { memberId: member.id } } } });
  expect(operation.state).toBe('FAILED_RETRYABLE');
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: sessionId } })).toMatchObject({ state: 'SCHEDULED', version: 0 });
  expect(await tenant.sessionCreditHold.findUniqueOrThrow({ where: { sessionId } })).toMatchObject({ state: 'HELD' });
  let releaseScan!: () => void;
  let scannedCandidate!: () => void;
  const scanPaused = new Promise<void>(resolve => { scannedCandidate = resolve; });
  const resumeScan = new Promise<void>(resolve => { releaseScan = resolve; });
  const delegate = tenant.pTSession as unknown as { findMany: (args: unknown) => Promise<Array<{ id: string }>> };
  const originalFindMany = delegate.findMany.bind(tenant.pTSession);
  delegate.findMany = async args => {
    const rows = await originalFindMany(args);
    if (rows.some(row => row.id === staleSessionId)) { scannedCandidate(); await resumeScan; }
    return rows;
  };
  const resumePromise = service.resume(access as never, operation.id);
  void resumePromise.catch(() => undefined);
  await scanPaused;
  const expiredStart = new Date(Date.now() - 2 * 60 * 60_000);
  await tenant.pTSession.update({ where: { id: staleSessionId }, data: { scheduledStartAt: expiredStart, scheduledEndAt: new Date(expiredStart.getTime() + 60 * 60_000) } });
  releaseScan();
  delegate.findMany = originalFindMany;
  const suspended = await resumePromise;
  expect(suspended).toMatchObject({ state: 'COMPLETE', targetStatus: 'SUSPENDED', memberId: member.id, cancelledSessionCount: 1 });
  expect(await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ status: 'SUSPENDED', version: member.version + 1 });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: memberIdentity.id, gymId: gym.id } } })).toMatchObject({ linkStatus: 'REVOKED', version: 1 });
  expect(await betaTenant.member.findUniqueOrThrow({ where: { id: betaMember.id } })).toMatchObject({ identityId: memberIdentity.id, status: 'ACTIVE', version: 0 });
  expect(await betaTenant.pTSession.findUniqueOrThrow({ where: { id: betaSessionId } })).toMatchObject({ state: 'PENDING_CONFIRMATION', version: 0 });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: memberIdentity.id, gymId: betaGym.id } } })).toMatchObject({ linkStatus: 'ACTIVE', version: 0 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: sessionId } })).toMatchObject({ state: 'CANCELLED', version: 1 });
  expect(await tenant.sessionCreditHold.findUniqueOrThrow({ where: { sessionId } })).toMatchObject({ state: 'RELEASED' });
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id, kind: 'RELEASE' } })).toBe(1);
  expect(await tenant.notification.count({ where: { resourceId: sessionId, eventCode: 'SESSION_CANCELLED' } })).toBe(1);
  expect(suspended.cancelledSessionCount).toBe(1);
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: staleSessionId } })).toMatchObject({ state: 'SCHEDULED', version: 0 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: completedId } })).toMatchObject({ state: 'COMPLETED', version: 0, startedAt: completedStart });
  expect(await tenant.commandReceipt.count({ where: { commandKind: 'MEMBER_LIFECYCLE_RELEASE', resourceId: staleSessionId,
    audits: { some: { eventCode: 'MEMBER_SESSION_RELEASE_SKIPPED' } } } })).toBe(1);
  expect(await tenant.commandReceipt.count({ where: { commandKind: 'MEMBER_LIFECYCLE_RELEASE', resourceId: staleSessionId,
    audits: { some: { eventCode: 'MEMBER_SESSION_RELEASED' } } } })).toBe(0);
  expect(await service.execute(access as never, member.id, key, { targetStatus: 'SUSPENDED', expectedVersion: member.version, reason: 'Test suspension' })).toEqual(suspended);

  const activated = await service.execute(access as never, member.id, `member-activate-${run.runId}`, { targetStatus: 'ACTIVE', expectedVersion: member.version + 1, reason: 'Test reactivation' });
  expect(activated).toMatchObject({ state: 'COMPLETE', targetStatus: 'ACTIVE', memberId: member.id });
  expect(await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ status: 'ACTIVE', version: member.version + 2 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: sessionId } })).toMatchObject({ state: 'CANCELLED', version: 1 });
  const inactive = await service.execute(access as never, member.id, `member-inactive-${run.runId}`, { targetStatus: 'INACTIVE', expectedVersion: member.version + 2, reason: 'Test deactivation' });
  expect(inactive).toMatchObject({ state: 'COMPLETE', targetStatus: 'INACTIVE' });
  const resuspended = await service.execute(access as never, member.id, `member-resuspend-${run.runId}`, { targetStatus: 'SUSPENDED', expectedVersion: member.version + 3, reason: 'Test status change while revoked' });
  expect(resuspended).toMatchObject({ state: 'COMPLETE', targetStatus: 'SUSPENDED' });
  expect(await tenant.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ status: 'SUSPENDED', version: member.version + 4 });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: memberIdentity.id, gymId: gym.id } } })).toMatchObject({ linkStatus: 'REVOKED', version: 3 });
  expect(await betaTenant.member.findUniqueOrThrow({ where: { id: betaMember.id } })).toMatchObject({ identityId: memberIdentity.id, status: 'ACTIVE', version: 0 });
  expect(await betaTenant.pTSession.findUniqueOrThrow({ where: { id: betaSessionId } })).toMatchObject({ state: 'PENDING_CONFIRMATION', version: 0 });
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: memberIdentity.id, gymId: betaGym.id } } })).toMatchObject({ linkStatus: 'ACTIVE', version: 0 });
});
