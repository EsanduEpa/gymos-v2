import { randomUUID } from 'node:crypto';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { SessionLifecycleService } from '../../src/sessions/session-lifecycle.service.js';
import { reserveSessionCredit } from '../../src/sessions/credit-holds.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
const previousJwtSecret = process.env.JWT_SECRET;
beforeAll(async () => { process.env.JWT_SECRET = 'task047-disposable-session-quote-secret-at-least-32-bytes'; run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[session-cancel-owned-cleanup]', JSON.stringify(await run.cleanup()));
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousJwtSecret; }, 120_000);
const uuidKey = (prefix: string) => `${prefix}-${randomUUID()}`;
function day(value: Date, days: number) { const d = new Date(value); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function gymDate(value: Date, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function context() {
  const gym = fixture.gyms[0]!; const tenant = fixture.tenants[0]!;
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
      minimumSessionDurationMinutes: config.minimumSessionDurationMinutes } });
  const gate = { withVerifiedTenant: async (_ctx: unknown, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as unknown as TenantSchemaGateService;
  const database = { master: fixture.master } as unknown as DatabaseService;
  const service = new SessionLifecycleService(database, gate);
  const base = { gymId: gym.id, slug: gym.slug, databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    expectedTenantManifestDigest: gym.expectedTenantManifestDigest, expectedTenantOperationId: gym.expectedTenantOperationId,
    expectedTenantOperationState: 'COMPLETE', observedTenantSchemaVersion: gym.expectedTenantSchemaVersion, observedTenantManifestDigest: gym.expectedTenantManifestDigest };
  const trainerAccess = { ...base, identityId: fixture.users.trainerUser.id, identityVersion: fixture.users.trainerUser.authVersion, accessVersion: trainerLink.version,
    role: 'TRAINER', actor: { kind: 'TRAINER' as const, id: trainer.id, registrationOperationId: trainerLink.enrollmentOperationId! } };
  const ownerAccess = { ...base, identityId: fixture.users.ownerA.id, identityVersion: 0, accessVersion: 0, role: 'OWNER', actor: null };
  const memberAccess = { ...base, identityId: fixture.users.memberUser.id, identityVersion: fixture.users.memberUser.authVersion, accessVersion: memberLink.version,
    role: 'MEMBER', actor: { kind: 'MEMBER' as const, id: member.id, registrationOperationId: memberLink.enrollmentOperationId! } };
  return { service, tenant, gym, member, trainer, config, configVersion, ownerAccess, trainerAccess, memberAccess };
}

async function scheduled(ctx: Awaited<ReturnType<typeof context>>, tag: string, startAt: Date) {
  const zone = ctx.config.timezone ?? 'Asia/Colombo'; const local = gymDate(startAt, zone); const currency = ctx.config.currency ?? 'LKR';
  const ownerId = ctx.ownerAccess.identityId;
  const plan = await ctx.tenant.membershipPlan.create({ data: { name: `Cancel ${tag}`, price: '0', currency, durationDays: 90 } });
  const startDay = day(new Date(`${local}T00:00:00Z`), -30); const endDay = day(new Date(`${local}T00:00:00Z`), 90);
  await ctx.tenant.membershipTerm.create({ data: { memberId: ctx.member.id, planId: plan.id, startDate: new Date(`${startDay}T00:00:00Z`), endDateExclusive: new Date(`${endDay}T00:00:00Z`),
    agreedPrice: '0', currency, planNameSnapshot: plan.name, configurationVersion: ctx.configVersion.configurationVersion, actorIdentityId: ownerId,
    idempotencyKey: uuidKey('cancel-term'), requestDigest: requestDigest({ tag }) } });
  const receipt = await ctx.tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_PACK', idempotencyKey: uuidKey('cancel-pack-receipt'),
    requestDigest: requestDigest({ tag, pack: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { resourceIds: [] } } });
  const pack = await ctx.tenant.sessionPack.create({ data: { memberId: ctx.member.id, issuedCredits: 1, price: '100.0000', currency, totalMinorUnits: 10000n,
    creditBaseMinorUnits: 10000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90,
    startDate: new Date(`${startDay}T00:00:00Z`), endDateExclusive: new Date(`${endDay}T00:00:00Z`), commandReceiptId: receipt.id,
    actorIdentityId: ownerId, idempotencyKey: uuidKey('cancel-pack'), requestDigest: requestDigest({ tag, issued: true }) } });
  await ctx.tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 1, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `cancel-issue-${tag}-${randomUUID()}`, receiptId: receipt.id, actorIdentityId: ownerId } });
  const session = await ctx.tenant.pTSession.create({ data: { memberId: ctx.member.id, trainerId: ctx.trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: startAt, scheduledEndAt: new Date(startAt.getTime() + 60 * 60_000), gymTimezone: zone, fee: '100.0000', currency,
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: ctx.configVersion.configurationVersion,
    confirmedAt: new Date(), createdByIdentityId: ownerId } });
  const booking = await ctx.tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_BOOKING', idempotencyKey: uuidKey('cancel-book-receipt'),
    requestDigest: requestDigest({ tag, session: session.id }), state: 'COMMITTED', committedAt: new Date(), resourceType: 'PT_SESSION', resourceId: session.id, safeResult: { resourceIds: [session.id] } } });
  await ctx.tenant.$transaction(tx => reserveSessionCredit(tx, { masterGymId: ctx.gym.id, sessionId: session.id, memberId: ctx.member.id,
    trainerId: ctx.trainer.id, scheduledLocalDate: local, explicitPackId: pack.id, actorIdentityId: ownerId, receiptId: booking.id }));
  return { session, pack };
}

