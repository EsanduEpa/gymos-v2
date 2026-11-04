import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { SessionRequestsService } from '../../src/sessions/session-requests.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[session-requests-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

function datePlus(days: number) {
  const now = new Date(); const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const o = Object.fromEntries(p.map(x => [x.type, x.value])); const date = new Date(`${o.year}-${o.month}-${o.day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
async function setup(gymIndex = 0) {
  const gym = fixture.gyms[gymIndex]!; const tenant = fixture.tenants[gymIndex]!; const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const [memberLink, trainerLink] = await Promise.all([
    fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.memberUser.id, gymId: gym.id } } }),
    fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.trainerUser.id, gymId: gym.id } } }),
  ]);
  const gate = { withVerifiedTenant: async (_context: unknown, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as unknown as TenantSchemaGateService;
  const service = new SessionRequestsService({ master: fixture.master } as never, gate);
  const base = { gymId: gym.id, slug: gym.slug, databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    expectedTenantManifestDigest: gym.expectedTenantManifestDigest, expectedTenantOperationId: gym.expectedTenantOperationId,
    expectedTenantOperationState: 'COMPLETE', observedTenantSchemaVersion: gym.expectedTenantSchemaVersion, observedTenantManifestDigest: gym.expectedTenantManifestDigest };
  const memberAccess = { ...base, identityId: fixture.users.memberUser.id, identityVersion: fixture.users.memberUser.authVersion, accessVersion: memberLink.version,
    role: 'MEMBER', actor: { kind: 'MEMBER' as const, id: member.id, registrationOperationId: memberLink.enrollmentOperationId! } };
  const trainerAccess = { ...base, identityId: fixture.users.trainerUser.id, identityVersion: fixture.users.trainerUser.authVersion, accessVersion: trainerLink.version,
    role: 'TRAINER', actor: { kind: 'TRAINER' as const, id: trainer.id, registrationOperationId: trainerLink.enrollmentOperationId! } };
  return { service, tenant, gym, member, trainer, memberAccess, trainerAccess };
}
async function entitlement(tenant: typeof fixture.tenants[number], suffix: string, credits: number, gymIndex = 0) {
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } }); const owner = gymIndex === 0 ? fixture.users.ownerA.id : fixture.users.ownerB.id;
  const start = datePlus(0); const end = datePlus(90); const startDate = new Date(`${start}T00:00:00Z`); const endDateExclusive = new Date(`${end}T00:00:00Z`);
  const plan = await tenant.membershipPlan.create({ data: { name: `Request ${suffix}`, price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate, endDateExclusive, agreedPrice: '0', currency: 'LKR',
    planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: owner, idempotencyKey: `request-term-${suffix}`, requestDigest: requestDigest({ suffix, term: true }) } });
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: owner, commandKind: 'TEST_REQUEST_PACK', idempotencyKey: `request-pack-receipt-${suffix}`,
    requestDigest: requestDigest({ suffix, pack: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { ok: true } } });
  const totalMinorUnits = 10000n;
  const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: credits, price: '100', currency: 'LKR', totalMinorUnits,
    creditBaseMinorUnits: totalMinorUnits / BigInt(credits), creditRemainder: Number(totalMinorUnits % BigInt(credits)), creditAllocationPolicyVersion: 'DEC-06-v1',
    validityDays: 90, startDate, endDateExclusive, commandReceiptId: receipt.id, actorIdentityId: owner, idempotencyKey: `request-pack-${suffix}`, requestDigest: requestDigest({ suffix, issued: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: credits, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `request-pack-issue-${suffix}`, receiptId: receipt.id, actorIdentityId: owner } });
  return { member, pack };
}
function requestBody(key: string, trainerId: string, time = '15:00') { return { trainerId, localDate: datePlus(2), localTime: time, timeZone: 'Asia/Colombo', type: 'IN_PERSON' as const,
  durationMinutes: 60, idempotencyKey: `request-${key}-0123456789` }; }

it('creates a pending request without a hold, audits/notifies once and accepts into a single reserved credit', async () => {
  const { service, tenant, gym, member, trainer, memberAccess, trainerAccess } = await setup();
  const { pack } = await entitlement(tenant, `${run.runId}-race`, 1);
  const left = await service.request(memberAccess, requestBody(`${run.runId}-left`, trainer.id, '10:00'));
  const right = await service.request(memberAccess, requestBody(`${run.runId}-right`, trainer.id, '12:00'));
  const concurrent = await Promise.allSettled([
    service.decide(trainerAccess, left.session.id, { action: 'ACCEPT', expectedVersion: 0, idempotencyKey: `accept-left-${run.runId}-0123456789` }),
    service.decide(trainerAccess, right.session.id, { action: 'ACCEPT', expectedVersion: 0, idempotencyKey: `accept-right-${run.runId}-0123456789` }),
  ]);
  expect(concurrent.filter(value => value.status === 'fulfilled')).toHaveLength(1);
  expect(concurrent.filter(value => value.status === 'rejected')).toHaveLength(1);
  expect(await tenant.sessionCreditHold.count({ where: { packId: pack.id, state: 'HELD' } })).toBe(1);
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(2);
  expect(await tenant.pTSession.count({ where: { id: { in: [left.session.id, right.session.id] }, state: 'PENDING_CONFIRMATION' } })).toBe(1);
  expect(await tenant.pTSession.count({ where: { id: { in: [left.session.id, right.session.id] }, state: 'SCHEDULED' } })).toBe(1);
  const { pack: mainPack } = await entitlement(tenant, `${run.runId}-main`, 1);
  const body = requestBody(run.runId, trainer.id);
  const pending = await service.request(memberAccess, body);
  expect(pending).toMatchObject({ replayed: false, session: { memberId: member.id, trainerId: trainer.id, state: 'PENDING_CONFIRMATION', version: 0 },
    notificationOutcome: { recipient: { role: 'TRAINER', actorId: trainer.id }, gymSlug: gym.slug, state: 'AVAILABLE', retryable: false } });
  const requestReceipt = await tenant.commandReceipt.findUniqueOrThrow({ where: { id: pending.receiptId } });
  expect(requestReceipt.safeResult).toMatchObject({ resourceIds: [pending.session.id, pending.notificationOutcome.eventId], notificationState: 'AVAILABLE', retryable: false });
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: pending.session.id } })).toBe(0);
  expect(await tenant.packCreditMovement.count({ where: { packId: mainPack.id } })).toBe(1);
  expect(await tenant.sessionSettlement.count({ where: { sessionId: pending.session.id } })).toBe(0);
  expect(await tenant.revenueRecord.count({ where: { sessionId: pending.session.id } })).toBe(0);
  expect(await tenant.payRecord.count({ where: { sessionId: pending.session.id } })).toBe(0);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.trainerUser.id, resourceId: pending.session.id, eventCode: 'HIRE_REQUEST' } })).toBe(1);
  expect(await tenant.auditLog.count({ where: { receiptId: pending.receiptId, eventCode: 'PT_SESSION_REQUESTED' } })).toBe(1);
  const replay = await service.request(memberAccess, body);
  expect(replay).toMatchObject({ receiptId: pending.receiptId, replayed: true, session: { id: pending.session.id } });
  const decision = { action: 'ACCEPT' as const, expectedVersion: 0, idempotencyKey: `accept-${run.runId}-0123456789` };
  const accepted = await service.decide(trainerAccess, pending.session.id, decision);
  expect(accepted).toMatchObject({ replayed: false, decision: 'ACCEPT', session: { state: 'SCHEDULED', version: 1 }, creditReservation: { state: 'HELD', packId: mainPack.id },
    notificationOutcome: { recipient: { role: 'MEMBER', actorId: member.id }, gymSlug: gym.slug, state: 'AVAILABLE', retryable: false } });
  const decisionReceipt = await tenant.commandReceipt.findUniqueOrThrow({ where: { id: accepted.receiptId } });
  expect(decisionReceipt.safeResult).toMatchObject({ resourceIds: [pending.session.id, accepted.notificationOutcome.eventId], notificationState: 'AVAILABLE', retryable: false });
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: pending.session.id, state: 'HELD' } })).toBe(1);
  expect(await tenant.packCreditMovement.count({ where: { packId: mainPack.id } })).toBe(2);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, resourceId: pending.session.id, eventCode: 'SESSION_BOOKED' } })).toBe(1);
  const acceptedReplay = await service.decide(trainerAccess, pending.session.id, decision);
  expect(acceptedReplay).toMatchObject({ receiptId: accepted.receiptId, replayed: true, session: { state: 'SCHEDULED' } });
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: pending.session.id } })).toBe(1);
  expect(gym.id).toBe(memberAccess.gymId);
});

it('declines without reserving credit; stale decisions and foreign trainer requests are denied', async () => {
  const { service, tenant, trainer, member, memberAccess, trainerAccess } = await setup();
  const { pack } = await entitlement(tenant, `${run.runId}-decline`, 1);
  const otherGym = fixture.gyms[1]!;
  await expect(service.request({ ...memberAccess, gymId: otherGym.id, slug: otherGym.slug, databaseName: otherGym.databaseName },
    requestBody(`${run.runId}-foreign`, trainer.id))).rejects.toMatchObject({ status: 404 });
  const pending = await service.request(memberAccess, requestBody(`${run.runId}-decline`, trainer.id, '17:00'));
  await expect(service.decide(trainerAccess, pending.session.id, { action: 'DECLINE', expectedVersion: 7, idempotencyKey: `stale-${run.runId}-0123456789` })).rejects.toMatchObject({ status: 409 });
  const declined = await service.decide(trainerAccess, pending.session.id, { action: 'DECLINE', expectedVersion: 0, reason: 'Unavailable\r\nthis week ', idempotencyKey: `decline-${run.runId}-0123456789` });
  expect(declined).toMatchObject({ decision: 'DECLINE', session: { state: 'DECLINED', version: 1 }, creditReservation: null,
    notificationOutcome: { recipient: { role: 'MEMBER', actorId: member.id }, gymSlug: fixture.gyms[0]!.slug, state: 'AVAILABLE' } });
  expect('declineReason' in declined.session).toBe(false);
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: pending.session.id } })).toBe(0);
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(1);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, resourceId: pending.session.id, eventCode: 'SESSION_DECLINED' } })).toBe(1);
  await expect(service.decide({ ...trainerAccess, gymId: otherGym.id, slug: otherGym.slug, databaseName: otherGym.databaseName }, pending.session.id,
    { action: 'ACCEPT', expectedVersion: 0, idempotencyKey: `foreign-gym-${run.runId}-0123456789` })).rejects.toMatchObject({ status: 404 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: pending.session.id } })).toMatchObject({ state: 'DECLINED', version: 1 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: pending.session.id } })).toMatchObject({ declineReason: 'Unavailable\nthis week' });
});

it('rechecks current minimum duration and rejects requests that have expired before acceptance', async () => {
  const { service, tenant, trainer, memberAccess, trainerAccess } = await setup();
  await entitlement(tenant, `${run.runId}-policy`, 2);
  const config = await tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
  const request = await service.request(memberAccess, requestBody(`${run.runId}-policy`, trainer.id, '11:00'));
  try {
    await tenant.gymConfiguration.update({ where: { id: 'current' }, data: { minimumSessionDurationMinutes: 120, version: { increment: 1 } } });
    await expect(service.decide(trainerAccess, request.session.id, { action: 'ACCEPT', expectedVersion: 0, idempotencyKey: `short-${run.runId}-0123456789` })).rejects.toMatchObject({ status: 422 });
    expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: request.session.id } })).toMatchObject({ state: 'PENDING_CONFIRMATION', version: 0 });
    expect(await tenant.sessionCreditHold.count({ where: { sessionId: request.session.id } })).toBe(0);
    await tenant.gymConfiguration.update({ where: { id: 'current' }, data: { minimumSessionDurationMinutes: config.minimumSessionDurationMinutes, version: { increment: 1 } } });
    await tenant.pTSession.update({ where: { id: request.session.id }, data: { scheduledStartAt: new Date('2020-01-01T10:00:00Z'), scheduledEndAt: new Date('2020-01-01T11:00:00Z') } });
    await expect(service.decide(trainerAccess, request.session.id, { action: 'ACCEPT', expectedVersion: 0, idempotencyKey: `expired-${run.runId}-0123456789` })).rejects.toMatchObject({ status: 409 });
    expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: request.session.id } })).toMatchObject({ state: 'PENDING_CONFIRMATION', version: 0 });
    expect(await tenant.sessionCreditHold.count({ where: { sessionId: request.session.id } })).toBe(0);
  } finally {
    await tenant.gymConfiguration.update({ where: { id: 'current' }, data: { minimumSessionDurationMinutes: config.minimumSessionDurationMinutes, version: { increment: 1 } } });
  }
});

it('rolls back the entire pending request when the required trainer notification insert fails', async () => {
  const { service, tenant, trainer, memberAccess } = await setup();
  await entitlement(tenant, `${run.runId}-notify-failure`, 1);
  const key = `notification-fail-${run.runId}-0123456789`;
  const before = {
    sessions: await tenant.pTSession.count(), holds: await tenant.sessionCreditHold.count(), movements: await tenant.packCreditMovement.count(),
    receipts: await tenant.commandReceipt.count({ where: { idempotencyKey: key } }),
    notifications: await tenant.notification.count({ where: { recipientIdentityId: fixture.users.trainerUser.id, eventCode: 'HIRE_REQUEST' } }),
    audits: await tenant.auditLog.count({ where: { eventCode: 'PT_SESSION_REQUESTED' } }),
  };
  await tenant.$executeRawUnsafe(`CREATE FUNCTION reject_session_request_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventCode" = 'HIRE_REQUEST' THEN RAISE EXCEPTION 'injected notification failure'; END IF; RETURN NEW; END $$`);
  await tenant.$executeRawUnsafe('CREATE TRIGGER reject_session_request_notification BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION reject_session_request_notification()');
  try {
    await expect(service.request(memberAccess, { ...requestBody(`${run.runId}-notification-failure`, trainer.id, '20:00'),
      localDate: datePlus(4), idempotencyKey: key })).rejects.toThrow();
  } finally {
    await tenant.$executeRawUnsafe('DROP TRIGGER IF EXISTS reject_session_request_notification ON "Notification"');
    await tenant.$executeRawUnsafe('DROP FUNCTION IF EXISTS reject_session_request_notification()');
  }
  expect(await tenant.pTSession.count()).toBe(before.sessions);
  expect(await tenant.sessionCreditHold.count()).toBe(before.holds);
  expect(await tenant.packCreditMovement.count()).toBe(before.movements);
  expect(await tenant.commandReceipt.count({ where: { idempotencyKey: key } })).toBe(before.receipts);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.trainerUser.id, eventCode: 'HIRE_REQUEST' } })).toBe(before.notifications);
  expect(await tenant.auditLog.count({ where: { eventCode: 'PT_SESSION_REQUESTED' } })).toBe(before.audits);
});

it('returns accurate selected-gym session credit eligibility and trainer shifts', async () => {
  const { service, tenant, trainer, memberAccess } = await setup();
  const before = await service.options(memberAccess, trainer.id);
  await tenant.trainer.update({ where: { id: trainer.id }, data: { shiftStart: '08:00', shiftEnd: '17:00' } });
  await entitlement(tenant, `${run.runId}-options`, 3);
  const options = await service.options(memberAccess, trainer.id);
  expect(options).toMatchObject({ trainerId: trainer.id, shiftStart: '08:00', shiftEnd: '17:00', timeZone: 'Asia/Colombo',
    availableCredits: before.availableCredits + 3, heldCredits: before.heldCredits, expiredCredits: before.expiredCredits, activeMembershipToday: true });
});
