import { SessionExpiryRunner } from '../../src/sessions/session-expiry-runner.js';
import type { DatabaseService } from '../../src/database.service.js';
import type { TenantDatabaseService } from '../../src/tenant-database.service.js';
import { randomUUID } from 'node:crypto';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';
import { processSessionReminder, sweepSessionReminders } from '../../src/sessions/session-reminders.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
const start = new Date('2030-01-15T06:00:00Z');
const at = (hours: number) => new Date(start.getTime() - hours * 3_600_000);
let sequence = 0;
async function booking(confirmedAt = at(48)) {
  const tenant = fixture.tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  // Each test has a distinct participant/date so historical booking exclusion remains enabled.
  const day = sequence++;
  const shiftedStart = new Date(start.getTime() + day * 86_400_000);
  const shift = (date: Date) => new Date(date.getTime() + day * 86_400_000);
  const session = await tenant.pTSession.create({ data: { id: `reminder-${randomUUID()}`, memberId: member.id, trainerId: trainer.id,
    state: 'SCHEDULED', scheduledStartAt: shiftedStart, scheduledEndAt: new Date(shiftedStart.getTime() + 3_600_000),
    gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR', confirmationRate: '0.4', confirmationLevel: 'LEVEL_1',
    configurationVersion: 0, confirmedAt: shift(confirmedAt), createdByIdentityId: fixture.users.ownerA.id } });
  const jobs = await tenant.pTSessionReminder.findMany({ where: { sessionId: session.id }, orderBy: { id: 'asc' } });
  return { tenant, session, jobs, now: (hours: number) => shift(at(hours)), gymId: fixture.gyms[0]!.id };
}
beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[reminders-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

it('queues only future/exact thresholds, and notes do not create new schedule work', async () => {
  const full = await booking(); expect(full.jobs).toHaveLength(4);
  await full.tenant.pTSession.update({ where: { id: full.session.id }, data: { notes: 'Private notes never appear in reminders', version: { increment: 1 } } });
  expect(await full.tenant.pTSessionReminder.count({ where: { sessionId: full.session.id } })).toBe(4);
  expect((await booking(at(24))).jobs).toHaveLength(4);
  expect((await booking(at(23))).jobs.map(j => j.kind)).toEqual(['1H', '1H']);
  expect((await booking(at(1))).jobs).toHaveLength(2);
  expect((await booking(at(0.5))).jobs).toHaveLength(0);
});
it('emits exactly due, deduplicates concurrent workers/restarts and preserves gym-local content', async () => {
  const ctx = await booking(); const job = ctx.jobs.find(j => j.kind === '24H')!;
  expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, new Date(ctx.now(24).getTime() - 1))).toBe('UNCHANGED');
  const outcomes = await Promise.all([0, 1].map(() => processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(24))));
  expect(outcomes).toContain('SENT');
  expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(23))).toBe('UNCHANGED');
  const result = await ctx.tenant.pTSessionReminder.findUniqueOrThrow({ where: { id: job.id }, include: { notification: true } });
  expect(result.notification).toMatchObject({ eventCode: 'SESSION_REMINDER_24H', resourceId: ctx.session.id });
  expect(result.notification!.message).toContain('Asia/Colombo');
  expect(result.notification!.message).not.toContain('Private');
  expect(await ctx.tenant.notification.count({ where: { resourceId: ctx.session.id } })).toBe(1);
});
it('skips stale 24H after outage, delivers only 1H before start, and skips after start', async () => {
  const ctx = await booking();
  for (const job of ctx.jobs) expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(1))).toBe(job.kind === '24H' ? 'SKIPPED' : 'SENT');
  expect(await ctx.tenant.notification.count({ where: { resourceId: ctx.session.id } })).toBe(2);
  const past = await booking();
  for (const job of past.jobs) expect(await processSessionReminder(past.tenant, fixture.master, past.gymId, job.id, past.now(0))).toBe('SKIPPED');
});
it('invalidates work and suppresses emitted reminders atomically on state change, including a worker race', async () => {
  const ctx = await booking(); const job = ctx.jobs.find(j => j.kind === '24H')!;
  await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(24));
  await Promise.all([
    processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, ctx.jobs.find(j => j.kind === '1H')!.id, ctx.now(1)),
    ctx.tenant.pTSession.update({ where: { id: ctx.session.id }, data: { state: 'CANCELLED', endedAt: ctx.now(1), version: { increment: 1 } } }),
  ]);
  expect(await ctx.tenant.pTSessionReminder.count({ where: { sessionId: ctx.session.id, status: 'PENDING' } })).toBe(0);
  expect(await ctx.tenant.notification.count({ where: { resourceId: ctx.session.id, supersededAt: null } })).toBe(0);
  expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(1))).toBe('UNCHANGED');
});
it('rolls back notification failure, persists backoff and recovers once without duplicates', async () => {
  const ctx = await booking(); const job = ctx.jobs.find(j => j.kind === '24H')!;
  await ctx.tenant.$executeRawUnsafe(`CREATE FUNCTION pt_test_fail_reminder() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventCode" = 'SESSION_REMINDER_24H' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$`);
  await ctx.tenant.$executeRawUnsafe(`CREATE TRIGGER pt_test_fail_reminder BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION pt_test_fail_reminder()`);
  try { expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(24))).toBe('FAILED'); }
  finally { await ctx.tenant.$executeRawUnsafe('DROP TRIGGER pt_test_fail_reminder ON "Notification"'); await ctx.tenant.$executeRawUnsafe('DROP FUNCTION pt_test_fail_reminder()'); }
  expect(await ctx.tenant.notification.count({ where: { resourceId: ctx.session.id } })).toBe(0);
  expect(await ctx.tenant.pTSessionReminder.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({ status: 'PENDING', attempts: 1, notificationId: null });
  expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(24))).toBe('UNCHANGED');
  expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, new Date(ctx.now(24).getTime() + 30_000))).toBe('SENT');
});
it('fails closed for foreign gym and revoked recipient access, and records pass health', async () => {
  const foreign = await booking(); const job = foreign.jobs[0]!;
  await expect(processSessionReminder(foreign.tenant, fixture.master, fixture.gyms[1]!.id, job.id, foreign.now(1))).rejects.toThrow('gym binding mismatch');
  expect((await foreign.tenant.pTSessionReminder.findUniqueOrThrow({ where: { id: job.id } })).status).toBe('PENDING');
  expect(await foreign.tenant.notification.count({ where: { resourceId: foreign.session.id } })).toBe(0);
  const ctx = await booking(); const memberJob = ctx.jobs.find(j => j.recipientRole === 'MEMBER')!;
  await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: memberJob.recipientIdentityId, gymId: ctx.gymId } }, data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
  try { expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, memberJob.id, ctx.now(24))).toBe('CANCELLED'); }
  finally { await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: memberJob.recipientIdentityId, gymId: ctx.gymId } }, data: { linkStatus: 'ACTIVE', version: { increment: 1 } } }); }
  await sweepSessionReminders(ctx.tenant, fixture.master, ctx.gymId, ctx.now(0));
  expect(await ctx.tenant.pTScheduledWorkStatus.findUniqueOrThrow({ where: { id: 'current' } })).toMatchObject({ lastSuccessAt: ctx.now(0) });
});

