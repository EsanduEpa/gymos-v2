import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import type { DatabaseService as DatabaseServiceType } from '../../src/database.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';
import { PlatformRegistryService } from '../../src/platform/platform-registry.service.js';
import { TenantDatabaseService } from '../../src/tenant-database.service.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let app: INestApplication;
let base: string;
const secret = randomBytes(32).toString('hex');
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
async function bearer(identityId: string) { return new SignJWT({ authVersion: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
  .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret)); }
async function call(path: string, accessToken: string, body?: unknown, method?: string) { return fetch(`${base}${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'),
  headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }

beforeAll(async () => {
  run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run);
  vi.stubEnv('JWT_SECRET', secret); vi.stubEnv('TENANT_DATABASE_URL', run.masterUrl);
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DatabaseService).useValue({ master: fixture.master } as DatabaseServiceType).compile();
  app = module.createNestApplication(); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
}, 120_000);

afterAll(async () => {
  await app?.close(); await fixture?.close();
  if (run) console.info('[segment08-finance-owned-cleanup]', JSON.stringify(await run.cleanup()));
  vi.unstubAllEnvs();
}, 120_000);

it('isolates and replays expense/budget commands, reconciles P&L, and closes payroll without a payout', async () => {
  const tenant = fixture.tenants[0]!; const slug = fixture.gyms[0]!.slug;
  const owner = await bearer(fixture.users.ownerA.id); const otherOwner = await bearer(fixture.users.ownerB.id);
  const trainer = await bearer(fixture.users.trainerUser.id); const member = await bearer(fixture.users.memberUser.id);
  const memberRow = await tenant.member.findFirstOrThrow(); const trainerRow = await tenant.trainer.findFirstOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const config = await tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
  const today = new Date();
  const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const currentMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const previousMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const monthStart = previousMonthDate.toISOString().slice(0, 10);
  const nextMonth = currentMonthDate.toISOString().slice(0, 10);
  const monthDays = Math.round((Date.parse(`${nextMonth}T00:00:00Z`) - Date.parse(`${monthStart}T00:00:00Z`)) / 86_400_000);
  const sessionId = randomUUID(); const scheduled = new Date('2026-10-15T08:00:00.000Z');
  await tenant.pTSession.create({ data: { id: sessionId, memberId: memberRow.id, trainerId: trainerRow.id, state: 'COMPLETED', type: 'IN_PERSON',
    scheduledStartAt: scheduled, scheduledEndAt: new Date(scheduled.getTime() + 3_600_000), gymTimezone: 'Asia/Colombo', fee: '250.0000', currency: 'LKR',
    confirmedAt: scheduled, confirmationRate: '0.200000', confirmationLevel: trainerRow.level ?? 'LEVEL_1', startedAt: scheduled,
    endedAt: new Date(scheduled.getTime() + 3_600_000), configurationVersion: config.version, createdByIdentityId: fixture.users.ownerA.id } });
  await tenant.revenueRecord.create({ data: { sessionId, category: 'COMPLETED_SESSION', amount: '250.0000', currency: 'LKR', sourceKey: `session:${sessionId}:completed` } });
  const periodId = randomUUID();
  await tenant.trainerPayPeriod.create({ data: { id: periodId, cadence: 'MONTHLY', localStartDate: date('2026-10-01'), localEndDateExclusive: date('2026-11-01'),
    timezone: 'Asia/Colombo', utcStartAt: new Date('2026-09-30T18:30:00Z'), utcEndAt: new Date('2026-10-31T18:30:00Z'), calculatedTotal: '50.0000' } });
  await tenant.payRecord.create({ data: { sessionId, periodId, amount: '50.0000', currency: 'LKR', sourceKey: `pay:${sessionId}`,
    confirmationRate: '0.200000', confirmationLevel: 'LEVEL_1' } });
  const payrollList = await call(`/gyms/${slug}/payroll/periods`, owner);
  expect(payrollList.status).toBe(200);
  expect(await payrollList.json()).toMatchObject({ items: [expect.objectContaining({ id: periodId, total: '50.0000', currency: 'LKR', recordCount: 1 })] });
  const plan = await tenant.membershipPlan.create({ data: { name: 'Completed full term', price: '310.0000', currency: 'LKR', durationDays: monthDays } });
  await tenant.membershipTerm.create({ data: { memberId: memberRow.id, planId: plan.id, startDate: date(monthStart), endDateExclusive: date(nextMonth),
    agreedPrice: '310.0000', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: config.version, actorIdentityId: fixture.users.ownerA.id,
    idempotencyKey: randomUUID(), requestDigest: 'd1:' + 'a'.repeat(64) } });
  const shortPlan = await tenant.membershipPlan.create({ data: { name: 'Three local days', price: '0.1000', currency: 'LKR', durationDays: 3 } });
  await tenant.membershipTerm.create({ data: { memberId: memberRow.id, planId: shortPlan.id, startDate: date('2026-09-01'), endDateExclusive: date('2026-09-04'),
    agreedPrice: '0.1000', currency: 'LKR', planNameSnapshot: shortPlan.name, configurationVersion: config.version, actorIdentityId: fixture.users.ownerA.id,
    idempotencyKey: randomUUID(), requestDigest: 'd1:' + '9'.repeat(64) } });
  await tenant.member.update({ where: { id: memberRow.id }, data: { status: 'SUSPENDED' } });
  const suspended = await (await call(`/gyms/${slug}/financials/revenue?from=2026-09-01&to=2026-09-03&page=1&pageSize=25`, owner)).json();
  expect(suspended.rangeStart).toBe('2026-08-31T18:30:00.000Z');
  expect(suspended.totals.membership).toBe('0.1000');
  expect(suspended.lines.filter((item: { sourceType: string }) => item.sourceType === 'MEMBERSHIP_TERM').map((item: { amount: string }) => item.amount)).toEqual(['0.04', '0.03', '0.03']);
  const expired = await (await call(`/gyms/${slug}/financials/revenue?from=2026-09-04&to=2026-09-04&page=1&pageSize=25`, owner)).json();
  expect(expired.totals.membership).toBe('0.0000');

  const expensesBefore = await tenant.expenseRecord.count(); const auditsBefore = await tenant.auditLog.count(); const receiptsBefore = await tenant.commandReceipt.count();
  await tenant.$executeRawUnsafe(`CREATE FUNCTION reject_expense_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventCode" = 'EXPENSE_CREATED' THEN RAISE EXCEPTION 'injected expense audit failure'; END IF; RETURN NEW; END $$`);
  await tenant.$executeRawUnsafe(`CREATE TRIGGER reject_expense_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_expense_audit()`);
  const failedDraft = { category: 'OTHER', amount: '12.00', currency: 'LKR', accountingDate: localToday, description: 'rollback fault injection', recurring: false, idempotencyKey: randomUUID() };
  const failedWrite = await call(`/gyms/${slug}/financials/expenses`, owner, failedDraft);
  await tenant.$executeRawUnsafe('DROP TRIGGER reject_expense_audit ON "AuditLog"'); await tenant.$executeRawUnsafe('DROP FUNCTION reject_expense_audit()');
  expect(failedWrite.status).toBeGreaterThanOrEqual(500);
  expect(await tenant.expenseRecord.count()).toBe(expensesBefore); expect(await tenant.auditLog.count()).toBe(auditsBefore);
  expect(await tenant.commandReceipt.count()).toBe(receiptsBefore);
  const expenseBody = { category: 'RENT', amount: '100.00', currency: 'LKR', accountingDate: localToday, description: '=1+1', recurring: false, idempotencyKey: randomUUID() };
  expect((await call(`/gyms/${slug}/financials/expenses`, trainer, expenseBody)).status).toBe(403);
  expect((await call(`/gyms/${slug}/financials/expenses`, member)).status).toBe(403);
  expect((await call(`/gyms/${slug}/financials/expenses`, owner, { ...expenseBody, amount: '1.001' })).status).toBe(422);
  const create = await call(`/gyms/${slug}/financials/expenses`, owner, expenseBody); expect(create.status).toBe(201);
  const created = await create.json(); expect(created.replayed).toBe(false);
  expect((await (await call(`/gyms/${slug}/financials/expenses`, owner, expenseBody)).json()).replayed).toBe(true);
  expect(await tenant.expenseRecord.count()).toBe(expensesBefore + 1);
  expect(await tenant.auditLog.count()).toBe(auditsBefore + 1);
  expect(await tenant.commandReceipt.count()).toBe(receiptsBefore + 1);
  const budgetKey = randomUUID(); const budgetBody = { category: 'RENT', month: expenseBody.accountingDate.slice(0, 7), amount: '150.00', currency: 'LKR', expectedVersion: null, idempotencyKey: budgetKey };
  expect((await call(`/gyms/${slug}/financials/budgets`, owner, budgetBody)).status).toBe(201);
  expect((await call(`/gyms/${slug}/financials/budgets`, owner, budgetBody)).status).toBe(201);
  const budgetList = await (await call(`/gyms/${slug}/financials/budgets?month=${expenseBody.accountingDate.slice(0, 7)}`, owner)).json();
  expect(budgetList).toMatchObject({ totalActual: '100.0000', items: expect.arrayContaining([expect.objectContaining({ category: 'RENT', variance: '-50.0000' })]) });
  const racingBudgets = await Promise.all(['120.00', '180.00'].map(amount => call(`/gyms/${slug}/financials/budgets`, owner,
    { category: 'UTILITIES', month: expenseBody.accountingDate.slice(0, 7), amount, currency: 'LKR', expectedVersion: null, idempotencyKey: randomUUID() })));
  expect(racingBudgets.map(response => response.status).sort((a, b) => a - b)).toEqual([201, 409]);
  expect(await tenant.categoryBudget.count({ where: { category: 'UTILITIES', month: date(`${expenseBody.accountingDate.slice(0, 7)}-01`) } })).toBe(1);
  const racingBudgetUpdates = await Promise.all(['210.00', '220.00'].map(amount => call(`/gyms/${slug}/financials/budgets`, owner,
    { category: 'UTILITIES', month: expenseBody.accountingDate.slice(0, 7), amount, currency: 'LKR', expectedVersion: 0, idempotencyKey: randomUUID() })));
  expect(racingBudgetUpdates.map(response => response.status).sort((a, b) => a - b)).toEqual([201, 409]);
  expect(await tenant.categoryBudget.findUniqueOrThrow({ where: { category_month: { category: 'UTILITIES', month: date(`${expenseBody.accountingDate.slice(0, 7)}-01`) } } })).toMatchObject({ version: 1 });
  expect((await call(`/gyms/${slug}/financials/budgets`, owner,
    { category: 'UTILITIES', month: expenseBody.accountingDate.slice(0, 7), amount: '230.00', currency: 'LKR', expectedVersion: 0, idempotencyKey: randomUUID() })).status).toBe(409);
  const monthEdge = '2026-02';
  const edgeReceipts = await Promise.all(Array.from({ length: 4 }, () => tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'FIXTURE_EXPENSE',
    idempotencyKey: randomUUID(), requestDigest: `d1:${'e'.repeat(64)}`, state: 'COMMITTED', safeResult: {}, committedAt: today } })));
  await tenant.expenseRecord.createMany({ data: ['2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01'].map((day, index) => ({
    category: 'OTHER' as const, amount: `${index + 1}.00`, currency: 'LKR', accountingDate: date(day), description: `edge-${day}`,
    recurring: false, commandReceiptId: edgeReceipts[index]!.id, createdByIdentityId: fixture.users.ownerA.id })) });
  const edgeBudget = await (await call(`/gyms/${slug}/financials/budgets?month=${monthEdge}`, owner)).json();
  expect(edgeBudget.totalActual).toBe('5.0000');
  expect(edgeBudget.items.find((item: { category: string }) => item.category === 'OTHER')).toMatchObject({ actual: '5', utilizationPercent: null });

  const range = `from=${monthStart}&to=${localToday}`;
  const pnlResponse = await call(`/gyms/${slug}/financials/pnl?${range}`, owner); expect(pnlResponse.status).toBe(200);
  const pnl = await pnlResponse.json(); expect(pnl).toMatchObject({ operationalEarning: '560.0000', expenses: '100.0000', payrollCost: '50.0000', operatingSurplus: '410.0000' });
  const revenueResponse = await call(`/gyms/${slug}/financials/revenue?${range}&page=1&pageSize=25`, owner); expect(revenueResponse.status).toBe(200);
  const revenue = await revenueResponse.json(); expect(revenue.totals).toMatchObject({ completedSession: '250.0000', membership: '310.0000', totalOperational: '560.0000', expiredUnusedSeparate: '0.0000' });
  expect(revenue.cashReceived).toBeNull();
  expect((await call(`/gyms/${slug}/financials/pnl?${range}`, otherOwner)).status).toBe(403);
  const foreignExpenses = await call(`/gyms/${fixture.gyms[1]!.slug}/financials/expenses?from=2026-11-01&to=2026-11-30`, otherOwner);
  expect((await foreignExpenses.json()).totalCount).toBe(0);

  const earnings = await call(`/gyms/${slug}/me/earnings?${range}`, trainer); expect(earnings.status).toBe(200); expect(Number((await earnings.json()).total)).toBe(50);
  expect((await call(`/gyms/${slug}/me/earnings?${range}`, owner)).status).toBe(403);
  const closeKeys = [randomUUID(), randomUUID()];
  const competingCloses = await Promise.all(closeKeys.map(idempotencyKey => call(`/gyms/${slug}/payroll/periods/${periodId}/close`, owner, { expectedVersion: 0, idempotencyKey })));
  expect(competingCloses.map(response => response.status).sort((a, b) => a - b)).toEqual([201, 409]);
  const winningCloseKey = closeKeys[competingCloses.findIndex(response => response.status === 201)]!;
  expect((await call(`/gyms/${slug}/payroll/periods/${periodId}/close`, owner, { expectedVersion: 0, idempotencyKey: winningCloseKey })).status).toBe(201);
  const approved = await call(`/gyms/${slug}/payroll/periods/${periodId}/approve`, owner, { expectedVersion: 1, expectedTotal: '50.0000', idempotencyKey: randomUUID() }); expect(approved.status).toBe(201);
  expect((await approved.json()).state).toBe('APPROVED');
  expect((await call(`/gyms/${slug}/payroll/periods/${periodId}/approve`, owner,
    { expectedVersion: 1, expectedTotal: '50.0000', idempotencyKey: randomUUID() })).status).toBe(409);
  expect(await tenant.payRecord.count({ where: { sessionId } })).toBe(1);
});

