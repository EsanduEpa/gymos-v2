import { randomUUID } from 'node:crypto';
import { contentDigest, requestDigest, tenantAuditKey } from '../../src/operations/primitives.js';
import { reserveSessionCredit, resolveSessionCreditHold } from '../../src/sessions/credit-holds.js';
import { applySessionCommand } from '../../src/sessions/session-commands.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;

beforeAll(async () => {
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
}, 120_000);

afterAll(async () => {
  await fixture?.close();
  if (run) console.info('[sessions-owned-cleanup]', JSON.stringify(await run.cleanup()));
}, 120_000);

function sessionRow(input: { id: string; memberId: string; trainerId: string; start: string; minutes: number; ownerIdentityId: string }) {
  const scheduledStartAt = new Date(input.start);
  return {
    id: input.id, memberId: input.memberId, trainerId: input.trainerId, state: 'SCHEDULED' as const, type: 'IN_PERSON' as const,
    scheduledStartAt, scheduledEndAt: new Date(scheduledStartAt.getTime() + input.minutes * 60_000), gymTimezone: 'Asia/Colombo',
    fee: '100.0000', currency: 'LKR', confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1' as const,
    configurationVersion: 0, confirmedAt: new Date(), createdByIdentityId: input.ownerIdentityId, createdAt: new Date(), updatedAt: new Date(),
  };
}

async function createReceipt(tenant: typeof fixture.tenants[number], input: { id: string; actorId: string; resourceId: string }) {
  return tenant.commandReceipt.create({ data: { id: input.id, actorIdentityId: input.actorId, commandKind: 'TEST_SESSION_CREDIT',
    idempotencyKey: randomUUID(), requestDigest: requestDigest({ id: input.id }), resourceType: 'PT_SESSION', resourceId: input.resourceId,
    state: 'COMMITTED', committedAt: new Date(), safeResult: { resourceId: input.resourceId } } });
}

