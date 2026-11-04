import { ForbiddenException } from '@nestjs/common';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { DatabaseService } from '../../src/database.service.js';
import { SessionReadsService } from '../../src/sessions/session-reads.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;

beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[session-reads-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

async function contextFor(gymIndex: number, role: 'OWNER' | 'TRAINER' | 'MEMBER') {
  const gymRef = fixture.gyms[gymIndex]!;
  const gym = await fixture.master.gym.findUniqueOrThrow({ where: { id: gymRef.id }, include: { expectedTenantOperation: true } });
  const identity = role === 'OWNER' ? gymIndex === 0 ? fixture.users.ownerA : fixture.users.ownerB
    : role === 'TRAINER' ? fixture.users.trainerUser : fixture.users.memberUser;
  const actor = role === 'OWNER' ? null : role === 'TRAINER'
    ? { kind: 'TRAINER', id: (await fixture.tenants[gymIndex]!.trainer.findUniqueOrThrow({ where: { identityId: identity.id } })).id }
    : { kind: 'MEMBER', id: (await fixture.tenants[gymIndex]!.member.findUniqueOrThrow({ where: { identityId: identity.id } })).id };
  const tenant = fixture.tenants[gymIndex]!;
  const gate = new TenantSchemaGateService({ withDatabase: async (_name: string, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as never);
  const service = new SessionReadsService({ master: fixture.master } as unknown as DatabaseService, gate);
  return { service, tenant, gym, access: { identityId: identity.id, gymId: gym.id, slug: gym.slug, role, actor,
    databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion, expectedTenantManifestDigest: gym.expectedTenantManifestDigest,
    expectedTenantOperationId: gym.expectedTenantOperationId, expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null,
    observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
    observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null } };
}

it('returns paged, role-scoped and privacy-minimized session views with local month bounds and no read effects', async () => {
  const { service, tenant, gym, access } = await contextFor(0, 'OWNER');
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const suffix = run.runId;
  const oldSessionIds: string[] = [];
  for (let index = 0; index < 105; index++) {
    const id = `read-${suffix}-${index}`; oldSessionIds.push(id);
    const day = String(Math.floor(index / 4) + 1).padStart(2, '0');
    const hour = String(1 + (index % 4) * 3).padStart(2, '0');
    await tenant.pTSession.create({ data: { id, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
      scheduledStartAt: new Date(`2026-09-${day}T${hour}:00:00.000Z`), scheduledEndAt: new Date(`2026-09-${day}T${hour}:30:00.000Z`),
      gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR', confirmationRate: '0.4', confirmationLevel: 'LEVEL_1',
      configurationVersion: 0, confirmedAt: new Date(), notes: 'shared note', createdByIdentityId: fixture.users.ownerA.id } });
  }
  const before = { sessions: await tenant.pTSession.count(), events: await tenant.sessionStateEvent.count(), movements: await tenant.packCreditMovement.count() };
  const page = await service.list(access, { month: '2026-09', page: 2, pageSize: 50 });
  expect(page).toMatchObject({ totalCount: 105, totalPages: 3, filterTotal: 105, page: 2, pageSize: 50,
    timeZone: 'Asia/Colombo', rangeStart: '2026-08-31T18:30:00.000Z', rangeEndExclusive: '2026-09-30T18:30:00.000Z',
    summary: { monthBookings: 105 } });
  expect(page.items).toHaveLength(50);
  expect(page.items[0]).toMatchObject({ notes: 'shared note', fee: '100', currency: 'LKR', trainerPay: null, state: 'SCHEDULED' });
  expect(JSON.stringify(page)).not.toMatch(/passwordHash|healthNotes|databaseName|identityId|specialisations/);
  const filtered = await service.list(access, { month: '2026-09', state: 'CANCELLED', page: 1, pageSize: 25 });
  expect(filtered).toMatchObject({ totalCount: 0, filterTotal: 0, summary: { monthBookings: 105 } });
  const recent = await service.recentMember(access, member.id);
  expect(recent).toMatchObject({ limit: 10, totalCount: 105, hasMore: true });
  expect(recent.items).toHaveLength(10);
  expect(await tenant.pTSession.count()).toBe(before.sessions);
  expect(await tenant.sessionStateEvent.count()).toBe(before.events);
  expect(await tenant.packCreditMovement.count()).toBe(before.movements);
  expect(gym.id).toBe(access.gymId);
}, 60_000);

it('limits personal reads to the authenticated actor, includes all-session month totals and exposes no member fee/pay', async () => {
  const owner = await contextFor(0, 'OWNER');
  const tenant = owner.tenant;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const id = `privacy-${run.runId}`;
  await tenant.pTSession.create({ data: { id, memberId: member.id, trainerId: trainer.id, state: 'COMPLETED', type: 'INTRODUCTORY',
    scheduledStartAt: new Date('2026-11-04T03:00:00.000Z'), scheduledEndAt: new Date('2026-11-04T04:00:00.000Z'), gymTimezone: 'Asia/Colombo',
    fee: '250.0000', currency: 'LKR', confirmationRate: '0.45', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: new Date(),
    startedAt: new Date(), endedAt: new Date(), notes: 'approved session notes', createdByIdentityId: fixture.users.ownerA.id } });
  const declinedId = `declined-privacy-${run.runId}`;
  await tenant.pTSession.create({ data: { id: declinedId, memberId: member.id, trainerId: trainer.id, state: 'DECLINED', type: 'IN_PERSON',
    scheduledStartAt: new Date('2026-11-05T03:00:00.000Z'), scheduledEndAt: new Date('2026-11-05T04:00:00.000Z'), gymTimezone: 'Asia/Colombo',
    fee: '100.0000', currency: 'LKR', configurationVersion: 0, declineReason: 'Please choose another time.', createdByIdentityId: fixture.users.ownerA.id } });
  await tenant.trainerPayPeriod.create({ data: { cadence: 'WEEKLY', localStartDate: new Date('2026-11-02T00:00:00.000Z'),
    localEndDateExclusive: new Date('2026-11-09T00:00:00.000Z'), timezone: 'Asia/Colombo', utcStartAt: new Date('2026-11-01T18:30:00.000Z'),
    utcEndAt: new Date('2026-11-08T18:30:00.000Z'), calculatedTotal: '112.5' } }).then(period => tenant.payRecord.create({ data: {
      sessionId: id, periodId: period.id, amount: '112.5000', currency: 'LKR', sourceKey: `pay-${run.runId}`, confirmationRate: '0.45', confirmationLevel: 'LEVEL_1' } }));
  const memberCtx = await contextFor(0, 'MEMBER');
  const memberPage = await memberCtx.service.list(memberCtx.access, { month: '2026-11', page: 1, pageSize: 10 });
  expect(memberPage.items).toHaveLength(2);
  expect(memberPage.items.find(item => item.id === id)).toMatchObject({ notes: 'approved session notes', fee: '250', currency: 'LKR', trainerPay: null, declineReason: null });
  expect(memberPage.items.find(item => item.id === declinedId)).toMatchObject({ state: 'DECLINED', declineReason: 'Please choose another time.' });
  const trainerCtx = await contextFor(0, 'TRAINER');
  const trainerPage = await trainerCtx.service.list(trainerCtx.access, { month: '2026-11', page: 1, pageSize: 10 });
  expect(trainerPage.items[0]).toMatchObject({ id, fee: '250', trainerPay: '112.5' });
  expect(trainerPage.items.find(item => item.id === declinedId)).toMatchObject({ state: 'DECLINED', declineReason: null });
  const ownerRecent = await owner.service.recentMember(owner.access, member.id);
  expect(ownerRecent.items.find(item => item.id === declinedId)).toMatchObject({ declineReason: null });
  await expect(memberCtx.service.list({ ...memberCtx.access, actor: { kind: 'MEMBER', id: 'another-member' } }, {})).rejects.toThrow(/Member session access/);
  await expect(memberCtx.service.list(memberCtx.access, { memberId: member.id })).rejects.toThrow();
}, 30_000);

it('keeps two gym databases isolated and owner-only member recent reads hide foreign IDs', async () => {
  const a = await contextFor(0, 'OWNER'); const b = await contextFor(1, 'OWNER');
  const memberA = await a.tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainerA = await a.tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const id = `gym-a-only-${run.runId}`;
  await a.tenant.pTSession.create({ data: { id, memberId: memberA.id, trainerId: trainerA.id, state: 'CANCELLED', type: 'IN_PERSON',
    scheduledStartAt: new Date('2026-11-06T03:00:00.000Z'), scheduledEndAt: new Date('2026-11-06T03:30:00.000Z'), gymTimezone: 'Asia/Colombo',
    fee: '50.0000', currency: 'LKR', confirmationRate: '0.4', confirmationLevel: 'LEVEL_1', configurationVersion: 0,
    confirmedAt: new Date(), endedAt: new Date(), createdByIdentityId: fixture.users.ownerA.id } });
  expect((await a.service.list(a.access, { date: '2026-11-06' })).totalCount).toBe(1);
  expect((await b.service.list(b.access, { date: '2026-11-06' })).totalCount).toBe(0);
  expect((await a.service.recentMember(a.access, memberA.id)).items[0]?.id).toBe(id);
  await expect(a.service.recentMember({ ...a.access, role: 'MEMBER' }, memberA.id)).rejects.toBeInstanceOf(ForbiddenException);
  await expect(b.service.recentMember(b.access, memberA.id)).rejects.toThrow();
});
