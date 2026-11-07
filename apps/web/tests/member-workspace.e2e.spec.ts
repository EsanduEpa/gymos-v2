import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createServer as createHttpServer, request as forwardRequest, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';
import { reserveSessionCredit } from '../../api/dist/sessions/credit-holds.js';
import { requestDigest } from '../../api/src/operations/primitives.js';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { installBrowserSession } from './support/browser-session.js';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const evidenceDirectory = join(webDirectory, 'test-results/ui-transformation/member');
type RunningProcess = { child: ChildProcess; errorText: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: RunningProcess | undefined;
let web: RunningProcess | undefined;
let apiBase = '';
let webBase = '';
let jwtSecret = '';
let targetMonth = '2026-12';
let proxy: Server;
let blockedResource = '';
let workoutId = '';
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
  await installBrowserSession({ page, master: fixture.master, identityId: userId, gymId: fixture.gyms[0].id, jwtSecret, origin: webBase });
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
  await seedMemberPlans();
  const [apiPort, webPort] = await Promise.all([reservePort(), reservePort()]);
  apiBase = `http://127.0.0.1:${apiPort}`; webBase = `http://127.0.0.1:${webPort}`; jwtSecret = randomBytes(32).toString('hex');
  api = launch(process.execPath, [join(apiDirectory, 'dist/main.js')], apiDirectory, { PATH: process.env.PATH, HOME: process.env.HOME,
    NODE_ENV: 'production', TZ: 'UTC', PORT: String(apiPort), MASTER_DATABASE_URL: environment.masterUrl,
    TENANT_DATABASE_URL: environment.masterUrl, PROVISION_DATABASE_URL: environment.masterUrl, JWT_SECRET: jwtSecret });
  await waitReady(`${apiBase}/`, api);
  const proxyPort = await reservePort();
  proxy = createHttpServer((req, res) => {
    if (blockedResource && req.url?.includes(blockedResource)) { res.writeHead(503, { 'content-type': 'application/json' }); res.end('{}'); return; }
    const upstream = forwardRequest(`${apiBase}${req.url}`, { method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode ?? 502, response.headers); response.pipe(res); });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end(); });
    req.pipe(upstream);
  });
  await new Promise<void>(resolve => proxy.listen(proxyPort, '127.0.0.1', resolve));
  web = launch(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory,
    { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', TZ: 'UTC', GYMOS_API_URL: `http://127.0.0.1:${proxyPort}`, GYMOS_WEB_ORIGIN: webBase });
  await waitReady(`${webBase}/login`, web);
});

test.afterAll('stop session-read services and remove owned fixtures', async () => {
  await stop(web); if (proxy) await new Promise<void>(resolve => proxy.close(() => resolve())); await stop(api); await fixture?.close();
  if (environment) console.info('[member-ui-browser-cleanup]', JSON.stringify(await environment.cleanup()));
});

