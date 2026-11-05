import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';
import { reserveSessionCredit } from '../../api/dist/sessions/credit-holds.js';
import { requestDigest } from '../../api/src/operations/primitives.js';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const evidenceDirectory = join(webDirectory, 'test-results/ui-transformation/trainer');
type RunningProcess = { child: ChildProcess; errorText: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: RunningProcess | undefined;
let web: RunningProcess | undefined;
let apiBase = '';
let webBase = '';
let jwtSecret = '';
let targetMonth = '2026-12';
let memberId = '';
let trainerId = '';

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
  const activeStart = new Date(now.getTime() - 50 * 60_000);
  await tenant.pTSession.create({ data: sessionData({ id: `read-active-${environment.runId}`, memberId: member.id, trainerId: trainer.id,
    state: 'ACTIVE', start: activeStart, end: new Date(now.getTime() + 10 * 60_000), createdBy: fixture.users.ownerA.id,
    startedAt: new Date(now.getTime() - 45 * 60_000) }) });
  const [year, month] = targetMonth.split('-').map(Number);
  const rows = [];
  for (let day = 1; day <= 15; day++) for (let slot = 0; slot < 2; slot++) {
    const start = new Date(Date.UTC(year!, month! - 1, day, 3 + slot * 3));
    rows.push(sessionData({ id: `read-scheduled-${environment.runId}-${day}-${slot}`, memberId: member.id, trainerId: trainer.id,
      state: 'SCHEDULED', start, end: new Date(start.getTime() + 30 * 60_000), createdBy: fixture.users.ownerA.id }));
  }
  await tenant.pTSession.createMany({ data: rows });

}
async function openAs(page: Page, userId: string, path: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId,
    authVersion: (await fixture.master.user.findUniqueOrThrow({ where: { id: userId }, select: { authVersion: true } })).authVersion,
    iss: 'gymos-v2', aud: 'gymos-api', iat: issuedAt, exp: issuedAt + 900 })).toString('base64url');
  const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
  const token = `${header}.${payload}.${signature}`;
  await page.goto('about:blank');
  await page.context().clearCookies();
  await page.context().addCookies([{ name: 'gymos_access_token', value: token, url: webBase, httpOnly: true, sameSite: 'Lax' }]);
  await page.goto(`${webBase}${path}`);
}

test.beforeEach(async ({ page }) => { page.setDefaultTimeout(15000); });

test.beforeAll('start isolated session-read fixtures and local services', async () => {
  test.setTimeout(180_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(environment);
  await mkdir(evidenceDirectory, { recursive: true });
  targetMonth = nextMonth(new Date(), 'Asia/Colombo');
  await seedSessions();
  await seedCoachingCredits();
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
  if (environment) console.info('[trainer-ui-browser-cleanup]', JSON.stringify(await environment.cleanup()));
});

async function seedCoachingCredits() {
  const tenant = fixture.tenants[0];
  memberId = (await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } })).id;
  trainerId = (await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } })).id;
  const today = localDate(new Date(), 'Asia/Colombo');
  const start = new Date(`${today}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 2);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 90);
  const plan = await tenant.membershipPlan.create({ data: { name: 'Trainer browser membership', price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId, planId: plan.id, startDate: start, endDateExclusive: end, agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: `trainer-ui-term-${environment.runId}`, requestDigest: requestDigest({ term: environment.runId }) } });
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_TRAINER_UI_PACK', idempotencyKey: `trainer-ui-pack-${environment.runId}`, requestDigest: requestDigest({ pack: environment.runId }), state: 'COMMITTED', committedAt: new Date(), safeResult: {} } });
  const pack = await tenant.sessionPack.create({ data: { memberId, issuedCredits: 5, price: '100', currency: 'LKR', totalMinorUnits: BigInt(10000), creditBaseMinorUnits: BigInt(2000), creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90, startDate: start, endDateExclusive: end, commandReceiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: `trainer-ui-issue-${environment.runId}`, requestDigest: requestDigest({ issue: environment.runId }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 5, heldDelta: 0, consumedDelta: 0, expiredDelta: 0, sourceKey: `trainer-ui-issue-${environment.runId}`, receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id } });
  const active = await tenant.pTSession.findUniqueOrThrow({ where: { id: `read-active-${environment.runId}` } });
  await tenant.pTSession.update({ where: { id: active.id }, data: { state: 'SCHEDULED', startedAt: null } });
  await tenant.$transaction(tx => reserveSessionCredit(tx as unknown as Parameters<typeof reserveSessionCredit>[0], { masterGymId: fixture.gyms[0].id, sessionId: active.id, memberId, trainerId, scheduledLocalDate: localDate(active.scheduledStartAt, 'Asia/Colombo'), explicitPackId: pack.id, actorIdentityId: fixture.users.ownerA.id, receiptId: receipt.id }));
  await tenant.pTSession.update({ where: { id: active.id }, data: { state: 'ACTIVE', startedAt: active.startedAt } });
  const readyStart = new Date(Date.now() + 11 * 60000);
  const ready = await tenant.pTSession.create({ data: sessionData({ id: `trainer-ready-${environment.runId}`, memberId, trainerId, state: 'SCHEDULED', start: readyStart, end: new Date(readyStart.getTime() + 60 * 60000), createdBy: fixture.users.ownerA.id }) });
  const readyReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_TRAINER_UI_BOOKING', idempotencyKey: `trainer-ui-ready-${environment.runId}`, requestDigest: requestDigest({ ready: environment.runId }), state: 'COMMITTED', committedAt: new Date(), safeResult: {} } });
  // The fixture uses the source-generated client; the compiled API helper's
  // declaration refers to the equivalent dist-generated transaction type.
  await tenant.$transaction(tx => reserveSessionCredit(tx as unknown as Parameters<typeof reserveSessionCredit>[0], { masterGymId: fixture.gyms[0].id, sessionId: ready.id, memberId, trainerId, scheduledLocalDate: localDate(readyStart, 'Asia/Colombo'), explicitPackId: pack.id, actorIdentityId: fixture.users.ownerA.id, receiptId: readyReceipt.id }));
  for (let i = 0; i < 2; i++) {
    const tomorrow = new Date(`${today}T00:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().slice(0,10);
    const time = new Date(`${date}T${i ? '19' : '17'}:00:00+05:30`);
    await tenant.pTSession.create({ data: { memberId, trainerId, state: 'PENDING_CONFIRMATION', type: 'IN_PERSON', fee: '50', currency: 'LKR', configurationVersion: 0, scheduledStartAt: time, scheduledEndAt: new Date(time.getTime() + 30 * 60000), gymTimezone: 'Asia/Colombo', createdByIdentityId: fixture.users.memberUser.id, notes: `Trainer UI request ${i}` } });
  }
}