it('serializes last-credit holds and consumes the original hold once', async () => {
  const tenant = fixture.tenants[0]!;
  const gym = fixture.gyms[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const ownerId = fixture.users.ownerA.id;
  const suffix = run.runId;
  const plan = await tenant.membershipPlan.create({ data: { name: `Session test ${suffix}`, price: '0', currency: 'LKR', durationDays: 61 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDateExclusive: new Date('2027-01-01T00:00:00.000Z'), agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name,
    configurationVersion: 0, actorIdentityId: ownerId, idempotencyKey: randomUUID(), requestDigest: requestDigest({ memberId: member.id, suffix }) } });
  const issueReceipt = await createReceipt(tenant, { id: `issue_${suffix}`, actorId: ownerId, resourceId: `pack_${suffix}` });
  const pack = await tenant.sessionPack.create({ data: { id: `pack_${suffix}`, memberId: member.id, issuedCredits: 1, price: '100.0000', currency: 'LKR',
    totalMinorUnits: 10000n, creditBaseMinorUnits: 10000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1',
    validityDays: 61, startDate: new Date('2026-11-01T00:00:00.000Z'), endDateExclusive: new Date('2027-01-01T00:00:00.000Z'),
    commandReceiptId: issueReceipt.id, actorIdentityId: ownerId, idempotencyKey: randomUUID(), requestDigest: requestDigest({ pack: suffix }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 1, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `issue-movement-${suffix}`, receiptId: issueReceipt.id, actorIdentityId: ownerId } });

  const ids = [`session-a-${suffix}`, `session-b-${suffix}`];
  const rows = [
    sessionRow({ id: ids[0]!, memberId: member.id, trainerId: trainer.id, start: '2026-11-05T03:00:00.000Z', minutes: 60, ownerIdentityId: ownerId }),
    sessionRow({ id: ids[1]!, memberId: member.id, trainerId: trainer.id, start: '2026-11-05T05:00:00.000Z', minutes: 30, ownerIdentityId: ownerId }),
  ];
  await tenant.pTSession.createMany({ data: rows });
  const receipts = await Promise.all(ids.map((id, index) => createReceipt(tenant, { id: `booking_${index}_${suffix}`, actorId: ownerId, resourceId: id })));
  const attempts = await Promise.allSettled(ids.map((sessionId, index) => tenant.$transaction(tx => reserveSessionCredit(tx, {
    masterGymId: gym.id, sessionId, memberId: member.id, trainerId: trainer.id, scheduledLocalDate: '2026-11-05',
    explicitPackId: pack.id, actorIdentityId: ownerId, receiptId: receipts[index]!.id,
  }))));
  expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(attempts.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect(await tenant.sessionCreditHold.count({ where: { packId: pack.id, state: 'HELD' } })).toBe(1);
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(2);

  const heldSession = attempts.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof reserveSessionCredit>>> => result.status === 'fulfilled')!;
  const heldSessionId = ids[attempts.indexOf(heldSession)];
  const resolutionReceipt = await createReceipt(tenant, { id: `consume_${suffix}`, actorId: ownerId, resourceId: heldSessionId! });
  const result = await tenant.$transaction(tx => resolveSessionCreditHold(tx, { masterGymId: gym.id, sessionId: heldSessionId!, receiptId: resolutionReceipt.id,
    actorIdentityId: ownerId, resolution: 'CONSUME', gymLocalDate: '2026-11-05' }));
  expect(result).toMatchObject({ state: 'CONSUMED', balance: { available: 0, held: 0, consumed: 1, expired: 0 } });
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(3);
  await expect(tenant.$transaction(tx => resolveSessionCreditHold(tx, { masterGymId: gym.id, sessionId: heldSessionId!, receiptId: resolutionReceipt.id,
    actorIdentityId: ownerId, resolution: 'CONSUME', gymLocalDate: '2026-11-05' }))).rejects.toThrow(/already been resolved/);
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(3);
  await expect(tenant.sessionCreditHold.create({ data: { sessionId: heldSessionId!, packId: pack.id, state: 'HELD', creditOrdinal: 1, creditValueMinorUnits: 10000n } })).rejects.toThrow();
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: heldSessionId! } })).toBe(1);

  const expiryReceipt = await createReceipt(tenant, { id: `issue_expiry_${suffix}`, actorId: ownerId, resourceId: `pack_expiry_${suffix}` });
  const expiryPack = await tenant.sessionPack.create({ data: { id: `pack_expiry_${suffix}`, memberId: member.id, issuedCredits: 1, price: '100.0000', currency: 'LKR',
    totalMinorUnits: 10000n, creditBaseMinorUnits: 10000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1',
    validityDays: 61, startDate: new Date('2026-11-01T00:00:00.000Z'), endDateExclusive: new Date('2027-01-01T00:00:00.000Z'),
    commandReceiptId: expiryReceipt.id, actorIdentityId: ownerId, idempotencyKey: randomUUID(), requestDigest: requestDigest({ expiryPack: suffix }) } });
  await tenant.packCreditMovement.create({ data: { packId: expiryPack.id, kind: 'ISSUE', availableDelta: 1, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `expiry-issue-movement-${suffix}`, receiptId: expiryReceipt.id, actorIdentityId: ownerId } });
  const expirySessionId = `session-expiry-${suffix}`;
  await tenant.pTSession.create({ data: sessionRow({ id: expirySessionId, memberId: member.id, trainerId: trainer.id,
    start: '2026-11-05T07:00:00.000Z', minutes: 30, ownerIdentityId: ownerId }) });
  const expiryBookingReceipt = await createReceipt(tenant, { id: `booking_expiry_${suffix}`, actorId: ownerId, resourceId: expirySessionId });
  await tenant.$transaction(tx => reserveSessionCredit(tx, { masterGymId: gym.id, sessionId: expirySessionId, memberId: member.id, trainerId: trainer.id,
    scheduledLocalDate: '2026-11-05', explicitPackId: expiryPack.id, actorIdentityId: ownerId, receiptId: expiryBookingReceipt.id }));
  const expiryReleaseReceipt = await createReceipt(tenant, { id: `release_expiry_${suffix}`, actorId: ownerId, resourceId: expirySessionId });
  const expiredHold = await tenant.$transaction(tx => resolveSessionCreditHold(tx, { masterGymId: gym.id, sessionId: expirySessionId,
    receiptId: expiryReleaseReceipt.id, actorIdentityId: ownerId, resolution: 'RELEASE', gymLocalDate: '2027-01-01' }));
  expect(expiredHold).toMatchObject({ state: 'RELEASED', expiredAtResolution: true, balance: { available: 0, held: 0, consumed: 0, expired: 1 } });
  expect(await tenant.packCreditMovement.count({ where: { packId: expiryPack.id } })).toBe(3);
});