async function pending(ctx: Awaited<ReturnType<typeof context>>, tag: string) {
  return ctx.tenant.pTSession.create({ data: { memberId: ctx.member.id, trainerId: ctx.trainer.id, state: 'PENDING_CONFIRMATION', type: 'IN_PERSON',
    scheduledStartAt: new Date(Date.now() + 60 * 60_000), scheduledEndAt: new Date(Date.now() + 120 * 60_000), gymTimezone: ctx.config.timezone ?? 'Asia/Colombo',
    fee: '100.0000', currency: ctx.config.currency ?? 'LKR', configurationVersion: ctx.configVersion.configurationVersion,
    createdByIdentityId: ctx.memberAccess.identityId, notes: tag } });
}

it('quotes free/late cancellation from the immutable booking policy and replays exact persisted effects', async () => {
  const ctx = await context();
  const free = await scheduled(ctx, `free-${run.runId}`, new Date(Date.now() + 2 * 24 * 60 * 60_000));
  const freeQuote = await ctx.service.quote(ctx.ownerAccess, free.session.id, 'CANCEL');
  expect(freeQuote).toMatchObject({ eligible: true, consequence: 'FREE_CANCELLATION', requiresAcknowledgment: false, acknowledgmentToken: null,
    sessionVersion: 0, policyVersion: free.session.configurationVersion });
  const freeBody = { expectedVersion: freeQuote.sessionVersion, policyVersion: freeQuote.policyVersion, idempotencyKey: uuidKey('cancel-free') };
  const result = await ctx.service.cancel(ctx.ownerAccess, free.session.id, freeBody);
  expect(result).toMatchObject({ consequence: 'FREE_CANCELLATION', deductedCredits: 0, creditEffect: { resolution: 'RELEASED', balance: 1 },
    notificationOutcome: { recipient: { role: 'MEMBER', actorId: ctx.member.id } } });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: free.session.id } })).toBe(1);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: free.session.id } })).toBe(0);
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: free.session.id } })).toBe(0);
  expect(await ctx.tenant.packCreditMovement.count({ where: { packId: free.pack.id, kind: 'RELEASE' } })).toBe(1);
  expect((await ctx.service.cancel(ctx.ownerAccess, free.session.id, freeBody)).replayed).toBe(true);
  await expect(ctx.service.cancel(ctx.ownerAccess, free.session.id, { ...freeBody, idempotencyKey: uuidKey('cancel-free-different') })).rejects.toMatchObject({ status: 409 });

  const late = await scheduled(ctx, `late-${run.runId}`, new Date(Date.now() - 5 * 60_000));
  const quote = await ctx.service.quote(ctx.memberAccess, late.session.id, 'CANCEL');
  expect(quote).toMatchObject({ eligible: true, consequence: 'LATE_CANCELLATION', requiresAcknowledgment: true });
  const base = { expectedVersion: quote.sessionVersion, policyVersion: quote.policyVersion, idempotencyKey: uuidKey('cancel-late') };
  await expect(ctx.service.cancel(ctx.memberAccess, late.session.id, base)).rejects.toMatchObject({ status: 409 });
  const lateResult = await ctx.service.cancel(ctx.memberAccess, late.session.id, { ...base, acknowledgmentToken: quote.acknowledgmentToken });
  expect(lateResult).toMatchObject({ consequence: 'LATE_CANCELLATION', isLateCancel: true, deductedCredits: 1,
    creditEffect: { resolution: 'CONSUMED', creditValue: '100' }, recognizedRevenue: { amount: '100' },
    notificationOutcome: { recipient: { role: 'TRAINER', actorId: ctx.trainer.id } } });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: late.session.id } })).toBe(1);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: late.session.id, category: 'LATE_CANCEL' } })).toBe(1);
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: late.session.id } })).toBe(0);
  const receipt = await ctx.tenant.commandReceipt.findUniqueOrThrow({ where: { id: lateResult.receiptId } });
  expect((receipt.safeResult as { resourceIds: string[] }).resourceIds).toHaveLength(3);
});

