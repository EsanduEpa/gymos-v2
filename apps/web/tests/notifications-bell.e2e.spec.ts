import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';

test.use({ trace: 'off', screenshot: 'off' });
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const evidenceDirectory = join(root, 'apps/web/test-results/notifications-bell');
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
async function loginAs(page: Page) {
  const user = fixture.users.memberUser;
  const authVersion = (await fixture.master.user.findUniqueOrThrow({ where: { id: user.id }, select: { authVersion: true } })).authVersion;
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: user.id, authVersion, iss: 'gymos-v2', aud: 'gymos-api', iat: issuedAt, exp: issuedAt + 900 })).toString('base64url');
  const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
  await page.context().addCookies([{ name: 'gymos_access_token', value: `${header}.${payload}.${signature}`, url: webBase, httpOnly: true, sameSite: 'Lax' }]);
  await page.goto(`${webBase}/gyms/${fixture.gyms[0]!.slug}/member`);
}

test.beforeAll('start isolated notification browser fixtures', async () => {
  test.setTimeout(120_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(environment);
  const tenant = fixture.tenants[0]!;
  await tenant.notification.createMany({ data: [
    { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `bell-booked-${environment.runId}`, eventCode: 'SESSION_BOOKED',
      title: 'Session confirmed', message: 'Your personal training session was confirmed.', linkKind: 'MEMBER_SESSIONS', resourceId: `session-${environment.runId}` },
    { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `bell-declined-${environment.runId}`, eventCode: 'SESSION_DECLINED',
      title: 'Request declined', message: 'Your personal training session request was declined.', linkKind: 'MEMBER_SESSIONS', resourceId: `request-${environment.runId}` },
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

test('selected-gym bell keeps unread state on failure and marks notifications explicitly on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page);
  const bell = page.getByRole('button', { name: 'Notifications, 2 unread' });
  await expect(bell).toBeVisible();
  await bell.click();
  const popover = page.getByRole('region', { name: 'Notifications' });
  await expect(popover.getByText('Session confirmed')).toBeVisible();
  await expect(popover.getByRole('link', { name: /Session confirmed/ })).toHaveAttribute('href', new RegExp(`/gyms/${fixture.gyms[0]!.slug}/sessions/session-${environment.runId}`));
  await expect(popover.getByRole('button', { name: 'Mark read' })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(evidenceDirectory, 'notifications-bell-390.png'), fullPage: true });

  await popover.getByRole('button', { name: 'Mark read' }).first().click();
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible();
  await stop(api); api = undefined;
  await popover.getByRole('button', { name: 'Refresh' }).click();
  await expect(popover.getByRole('status')).toContainText('last saved notification state');
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible();
  api = await startApi(); await waitReady(`${apiBase}/`, api);
  await popover.getByRole('button', { name: 'Refresh' }).click();
  await expect(popover.getByRole('button', { name: 'Mark all read' })).toBeEnabled();
  await popover.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  await expect(popover.getByText('0 unread')).toBeVisible();
});
