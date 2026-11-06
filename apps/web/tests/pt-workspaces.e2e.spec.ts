import { reserveSessionCredit } from '../../api/dist/sessions/credit-holds.js';
import { recordInitialSession } from '../../api/dist/sessions/session-commands.js';
import { requestDigest } from '../../api/src/operations/primitives.js';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';
import { installBrowserSession } from './support/browser-session.js';

test.use({ trace: 'off', screenshot: 'off' });
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const evidenceDirectory = join(root, 'apps/web/test-results/pt-workspaces');
type RunningProcess = { child: ChildProcess; errorText: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: RunningProcess | undefined;
let web: RunningProcess | undefined;
let apiBase = '';
let webBase = '';
let jwtSecret = '';

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
    try { if ((await fetch(url)).ok) return; } catch { /* startup in progress */ }
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
async function startApi() {
  const port = Number(new URL(apiBase).port);
  return launch(process.execPath, [join(apiDirectory, 'dist/main.js')], apiDirectory, {
    PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', TZ: 'UTC', PORT: String(port),
    MASTER_DATABASE_URL: environment.masterUrl, TENANT_DATABASE_URL: environment.masterUrl, PROVISION_DATABASE_URL: environment.masterUrl,
    JWT_SECRET: jwtSecret,
  });
}
async function loginAs(page: Page, role: 'MEMBER' | 'TRAINER' | 'OWNER', path: string) {
  const user = role === 'OWNER' ? fixture.users.ownerA : role === 'TRAINER' ? fixture.users.trainerUser : fixture.users.memberUser;
  await installBrowserSession({ page, master: fixture.master, identityId: user.id, jwtSecret, origin: webBase });
  await page.goto(`${webBase}${path}`);
}

test.beforeAll('start isolated notification browser fixtures', async () => {
  test.setTimeout(120_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(environment);
  const tenant = fixture.tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const start = new Date(clock!.now.getTime() + 48 * 3_600_000);
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(start).map(part => [part.type, part.value]));
  const bookedDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const packStart = new Date(`${bookedDate}T00:00:00Z`); packStart.setUTCDate(packStart.getUTCDate() - 3);
  const packEnd = new Date(packStart); packEnd.setUTCDate(packEnd.getUTCDate() + 90);
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_PT_BROWSER', idempotencyKey: `pt-browser-${environment.runId}`, requestDigest: requestDigest({ run: environment.runId }), state: 'COMMITTED', committedAt: clock!.now, safeResult: {} } });
  const plan = await tenant.membershipPlan.create({ data: { name: 'Synthetic PT membership', price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: packStart, endDateExclusive: packEnd, agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: `pt-term-${environment.runId}`, requestDigest: requestDigest({ term: environment.runId }) } });
  const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: 4, price: '100', currency: 'LKR', totalMinorUnits: BigInt(10000), creditBaseMinorUnits: BigInt(2500), creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90, startDate: packStart, endDateExclusive: packEnd, commandReceiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: `pt-pack-${environment.runId}`, requestDigest: requestDigest({ pack: environment.runId }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 4, heldDelta: 0, consumedDelta: 0, expiredDelta: 0, sourceKey: `pt-issue-${environment.runId}`, receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id } });
  await tenant.pTSession.create({ data: { id: `pt-confirmed-${environment.runId}`, memberId: member.id, trainerId: trainer.id,
    state: 'SCHEDULED', type: 'IN_PERSON', scheduledStartAt: start, scheduledEndAt: new Date(start.getTime() + 3_600_000),
    gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR', configurationVersion: 0, availabilityVersion: 0, confirmationRate: '0.4', confirmationLevel: 'LEVEL_1', confirmedAt: clock!.now,
    createdByIdentityId: fixture.users.ownerA.id } });
  await tenant.pTSession.create({ data: { id: `pt-pending-${environment.runId}`, memberId: member.id, trainerId: trainer.id,
    state: 'PENDING_CONFIRMATION', type: 'IN_PERSON', scheduledStartAt: new Date(start.getTime() + 86_400_000), scheduledEndAt: new Date(start.getTime() + 90_000_000),
    gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR', configurationVersion: 0, requestExpiresAt: new Date(clock!.now.getTime() + 12 * 3_600_000),
    createdByIdentityId: fixture.users.memberUser.id } });
  await tenant.$transaction(async tx => {
    await reserveSessionCredit(tx as unknown as Parameters<typeof reserveSessionCredit>[0], { masterGymId: fixture.gyms[0]!.id, sessionId: `pt-confirmed-${environment.runId}`, memberId: member.id, trainerId: trainer.id, scheduledLocalDate: bookedDate, explicitPackId: pack.id, actorIdentityId: fixture.users.ownerA.id, receiptId: receipt.id });
    await recordInitialSession(tx as unknown as Parameters<typeof recordInitialSession>[0], { masterGymId: fixture.gyms[0]!.id, sessionId: `pt-confirmed-${environment.runId}`, receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id, command: 'OWNER_BOOK' });
    await recordInitialSession(tx as unknown as Parameters<typeof recordInitialSession>[0], { masterGymId: fixture.gyms[0]!.id, sessionId: `pt-pending-${environment.runId}`, receiptId: receipt.id, actorIdentityId: fixture.users.memberUser.id, command: 'MEMBER_REQUEST' });
  });
  await tenant.notification.createMany({ data: [
    { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `bell-booked-${environment.runId}`, eventCode: 'SESSION_BOOKED',
      title: 'Session confirmed', message: 'Your personal training session was confirmed.', linkKind: 'MEMBER_SESSIONS', resourceId: `pt-confirmed-${environment.runId}` },
    { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `bell-declined-${environment.runId}`, eventCode: 'SESSION_DECLINED',
      title: 'Request declined', message: 'Your personal training session request was declined.', linkKind: 'MEMBER_SESSIONS', resourceId: `pt-pending-${environment.runId}` },
  ] });
  const [apiPort, webPort] = await Promise.all([reservePort(), reservePort()]);
  apiBase = `http://127.0.0.1:${apiPort}`;
  webBase = `http://127.0.0.1:${webPort}`;
  jwtSecret = randomBytes(32).toString('hex');
  api = await startApi();
  await waitReady(`${apiBase}/`, api);
  web = launch(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory, {
    PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', TZ: 'UTC', GYMOS_API_URL: apiBase, GYMOS_WEB_ORIGIN: webBase,
  });
  await waitReady(`${webBase}/login`, web);
});

