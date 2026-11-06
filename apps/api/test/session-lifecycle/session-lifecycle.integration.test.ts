import { randomUUID } from 'node:crypto';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { SessionLifecycleService } from '../../src/sessions/session-lifecycle.service.js';
import { SessionReadsService } from '../../src/sessions/session-reads.service.js';
import { reserveSessionCredit } from '../../src/sessions/credit-holds.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[session-lifecycle-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

function localDateAt(instant: Date, zone = 'Asia/Colombo') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant).map(v => [v.type, v.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function shiftDays(date: string, days: number) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function uuidKey(prefix: string) { return `${prefix}-${randomUUID()}`; }

async function setup(gymIndex = 0) {
  const gym = fixture.gyms[gymIndex]!; const tenant = fixture.tenants[gymIndex]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const [memberLink, trainerLink] = await Promise.all([
    fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.memberUser.id, gymId: gym.id } } }),
    fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.trainerUser.id, gymId: gym.id } } }),
  ]);
  const config = await tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
  const configVersion = await tenant.gymConfigurationVersion.findUnique({ where: { gymConfigurationId_configurationVersion: { gymConfigurationId: 'current', configurationVersion: config.version } } })
    ?? await tenant.gymConfigurationVersion.create({ data: { gymConfigurationId: 'current', configurationVersion: config.version, currency: config.currency, timezone: config.timezone,
      address: config.address, phone: config.phone, email: config.email, payPeriod: config.payPeriod, defaultSessionFee: config.defaultSessionFee,
      level2SessionFee: config.level2SessionFee ?? config.defaultSessionFee, introSessionFee: config.introSessionFee ?? config.defaultSessionFee,
      level1BaseRate: config.level1BaseRate, level2BaseRate: config.level2BaseRate, offShiftPremium: config.offShiftPremium,
      cancellationWindowMinutes: config.cancellationWindowMinutes, lateCancelDeduction: config.lateCancelDeduction,
      minimumSessionDurationMinutes: 20 } });
  const gate = { withVerifiedTenant: async (_context: unknown, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as unknown as TenantSchemaGateService;
  const db = { master: fixture.master } as unknown as DatabaseService;
  const service = new SessionLifecycleService(db, gate);
  const reads = new SessionReadsService(db, gate);
  const base = { gymId: gym.id, slug: gym.slug, databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    expectedTenantManifestDigest: gym.expectedTenantManifestDigest, expectedTenantOperationId: gym.expectedTenantOperationId,
    expectedTenantOperationState: 'COMPLETE', observedTenantSchemaVersion: gym.expectedTenantSchemaVersion, observedTenantManifestDigest: gym.expectedTenantManifestDigest };
  const trainerAccess = { ...base, identityId: fixture.users.trainerUser.id, identityVersion: fixture.users.trainerUser.authVersion, accessVersion: trainerLink.version,
    role: 'TRAINER', actor: { kind: 'TRAINER' as const, id: trainer.id, registrationOperationId: trainerLink.enrollmentOperationId! } };
  const ownerAccess = { ...base, identityId: gymIndex === 0 ? fixture.users.ownerA.id : fixture.users.ownerB.id, identityVersion: 0, accessVersion: 0, role: 'OWNER', actor: null };
  const memberAccess = { ...base, identityId: fixture.users.memberUser.id, identityVersion: fixture.users.memberUser.authVersion, accessVersion: memberLink.version,
    role: 'MEMBER', actor: { kind: 'MEMBER' as const, id: member.id, registrationOperationId: memberLink.enrollmentOperationId! } };
  return { service, reads, tenant, gym, member, trainer, config, configVersion, trainerAccess, ownerAccess, memberAccess };
}

async function createSession(ctx: Awaited<ReturnType<typeof setup>>, suffix: string, scheduledStart?: Date) {
  const now = new Date(); const start = scheduledStart ?? new Date(now.getTime() - 5 * 60_000); const end = new Date(start.getTime() + 60 * 60_000);
  const localDate = localDateAt(start, ctx.config.timezone ?? 'Asia/Colombo'); const currency = ctx.config.currency ?? 'LKR'; const ownerId = ctx.ownerAccess.identityId;
  const plan = await ctx.tenant.membershipPlan.create({ data: { name: `Lifecycle ${suffix}`, price: '0', currency, durationDays: 90 } });
  const termStart = shiftDays(localDate, -30); const termEnd = shiftDays(localDate, 90);
  await ctx.tenant.membershipTerm.create({ data: { memberId: ctx.member.id, planId: plan.id, startDate: new Date(`${termStart}T00:00:00Z`), endDateExclusive: new Date(`${termEnd}T00:00:00Z`),
    agreedPrice: '0', currency, planNameSnapshot: plan.name, configurationVersion: ctx.configVersion.configurationVersion, actorIdentityId: ownerId,
    idempotencyKey: uuidKey('lc-term'), requestDigest: requestDigest({ suffix, term: true }) } });
  const receipt = await ctx.tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_SESSION_PACK', idempotencyKey: uuidKey('lc-pack-receipt'),
    requestDigest: requestDigest({ suffix, pack: true }), state: 'COMMITTED', committedAt: now, safeResult: { resourceIds: [] } } });
  const pack = await ctx.tenant.sessionPack.create({ data: { memberId: ctx.member.id, issuedCredits: 1, price: '100.0000', currency, totalMinorUnits: 10000n,
    creditBaseMinorUnits: 10000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90,
    startDate: new Date(`${termStart}T00:00:00Z`), endDateExclusive: new Date(`${termEnd}T00:00:00Z`), commandReceiptId: receipt.id,
    actorIdentityId: ownerId, idempotencyKey: uuidKey('lc-pack'), requestDigest: requestDigest({ suffix, issued: true }) } });
  await ctx.tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 1, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `lc-issue-${suffix}`, receiptId: receipt.id, actorIdentityId: ownerId } });
  const session = await ctx.tenant.pTSession.create({ data: { memberId: ctx.member.id, trainerId: ctx.trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: start, scheduledEndAt: end, gymTimezone: ctx.config.timezone ?? 'Asia/Colombo', fee: '100.0000', currency,
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: ctx.configVersion.configurationVersion,
    confirmedAt: now, createdByIdentityId: ownerId } });
  const bookingReceipt = await ctx.tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_SESSION_BOOKING', idempotencyKey: uuidKey('lc-book-receipt'),
    requestDigest: requestDigest({ suffix, session: session.id }), state: 'COMMITTED', committedAt: now, resourceType: 'PT_SESSION', resourceId: session.id, safeResult: { resourceIds: [session.id] } } });
  await ctx.tenant.$transaction(tx => reserveSessionCredit(tx, { masterGymId: ctx.gym.id, sessionId: session.id, memberId: ctx.member.id, trainerId: ctx.trainer.id,
    scheduledLocalDate: localDate, explicitPackId: pack.id, actorIdentityId: ownerId, receiptId: bookingReceipt.id }));
  return { session, pack };
}