it('the shared runner scans verified tenant bindings and emits due work with no browser', async () => {
  const tenant = fixture.tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const session = await tenant.pTSession.create({ data: { memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED',
    scheduledStartAt: new Date(clock!.now.getTime() + 59 * 60_000), scheduledEndAt: new Date(clock!.now.getTime() + 119 * 60_000),
    gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR', confirmationRate: '0.4', confirmationLevel: 'LEVEL_1', configurationVersion: 0,
    confirmedAt: new Date(clock!.now.getTime() - 48 * 3_600_000), createdByIdentityId: fixture.users.ownerA.id } });
  const tenants = { withDatabase: async (name: string, work: (client: typeof tenant) => Promise<unknown>) => {
    const index = fixture.tenantDatabases.findIndex(db => db.name === name);
    if (index < 0) throw new Error('Unowned target');
    return work(fixture.tenants[index]!);
  } } as TenantDatabaseService;
  const runner = new SessionExpiryRunner({ master: fixture.master } as DatabaseService, tenants);
  const result = await runner.tick();
  expect(result).toMatchObject({ gyms: 2, failures: 0 });
  expect(await tenant.notification.count({ where: { resourceId: session.id, eventCode: 'SESSION_REMINDER_1H' } })).toBe(2);
  await runner.tick();
  expect(await tenant.notification.count({ where: { resourceId: session.id } })).toBe(2);
  await runner.onApplicationShutdown();
});

it('never emits for any non-confirmed state and a replacement receives separate schedule work', async () => {
  for (const state of ['ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'EXPIRED', 'PENDING_CONFIRMATION'] as const) {
    const ctx = await booking();
    await ctx.tenant.pTSession.update({ where: { id: ctx.session.id }, data: { state,
      confirmedAt: ['DECLINED','EXPIRED','PENDING_CONFIRMATION'].includes(state) ? null : ctx.session.confirmedAt,
      ...(['DECLINED','EXPIRED','PENDING_CONFIRMATION'].includes(state) ? { confirmationRate: null, confirmationLevel: null } : {}),
      startedAt: ['ACTIVE','COMPLETED'].includes(state) ? ctx.now(0) : null,
      endedAt: ['COMPLETED','MISSED','CANCELLED'].includes(state) ? ctx.now(-1) : null,
      declineReason: state === 'DECLINED' ? 'Synthetic declined request' : null,
      requestExpiresAt: ['EXPIRED','PENDING_CONFIRMATION'].includes(state) ? ctx.now(2) : null } });
    for (const job of ctx.jobs) expect(await processSessionReminder(ctx.tenant, fixture.master, ctx.gymId, job.id, ctx.now(1))).toBe('UNCHANGED');
    expect(await ctx.tenant.notification.count({ where: { resourceId: ctx.session.id } })).toBe(0);
  }
  const original = await booking(); const replacement = await booking();
  await original.tenant.pTSession.update({ where: { id: original.session.id }, data: { state: 'CANCELLED', endedAt: original.now(2) } });
  expect(await replacement.tenant.pTSessionReminder.count({ where: { sessionId: replacement.session.id, status: 'PENDING' } })).toBe(4);
  expect(new Set([...original.jobs, ...replacement.jobs].map(job => job.id)).size).toBe(8);
});
