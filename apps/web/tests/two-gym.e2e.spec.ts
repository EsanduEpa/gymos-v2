import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');

type ProcessState = { child: ChildProcess; errors: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: ProcessState | undefined;
let web: ProcessState | undefined;
let apiBase = '';
let webBase = '';

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to reserve local port');
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

function start(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ProcessState {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr?.on('data', (chunk) => { errors = `${errors}${String(chunk)}`.slice(-5000); });
  child.on('error', (error) => { errors = `${errors}${error.message}`.slice(-5000); });
  return { child, errors: () => errors.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED_DATABASE_URL]') };
}

async function waitReady(url: string, processState: ProcessState): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (processState.child.exitCode !== null) throw new Error(`Server exited before ready: ${processState.errors()}`);
    try { if ((await fetch(url)).ok) return; } catch { /* still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not become ready: ${processState.errors()}`);
}

async function stop(processState: ProcessState | undefined): Promise<void> {
  if (!processState || processState.child.exitCode !== null) return;
  processState.child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolve) => processState.child.once('exit', () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ]);
  if (processState.child.exitCode === null) processState.child.kill('SIGKILL');
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${webBase}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(fixture.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.beforeAll(async () => {
  test.setTimeout(120_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(environment);
  const [apiPort, webPort] = await Promise.all([freePort(), freePort()]);
  apiBase = `http://127.0.0.1:${apiPort}`;
  webBase = `http://127.0.0.1:${webPort}`;
  const jwtSecret = randomBytes(32).toString('hex');
  const cleanEnvironment: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: 'production',
    TZ: 'UTC',
  };
  api = start(process.execPath, [join(apiDirectory, 'dist/main.js')], apiDirectory, {
    ...cleanEnvironment,
    PORT: String(apiPort),
    MASTER_DATABASE_URL: environment.masterUrl,
    TENANT_DATABASE_URL: environment.masterUrl,
    PROVISION_DATABASE_URL: environment.masterUrl,
    JWT_SECRET: jwtSecret,
  });
  await waitReady(`${apiBase}/`, api);
  web = start(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory, {
    ...cleanEnvironment,
    GYMOS_API_URL: apiBase,
  });
  await waitReady(`${webBase}/login`, web);
});

test.afterAll(async () => {
  await stop(web);
  await stop(api);
  await fixture?.close();
  if (environment) console.info('[task007-owned-run-cleanup]', JSON.stringify(await environment.cleanup()));
});

test('real browser and HTTP requests preserve two-gym isolation and pure reads', async ({ page, request }) => {
  await page.clock.install({ time: new Date(fixture.fixedNow) });
  const [masterBefore, alphaBefore, betaBefore] = await Promise.all([
    fixture.master.$transaction([
      fixture.master.user.count(), fixture.master.gym.count(), fixture.master.gymAccess.count(),
      fixture.master.operation.count(), fixture.master.platformAuditLog.count(),
    ]),
    fixture.tenants[0].$transaction([fixture.tenants[0].member.count(), fixture.tenants[0].trainer.count(), fixture.tenants[0].auditLog.count()]),
    fixture.tenants[1].$transaction([fixture.tenants[1].member.count(), fixture.tenants[1].trainer.count(), fixture.tenants[1].auditLog.count()]),
  ]);
  await page.goto(`${webBase}/login`);
  expect(await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/theme`)).toBeOK();
  await page.goto(`${webBase}/`);
  expect(await fixture.master.$transaction([
    fixture.master.user.count(), fixture.master.gym.count(), fixture.master.gymAccess.count(),
    fixture.master.operation.count(), fixture.master.platformAuditLog.count(),
  ])).toEqual(masterBefore);
  expect(await fixture.tenants[0].$transaction([fixture.tenants[0].member.count(), fixture.tenants[0].trainer.count(), fixture.tenants[0].auditLog.count()])).toEqual(alphaBefore);
  expect(await fixture.tenants[1].$transaction([fixture.tenants[1].member.count(), fixture.tenants[1].trainer.count(), fixture.tenants[1].auditLog.count()])).toEqual(betaBefore);

  await login(page, fixture.users.ownerA.email);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}$`));
  await expect(page.getByRole('heading', { name: 'Test Gym Alpha' })).toBeVisible();
  await expect(page.locator('.count-badge')).toHaveText('100');
  await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#0F766E');
  await page.getByLabel('Full name').fill('Browser Added Member');
  await page.getByRole('textbox', { name: 'Email address optional' }).fill(`browser-${environment.runId}@example.test`);
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByRole('status')).toContainText('Member added');
  await expect(page.getByText('Browser Added Member')).toBeVisible();

  const ownerLogin = await request.post(`${apiBase}/auth/login`, { data: { email: fixture.users.ownerA.email, password: fixture.password } });
  expect(ownerLogin.ok()).toBeTruthy();
  const ownerToken = (await ownerLogin.json()).accessToken as string;
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/members`, { headers: { authorization: `Bearer ${ownerToken}` } })).status()).toBe(403);
  await page.goto(`${webBase}/gyms/${fixture.gyms[1].slug}`);
  await expect(page.getByText('This page could not be found')).toBeVisible();

  await page.context().clearCookies();
  await login(page, fixture.users.trainerUser.email);
  await expect(page).toHaveURL(/\/login\?error=access$/);
  await expect(page.locator('p[role="alert"]')).toContainText('does not have access');
  const trainerLogin = await request.post(`${apiBase}/auth/login`, { data: { email: fixture.users.trainerUser.email, password: fixture.password } });
  const trainerToken = (await trainerLogin.json()).accessToken as string;
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/members`, { headers: { authorization: `Bearer ${trainerToken}` } })).status()).toBe(403);

  await page.context().clearCookies();
  await login(page, fixture.users.admin.email);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Test Gym Alpha')).toBeVisible();
  await expect(page.getByText('Test Gym Beta')).toBeVisible();

  expect(await fixture.tenants[0].member.count()).toBe(fixture.expected.alphaMembers + 1);
  expect(await fixture.tenants[1].member.count()).toBe(fixture.expected.betaMembers);
  expect(await fixture.master.gymAccess.count({ where: { userId: fixture.users.multiOwner.id, linkStatus: 'ACTIVE' } })).toBe(2);
  expect(await fixture.master.gymAccess.count({ where: { userId: fixture.users.pendingUser.id, linkStatus: 'PENDING' } })).toBe(1);
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.forcedUser.id } })).mustChangePassword).toBe(true);
  expect(await fixture.master.gymAccess.count({ where: { userId: fixture.users.inactiveUser.id, linkStatus: 'REVOKED' } })).toBe(1);
  const mismatchedAccess = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.mismatchUser.id, gymId: fixture.gyms[0].id } } });
  const mismatchedActor = await fixture.tenants[0].member.findUniqueOrThrow({ where: { id: mismatchedAccess.tenantActorId! } });
  expect(mismatchedActor.identityId).not.toBe(fixture.users.mismatchUser.id);
  expect((await fixture.tenants[0].gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).masterGymId).toBe(fixture.gyms[0].id);
  expect((await fixture.tenants[1].gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).masterGymId).toBe(fixture.gyms[1].id);
});