it('starts once under the selected-gym fence; rejects early, foreign, inactive and wrong-role starts', async () => {
  const ctx = await setup(); const ready = await createSession(ctx, `start-${run.runId}`);
  const body = { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-start') };
  const attempts = await Promise.allSettled([ctx.service.start(ctx.trainerAccess, ready.session.id, body), ctx.service.start(ctx.trainerAccess, ready.session.id, body)]);
  if (attempts.some(x => x.status === 'rejected')) console.info('[start-debug]', JSON.stringify(attempts.map(x => x.status === 'rejected' ? String(x.reason?.stack ?? x.reason) : x.value)));
  expect(attempts.filter(x => x.status === 'fulfilled')).toHaveLength(2);
  const first = (attempts.find(x => x.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
  expect(first).toMatchObject({ session: { state: 'ACTIVE', version: 1 }, notificationOutcome: { recipient: { role: 'MEMBER', actorId: ctx.member.id }, state: 'AVAILABLE' } });
  expect(await ctx.tenant.sessionStateEvent.count({ where: { sessionId: ready.session.id, toState: 'ACTIVE' } })).toBe(1);
  expect(await ctx.tenant.notification.count({ where: { resourceId: ready.session.id, eventCode: 'SESSION_STARTED' } })).toBe(1);
  expect(await ctx.tenant.auditLog.count({ where: { receiptId: first.receiptId, eventCode: 'PT_SESSION_STARTED' } })).toBe(1);
  await expect(ctx.service.start(ctx.trainerAccess, ready.session.id, { ...body, idempotencyKey: uuidKey('lifecycle-start-different') })).rejects.toMatchObject({ status: 409 });
  await expect(ctx.service.start(ctx.memberAccess, ready.session.id, { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-wrong-role') })).rejects.toMatchObject({ status: 403 });
  await ctx.tenant.pTSession.update({ where: { id: ready.session.id }, data: { startedAt: new Date(Date.now() - 25 * 60_000) } });
  await ctx.service.complete(ctx.trainerAccess, ready.session.id, { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-free-slot') });

  const tooEarly = await createSession(ctx, `early-${run.runId}`, new Date(Date.now() + 2 * 60 * 60_000));
  await expect(ctx.service.start(ctx.trainerAccess, tooEarly.session.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-early') })).rejects.toMatchObject({ status: 422 });
  expect(await ctx.tenant.sessionStateEvent.count({ where: { sessionId: tooEarly.session.id } })).toBe(0);
  const otherGym = fixture.gyms[1]!; const otherTenant = fixture.tenants[1]!; const foreignMember = await otherTenant.member.create({ data: { fullName: `Foreign ${run.runId}` } });
  const foreignTrainer = await otherTenant.trainer.create({ data: { fullName: `Foreign Trainer ${run.runId}`, level: 'LEVEL_1' } });
  const foreignStart = new Date(Date.now() - 5 * 60_000);
  const foreign = await otherTenant.pTSession.create({ data: { memberId: foreignMember.id, trainerId: foreignTrainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: foreignStart, scheduledEndAt: new Date(foreignStart.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR',
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: new Date(), createdByIdentityId: fixture.users.ownerB.id } });
  expect(otherGym.id).not.toBe(ctx.gym.id);
  await expect(ctx.service.start(ctx.trainerAccess, foreign.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-foreign') })).rejects.toMatchObject({ status: 404 });

  const inactive = await createSession(ctx, `inactive-${run.runId}`, new Date(Date.now() + 4 * 60 * 60_000));
  await ctx.tenant.trainer.update({ where: { id: ctx.trainer.id }, data: { status: 'DEACTIVATED' } });
  await expect(ctx.service.start(ctx.trainerAccess, inactive.session.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-inactive') })).rejects.toMatchObject({ status: 403 });
  await ctx.tenant.trainer.update({ where: { id: ctx.trainer.id }, data: { status: 'ACTIVE' } });

  await expect(ctx.service.complete(ctx.trainerAccess, tooEarly.session.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-direct-complete') })).rejects.toMatchObject({ status: 409 });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: tooEarly.session.id } })).toBe(0);
  expect(await ctx.tenant.sessionCreditHold.count({ where: { sessionId: tooEarly.session.id, state: 'HELD' } })).toBe(1);
});

it('completes the held credit using the booking policy snapshot, replays safely, and keeps notes member-visible without money effects', async () => {
  const ctx = await setup(); const ready = await createSession(ctx, `complete-${run.runId}`);
  const startKey = uuidKey('lifecycle-start-complete');
  const started = await ctx.service.start(ctx.trainerAccess, ready.session.id, { expectedVersion: 0, idempotencyKey: startKey });
  const originalVersion = ctx.configVersion.configurationVersion;
  const thresholdMinutes = ctx.configVersion.minimumSessionDurationMinutes;
  await ctx.tenant.gymConfiguration.update({ where: { id: 'current' }, data: { minimumSessionDurationMinutes: 60, level1BaseRate: '0.900000' } });
  await ctx.tenant.trainer.update({ where: { id: ctx.trainer.id }, data: { level: 'LEVEL_2' } });
  expect(thresholdMinutes).toBeGreaterThan(0);
  await ctx.tenant.pTSession.update({ where: { id: ready.session.id }, data: { startedAt: new Date(Date.now() - (thresholdMinutes - 1) * 60_000) } });
  await expect(ctx.service.complete(ctx.trainerAccess, ready.session.id, { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-complete-too-short') })).rejects.toMatchObject({ status: 422 });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: ready.session.id } })).toBe(0);
  expect(await ctx.tenant.sessionCreditHold.count({ where: { sessionId: ready.session.id, state: 'HELD' } })).toBe(1);
  const startedAt = new Date(Date.now() - thresholdMinutes * 60_000);
  await ctx.tenant.pTSession.update({ where: { id: ready.session.id }, data: { startedAt } });
  await ctx.tenant.sessionPack.update({ where: { id: ready.pack.id }, data: { endDateExclusive: new Date(`${shiftDays(localDateAt(new Date()), -1)}T00:00:00Z`) } });
  const completionBody = { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-complete') };
  const completed = await ctx.service.complete(ctx.trainerAccess, ready.session.id, completionBody);
  expect(completed).toMatchObject({ replayed: false, session: { state: 'COMPLETED', version: 2 }, creditEffect: { delta: -1, creditOrdinal: 1, creditValue: '100.00' },
    recognizedRevenue: { amount: '100', currency: 'LKR' }, trainerPay: { amount: '40' }, notificationOutcome: { state: 'AVAILABLE' } });
  const replay = await ctx.service.complete(ctx.trainerAccess, ready.session.id, completionBody);
  expect(replay).toMatchObject({ receiptId: completed.receiptId, replayed: true, session: { state: 'COMPLETED', version: 2, endedAt: completed.session.endedAt }, trainerPay: completed.trainerPay });
  await expect(ctx.service.complete(ctx.trainerAccess, ready.session.id, { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-complete-different') })).rejects.toMatchObject({ status: 409 });
  const startReplay = await ctx.service.start(ctx.trainerAccess, ready.session.id, { expectedVersion: 0, idempotencyKey: startKey });
  const persistedStartAt = (await ctx.tenant.pTSession.findUniqueOrThrow({ where: { id: ready.session.id }, select: { startedAt: true } })).startedAt!.toISOString();
  expect(startReplay).toMatchObject({ receiptId: started.receiptId, replayed: true, session: { state: 'ACTIVE', version: 1, startedAt: persistedStartAt } });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: ready.session.id } })).toBe(1);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: ready.session.id, category: 'COMPLETED_SESSION' } })).toBe(1);
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: ready.session.id } })).toBe(1);
  expect(await ctx.tenant.sessionCreditHold.count({ where: { sessionId: ready.session.id, state: 'CONSUMED' } })).toBe(1);
  expect(await ctx.tenant.packCreditMovement.count({ where: { packId: ready.pack.id, kind: 'CONSUME', creditOrdinal: 1 } })).toBe(1);
  const completedNotices = await ctx.tenant.notification.findMany({ where: { resourceId: ready.session.id, eventCode: 'SESSION_COMPLETED' } });
  expect(completedNotices).toHaveLength(2);
  expect(new Set(completedNotices.map(notice => notice.recipientIdentityId))).toEqual(new Set([fixture.users.memberUser.id, fixture.users.trainerUser.id]));
  const payRow = await ctx.tenant.payRecord.findUniqueOrThrow({ where: { sessionId: ready.session.id } });
  expect(payRow.confirmationRate.toFixed(6)).toBe('0.400000');
  expect(payRow.confirmationLevel).toBe('LEVEL_1');
  expect(payRow.amount.toFixed(4)).toBe('40.0000');
  const receipt = await ctx.tenant.commandReceipt.findUniqueOrThrow({ where: { id: completed.receiptId } });
  expect(receipt.safeResult).toMatchObject({ version: 2, notificationState: 'AVAILABLE' });
  expect((receipt.safeResult as { resourceIds: string[] }).resourceIds).toHaveLength(6);
  expect(originalVersion).toBe(ready.session.configurationVersion);

  const countsBeforeNotes = { holds: await ctx.tenant.sessionCreditHold.count({ where: { sessionId: ready.session.id } }),
    revenue: await ctx.tenant.revenueRecord.count({ where: { sessionId: ready.session.id } }), pay: await ctx.tenant.payRecord.count({ where: { sessionId: ready.session.id } }) };
  const firstNote = { notes: 'Member-safe shared note', expectedVersion: 2, idempotencyKey: uuidKey('lifecycle-note-first') };
  const firstSaved = await ctx.service.updateNotes(ctx.trainerAccess, ready.session.id, firstNote);
  await ctx.service.updateNotes(ctx.trainerAccess, ready.session.id, { notes: 'New shared note', expectedVersion: 3, idempotencyKey: uuidKey('lifecycle-note-second') });
  const replayedNote = await ctx.service.updateNotes(ctx.trainerAccess, ready.session.id, firstNote);
  expect(replayedNote).toMatchObject({ receiptId: firstSaved.receiptId, replayed: true, notes: 'Member-safe shared note', version: 3 });
  const memberPage = await ctx.reads.list(ctx.memberAccess, {});
  expect(memberPage.items.find(row => row.id === ready.session.id)?.notes).toBe('New shared note');
  for (const access of [ctx.memberAccess, ctx.trainerAccess, ctx.ownerAccess]) {
    const detail = await ctx.reads.detail(access, ready.session.id);
    expect(detail).toMatchObject({ reservation: 'CONSUMED', settlement: 'COMPLETED', creditConsumed: true,
      minimumCompletionMinutes: thresholdMinutes, session: { id: ready.session.id, state: 'COMPLETED', notes: 'New shared note', version: 4 } });
    expect(detail.timeline.filter(event => event.notesUpdated)).toHaveLength(2);
    expect(detail.session).toMatchObject(access.role === 'MEMBER' ? { trainerPay: null, fee: null, currency: null } : access.role === 'TRAINER' ? { trainerPay: '40', fee: null } : { fee: '100', trainerPay: null });
  }
  expect(await ctx.tenant.sessionCreditHold.count({ where: { sessionId: ready.session.id } })).toBe(countsBeforeNotes.holds);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: ready.session.id } })).toBe(countsBeforeNotes.revenue);
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: ready.session.id } })).toBe(countsBeforeNotes.pay);
  await ctx.tenant.trainer.update({ where: { id: ctx.trainer.id }, data: { level: 'LEVEL_1' } });
});

it('rolls back completion effects on an injected earning failure and writes a signed correction after a close wins', async () => {
  const ctx = await setup();
  const failing = await createSession(ctx, `failure-${run.runId}`);
  await ctx.service.start(ctx.trainerAccess, failing.session.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-start-failure') });
  await ctx.tenant.pTSession.update({ where: { id: failing.session.id }, data: { startedAt: new Date(Date.now() - 25 * 60_000) } });
  await ctx.tenant.$executeRawUnsafe(`CREATE FUNCTION "fail_lifecycle_revenue_${run.runId.replaceAll('-', '_')}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected lifecycle revenue failure'; END; $$`);
  await ctx.tenant.$executeRawUnsafe(`CREATE TRIGGER "fail_lifecycle_revenue_${run.runId.replaceAll('-', '_')}" BEFORE INSERT ON "RevenueRecord" FOR EACH ROW EXECUTE FUNCTION "fail_lifecycle_revenue_${run.runId.replaceAll('-', '_')}"()`);
  const failingKey = uuidKey('lifecycle-complete-failure');
  await expect(ctx.service.complete(ctx.trainerAccess, failing.session.id, { expectedVersion: 1, idempotencyKey: failingKey })).rejects.toThrow(/injected lifecycle revenue failure/);
  await ctx.tenant.$executeRawUnsafe(`DROP TRIGGER "fail_lifecycle_revenue_${run.runId.replaceAll('-', '_')}" ON "RevenueRecord"`);
  await ctx.tenant.$executeRawUnsafe(`DROP FUNCTION "fail_lifecycle_revenue_${run.runId.replaceAll('-', '_')}"()`);
  expect(await ctx.tenant.pTSession.findUniqueOrThrow({ where: { id: failing.session.id } })).toMatchObject({ state: 'ACTIVE', version: 1 });
  expect(await ctx.tenant.sessionCreditHold.count({ where: { sessionId: failing.session.id, state: 'HELD' } })).toBe(1);
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: failing.session.id } })).toBe(0);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: failing.session.id } })).toBe(0);
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: failing.session.id } })).toBe(0);
  expect(await ctx.tenant.trainerPayCorrection.count({ where: { sessionId: failing.session.id } })).toBe(0);
  expect(await ctx.tenant.notification.count({ where: { resourceId: failing.session.id, eventCode: 'SESSION_COMPLETED' } })).toBe(0);
  expect(await ctx.tenant.commandReceipt.count({ where: { idempotencyKey: failingKey, commandKind: 'COMPLETE_PT_SESSION' } })).toBe(0);
  await ctx.tenant.pTSession.update({ where: { id: failing.session.id }, data: { startedAt: new Date(Date.now() - 25 * 60_000) } });
  await ctx.service.complete(ctx.trainerAccess, failing.session.id, { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-complete-retry') });

  const closed = await createSession(ctx, `closed-${run.runId}`);
  await ctx.service.start(ctx.trainerAccess, closed.session.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-start-closed') });
  await ctx.tenant.pTSession.update({ where: { id: closed.session.id }, data: { startedAt: new Date(Date.now() - 25 * 60_000) } });
  const source = await ctx.tenant.gymConfigurationVersion.findUniqueOrThrow({ where: { gymConfigurationId_configurationVersion: { gymConfigurationId: 'current', configurationVersion: closed.session.configurationVersion } } });
  const local = localDateAt(closed.session.scheduledStartAt, closed.session.gymTimezone); const [year, month, day] = local.split('-').map(Number);
  let periodStart: string; let periodEnd: string;
  if (source.payPeriod === 'MONTHLY') { periodStart = `${year}-${String(month).padStart(2, '0')}-01`; periodEnd = month === 12 ? `${year! + 1}-01-01` : `${year}-${String(month! + 1).padStart(2, '0')}-01`; }
  else { const d = new Date(Date.UTC(year!, month! - 1, day!)); const monday = (d.getUTCDay() + 6) % 7; periodStart = shiftDays(local, -monday); periodEnd = shiftDays(periodStart, 7); }
  const boundary = (date: string) => new Date(new Date(`${date}T00:00:00.000Z`).getTime() - 330 * 60_000);
  const lock = `trainer-pay-period:${ctx.gym.id}:${source.payPeriod}:${periodStart}`;
  const closedPeriod = await ctx.tenant.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lock}, 0))`;
    return tx.trainerPayPeriod.upsert({ where: { cadence_localStartDate: { cadence: source.payPeriod, localStartDate: new Date(`${periodStart}T00:00:00Z`) } },
      create: { cadence: source.payPeriod, localStartDate: new Date(`${periodStart}T00:00:00Z`), localEndDateExclusive: new Date(`${periodEnd}T00:00:00Z`), timezone: closed.session.gymTimezone,
        utcStartAt: boundary(periodStart), utcEndAt: boundary(periodEnd), state: 'CLOSED', version: 1 }, update: { state: 'CLOSED', version: { increment: 1 } } });
  });
  const closedBody = { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-complete-closed') };
  const correction = await ctx.service.complete(ctx.trainerAccess, closed.session.id, closedBody);
  const correctionReplay = await ctx.service.complete(ctx.trainerAccess, closed.session.id, closedBody);
  expect(correctionReplay).toMatchObject({ receiptId: correction.receiptId, replayed: true, trainerPay: correction.trainerPay, session: { version: 2, state: 'COMPLETED' } });
  expect(correction.trainerPay).toMatchObject({ recordId: expect.any(String), periodId: expect.not.stringMatching(closedPeriod.id), amount: '40' });
  const row = await ctx.tenant.trainerPayCorrection.findFirstOrThrow({ where: { sessionId: closed.session.id } });
  expect(row).toMatchObject({ originalPeriodId: closedPeriod.id, correctionPeriodId: correction.trainerPay.periodId, sourcePeriodState: 'CLOSED', reason: expect.any(String) });
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: closed.session.id } })).toBe(0);
  expect(await ctx.tenant.trainerPayCorrection.count({ where: { sessionId: closed.session.id } })).toBe(1);
  await expect(ctx.tenant.trainerPayCorrection.update({ where: { id: row.id }, data: { reason: 'rewritten' } })).rejects.toThrow(/append-only/);

  const approved = await createSession(ctx, `approved-${run.runId}`);
  await ctx.service.start(ctx.trainerAccess, approved.session.id, { expectedVersion: 0, idempotencyKey: uuidKey('lifecycle-start-approved') });
  await ctx.tenant.pTSession.update({ where: { id: approved.session.id }, data: { startedAt: new Date(Date.now() - 25 * 60_000) } });
  const approvalTime = new Date();
  await ctx.tenant.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lock}, 0))`;
    await tx.$queryRaw`SELECT "id" FROM "TrainerPayPeriod" WHERE "id" = ${closedPeriod.id} FOR UPDATE`;
    await tx.trainerPayPeriod.update({ where: { id: closedPeriod.id }, data: { state: 'APPROVED', version: { increment: 1 }, approvedAt: approvalTime,
      approvedByIdentityId: ctx.ownerAccess.identityId } });
  });
  const approvedBody = { expectedVersion: 1, idempotencyKey: uuidKey('lifecycle-complete-approved') };
  const approvedCorrection = await ctx.service.complete(ctx.trainerAccess, approved.session.id, approvedBody);
  const approvedReplay = await ctx.service.complete(ctx.trainerAccess, approved.session.id, approvedBody);
  expect(approvedReplay).toMatchObject({ receiptId: approvedCorrection.receiptId, replayed: true, trainerPay: approvedCorrection.trainerPay });
  const approvedRow = await ctx.tenant.trainerPayCorrection.findFirstOrThrow({ where: { sessionId: approved.session.id } });
  expect(approvedRow).toMatchObject({ originalPeriodId: closedPeriod.id, correctionPeriodId: approvedCorrection.trainerPay.periodId, sourcePeriodState: 'APPROVED',
    sourcePeriodApprovedByIdentityId: ctx.ownerAccess.identityId });
  expect(approvedRow.sourcePeriodApprovedAt).toEqual(approvalTime);
  expect(await ctx.tenant.trainerPayPeriod.findUniqueOrThrow({ where: { id: closedPeriod.id } })).toMatchObject({ state: 'APPROVED', approvedByIdentityId: ctx.ownerAccess.identityId });
});