it('exports complete bounded row sets over 100, protects formulas, exports only the current audit page, and scopes dashboard/analytics', async () => {
  const tenant = fixture.tenants[0]!; const slug = fixture.gyms[0]!.slug; const owner = await bearer(fixture.users.ownerA.id);
  const count = 105;
  const receipts = Array.from({ length: count }, () => ({ id: randomUUID(), actorIdentityId: fixture.users.ownerA.id, commandKind: 'FIXTURE_EXPENSE',
    idempotencyKey: randomUUID(), requestDigest: `d1:${'b'.repeat(64)}`, state: 'COMMITTED' as const, safeResult: {},
    committedAt: new Date('2026-10-16T10:00:00Z'), updatedAt: new Date('2026-10-16T10:00:00Z') }));
  await tenant.commandReceipt.createMany({ data: receipts });
  await tenant.expenseRecord.createMany({ data: receipts.map((receipt, index) => ({ category: 'OTHER' as const, amount: '1.00', currency: 'LKR',
    accountingDate: date('2026-10-16'), description: index === 0 ? '=1+1' : `row-${index}`, recurring: false, commandReceiptId: receipt.id,
    createdByIdentityId: fixture.users.ownerA.id, createdAt: new Date('2026-10-16T10:00:00Z'), updatedAt: new Date('2026-10-16T10:00:00Z') })) });
  const exportResponse = await call(`/gyms/${slug}/financials/export`, owner, { kind: 'expenses', from: '2026-10-01', to: '2026-10-31' });
  expect(exportResponse.status).toBe(200); expect(exportResponse.headers.get('content-type')).toContain('text/csv');
  expect(exportResponse.headers.get('content-disposition')).toMatch(/^attachment; filename="[a-zA-Z0-9._-]+\.csv"$/);
  expect(exportResponse.headers.get('cache-control')).toContain('no-store');
  const csvBytes = new Uint8Array(await exportResponse.arrayBuffer()); const csv = new TextDecoder().decode(csvBytes); expect(Array.from(csvBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]); expect(csv.match(/\r\n/g)?.length).toBe(count + 1);
  expect(csv).toContain("'=1+1"); expect(csv).toContain('"row-104"');
  const auditExport = await call(`/gyms/${slug}/financials/export`, owner, { kind: 'audit', page: 1, pageSize: 20, actionType: 'EXPENSE_CREATED' });
  expect(auditExport.status).toBe(200); expect((await auditExport.text()).match(/\r\n/g)?.length).toBe(2);
  expect(await tenant.auditLog.count({ where: { eventCode: 'CSV_EXPORTED' } })).toBeGreaterThanOrEqual(2);
  expect((await call(`/gyms/${slug}/financials/export`, await bearer(fixture.users.trainerUser.id), { kind: 'expenses', from: '2026-10-01', to: '2026-10-31' })).status).toBe(403);
  expect((await call(`/gyms/${slug}/financials/export`, owner, { kind: 'expenses', from: '2025-01-01', to: '2026-11-01' })).status).toBe(422);
  const invalidExport = await call(`/gyms/${slug}/financials/export`, owner, { kind: 'expenses', from: '2025-01-01', to: '2026-11-01' });
  expect(invalidExport.headers.get('content-disposition')).toBeNull();

  const trainerRow = await tenant.trainer.findFirstOrThrow(); const memberRow = await tenant.member.findFirstOrThrow();
  const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const midnightUtc = new Date(Date.parse(`${localToday}T00:00:00Z`) - 330 * 60_000);
  for (const [minutes, amount] of [[-1, '1.0000'], [0, '2.0000'], [479, '3.0000'], [480, '4.0000']] as const) {
    const sessionId = randomUUID(); const scheduledStartAt = new Date(midnightUtc.getTime() + minutes * 60_000);
    await tenant.pTSession.create({ data: { id: sessionId, memberId: memberRow.id, trainerId: trainerRow.id, state: 'COMPLETED', type: 'IN_PERSON',
      scheduledStartAt, scheduledEndAt: new Date(scheduledStartAt.getTime() + 60_000), gymTimezone: 'Asia/Colombo', fee: amount, currency: 'LKR',
      confirmedAt: scheduledStartAt, confirmationRate: '0.200000', confirmationLevel: 'LEVEL_1', startedAt: scheduledStartAt,
      endedAt: new Date(scheduledStartAt.getTime() + 60_000), configurationVersion: 0, createdByIdentityId: fixture.users.ownerA.id } });
    await tenant.revenueRecord.create({ data: { sessionId, category: 'COMPLETED_SESSION', amount, currency: 'LKR', sourceKey: `session:${sessionId}:completed` } });
  }
  const dashboard = await call(`/gyms/${slug}/dashboard`, owner); expect(dashboard.status).toBe(200); const data = await dashboard.json();
  expect(data.timeZone).toBe('Asia/Colombo'); expect(data.earningChart).toHaveLength(8); expect(data.metrics.membersInGym.definition).toContain('not a people count');
  expect(data.rangeStart).toBe(midnightUtc.toISOString()); expect(data.metrics.todayOperationalEarning.value).toBe('9.0000');
  expect(data.earningChart[0]).toMatchObject({ startHour: 6, endHour: 8, amount: '3.0000' });
  expect(data.earningChart[1]).toMatchObject({ startHour: 8, endHour: 10, amount: '4.0000' });
  expect((await call(`/gyms/${slug}/dashboard`, await bearer(fixture.users.memberUser.id))).status).toBe(403);
  const analytics = await call(`/gyms/${slug}/analytics?window=6m`, owner); expect(analytics.status).toBe(200); const insights = await analytics.json();
  expect(insights.memberGrowth.points).toHaveLength(6); expect(insights.peakHours.points).toHaveLength(15); expect(insights.utilization.formula).toContain('overnight shifts wrap midnight');
  const oldestMonth = insights.memberGrowth.points[0].month as string;
  const oldestBoundary = new Date(Date.parse(`${oldestMonth}-01T00:00:00Z`) - 330 * 60_000);
  const currentMonth = insights.memberGrowth.points[5].month as string;
  const nextMonthBoundary = new Date(Date.UTC(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 1) - 330 * 60_000);
  await tenant.member.createMany({ data: [new Date(oldestBoundary.getTime() - 1), oldestBoundary,
    new Date(nextMonthBoundary.getTime() - 1), nextMonthBoundary].map((createdAt, index) => ({ fullName: `Growth edge ${index}`, createdAt })) });
  const edgedGrowth = (await (await call(`/gyms/${slug}/analytics?window=6m`, owner)).json()).memberGrowth.points;
  expect(edgedGrowth[0].count - insights.memberGrowth.points[0].count).toBe(1);
  expect(edgedGrowth[5].count - insights.memberGrowth.points[5].count).toBe(1);
  expect(edgedGrowth.slice(1, 5).map((point: { count: number }, index: number) => point.count - insights.memberGrowth.points[index + 1].count)).toEqual([0, 0, 0, 0]);
  const emptyGymAnalytics = await (await call(`/gyms/${fixture.gyms[1]!.slug}/analytics?window=30d`, await bearer(fixture.users.ownerB.id))).json();
  expect(emptyGymAnalytics.utilization.points).toEqual([]);
  expect(emptyGymAnalytics.peakHours.points.every((point: { sessionCount: number; averagePerDay: number }) => point.sessionCount === 0 && point.averagePerDay === 0)).toBe(true);
  expect(emptyGymAnalytics.memberGrowth.points).toHaveLength(6);
  expect(Number.isFinite(Date.parse(emptyGymAnalytics.rangeStart))).toBe(true);
  expect((await call(`/gyms/${slug}/analytics?window=invalid`, owner)).status).toBe(404);
  const audit = await call(`/gyms/${slug}/audit?page=1&pageSize=20&actionType=EXPENSE_CREATED`, owner); expect(audit.status).toBe(200);
  expect((await audit.json()).availableActionTypes).toContain('CSV_EXPORTED');

  const auditRows = Array.from({ length: 27 }, () => ({ id: randomUUID(), at: new Date('2026-10-20T10:00:00.000Z') }));
  const auditReceipts = auditRows.map(() => ({ id: randomUUID(), actorIdentityId: fixture.users.ownerA.id, commandKind: 'FIXTURE_AUDIT',
    idempotencyKey: randomUUID(), requestDigest: `d1:${'c'.repeat(64)}`, state: 'COMMITTED' as const, safeResult: {},
    committedAt: new Date('2026-10-20T10:00:00.000Z'), updatedAt: new Date('2026-10-20T10:00:00.000Z') }));
  await tenant.commandReceipt.createMany({ data: auditReceipts });
  const sortedAuditRows = [...auditRows].sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id));
  await tenant.auditLog.createMany({ data: sortedAuditRows.map((row, index) => ({ id: row.id, eventKey: `ta1:${createHash('sha256').update(row.id).digest('hex')}`, contentDigest: createHash('sha256').update(`fixture-content:${row.id}`).digest('hex'),
    receiptId: auditReceipts[index]!.id, actorIdentityId: fixture.users.ownerA.id, eventCode: 'PT_SESSION_STARTED', resourceType: 'PT_SESSION', resourceId: row.id,
    transition: { to: 'audit', version: 0 }, createdAt: row.at })) });
  const page1 = await (await call(`/gyms/${slug}/audit?page=1&pageSize=20&actionType=PT_SESSION_STARTED`, owner)).json();
  const page2 = await (await call(`/gyms/${slug}/audit?page=2&pageSize=20&actionType=PT_SESSION_STARTED`, owner)).json();
  expect(page1.totalCount).toBe(27); expect(page1.items).toHaveLength(20); expect(page2.items).toHaveLength(7);
  expect(page1.items.map((row: { id: string }) => row.id)).toEqual(sortedAuditRows.slice(0, 20).map(row => row.id));
  expect(page2.items.map((row: { id: string }) => row.id)).toEqual(sortedAuditRows.slice(20).map(row => row.id));
  expect(new Set([...page1.items, ...page2.items].map((row: { id: string }) => row.id)).size).toBe(27);
  const supportRowId = randomUUID(); const supportReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.admin.id,
    commandKind: 'FIXTURE_AUDIT', idempotencyKey: randomUUID(), requestDigest: `d1:${'f'.repeat(64)}`, state: 'COMMITTED', safeResult: {}, committedAt: new Date() } });
  await tenant.auditLog.create({ data: { id: supportRowId, eventKey: `ta1:${createHash('sha256').update(supportRowId).digest('hex')}`,
    contentDigest: createHash('sha256').update(`fixture-content:${supportRowId}`).digest('hex'), receiptId: supportReceipt.id,
    actorIdentityId: fixture.users.admin.id, originalActorIdentityId: fixture.users.ownerA.id, eventCode: 'PT_SESSION_STARTED',
    resourceType: 'PT_SESSION', resourceId: supportRowId, transition: { from: 'SCHEDULED', to: 'ACTIVE', version: 1, secret: 'must be redacted' } } });
  const supportAudit = await (await call(`/gyms/${slug}/audit?page=1&pageSize=20&actionType=PT_SESSION_STARTED`, owner)).json();
  expect(supportAudit.items.find((row: { id: string }) => row.id === supportRowId)).toMatchObject({ actorIdentityId: fixture.users.admin.id,
    originalActorIdentityId: fixture.users.ownerA.id, transition: { from: 'SCHEDULED', to: 'ACTIVE', version: 1 } });
  expect(JSON.stringify(supportAudit)).not.toContain('must be redacted');
  expect((await call(`/gyms/${slug}/audit?page=1&pageSize=20&actionType=PT_SESSION_STARTED`, await bearer(fixture.users.ownerB.id))).status).toBe(403);
  const otherGymAudit = await (await call(`/gyms/${fixture.gyms[1]!.slug}/audit?page=1&pageSize=20&actionType=PT_SESSION_STARTED`, await bearer(fixture.users.ownerB.id))).json();
  expect(otherGymAudit.items).toEqual([]);
});