it('withdraws pending requests freely; enforces no-show grace, role, acknowledgment, and one-time persisted effects', async () => {
  const ctx = await context();
  const request = await pending(ctx, `withdraw-${run.runId}`);
  const pendingQuote = await ctx.service.quote(ctx.memberAccess, request.id, 'CANCEL');
  expect(pendingQuote.consequence).toBe('PENDING_WITHDRAWAL');
  const withdrawal = await ctx.service.cancel(ctx.memberAccess, request.id, { expectedVersion: 0, policyVersion: pendingQuote.policyVersion, idempotencyKey: uuidKey('withdraw') });
  expect(withdrawal).toMatchObject({ session: { state: 'CANCELLED' }, consequence: 'PENDING_WITHDRAWAL', deductedCredits: 0, creditEffect: { resolution: 'NONE' } });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: request.id, kind: 'WITHDRAWN' } })).toBe(1);

  const early = await scheduled(ctx, `early-${run.runId}`, new Date(Date.now() + 4 * 60 * 60_000));
  const earlyQuote = await ctx.service.quote(ctx.ownerAccess, early.session.id, 'NO_SHOW');
  expect(earlyQuote.eligible).toBe(false);
  expect(earlyQuote.acknowledgmentToken).toBeNull();
  await expect(ctx.service.noShow(ctx.ownerAccess, early.session.id, { expectedVersion: 0, policyVersion: earlyQuote.policyVersion,
    idempotencyKey: uuidKey('no-show-early'), acknowledgmentToken: 'x'.repeat(32) })).rejects.toMatchObject({ status: 422 });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: early.session.id } })).toBe(0);

  const ready = await scheduled(ctx, `missed-${run.runId}`, new Date(Date.now() - 16 * 60_000));
  const quote = await ctx.service.quote(ctx.trainerAccess, ready.session.id, 'NO_SHOW');
  expect(quote).toMatchObject({ eligible: true, consequence: 'NO_SHOW', requiresAcknowledgment: true });
  const body = { expectedVersion: quote.sessionVersion, policyVersion: quote.policyVersion, idempotencyKey: uuidKey('no-show'), acknowledgmentToken: quote.acknowledgmentToken! };
  const attempts = await Promise.allSettled([ctx.service.noShow(ctx.trainerAccess, ready.session.id, body), ctx.service.noShow(ctx.trainerAccess, ready.session.id, body)]);
  if (attempts.some(value => value.status === 'rejected')) console.info('[no-show-replay-debug]', JSON.stringify(attempts.map(value => value.status === 'rejected' ? String(value.reason?.stack ?? value.reason) : value.value)));
  expect(attempts.filter(value => value.status === 'fulfilled')).toHaveLength(2);
  const value = (attempts.find(value => value.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
  expect(value).toMatchObject({ session: { state: 'MISSED' }, creditEffect: { resolution: 'CONSUMED' }, recognizedRevenue: { amount: '100' }, notificationOutcome: { state: 'AVAILABLE' } });
  expect((await ctx.service.noShow(ctx.trainerAccess, ready.session.id, body)).replayed).toBe(true);
  await expect(ctx.service.noShow(ctx.memberAccess, ready.session.id, { ...body, idempotencyKey: uuidKey('no-show-member') })).rejects.toMatchObject({ status: 403 });
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: ready.session.id, kind: 'MISSED' } })).toBe(1);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: ready.session.id, category: 'MISSED_LATE' } })).toBe(1);
  expect(await ctx.tenant.payRecord.count({ where: { sessionId: ready.session.id } })).toBe(0);
  expect(await ctx.tenant.packCreditMovement.count({ where: { packId: ready.pack.id, kind: 'CONSUME' } })).toBe(1);
});

