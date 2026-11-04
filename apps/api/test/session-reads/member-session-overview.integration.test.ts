import { ForbiddenException } from '@nestjs/common';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { DatabaseService } from '../../src/database.service.js';
import { MemberSessionOverviewService } from '../../src/sessions/member-session-overview.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[member-session-overview-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

async function ownerService(gymIndex = 0) {
  const ref = fixture.gyms[gymIndex]!;
  const gym = await fixture.master.gym.findUniqueOrThrow({ where: { id: ref.id }, include: { expectedTenantOperation: true } });
  const identity = gymIndex === 0 ? fixture.users.ownerA : fixture.users.ownerB;
  const tenant = fixture.tenants[gymIndex]!;
  const gate = new TenantSchemaGateService({ withDatabase: async (_name: string, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as never);
  const service = new MemberSessionOverviewService({ master: fixture.master } as unknown as DatabaseService, gate);
  return { service, tenant, gym, access: { identityId: identity.id, gymId: gym.id, slug: gym.slug, role: 'OWNER', databaseName: gym.databaseName,
    expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion, expectedTenantManifestDigest: gym.expectedTenantManifestDigest,
    expectedTenantOperationId: gym.expectedTenantOperationId, expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null,
    observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
    observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null } };
}

it('pages owner member month summaries with independent lifetime pack ledger and month session counts', async () => {
  const { service, tenant, gym, access } = await ownerService();
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  await tenant.member.createMany({ data: Array.from({ length: 29 }, (_, index) => ({ fullName: `Overview member ${String(index + 1).padStart(3, '0')}`,
    email: `overview-${index + 1}-${run.runId}@example.test`, identityId: `overview-identity-${index + 1}-${randomUUID()}`,
    enrollmentOperationId: `overview-operation-${index + 1}-${randomUUID()}`, registrationState: 'COMPLETE' as const, status: 'ACTIVE' as const })) });
  const plan = await tenant.membershipPlan.create({ data: { name: `Overview ${run.runId}`, price: '0', currency: 'LKR', durationDays: 30 } });
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit' }).format(new Date());
  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year!, monthNumber! - 1, 1));
  const nextMonth = new Date(Date.UTC(year!, monthNumber!, 1));
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: firstDay, endDateExclusive: nextMonth,
    agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: fixture.users.ownerA.id,
    idempotencyKey: `overview-term-${run.runId}`, requestDigest: requestDigest({ overview: run.runId, term: true }) } });
  const issueReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_ISSUE_PACK',
    idempotencyKey: `overview-receipt-${run.runId}`, requestDigest: requestDigest({ overview: run.runId, receipt: true }), state: 'COMMITTED',
    committedAt: new Date(), safeResult: { issued: true } } });
  const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: 5, price: '100.0000', currency: 'LKR',
    totalMinorUnits: 10000n, creditBaseMinorUnits: 2000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 30,
    startDate: firstDay, endDateExclusive: nextMonth, commandReceiptId: issueReceipt.id, actorIdentityId: fixture.users.ownerA.id,
    idempotencyKey: `overview-pack-${run.runId}`, requestDigest: requestDigest({ overview: run.runId, pack: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 5, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `overview-issue-${run.runId}`, receiptId: issueReceipt.id, actorIdentityId: fixture.users.ownerA.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  await tenant.pTSession.create({ data: { id: `overview-session-${run.runId}`, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt: new Date(Date.UTC(year!, monthNumber! - 1, 15, 4)), scheduledEndAt: new Date(Date.UTC(year!, monthNumber! - 1, 15, 5)),
    gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR', confirmationRate: '0.4', confirmationLevel: 'LEVEL_1',
    configurationVersion: 0, confirmedAt: new Date(), createdByIdentityId: fixture.users.ownerA.id } });

  const page = await service.read(access, { month, q: 'Overview member', page: 2, pageSize: 10 });
  expect(page).toMatchObject({ month, page: 2, pageSize: 10, totalCount: 29, matchingMemberCount: 29, totalPages: 3, timeZone: 'Asia/Colombo' });
  expect(page.items).toHaveLength(10);
  expect(page.items[0]?.packTotals).toMatchObject({ total: 0, remaining: 0, used: 0, basis: 'LIFETIME' });

  const memberRow = await service.read(access, { month, q: 'Member Alpha', page: 1, pageSize: 10 });
  expect(memberRow.items).toHaveLength(1);
  expect(memberRow.items[0]).toMatchObject({ latestMembership: { planName: plan.name }, packTotals: { total: 5, remaining: 5, used: 0, expiredUnused: 0, basis: 'LIFETIME' },
    monthSessionCounts: { pending: 0, scheduled: 1, active: 0, completed: 0, missed: 0, cancelled: 0, declined: 0 }, matchingSessionCount: 1 });
  expect(await tenant.pTSession.count({ where: { id: `overview-session-${run.runId}` } })).toBe(1);
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id } })).toBe(1);
  expect(gym.id).toBe(access.gymId);
}, 30_000);

it('enforces owner role and selected-gym separation for member summary reads', async () => {
  const alpha = await ownerService(0); const beta = await ownerService(1);
  const month = '2026-11';
  await expect(alpha.service.read({ ...alpha.access, role: 'MEMBER' }, { month, page: 1, pageSize: 25 })).rejects.toBeInstanceOf(ForbiddenException);
  expect((await alpha.service.read(alpha.access, { month, q: 'Member Alpha', page: 1, pageSize: 25 })).totalCount).toBe(1);
  expect((await beta.service.read(beta.access, { month, q: 'Member Alpha', page: 1, pageSize: 25 })).totalCount).toBe(0);
});
import { randomUUID } from 'node:crypto';