async function seedCoachingCredits() {
  const tenant = fixture.tenants[0];
  memberId = (await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } })).id;
  trainerId = (await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } })).id;
  const requestDate = new Date(`${localDate(new Date(Date.now() + 4 * 86400000), 'Asia/Colombo')}T00:00:00.000Z`);
  const availabilityReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_MEMBER_REQUEST_AVAILABILITY',
    idempotencyKey: `member-request-availability-${environment.runId}`, requestDigest: requestDigest({ run: environment.runId, availability: true }),
    state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  await tenant.pTAvailabilityRule.create({ data: { trainerId, kind: 'DATED_WINDOW', localDate: requestDate, startMinute: 900, endMinute: 1020,
    createdByIdentityId: fixture.users.ownerA.id, commandReceiptId: availabilityReceipt.id } });
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
  // Keep one pending request so the member request journey can create a second
  // request within the per-member two-request limit.
  for (let i = 0; i < 1; i++) {
    const tomorrow = new Date(`${today}T00:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().slice(0,10);
    const time = new Date(`${date}T${i ? '19' : '17'}:00:00+05:30`);
    await tenant.pTSession.create({ data: { memberId, trainerId, state: 'PENDING_CONFIRMATION', type: 'IN_PERSON', fee: '50', currency: 'LKR', configurationVersion: 0, scheduledStartAt: time, scheduledEndAt: new Date(time.getTime() + 30 * 60000), requestExpiresAt: new Date(Date.now() + 12 * 3600000), gymTimezone: 'Asia/Colombo', createdByIdentityId: fixture.users.memberUser.id, notes: `Trainer UI request ${i}` } });
  }
}

async function seedMemberPlans() {
  const tenant = fixture.tenants[0];
  const latest = await tenant.workoutPlan.create({ data: { memberId, trainerId, name: 'Member Strength Plan', description: 'Controlled movement and clear instructions.', createdAt: new Date(Date.now() - 60000), exercises: { create: [
    { sortOrder: 0, name: 'Bodyweight squat', sets: 3, reps: 12, weightKg: '0', notes: 'Keep the movement controlled.\nRest between sets.' },
    { sortOrder: 1, name: 'Walking warmup', sets: 1, durationMinutes: 10 },
  ] } } });
  workoutId = latest.id;
  for (let index = 0; index < 20; index++) await tenant.workoutPlan.create({ data: { memberId, trainerId, name: `Previous training ${index}`, createdAt: new Date(Date.now() - (index + 2) * 3600000), exercises: { create: [{ sortOrder: 0, name: 'Stretch', sets: 1, durationMinutes: 5 }] } } });
  await tenant.mealPlan.create({ data: { memberId, trainerId, name: 'Weekly Meal Guidance', entries: { create: [
    { sortOrder: 0, dayOfWeek: 1, mealType: 'Breakfast', foodItem: 'Oats and fruit', calories: 300, proteinGrams: '12.50', carbsGrams: null, fatsGrams: '0' },
    { sortOrder: 1, dayOfWeek: 2, mealType: 'Lunch', foodItem: 'Lentil bowl', calories: 200, proteinGrams: '25', carbsGrams: null, fatsGrams: '0' },
  ] } } });
  await tenant.mealPlan.create({ data: { memberId, trainerId, name: 'Nutrition Details Pending', createdAt: new Date(Date.now() - 3600000), entries: { create: [{ sortOrder: 0, dayOfWeek: 3, mealType: 'Dinner', foodItem: 'Vegetable soup' }] } } });
  const today = localDate(new Date(), 'Asia/Colombo');
  const start = new Date(`${today}T01:00:00+05:30`);
  await tenant.pTSession.create({ data: { memberId, trainerId, state: 'COMPLETED', type: 'IN_PERSON', scheduledStartAt: start, scheduledEndAt: new Date(start.getTime() + 1800000), gymTimezone: 'Asia/Colombo', fee: '50', currency: 'LKR', confirmationRate: '0.4', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: start, startedAt: start, endedAt: new Date(start.getTime() + 1800000), createdByIdentityId: fixture.users.ownerA.id, notes: 'Member visible coaching feedback' } });
}

test('member appearance presents verified home and all member screens in both themes', async ({ page, request }) => {
  test.setTimeout(180000);
  const base = `/gyms/${fixture.gyms[0].slug}/member`;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openAs(page, fixture.users.memberUser.id, `/gyms/${fixture.gyms[0].slug}`);
  await expect(page).toHaveURL(new RegExp(`${base}$`));
  await expect(page.locator('.member-workspace')).toBeVisible();
  await expect(page.locator('.member-metric').nth(0).locator('strong')).toHaveText('21');
  await expect(page.locator('.member-metric').nth(1).locator('strong')).toHaveText('1');
  await expect(page.locator('.member-metric').nth(2).locator('strong')).toHaveText('3');
  await expect(page.locator('.member-workout-feature')).toContainText('Member Strength Plan');
  await expect(page.locator('.member-pt-priority')).toContainText('Trainer Alpha');
  const geometry: Record<number, unknown> = {};
  for (const mode of ['light','dark'] as const) {
    if (mode === 'dark') await page.goto(`${webBase}${base}`);
    await page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440,1024,768,390,320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} home ${width}`).toBe(true);
      const contrast = await page.locator('.member-metric').first().evaluate(element => { const luminance = (color: string) => { const c = (color.match(/[\d.]+/g) ?? []).slice(0,3).map(Number).map(value => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return .2126*c[0]! + .7152*c[1]! + .0722*c[2]!; }; const style = getComputedStyle(element); const a=luminance(style.color), b=luminance(style.backgroundColor); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      const box = await page.locator('.member-metrics').boundingBox();
      if (mode === 'light') geometry[width] = box; else expect(box).toEqual(geometry[width]);
      await expect(page.locator('.member-metric').first()).toHaveCSS('background-color', mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(23, 36, 59)');
      await page.screenshot({ path: join(evidenceDirectory, `${mode}-home-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    for (const [index,path] of ['/workout-plans', '/meal-plans', '/sessions', '/calendar', '/trainers', `/trainers/${trainerId}/book`].entries()) {
      await page.goto(`${webBase}${base}${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('main [role="alert"]')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
      for (const width of [1440,320]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} ${path} ${width}`).toBe(true);
        await page.screenshot({ path: join(evidenceDirectory, `${mode}-screen-${index}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('.shell-sidebar')).toHaveCSS('width', '80px');
  await page.reload();
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  const more = page.getByRole('button', { name: 'More navigation options', exact: true });
  await more.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(drawer.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
  await page.getByRole('navigation', { name: 'Member shortcuts' }).getByRole('link', { name: 'Workouts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout plans', exact: true })).toBeVisible();
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/me/workout-plans`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(403);
  await expect(page.getByRole('button', { name: /Save and assign|Start workout|Complete workout|Complete session/ })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Midnight Blue', exact: true })).toHaveCSS('transition-duration', '0s');
  expect(errors).toEqual([]);
});

test('member plans preserve exact details paging and calendar keyboard selection', async ({ page }) => {
  const base = `/gyms/${fixture.gyms[0].slug}/member`;
  await openAs(page, fixture.users.memberUser.id, `${base}/workout-plans`);
  const plan = page.locator(`#workout-${workoutId}`);
  await expect(plan).toContainText('0 kg');
  await expect(plan).toContainText('10 min');
  await expect(plan).toContainText('Keep the movement controlled.');
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.member-plan-pager')).toContainText('Page 2 of 2');
  await page.goto(`${webBase}${base}/meal-plans`);
  const totals = page.getByRole('region', { name: 'Recorded nutrition totals for Weekly Meal Guidance' });
  await expect(totals).toContainText('500 kcal');
  await expect(totals).toContainText('37.5 g');
  await expect(totals.locator('dl > div').nth(2).locator('dd')).toHaveText('—');
  await expect(totals.locator('dl > div').nth(3).locator('dd')).toHaveText('0 g');
  await expect(page.getByRole('region', { name: 'Recorded nutrition totals for Nutrition Details Pending' }).locator('dl > div').first().locator('dd')).toHaveText('—');
  const monday = page.locator('.member-meal-days details').first();
  await monday.locator('summary').click();
  await expect(monday.getByText('Oats and fruit', { exact: true })).toBeHidden();
  await monday.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(monday.getByText('Oats and fruit', { exact: true })).toBeVisible();
  await page.goto(`${webBase}${base}/calendar?month=${targetMonth}`);
  const firstWeekday = new Date(`${targetMonth}-01T12:00:00Z`).getUTCDay();
  const mondayDate = `${targetMonth}-${String(1 + (8 - firstWeekday) % 7).padStart(2,'0')}`;
  const nextDate = new Date(`${mondayDate}T12:00:00Z`); nextDate.setUTCDate(nextDate.getUTCDate()+1); const tuesdayDate = nextDate.toISOString().slice(0,10);
  const day = page.getByRole('button', { name: new RegExp(`^${mondayDate},`) });
  await day.click(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: new RegExp(`^${tuesdayDate},`) })).toBeFocused();
  await expect(page.getByRole('complementary', { name: `Sessions on ${tuesdayDate}` })).toContainText('Trainer Alpha');
  await page.getByRole('button', { name: new RegExp(`^${mondayDate},`) }).click();
  const panel = page.getByRole('complementary', { name: `Sessions on ${mondayDate}` });
  await expect(panel).toContainText('Meal plan activity');
  await panel.getByRole('link', { name: 'View this day’s sessions' }).click();
  await expect(page).toHaveURL(new RegExp(`mode=day&date=${mondayDate}`));
  await expect(page.locator('main')).not.toContainText('Trainer earning:');
  await expect(page.locator('main')).not.toContainText('Session fee:');
});

test('member requests keep drafts and withdraw without holding credits then confirm policy cancellation', async ({ page }) => {
  const base = `/gyms/${fixture.gyms[0].slug}/member`;
  const tenant = fixture.tenants[0];
  await openAs(page, fixture.users.memberUser.id, `${base}/trainers`);
  await page.getByLabel('Search by trainer name').fill('no-match');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No active trainers found' })).toBeVisible();
  await page.getByLabel('Search by trainer name').fill('Trainer Alpha');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('link', { name: 'View Trainer Alpha profile', exact: true }).click();
  await page.getByRole('link', { name: 'Request a private session', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  const requestDay = localDate(new Date(Date.now() + 4 * 86400000), 'Asia/Colombo');
  await page.getByLabel('Session date', { exact: true }).fill(requestDay);
  const startTime = page.getByLabel(/^Available start time/);
  await expect(startTime).toBeEnabled();
  await startTime.selectOption(await startTime.locator('option').filter({ hasText: '15:00' }).getAttribute('value') ?? '');
  await page.getByLabel('Note for the trainer (optional)').fill('Member UI request');
  const holdsBefore = await tenant.sessionCreditHold.count();
  const movementsBefore = await tenant.packCreditMovement.count();
  await page.getByRole('button', { name: 'Request session', exact: true }).click();
  try {
    await expect(page.locator('.member-request-form').getByRole('status')).toContainText('trainer must accept');
  } catch (error) {
    console.error('[member-request-browser-diagnostics]', { api: api?.errorText(), web: web?.errorText(), form: await page.locator('.member-request-form').innerText() });
    throw error;
  }
  const session = await tenant.pTSession.findFirstOrThrow({ where: { notes: 'Member UI request' } });
  expect(session.state).toBe('PENDING_CONFIRMATION');
  expect(await tenant.sessionCreditHold.count()).toBe(holdsBefore);
  await page.goto(`${webBase}${base}/sessions?mode=day&date=${requestDay}`);
  const card = page.locator(`#session-${session.id}`);
  await card.getByRole('button', { name: 'Withdraw request', exact: true }).click();
  const withdrawal = page.getByRole('dialog', { name: 'Withdraw request', exact: true });
  await expect(withdrawal).toContainText('without using a credit');
  await withdrawal.getByRole('button', { name: 'Withdraw request', exact: true }).click();
  await expect(card).toContainText('CANCELLED');
  expect(await tenant.packCreditMovement.count()).toBe(movementsBefore);
  await page.goto(`${webBase}${base}/sessions?mode=day&date=${localDate(new Date(), 'Asia/Colombo')}`);
  const ready = page.locator(`#session-trainer-ready-${environment.runId}`);
  await ready.getByRole('button', { name: 'Cancel session', exact: true }).click();
  const quote = page.getByRole('dialog', { name: 'Cancel session', exact: true });
  await expect(quote).toContainText('This late cancellation consumes one PT credit.');
  await expect(quote.getByRole('button', { name: 'Cancel session', exact: true })).toBeDisabled();
  await quote.getByRole('checkbox').check();
  await quote.getByRole('button', { name: 'Cancel session', exact: true }).click();
  await expect(ready).toContainText('CANCELLED');
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: `trainer-ready-${environment.runId}`, state: 'CONSUMED' } })).toBe(1);
});

test('member home preserves independent data during a plan outage and recovers', async ({ page }) => {
  const base = `/gyms/${fixture.gyms[0].slug}/member`;
  blockedResource = '/me/workout-plans';
  try {
    await openAs(page, fixture.users.memberUser.id, base);
    await expect(page.locator('.member-metric').first().locator('strong')).toHaveText('—');
    await expect(page.getByRole('heading', { name: 'Workout plans unavailable' })).toBeVisible();
    await expect(page.locator('.member-credit-panel')).toContainText('Your session credits');
    await expect(page.locator('.member-nutrition-preview')).toContainText('Weekly Meal Guidance');
    await page.getByRole('link', { name: 'View workouts', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('could not be loaded');
    blockedResource = '';
    await page.getByRole('link', { name: 'Retry workout plans', exact: true }).click();
    await expect(page.locator('.member-plan-list')).toContainText('Member Strength Plan');
  } finally { blockedResource = ''; }
});