it('enforces unique settlement, revenue and pay origins plus valid credit-movement shapes', async () => {
  const tenant = fixture.tenants[0]!;
  const ownerId = fixture.users.ownerA.id;
  const memberId = (await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } })).id;
  const trainerId = (await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } })).id;
  const suffix = run.runId;
  const sessionId = `unique-effects-${suffix}`;
  const completedAt = new Date('2026-11-08T04:00:00.000Z');
  await tenant.pTSession.create({ data: { ...sessionRow({ id: sessionId, memberId, trainerId, start: '2026-11-08T03:00:00.000Z', minutes: 60, ownerIdentityId: ownerId }),
    state: 'COMPLETED', startedAt: new Date('2026-11-08T03:00:00.000Z'), endedAt: completedAt } });
  const receipt = await createReceipt(tenant, { id: `unique_effects_receipt_${suffix}`, actorId: ownerId, resourceId: sessionId });
  const settlement = { sessionId, kind: 'COMPLETED' as const, creditConsumed: true, creditValue: '100.0000', currency: 'LKR', sourceReceiptId: receipt.id };
  await tenant.sessionSettlement.create({ data: settlement });
  await expect(tenant.sessionSettlement.create({ data: settlement })).rejects.toThrow();
  expect(await tenant.sessionSettlement.count({ where: { sessionId } })).toBe(1);

  await tenant.revenueRecord.create({ data: { sessionId, category: 'COMPLETED_SESSION', amount: '100.0000', currency: 'LKR', sourceKey: `revenue-${suffix}` } });
  await expect(tenant.revenueRecord.create({ data: { sessionId, category: 'COMPLETED_SESSION', amount: '100.0000', currency: 'LKR', sourceKey: `revenue-${suffix}` } })).rejects.toThrow();
  expect(await tenant.revenueRecord.count({ where: { sessionId } })).toBe(1);

  const period = await tenant.trainerPayPeriod.create({ data: { cadence: 'WEEKLY', localStartDate: new Date('2026-11-02T00:00:00.000Z'),
    localEndDateExclusive: new Date('2026-11-09T00:00:00.000Z'), timezone: 'Asia/Colombo', utcStartAt: new Date('2026-11-01T18:30:00.000Z'),
    utcEndAt: new Date('2026-11-08T18:30:00.000Z'), calculatedTotal: '40.0000' } });
  const pay = { sessionId, periodId: period.id, amount: '40.0000', currency: 'LKR', sourceKey: `pay-${suffix}`, confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1' as const };
  await tenant.payRecord.create({ data: pay });
  await expect(tenant.payRecord.create({ data: pay })).rejects.toThrow();
  expect(await tenant.payRecord.count({ where: { sessionId } })).toBe(1);

  const issueReceipt = await createReceipt(tenant, { id: `invalid_movement_receipt_${suffix}`, actorId: ownerId, resourceId: sessionId });
  const pack = await tenant.sessionPack.create({ data: { id: `invalid_movement_pack_${suffix}`, memberId, issuedCredits: 1, price: '0.0000', currency: 'LKR',
    totalMinorUnits: 0n, creditBaseMinorUnits: 0n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1',
    validityDays: 30, startDate: new Date('2026-11-01T00:00:00.000Z'), endDateExclusive: new Date('2026-12-01T00:00:00.000Z'),
    commandReceiptId: issueReceipt.id, actorIdentityId: ownerId, idempotencyKey: randomUUID(), requestDigest: requestDigest({ invalidMovement: suffix }) } });
  await expect(tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 0, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `invalid-shape-${suffix}`, receiptId: issueReceipt.id, actorIdentityId: ownerId } })).rejects.toThrow();
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(0);
});

it('uses database half-open exclusions for concurrent overlap while allowing a touching slot', async () => {
  const tenant = fixture.tenants[0]!;
  const memberId = (await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } })).id;
  const trainerId = (await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } })).id;
  const ownerId = fixture.users.ownerA.id;
  const suffix = run.runId;
  const first = sessionRow({ id: `overlap-a-${suffix}`, memberId, trainerId, start: '2026-11-06T03:00:00.000Z', minutes: 60, ownerIdentityId: ownerId });
  const second = sessionRow({ id: `overlap-b-${suffix}`, memberId, trainerId, start: '2026-11-06T03:30:00.000Z', minutes: 30, ownerIdentityId: ownerId });
  const overlapAttempts = await Promise.allSettled([tenant.pTSession.create({ data: first }), tenant.pTSession.create({ data: second })]);
  expect(overlapAttempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(overlapAttempts.filter(result => result.status === 'rejected')).toHaveLength(1);
  const committed = overlapAttempts.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof tenant.pTSession.create>>> => result.status === 'fulfilled')!.value;
  const touching = sessionRow({ id: `touching-${suffix}`, memberId, trainerId, start: committed.scheduledEndAt.toISOString(), minutes: 30, ownerIdentityId: ownerId });
  await expect(tenant.pTSession.create({ data: touching })).resolves.toMatchObject({ id: touching.id });
  expect(await tenant.pTSession.count({ where: { id: { in: [first.id, second.id, touching.id] }, state: 'SCHEDULED' } })).toBe(2);
});