test.afterAll('stop isolated notification browser fixtures', async () => {
  await stop(web); await stop(api); await fixture?.close();
  if (environment) console.info('[notification-browser-cleanup]', JSON.stringify(await environment.cleanup()));
});

test('PT priority, detail routes and bell preserve both themes at mobile/tablet/desktop widths', async ({ page }) => {
  test.setTimeout(240_000);
  const slug = fixture.gyms[0]!.slug;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mkdir(evidenceDirectory, { recursive: true });
  for (const role of ['MEMBER', 'TRAINER', 'OWNER'] as const) {
    const workspace = `/gyms/${slug}/${role === 'MEMBER' ? 'member' : role === 'TRAINER' ? 'trainer/schedule' : 'owner/sessions'}`;
    await loginAs(page, role, workspace);
    if (role === 'MEMBER') {
      await expect(page.getByRole('heading', { name: 'Your next PT session' })).toBeVisible();
      await expect(page.locator('.member-pt-priority')).toContainText('Decision due');
      await expect(page.locator('.member-pt-priority')).toContainText('3 unheld · 1 reserved');
      await expect(page.locator('.member-pt-priority')).toContainText('Next unheld credit expires');
      await expect(page.getByRole('link', { name: 'Request PT', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Notifications, 2 unread' }).click();
      const popover = page.getByRole('region', { name: 'Notifications' });
      await expect(popover.getByRole('link', { name: /Session confirmed/ })).toHaveAttribute('href', `/gyms/${slug}/sessions/pt-confirmed-${environment.runId}`);
      await expect(popover).toContainText('when you open or use it');
      await popover.getByRole('button', { name: 'Close notifications' }).click();
    }
    if (role === 'OWNER') {
      await expect(page.getByRole('heading', { name: 'Scheduled work health' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Daily date navigation' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'No sessions found' })).toBeVisible();
    }
    for (const mode of ['light', 'dark'] as const) {
      await page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true }).click();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role} ${mode} ${width}`).toBe(true);
        await page.screenshot({ path: join(evidenceDirectory, `${role}-${mode}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
      await page.goto(`${webBase}/gyms/${slug}/sessions/pt-confirmed-${environment.runId}`);
      await expect(page.getByRole('heading', { name: 'PT booking details' })).toBeVisible();
      await expect(page.getByText('Booking details could not be loaded.')).toHaveCount(0);
      await expect(page.getByText('No recorded state events for this booking.')).toHaveCount(0);
      await expect(page.getByText('held', { exact: true })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role} detail ${mode} ${width}`).toBe(true);
        await page.screenshot({ path: join(evidenceDirectory, `${role}-detail-${mode}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
      await page.getByRole('link', { name: 'Back to sessions' }).focus();
      await expect(page.getByRole('link', { name: 'Back to sessions' })).toBeFocused();
      await page.goto(`${webBase}${workspace}`);
    }
  }
  expect(errors).toEqual([]);
});

test('member cancellation dialog preserves focus and releases one reserved credit with both notifications', async ({ page }) => {
  const slug = fixture.gyms[0]!.slug;
  const sessionId = `pt-confirmed-${environment.runId}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, 'MEMBER', `/gyms/${slug}/sessions/${sessionId}`);
  const opener = page.getByRole('button', { name: 'Cancel session', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Cancel session' });
  await expect(dialog.getByRole('heading', { name: 'Cancel session' })).toBeFocused();
  await expect(dialog).toContainText('No PT credit is used. The reservation is released.');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog.getByRole('button', { name: 'Cancel session', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel session', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel session', exact: true })).toHaveCount(0);
  const tenant = fixture.tenants[0]!;
  const session = await tenant.pTSession.findUniqueOrThrow({ where: { id: sessionId }, include: { creditHold: true, settlement: true } });
  expect(session.state).toBe('CANCELLED'); expect(session.creditHold?.state).toBe('RELEASED'); expect(session.settlement?.creditConsumed).toBe(false);
  expect(await tenant.pTSessionReminder.count({ where: { sessionId, status: 'PENDING' } })).toBe(0);
  const notifications = await tenant.notification.findMany({ where: { resourceId: sessionId, eventCode: 'SESSION_CANCELLED' } });
  expect(notifications).toHaveLength(2);
  expect(new Set(notifications.map(row => row.recipientIdentityId))).toEqual(new Set([fixture.users.memberUser.id, fixture.users.trainerUser.id]));
});
