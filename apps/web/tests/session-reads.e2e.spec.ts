import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { installBrowserSession } from './support/browser-session.js';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const evidenceDirectory = join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-044');
type RunningProcess = { child: ChildProcess; errorText: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: RunningProcess | undefined;
let web: RunningProcess | undefined;
let apiBase = '';
let webBase = '';
let jwtSecret = '';
let targetMonth = '2026-12';
let persistedBefore = { sessions: 0, events: 0, movements: 0 };

async function reservePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to reserve a local port');
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
function launch(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): RunningProcess {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr?.on('data', chunk => { errors = `${errors}${String(chunk)}`.slice(-5000); });
  return { child, errorText: () => errors.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED_DATABASE_URL]') };
}
async function waitReady(url: string, processState: RunningProcess) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (processState.child.exitCode !== null) throw new Error(`Server exited before ready: ${processState.errorText()}`);
    try { if ((await fetch(url)).ok) return; } catch { /* server startup */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not become ready: ${processState.errorText()}`);
}
async function stop(processState: RunningProcess | undefined) {
  if (!processState || processState.child.exitCode !== null) return;
  processState.child.kill('SIGTERM');
  await Promise.race([new Promise<void>(resolve => processState.child.once('exit', () => resolve())), new Promise(resolve => setTimeout(resolve, 10_000))]);
  if (processState.child.exitCode === null) processState.child.kill('SIGKILL');
}
function localDate(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function nextMonth(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(value.year), Number(value.month), 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function sessionData(input: { id: string; memberId: string; trainerId: string; state: 'SCHEDULED' | 'ACTIVE'; start: Date; end: Date; createdBy: string; startedAt?: Date }) {
  return { id: input.id, memberId: input.memberId, trainerId: input.trainerId, state: input.state, type: 'IN_PERSON' as const,
    scheduledStartAt: input.start, scheduledEndAt: input.end, gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR',
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1' as const, configurationVersion: 0, confirmedAt: new Date(),
    ...(input.startedAt ? { startedAt: input.startedAt } : {}), createdByIdentityId: input.createdBy };
}
async function seedSessions() {
  const tenant = fixture.tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const now = new Date();
  const activeStart = new Date(now.getTime() - 35 * 60_000);
  await tenant.pTSession.create({ data: sessionData({ id: `read-active-${environment.runId}`, memberId: member.id, trainerId: trainer.id,
    state: 'ACTIVE', start: activeStart, end: new Date(now.getTime() + 25 * 60_000), createdBy: fixture.users.ownerA.id,
    startedAt: new Date(now.getTime() - 20 * 60_000) }) });
  const [year, month] = targetMonth.split('-').map(Number);
  const rows = [];
  for (let day = 1; day <= 15; day++) for (let slot = 0; slot < 2; slot++) {
    const start = new Date(Date.UTC(year!, month! - 1, day, 3 + slot * 3));
    rows.push(sessionData({ id: `read-scheduled-${environment.runId}-${day}-${slot}`, memberId: member.id, trainerId: trainer.id,
      state: 'SCHEDULED', start, end: new Date(start.getTime() + 30 * 60_000), createdBy: fixture.users.ownerA.id }));
  }
  await tenant.pTSession.createMany({ data: rows });
  persistedBefore = { sessions: await tenant.pTSession.count(), events: await tenant.sessionStateEvent.count(), movements: await tenant.packCreditMovement.count() };
}
async function openAs(page: Page, userId: string, path: string) {
  await installBrowserSession({ page, master: fixture.master, identityId: userId, jwtSecret, origin: webBase });
  await page.goto(`${webBase}${path}`);
}

test.beforeAll('start isolated session-read fixtures and local services', async () => {
  test.setTimeout(180_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(environment);
  await mkdir(evidenceDirectory, { recursive: true });
  targetMonth = nextMonth(new Date(), 'Asia/Colombo');
  await seedSessions();
  const [apiPort, webPort] = await Promise.all([reservePort(), reservePort()]);
  apiBase = `http://127.0.0.1:${apiPort}`; webBase = `http://127.0.0.1:${webPort}`; jwtSecret = randomBytes(32).toString('hex');
  api = launch(process.execPath, [join(apiDirectory, 'dist/main.js')], apiDirectory, { PATH: process.env.PATH, HOME: process.env.HOME,
    NODE_ENV: 'production', TZ: 'UTC', PORT: String(apiPort), MASTER_DATABASE_URL: environment.masterUrl,
    TENANT_DATABASE_URL: environment.masterUrl, PROVISION_DATABASE_URL: environment.masterUrl, JWT_SECRET: jwtSecret });
  await waitReady(`${apiBase}/`, api);
  web = launch(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory,
    { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', TZ: 'UTC', GYMOS_API_URL: apiBase, GYMOS_WEB_ORIGIN: webBase });
  await waitReady(`${webBase}/login`, web);
});

test.afterAll('stop session-read services and remove owned fixtures', async () => {
  await stop(web); await stop(api); await fixture?.close();
  if (environment) console.info('[session-read-browser-cleanup]', JSON.stringify(await environment.cleanup()));
});

test('owner, trainer and member see the same selected-gym session ledger read-only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const slug = fixture.gyms[0]!.slug;
  const ownerPath = `/gyms/${slug}/owner/sessions?view=list&mode=month&month=${targetMonth}&q=Member%20Alpha`;
  await openAs(page, fixture.users.ownerA.id, ownerPath);
  await expect(page.getByRole('heading', { name: 'PT Session Oversight & Analytics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Monthly member overview' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Monthly member session overview' })).toContainText('Member Alpha');
  await expect(page.getByRole('table', { name: 'Gym session ledger' })).toContainText('Trainer Alpha');
  await expect(page.getByRole('link', { name: 'Next page' })).toBeVisible();
  const ownerRow = page.getByRole('table', { name: 'Gym session ledger' }).locator('tbody tr').first();
  await expect(ownerRow.getByRole('button', { name: 'Cancel session' })).toHaveCount(0);
  const memberOverviewRow = page.getByRole('table', { name: 'Monthly member session overview' }).locator('tbody tr').filter({ hasText: 'Member Alpha' }).first();
  await memberOverviewRow.locator('details summary').click();
  await memberOverviewRow.getByRole('link', { name: /View \d+ matching sessions?/ }).click();
  await expect(page).toHaveURL(new RegExp(`mode=month.*month=${targetMonth}.*memberId=`));
  await expect(page.getByText(/Page 1 of \d+ · 30 sessions match these filters/)).toBeVisible();
  await page.screenshot({ path: join(evidenceDirectory, 'owner-sessions-month.png'), fullPage: true });

  const trainerPath = `/gyms/${slug}/trainer/schedule?mode=month&month=${targetMonth}`;
  await openAs(page, fixture.users.trainerUser.id, trainerPath);
  await expect(page.getByRole('heading', { name: 'Trainer Daily Schedule' })).toBeVisible();
  await expect(page.locator('.trainer-metric').first().locator('strong')).toHaveText('30');
  await page.getByRole('button', { name: 'Cancel session' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Cancel session' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Cancel session' }).getByRole('button', { name: 'Close' }).click();
  await openAs(page, fixture.users.trainerUser.id, `/gyms/${slug}/trainer/schedule?mode=month&month=${localDate(new Date(), 'Asia/Colombo').slice(0, 7)}&state=ACTIVE`);
  await expect(page.getByText(/Elapsed \d+:\d{2}/)).toBeVisible();
  await expect(page.getByLabel(/Elapsed session time, display only/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete session' })).toHaveCount(0);
  await expect(page.getByText(/Session commands are not enabled on this view yet/)).toHaveCount(0);
  await page.screenshot({ path: join(evidenceDirectory, 'trainer-active-session.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const memberPath = `/gyms/${slug}/member/sessions?mode=month&month=${targetMonth}`;
  await openAs(page, fixture.users.memberUser.id, memberPath);
  await expect(page.getByRole('heading', { name: 'My PT Sessions' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'member session view' })).toBeVisible();
  await expect(page.getByLabel('Monthly session counts by state')).toContainText('Scheduled');
  await expect(page.getByLabel('Monthly session counts by state')).toContainText('30');
  await expect(page.getByRole('button', { name: 'Complete session' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel session' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Cancel session' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Cancel session' }).getByRole('button', { name: 'Close' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: 'Next page' })).toBeVisible();
  await page.getByRole('link', { name: 'Refresh sessions' }).click();
  await expect(page.getByRole('heading', { name: 'My PT Sessions' })).toBeVisible();
  await page.screenshot({ path: join(evidenceDirectory, 'member-sessions-mobile.png'), fullPage: true });

  const tenant = fixture.tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const workoutBefore = { plans: await tenant.workoutPlan.count(), exercises: await tenant.workoutExercise.count(),
    receipts: await tenant.commandReceipt.count(), audits: await tenant.auditLog.count() };
  await openAs(page, fixture.users.trainerUser.id, '/gyms/' + slug + '/trainer/plans/workout/new?memberId=' + encodeURIComponent(member.id));
  await page.getByRole('heading', { name: 'Plan for Member Alpha' }).waitFor();
  await expect(page.getByLabel('Exercise name').first()).toHaveValue('');
  await page.getByLabel('Exercise name').first().fill('Bench Press');
  await page.getByLabel('Sets', { exact: true }).first().fill('4');
  await page.getByLabel('Reps (optional)').first().fill('10');
  await page.getByLabel('Weight kg (optional)').first().fill('0');
  await page.getByLabel('Plan title').fill('Browser Strength Plan');
  await page.getByRole('button', { name: 'Save and assign workout plan' }).click();
  await expect(page.getByRole('status')).toContainText('Workout plan assigned to this client.');
  expect(await tenant.workoutPlan.count()).toBe(workoutBefore.plans + 1);
  expect(await tenant.workoutExercise.count()).toBe(workoutBefore.exercises + 1);
  expect(await tenant.commandReceipt.count()).toBe(workoutBefore.receipts + 1);
  expect(await tenant.auditLog.count()).toBe(workoutBefore.audits + 1);
  await openAs(page, fixture.users.memberUser.id, '/gyms/' + slug + '/member/workout-plans');
  await expect(page.getByRole('heading', { name: 'Workout plans', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Browser Strength Plan');
  await expect(page.getByRole('article')).toContainText('0 kg');
  await expect(page.getByRole('button', { name: /Save|assign|edit/i })).toHaveCount(0);
  await page.screenshot({ path: join(evidenceDirectory, 'member-workout-plans.png'), fullPage: true });

  const mealBefore = { plans: await tenant.mealPlan.count(), entries: await tenant.mealPlanEntry.count(),
    receipts: await tenant.commandReceipt.count(), audits: await tenant.auditLog.count() };
  await openAs(page, fixture.users.trainerUser.id, '/gyms/' + slug + '/trainer/plans/meal/new?memberId=' + encodeURIComponent(member.id));
  await page.getByRole('heading', { name: 'Plan for Member Alpha' }).waitFor();
  await page.getByLabel('Plan title').fill('Browser Nutrition Plan');
  await page.getByLabel('Food item').first().fill('Oats');
  await page.getByLabel('Calories').first().fill('300');
  await page.getByLabel('Protein g').first().fill('12.50');
  await page.getByLabel('Carbs g').first().fill('40');
  await page.getByLabel('Fat g').first().fill('0');
  await page.getByRole('button', { name: 'Add meal' }).click();
  await page.getByLabel('Food item').nth(1).fill('Shake');
  await page.getByLabel('Calories').nth(1).fill('200');
  await page.getByLabel('Protein g').nth(1).fill('25');
  await page.getByLabel('Carbs g').nth(1).fill('10.25');
  await expect(page.getByLabel('Live nutrition totals')).toContainText('500');
  await expect(page.getByLabel('Live nutrition totals')).toContainText('37.50 g');
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: join(evidenceDirectory, 'trainer-meal-plan-builder.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save and assign meal plan' }).click();
  await expect(page.getByRole('status')).toContainText('Meal plan assigned to this client.');
  expect(await tenant.mealPlan.count()).toBe(mealBefore.plans + 1);
  expect(await tenant.mealPlanEntry.count()).toBe(mealBefore.entries + 2);
  expect(await tenant.commandReceipt.count()).toBe(mealBefore.receipts + 1);
  expect(await tenant.auditLog.count()).toBe(mealBefore.audits + 1);
  await openAs(page, fixture.users.memberUser.id, '/gyms/' + slug + '/member/meal-plans');
  await expect(page.getByRole('heading', { name: 'Meal plans', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Browser Nutrition Plan');
  await expect(page.getByRole('article')).toContainText(/Monday[\s\S]*Breakfast[\s\S]*Oats/);
  await expect(page.getByRole('article')).toContainText('500 kcal');
  await expect(page.getByRole('button', { name: /Save|assign|edit/i })).toHaveCount(0);
  await page.screenshot({ path: join(evidenceDirectory, 'member-meal-plans.png'), fullPage: true });

  expect({ sessions: await fixture.tenants[0]!.pTSession.count(), events: await fixture.tenants[0]!.sessionStateEvent.count(),
    movements: await fixture.tenants[0]!.packCreditMovement.count() }).toEqual(persistedBefore);
});