it('applies only command-specific versioned transitions and rolls back if required audit conflicts', async () => {
  const tenant = fixture.tenants[0]!;
  const gym = fixture.gyms[0]!;
  const ownerId = fixture.users.ownerA.id;
  const trainerIdentityId = fixture.users.trainerUser.id;
  const memberId = (await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } })).id;
  const trainerId = (await tenant.trainer.findUniqueOrThrow({ where: { identityId: trainerIdentityId } })).id;
  const successSessionId = `command-ok-${run.runId}`;
  const failedSessionId = `command-audit-failure-${run.runId}`;
  await tenant.pTSession.createMany({ data: [
    sessionRow({ id: successSessionId, memberId, trainerId, start: '2026-11-07T03:00:00.000Z', minutes: 60, ownerIdentityId: ownerId }),
    sessionRow({ id: failedSessionId, memberId, trainerId, start: '2026-11-07T05:00:00.000Z', minutes: 60, ownerIdentityId: ownerId }),
  ] });
  const successReceipt = await createReceipt(tenant, { id: `start_ok_${run.runId}`, actorId: trainerIdentityId, resourceId: successSessionId });
  const invalidReceipt = await createReceipt(tenant, { id: `start_fail_${run.runId}`, actorId: trainerIdentityId, resourceId: failedSessionId });
  await expect(tenant.$transaction(tx => applySessionCommand(tx, { masterGymId: gym.id, sessionId: successSessionId,
    receiptId: successReceipt.id, actorIdentityId: trainerIdentityId, actorRole: 'TRAINER', actorTenantId: trainerId,
    command: 'COMPLETE', expectedVersion: 0 }))).rejects.toThrow(/not allowed/);
  await expect(tenant.$transaction(tx => applySessionCommand(tx, { masterGymId: gym.id, sessionId: successSessionId,
    receiptId: successReceipt.id, actorIdentityId: fixture.users.memberUser.id, actorRole: 'TRAINER', actorTenantId: trainerId,
    command: 'START', expectedVersion: 0 }))).rejects.toThrow(/Assigned trainer access is required/);
  expect(await tenant.sessionStateEvent.count({ where: { sessionId: successSessionId } })).toBe(0);
  const started = await tenant.$transaction(tx => applySessionCommand(tx, { masterGymId: gym.id, sessionId: successSessionId,
    receiptId: successReceipt.id, actorIdentityId: trainerIdentityId, actorRole: 'TRAINER', actorTenantId: trainerId,
    command: 'START', expectedVersion: 0 }));
  expect(started).toMatchObject({ state: 'ACTIVE', version: 1 });
  expect(started.startedAt).toBeInstanceOf(Date);
  expect(await tenant.sessionStateEvent.count({ where: { sessionId: successSessionId } })).toBe(1);
  expect(await tenant.auditLog.count({ where: { receiptId: successReceipt.id, eventCode: 'PT_SESSION_STARTED' } })).toBe(1);
  await expect(tenant.$transaction(tx => applySessionCommand(tx, { masterGymId: gym.id, sessionId: successSessionId,
    receiptId: successReceipt.id, actorIdentityId: trainerIdentityId, actorRole: 'TRAINER', actorTenantId: trainerId,
    command: 'START', expectedVersion: 0 }))).rejects.toThrow(/changed/);
  expect(await tenant.sessionStateEvent.count({ where: { sessionId: successSessionId } })).toBe(1);

  const eventKey = tenantAuditKey({ masterGymId: gym.id, receiptId: invalidReceipt.id, eventCode: 'PT_SESSION_STARTED',
    resourceType: 'PT_SESSION', resourceId: failedSessionId });
  await tenant.auditLog.create({ data: { eventKey, contentDigest: contentDigest({ intentionally: 'different' }), receiptId: invalidReceipt.id,
    actorIdentityId: trainerIdentityId, eventCode: 'PT_SESSION_STARTED', resourceType: 'PT_SESSION', resourceId: failedSessionId,
    transition: { from: 'different', to: 'different', version: 1 } } });
  await expect(tenant.$transaction(tx => applySessionCommand(tx, { masterGymId: gym.id, sessionId: failedSessionId,
    receiptId: invalidReceipt.id, actorIdentityId: trainerIdentityId, actorRole: 'TRAINER', actorTenantId: trainerId,
    command: 'START', expectedVersion: 0 }))).rejects.toThrow(/different content/);
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: failedSessionId } })).toMatchObject({ state: 'SCHEDULED', version: 0, startedAt: null });
  expect(await tenant.sessionStateEvent.count({ where: { sessionId: failedSessionId } })).toBe(0);
  expect(await tenant.auditLog.count({ where: { receiptId: invalidReceipt.id } })).toBe(1);
});