test('trainer appearance covers schedule requests clients builders and earnings in both themes', async ({ page, request }) => {
  test.setTimeout(180000);
  const base = `/gyms/${fixture.gyms[0].slug}/trainer`;
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await openAs(page, fixture.users.trainerUser.id, `/gyms/${fixture.gyms[0].slug}`);
  await expect(page).toHaveURL(new RegExp(`${base}/schedule$`));
  await expect(page.locator('.trainer-workspace')).toBeVisible();
  await expect(page.locator('.trainer-metric').nth(1).locator('strong')).toHaveText('1');
  await expect(page.locator('.trainer-metric').nth(2).locator('strong')).toHaveText('2');
  const metricGeometry: Record<number, unknown> = {};
  for (const mode of ['light', 'dark'] as const) {
    await page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} schedule ${width}`).toBe(true);
      const contrast = await page.locator('.trainer-metric').first().evaluate(element => {
        const luminance = (color: string) => { const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(value => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!; };
        const style = getComputedStyle(element); const a = luminance(style.color), b = luminance(style.backgroundColor); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      const geometry = await page.locator('.trainer-metrics').boundingBox();
      if (mode === 'light') metricGeometry[width] = geometry;
      else expect(geometry).toEqual(metricGeometry[width]);
      await page.screenshot({ path: join(evidenceDirectory, `${mode}-schedule-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    for (const [index,path] of ['/calendar?month=' + targetMonth, '/requests', '/clients', `/clients/${memberId}`, `/plans/workout/new?memberId=${memberId}`, `/plans/meal/new?memberId=${memberId}`, '/earnings', `/schedule?mode=month&month=${targetMonth}`].entries()) {
      await page.goto(`${webBase}${base}${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
      await expect(page.locator('main [role="alert"]')).toHaveCount(0);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} ${path} ${width}`).toBe(true);
        await page.screenshot({ path: join(evidenceDirectory, `${mode}-screen-${index}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
    }
    await page.goto(`${webBase}${base}/schedule`);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('.shell-sidebar')).toHaveCSS('width','80px');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  const menu = page.getByRole('button', { name: 'Open navigation menu' });
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(drawer.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Midnight Blue', exact: true })).toHaveCSS('transition-duration', '0s');
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/me/clients`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(403);
  await openAs(page, fixture.users.memberUser.id, `${base}/clients`);
  await expect(page.locator('.trainer-workspace')).toHaveCount(0);
  await page.goto(`${webBase}${base}/calendar`);
  await expect(page.locator('.trainer-workspace')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('trainer calendar shows every monthly session and links to the day schedule', async ({ page }) => {
  const base = `/gyms/${fixture.gyms[0].slug}/trainer`;
  await openAs(page, fixture.users.trainerUser.id, `${base}/calendar?month=${targetMonth}`);
  await expect(page.getByRole('heading', { name: 'My calendar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Calendar', exact: true }).first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('table', { name: /trainer calendar/ })).toBeVisible();
  await expect(page.locator('.trainer-calendar-summary')).toContainText('30');
  const firstDate = `${targetMonth}-01`;
  const first = page.getByRole('button', { name: new RegExp(`^${firstDate}, 2 sessions`) });
  await first.click();
  await expect(page.getByRole('complementary', { name: `Trainer sessions on ${firstDate}` })).toContainText('Member Alpha');
  await page.getByRole('complementary', { name: `Trainer sessions on ${firstDate}` }).getByRole('link', { name: 'View this day’s schedule' }).click();
  await expect(page).toHaveURL(new RegExp(`mode=day&date=${firstDate}`));
  await expect(page.locator('.trainer-session-card')).toHaveCount(2);
  const [year, month] = targetMonth.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  const extra = Array.from({ length: daysInMonth }, (_, day) => [0, 1, 9, 10].map(hour => {
    const start = new Date(Date.UTC(year!, month! - 1, day + 1, hour));
    return sessionData({ id: `calendar-extra-${environment.runId}-${day}-${hour}`, memberId, trainerId, state: 'SCHEDULED', start,
      end: new Date(start.getTime() + 30 * 60_000), createdBy: fixture.users.ownerA.id });
  })).flat();
  await fixture.tenants[0].pTSession.createMany({ data: extra });
  await page.goto(`${webBase}${base}/calendar?month=${targetMonth}`);
  await expect(page.locator('.trainer-calendar-summary')).toContainText(`${30 + extra.length} total sessions`);
  await expect(page.getByText('Some session records could not be loaded.')).toHaveCount(0);
  const lastDate = `${targetMonth}-${daysInMonth}`;
  await page.getByRole('button', { name: new RegExp(`^${lastDate}, 4 sessions`) }).click();
  await expect(page.getByRole('complementary', { name: `Trainer sessions on ${lastDate}` }).locator('li')).toHaveCount(4);
});

test('trainer coaching keeps drafts assigns real plans and preserves client-only access', async ({ page, request }) => {
  const base = `/gyms/${fixture.gyms[0].slug}/trainer`;
  await openAs(page, fixture.users.trainerUser.id, `${base}/clients`);
  const trainerToken = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  const rosterResponse = await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/me/clients?q=Member%20Alpha`, { headers: { authorization: `Bearer ${trainerToken}` } });
  expect(rosterResponse.ok()).toBe(true);
  expect((await rosterResponse.json()).items[0].usablePackBalance).toEqual({ available: 3, held: 2 });
  await page.getByLabel('Search clients').fill('no-matching-client');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=no-matching-client/);
  await expect(page.getByRole('heading', { name: 'No confirmed clients' })).toBeVisible();
  await page.getByLabel('Search clients').fill('Member Alpha');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=Member(?:%20|\+)Alpha/);
  await expect(page.getByRole('table', { name: 'Your confirmed clients' })).toContainText('Member Alpha');
  await page.getByRole('link', { name: 'View 360° Profile' }).click();
  await page.getByRole('link', { name: 'Create workout plan', exact: true }).click();
  await page.getByLabel('Plan title').fill('Trainer UI Strength');
  await page.getByLabel('Description (optional)').fill('Retained description');
  await expect(page.getByLabel('Exercise name')).toHaveValue('');
  await page.getByLabel('Exercise name').fill('Goblet squat');
  await page.getByLabel('Sets', { exact: true }).fill('3');
  await page.getByLabel('Weight kg (optional)').fill('0');
  await page.getByLabel('Sets', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save and assign workout plan' }).click();
  expect(await page.getByLabel('Sets', { exact: true }).evaluate(e => (e as HTMLInputElement).validity.rangeUnderflow)).toBe(true);
  await page.getByLabel('Sets', { exact: true }).fill('3');
  // Trigger server validation while preserving the meaningful zero-weight draft.
  await page.getByLabel('Plan title').fill(' ');
  await page.getByRole('button', { name: 'Save and assign workout plan' }).click();
  await expect(page.locator('form').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Description (optional)')).toHaveValue('Retained description');
  await expect(page.getByLabel('Exercise name')).toHaveValue('Goblet squat');
  await page.getByLabel('Plan title').fill('Trainer UI Strength');
  await page.getByLabel('Weight kg (optional)').fill('0');
  await page.getByRole('button', { name: 'Save and assign workout plan' }).click();
  await expect(page.locator('form').getByRole('status')).toContainText('Workout plan assigned');
  const tenant = fixture.tenants[0];
  expect(await tenant.workoutPlan.count({ where: { name: 'Trainer UI Strength', memberId } })).toBe(1);
  expect((await tenant.workoutExercise.findFirstOrThrow({ where: { plan: { name: 'Trainer UI Strength' } } })).weightKg?.toString()).toBe('0');
  await page.goto(`${webBase}${base}/plans/meal/new?memberId=${memberId}`);
  await page.getByLabel('Plan title').fill('Trainer UI Nutrition');
  await page.getByLabel('Food item').fill('Oats');
  await page.getByLabel('Calories', { exact: true }).fill('300');
  await page.getByLabel('Protein g').fill('12.50');
  await page.getByRole('button', { name: 'Add meal', exact: true }).click();
  await page.getByLabel('Food item').nth(1).fill('Yogurt');
  await page.getByLabel('Calories', { exact: true }).nth(1).fill('200');
  await expect(page.getByLabel('Live nutrition totals')).toContainText('500');
  await page.getByRole('button', { name: 'Save and assign meal plan' }).click();
  await expect(page.locator('form').getByRole('status')).toContainText('Meal plan assigned');
  await page.goto(`${webBase}${base}/clients/${memberId}`);
  await expect(page.locator('#workouts')).toContainText('Trainer UI Strength');
  await expect(page.locator('#meals')).toContainText('Trainer UI Nutrition');
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  const unrelated = await tenant.member.findFirstOrThrow({ where: { identityId: null } });
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/me/clients/${unrelated.id}`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(404);
  await openAs(page, fixture.users.memberUser.id, `/gyms/${fixture.gyms[0].slug}/member/workout-plans`);
  await expect(page.getByRole('article')).toContainText('Trainer UI Strength');
  await expect(page.getByRole('button', { name: /Save and assign/ })).toHaveCount(0);
});

test('trainer accepts declines completes with confirmation and saves member-visible notes', async ({ page }) => {
  const base = `/gyms/${fixture.gyms[0].slug}/trainer`;
  await openAs(page, fixture.users.trainerUser.id, `${base}/requests`);
  const accept = page.locator('.session-request-card').filter({ hasText: 'Trainer UI request 0' });
  await accept.getByRole('button', { name: 'Accept and reserve one credit' }).click();
  await expect(page.getByText('Trainer UI request 0', { exact: false })).toHaveCount(0);
  const decline = page.locator('.session-request-card').filter({ hasText: 'Trainer UI request 1' });
  await decline.getByLabel('Optional message for the member').fill('Please choose another time.');
  await decline.getByRole('button', { name: 'Decline request', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No pending requests' })).toBeVisible();
  const tenant = fixture.tenants[0];
  expect((await tenant.pTSession.findFirstOrThrow({ where: { notes: 'Trainer UI request 0' } })).state).toBe('SCHEDULED');
  expect((await tenant.pTSession.findFirstOrThrow({ where: { notes: 'Trainer UI request 1' } })).state).toBe('DECLINED');
  await page.goto(`${webBase}${base}/schedule`);
  const card = page.locator(`#session-read-active-${environment.runId}`);
  await card.getByRole('button', { name: 'Complete session', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Complete this session?', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('consumes its held credit');
  await page.keyboard.press('Escape');
  await expect(card.getByRole('button', { name: 'Complete session', exact: true })).toBeFocused();
  expect((await tenant.pTSession.findUniqueOrThrow({ where: { id: `read-active-${environment.runId}` } })).state).toBe('ACTIVE');
  await card.getByRole('button', { name: 'Complete session', exact: true }).click();
  await dialog.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(card).toContainText('COMPLETED');
  expect(await tenant.sessionSettlement.count({ where: { sessionId: `read-active-${environment.runId}` } })).toBe(1);
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: `read-active-${environment.runId}`, state: 'CONSUMED' } })).toBe(1);
  await card.locator('summary').filter({ hasText: 'Edit Notes' }).click();
  await card.getByLabel('Member-visible session notes').fill('Trainer UI completed coaching notes');
  await card.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect(card).toContainText('Shared session notes saved.');
  const ready = page.locator(`#session-trainer-ready-${environment.runId}`);
  await ready.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(ready).toContainText('ACTIVE');
  expect((await tenant.pTSession.findUniqueOrThrow({ where: { id: `trainer-ready-${environment.runId}` } })).state).toBe('ACTIVE');
  await page.goto(`${webBase}${base}/earnings`);
  await expect(page.locator('.trainer-earnings-metrics')).not.toContainText('Unavailable');
  await expect(page.getByRole('main')).toContainText('do not report payment or payout');
  await openAs(page, fixture.users.memberUser.id, `/gyms/${fixture.gyms[0].slug}/member/sessions`);
  await expect(page.getByRole('main')).toContainText('Trainer UI completed coaching notes');
});