it('returns a fresh quote for stale session versions and isolates foreign session IDs', async () => {
  const ctx = await context(); const ready = await scheduled(ctx, `stale-${run.runId}`, new Date(Date.now() - 5 * 60_000));
  const quote = await ctx.service.quote(ctx.ownerAccess, ready.session.id, 'CANCEL');
  await ctx.tenant.pTSession.update({ where: { id: ready.session.id }, data: { version: { increment: 1 } } });
  await expect(ctx.service.cancel(ctx.ownerAccess, ready.session.id, { expectedVersion: quote.sessionVersion, policyVersion: quote.policyVersion,
    idempotencyKey: uuidKey('cancel-stale'), acknowledgmentToken: quote.acknowledgmentToken })).rejects.toMatchObject({ status: 409 });
  const refreshed = await ctx.service.quote(ctx.ownerAccess, ready.session.id, 'CANCEL');
  await ctx.service.cancel(ctx.ownerAccess, ready.session.id, { expectedVersion: refreshed.sessionVersion, policyVersion: refreshed.policyVersion,
    idempotencyKey: uuidKey('cancel-stale-cleanup'), acknowledgmentToken: refreshed.acknowledgmentToken });
  const otherTenant = fixture.tenants[1]!;
  const foreignMember = await otherTenant.member.create({ data: { fullName: `Foreign ${run.runId}` } });
  const foreignTrainer = await otherTenant.trainer.create({ data: { fullName: `Foreign trainer ${run.runId}`, level: 'LEVEL_1' } });
  const foreign = await otherTenant.pTSession.create({ data: { memberId: foreignMember.id, trainerId: foreignTrainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: new Date(Date.now() - 5 * 60_000), scheduledEndAt: new Date(Date.now() + 55 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR',
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: ctx.configVersion.configurationVersion, confirmedAt: new Date(), createdByIdentityId: fixture.users.ownerB.id } });
  await expect(ctx.service.quote(ctx.ownerAccess, foreign.id, 'CANCEL')).rejects.toMatchObject({ status: 404 });
});

it('keeps cancellation policy frozen at booking when current gym settings change', async () => {
  const ctx = await context();
  const ready = await scheduled(ctx, `frozen-policy-${run.runId}`, new Date(Date.now() - 5 * 60_000));
  const oldVersion = ctx.configVersion.configurationVersion;
  await ctx.tenant.gymConfiguration.update({ where: { id: 'current' }, data: { version: { increment: 1 }, cancellationWindowMinutes: 30, lateCancelDeduction: false } });
  const quote = await ctx.service.quote(ctx.ownerAccess, ready.session.id, 'CANCEL');
  expect(quote.policyVersion).toBe(oldVersion);
  expect(quote).toMatchObject({ consequence: 'LATE_CANCELLATION', requiresAcknowledgment: true });
  const cancelled = await ctx.service.cancel(ctx.ownerAccess, ready.session.id, { expectedVersion: quote.sessionVersion, policyVersion: oldVersion,
    idempotencyKey: uuidKey('frozen-policy-cancel'), acknowledgmentToken: quote.acknowledgmentToken });
  expect(cancelled.consequence).toBe('LATE_CANCELLATION');
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: ready.session.id, category: 'LATE_CANCEL' } })).toBe(1);
  await ctx.tenant.gymConfiguration.update({ where: { id: 'current' }, data: { version: { increment: 1 },
    cancellationWindowMinutes: ctx.config.cancellationWindowMinutes, lateCancelDeduction: ctx.config.lateCancelDeduction } });
});

it('serializes conflicting late cancellation and no-show commands to one terminal settlement', async () => {
  const ctx = await context(); const ready = await scheduled(ctx, `terminal-race-${run.runId}`, new Date(Date.now() - 18 * 60_000));
  const [cancelQuote, missedQuote] = await Promise.all([
    ctx.service.quote(ctx.ownerAccess, ready.session.id, 'CANCEL'),
    ctx.service.quote(ctx.trainerAccess, ready.session.id, 'NO_SHOW'),
  ]);
  expect(cancelQuote.consequence).toBe('LATE_CANCELLATION');
  expect(missedQuote.eligible).toBe(true);
  const outcomes = await Promise.allSettled([
    ctx.service.cancel(ctx.ownerAccess, ready.session.id, { expectedVersion: 0, policyVersion: cancelQuote.policyVersion,
      idempotencyKey: uuidKey('race-cancel'), acknowledgmentToken: cancelQuote.acknowledgmentToken }),
    ctx.service.noShow(ctx.trainerAccess, ready.session.id, { expectedVersion: 0, policyVersion: missedQuote.policyVersion,
      idempotencyKey: uuidKey('race-no-show'), acknowledgmentToken: missedQuote.acknowledgmentToken! }),
  ]);
  expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
  expect(await ctx.tenant.sessionSettlement.count({ where: { sessionId: ready.session.id } })).toBe(1);
  expect(await ctx.tenant.revenueRecord.count({ where: { sessionId: ready.session.id, category: { in: ['LATE_CANCEL', 'MISSED_LATE'] } } })).toBe(1);
  expect(await ctx.tenant.packCreditMovement.count({ where: { packId: ready.pack.id, kind: 'CONSUME' } })).toBe(1);
  expect(await ctx.tenant.auditLog.count({ where: { resourceId: ready.session.id, eventCode: { in: ['PT_SESSION_CANCELLED', 'PT_SESSION_MISSED'] } } })).toBe(1);
  expect(await ctx.tenant.notification.count({ where: { resourceId: ready.session.id, eventCode: { in: ['SESSION_CANCELLED', 'SESSION_MISSED'] } } })).toBe(1);
});
