import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { resolveSessionLocalTime, SessionBookingService } from '../../src/sessions/booking.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;

beforeAll(async () => {
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
  const tenant = fixture.tenants[0]!;
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_AVAILABILITY', idempotencyKey: `booking-avail-${run.runId}`,
    requestDigest: requestDigest({ runId: run.runId, availability: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  await tenant.pTAvailabilityRule.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({ id: `book_avail_${weekday}_${run.runId}`, trainerId: trainer.id, kind: 'WEEKLY_WINDOW' as const, weekday,
    startMinute: 0, endMinute: 1440, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveToExclusive: new Date('2027-01-01T00:00:00Z'), createdByIdentityId: fixture.users.ownerA.id, commandReceiptId: receipt.id, updatedAt: new Date() })) });
}, 120_000);

afterAll(async () => {
  await fixture?.close();
  if (run) console.info('[session-booking-owned-cleanup]', JSON.stringify(await run.cleanup()));
}, 120_000);

function localDate(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function addDays(date: string, days: number) { const result = new Date(`${date}T00:00:00.000Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); }

async function serviceFor(gymIndex = 0) {
  const fixtureGym = fixture.gyms[gymIndex]!;
  const gym = await fixture.master.gym.findUniqueOrThrow({ where: { id: fixtureGym.id }, include: { expectedTenantOperation: true } });
  const tenant = fixture.tenants[gymIndex]!;
  const access = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: gymIndex === 0 ? fixture.users.ownerA.id : fixture.users.ownerB.id, gymId: gym.id } } });
  const owner = gymIndex === 0 ? fixture.users.ownerA : fixture.users.ownerB;
  const schemaGate = new TenantSchemaGateService({ withDatabase: async (_databaseName: string, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as never);
  const service = new SessionBookingService({ master: fixture.master } as never, schemaGate);
  return { service, tenant, gym, access: { identityId: owner.id, identityVersion: owner.authVersion, gymId: gym.id, slug: gym.slug,
    role: 'OWNER', databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    expectedTenantManifestDigest: gym.expectedTenantManifestDigest, expectedTenantOperationId: gym.expectedTenantOperationId,
    expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null, observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
    observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null, accessVersion: access.version, actor: null } };
}

async function issueTestEntitlement(tenant: typeof fixture.tenants[number], gymIndex: number, memberId: string, suffix: string, credits: number) {
  const ownerId = gymIndex === 0 ? fixture.users.ownerA.id : fixture.users.ownerB.id;
  const today = localDate(); const startDate = new Date(`${today}T00:00:00.000Z`); const endDateExclusive = new Date(`${addDays(today, 90)}T00:00:00.000Z`);
  const plan = await tenant.membershipPlan.create({ data: { name: `Booking ${suffix}`, price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId, planId: plan.id, startDate, endDateExclusive, agreedPrice: '0', currency: 'LKR',
    planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: ownerId, idempotencyKey: `booking-term-${suffix}`, requestDigest: requestDigest({ suffix, term: true }) } });
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_BOOKING_PACK', idempotencyKey: `booking-pack-receipt-${suffix}`,
    requestDigest: requestDigest({ suffix, issued: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const totalMinorUnits = 10_000n;
  const pack = await tenant.sessionPack.create({ data: { memberId, issuedCredits: credits, price: '100.0000', currency: 'LKR', totalMinorUnits,
    creditBaseMinorUnits: totalMinorUnits / BigInt(credits), creditRemainder: Number(totalMinorUnits % BigInt(credits)), creditAllocationPolicyVersion: 'DEC-06-v1',
    validityDays: 90, startDate, endDateExclusive,
    commandReceiptId: receipt.id, actorIdentityId: ownerId, idempotencyKey: `booking-pack-${suffix}`, requestDigest: requestDigest({ suffix, pack: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: credits, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `booking-pack-issue-${suffix}`, receiptId: receipt.id, actorIdentityId: ownerId } });
  return pack;
}

function input(memberId: string, trainerId: string, date: string, key: string, time = '15:00') {
  return { memberId, trainerId, localDate: date, localTime: time, timeZone: 'Asia/Colombo', type: 'IN_PERSON' as const,
    durationMinutes: 60, notes: 'Owner booking', idempotencyKey: `booking-${key}-0123456789` };
}

it('serves sanitized owner booking options and atomically books, reserves, audits and notifies with replay safety', async () => {
  const { service, tenant, gym, access } = await serviceFor();
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  await issueTestEntitlement(tenant, 0, member.id, run.runId, 2);

  const options = await service.options(access, { memberPage: 1, memberPageSize: 25, trainerPage: 1, trainerPageSize: 25, localDate: addDays(localDate(), 1) });
  expect(options.members.items.find(row => row.memberId === member.id)).toMatchObject({ eligibility: 'ELIGIBLE', availableCredits: 2 });
  expect(options.trainers.items.find(row => row.trainerId === trainer.id)).toMatchObject({ trainerId: trainer.id, level: 'LEVEL_1' });
  expect(options.policy).toMatchObject({ timeZone: 'Asia/Colombo', maximumDurationMinutes: 60, scheduleHorizonDays: 14 });
  await expect(service.options({ ...access, role: 'MEMBER' }, { memberPage: 1, memberPageSize: 25, trainerPage: 1, trainerPageSize: 25 }))
    .rejects.toBeInstanceOf(ForbiddenException);

  const booking = input(member.id, trainer.id, addDays(localDate(), 1), run.runId);
  const result = await service.book(access, booking, booking.idempotencyKey);
  expect(result).toMatchObject({ replayed: false, notificationOutcome: { recipient: { role: 'MEMBER', actorId: member.id }, state: 'AVAILABLE', retryable: false }, session: { state: 'SCHEDULED', memberId: member.id, trainerId: trainer.id }, creditReservation: { state: 'HELD' } });
  expect(await tenant.pTSession.count({ where: { id: result.session.id, state: 'SCHEDULED' } })).toBe(1);
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: result.session.id, packId: result.creditReservation.packId, state: 'HELD' } })).toBe(1);
  expect(await tenant.packCreditMovement.count({ where: { holdId: result.creditReservation.holdId, kind: 'HOLD' } })).toBe(1);
  expect(await tenant.sessionStateEvent.count({ where: { sessionId: result.session.id, toState: 'SCHEDULED' } })).toBe(1);
  expect(await tenant.auditLog.count({ where: { receiptId: result.receiptId, eventCode: 'PT_SESSION_BOOKED' } })).toBe(1);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, resourceId: result.session.id, eventCode: 'SESSION_BOOKED' } })).toBe(1);
  const replay = await service.book(access, booking, booking.idempotencyKey);
  expect(replay).toMatchObject({ receiptId: result.receiptId, replayed: true, session: { id: result.session.id } });
  expect(await tenant.pTSession.count({ where: { id: result.session.id } })).toBe(1);
  expect(await tenant.packCreditMovement.count({ where: { holdId: result.creditReservation.holdId } })).toBe(1);
  expect(await tenant.notification.count({ where: { resourceId: result.session.id } })).toBe(2);
  expect(await tenant.notification.count({ where: { resourceId: result.session.id, recipientIdentityId: fixture.users.trainerUser.id, eventCode: 'SESSION_BOOKED' } })).toBe(1);
  const altered = { ...booking, notes: 'changed body' };
  await expect(service.book(access, altered, altered.idempotencyKey)).rejects.toMatchObject({ status: 409 });
  expect(await tenant.pTSession.count({ where: { id: result.session.id } })).toBe(1);
  expect(gym.id).toBe(access.gymId);
}, 30_000);

it('allows only one of concurrent bookings to hold the last credit and rejects a foreign gym member safely', async () => {
  const { service, tenant, gym, access } = await serviceFor();
  const member = await tenant.member.findFirstOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  // Consume the remaining credit from the preceding booking case so this race owns exactly one available credit.
  const drainDate = addDays(localDate(), 1);
  await service.book(access, input(member.id, trainer.id, drainDate, `${run.runId}-drain-a`, '09:00'));
  await issueTestEntitlement(tenant, 0, member.id, `${run.runId}-race`, 1);
  const isolatedMember = member;
  const date = addDays(localDate(), 2);
  const attempts = await Promise.allSettled([
    service.book(access, input(isolatedMember.id, trainer.id, date, `${run.runId}-left`, '13:00')),
    service.book(access, input(isolatedMember.id, trainer.id, date, `${run.runId}-right`, '16:00')),
  ]);
  expect(attempts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
  expect(attempts.filter(item => item.status === 'rejected')).toHaveLength(1);
  expect(await tenant.sessionCreditHold.count({ where: { state: 'HELD', session: { memberId: isolatedMember.id, scheduledStartAt: { gte: new Date(`${date}T00:00:00.000Z`) } } } })).toBe(1);
  const foreign = await fixture.tenants[1]!.member.findFirstOrThrow({ where: { status: 'ACTIVE' } });
  await expect(service.book(access, input(foreign.id, trainer.id, addDays(date, 1), `${run.runId}-foreign`))).rejects.toBeInstanceOf(NotFoundException);
  expect(await tenant.pTSession.count({ where: { memberId: foreign.id } })).toBe(0);
  expect(gym.id).toBe(access.gymId);
}, 30_000);

it('rejects DST gaps, unresolved ambiguity, stale timezone and out-of-horizon or past schedules without effects', async () => {
  expect(() => resolveSessionLocalTime('2026-03-08', '02:30', 'America/New_York')).toThrow(/does not exist/);
  expect(() => resolveSessionLocalTime('2026-11-01', '01:30', 'America/New_York')).toThrow(/ambiguous/);
  const early = resolveSessionLocalTime('2026-11-01', '01:30', 'America/New_York', '-04:00');
  const late = resolveSessionLocalTime('2026-11-01', '01:30', 'America/New_York', '-05:00');
  expect(late.instant.getTime() - early.instant.getTime()).toBe(60 * 60_000);
  const { service, tenant, access } = await serviceFor();
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  await issueTestEntitlement(tenant, 0, member.id, `${run.runId}-time`, 3);
  const before = await tenant.pTSession.count();
  const tomorrow = addDays(localDate(), 1);
  await expect(service.book(access, { ...input(member.id, trainer.id, tomorrow, `${run.runId}-zone`), timeZone: 'UTC' })).rejects.toMatchObject({ status: 409 });
  await expect(service.book(access, input(member.id, trainer.id, addDays(localDate(), 366), `${run.runId}-horizon`))).rejects.toMatchObject({ status: 422 });
  const afterPolicyHorizon = new Date(Date.now() + 14 * 24 * 60 * 60_000 + 60_000);
  const horizonParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(afterPolicyHorizon);
  const horizonValues = Object.fromEntries(horizonParts.map(part => [part.type, part.value]));
  const horizonDate = `${horizonValues.year}-${horizonValues.month}-${horizonValues.day}`;
  const horizonTime = `${horizonValues.hour}:${horizonValues.minute}`;
  await expect(service.book(access, input(member.id, trainer.id, horizonDate, `${run.runId}-over14`, horizonTime))).rejects.toMatchObject({ status: 422 });
  await expect(service.book(access, input(member.id, trainer.id, localDate(), `${run.runId}-notice`, '00:01'))).rejects.toMatchObject({ status: 422 });
  await expect(service.book(access, { ...input(member.id, trainer.id, tomorrow, `${run.runId}-duration`), durationMinutes: 90 })).rejects.toMatchObject({ status: 422 });
  await expect(service.book(access, { ...input(member.id, trainer.id, tomorrow, `${run.runId}-virtual`), type: 'VIRTUAL' })).rejects.toMatchObject({ status: 422 });
  expect(await tenant.pTSession.count()).toBe(before);
});