it('withholds platform totals for missing, stale and failed tenant summaries and refreshes only 25 gyms per cursor batch', async () => {
  const master = fixture.master;
  const rows = await master.gym.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  const seedGym = await master.gym.findUniqueOrThrow({ where: { id: fixture.gyms[0]!.id }, include: { expectedTenantOperation: true } });
  const count = 27;
  for (let i = 0; i < count; i++) {
    const slug = `summary-${i}-${run.runId.slice(0, 8)}`;
    const operationId = `summary_op_${i}_${run.runId.slice(0, 8)}`;
    const databaseName = `gymos_${randomUUID().replaceAll('-', '')}`;
    const gym = await master.gym.create({ data: { name: `Summary Gym ${i}`, slug, databaseName, status: 'ACTIVE' } });
    await master.operation.create({ data: { id: operationId, kind: 'PROVISION_GYM', actorIdentityId: fixture.users.admin.id,
      scopeKey: `provision-gym:${slug}`, idempotencyKey: `summary-key-${i}-${run.runId}`, requestDigest: `d1:${'a'.repeat(64)}`,
      requestedSlug: slug, databaseName, intendedTenantTemplateVersion: seedGym.expectedTenantSchemaVersion,
      intendedTenantManifestDigest: seedGym.expectedTenantManifestDigest, appliedTenantTemplateVersion: seedGym.expectedTenantSchemaVersion,
      appliedTenantManifestDigest: seedGym.expectedTenantManifestDigest, gymId: gym.id, state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: {},
      provisioningIntent: { create: { name: `Summary Gym ${i}`, ownerEmail: `summary${i}@example.test`, plannedOwnerIdentityId: fixture.users.admin.id,
        reuseIdentity: true, actorAuthVersion: 0, currency: 'LKR', timezone: 'Asia/Colombo' } } } });
    await master.gym.update({ where: { id: gym.id }, data: { expectedTenantSchemaVersion: seedGym.expectedTenantSchemaVersion,
      expectedTenantManifestDigest: seedGym.expectedTenantManifestDigest, expectedTenantOperationId: operationId } });
  }
  const initial = await master.gym.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  const service = new PlatformRegistryService({ master } as DatabaseServiceType, {} as TenantDatabaseService);
  const makeCurrentCache = (gymId: string, observedAt: Date, memberCount = 4, trainerCount = 2) => master.gymRegistrySummary.upsert({ where: { gymId },
    create: { gymId, health: 'VERIFIED', observedAt, memberCount, trainerCount, schemaVersion: seedGym.expectedTenantSchemaVersion },
    update: { health: 'VERIFIED', observedAt, memberCount, trainerCount, schemaVersion: seedGym.expectedTenantSchemaVersion } });
  const now = new Date();
  for (const row of initial) await makeCurrentCache(row.id, now);
  const complete = await service.analyticsSummary(); expect(complete.partial).toBe(false);
  expect(complete.memberCount).toBe(initial.length * 4); expect(complete.trainerCount).toBe(initial.length * 2);
  const [databaseClock] = await master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  await master.gymRegistrySummary.update({ where: { gymId: initial[1]!.id }, data: { observedAt: new Date(databaseClock!.now.getTime() - 7_200_000) } });
  await master.gymRegistrySummary.delete({ where: { gymId: initial[2]!.id } });
  const partial = await service.analyticsSummary();
  expect(partial.partial).toBe(true); expect(partial.memberCount).toBeNull(); expect(partial.trainerCount).toBeNull();
  expect(partial.staleGyms).toBe(1); expect(partial.unavailableGyms).toBe(2); expect(partial.verifiedGyms).toBe(initial.length - 2);

  // A controlled refresh with one inaccessible tenant must write UNAVAILABLE instead of zero counts.
  const unavailableGym = initial[0]!;
  const failingTenants = { withAdministrativeRead: vi.fn().mockRejectedValue(new Error('tenant unavailable')) } as unknown as TenantDatabaseService;
  const failedRefreshService = new PlatformRegistryService({ master } as DatabaseServiceType, failingTenants);
  await failedRefreshService.refreshOne(unavailableGym.id, fixture.users.admin.id);
  expect(await master.gymRegistrySummary.findUniqueOrThrow({ where: { gymId: unavailableGym.id } })).toMatchObject({ health: 'UNAVAILABLE', memberCount: null, trainerCount: null });
  const stillPartial = await service.analyticsSummary(); expect(stillPartial.partial).toBe(true); expect(stillPartial.memberCount).toBeNull();

  const first = await master.gym.findMany({ take: 26, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  const expectedFirst = first.slice(0, 25);
  const refreshSpy = vi.spyOn(service, 'refreshOne').mockImplementation(async () => undefined);
  const batch1 = await service.refreshAnalyticsBatch(fixture.users.admin.id);
  expect(batch1.processed).toBe(25); expect(batch1.nextCursor).toBe(expectedFirst.at(-1)!.id);
  expect(refreshSpy).toHaveBeenCalledTimes(25);
  refreshSpy.mockClear();
  const nextRows = await master.gym.findMany({ take: 26, cursor: { id: batch1.nextCursor! }, skip: 1, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  const batch2 = await service.refreshAnalyticsBatch(fixture.users.admin.id, batch1.nextCursor!);
  expect(batch2.processed).toBe(nextRows.length); expect(batch2.nextCursor).toBeNull();
  expect(refreshSpy).toHaveBeenCalledTimes(nextRows.length);
  await expect(service.refreshAnalyticsBatch(fixture.users.admin.id, 'missing-cursor')).rejects.toThrow();
  expect(await master.gym.count()).toBe(initial.length);
  expect(rows.length).toBe(2);
});
