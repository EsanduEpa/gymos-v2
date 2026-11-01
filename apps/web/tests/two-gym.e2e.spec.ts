import { spawn, type ChildProcess } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const classicEvidenceDirectory = join(root, 'docs/migration/evidence/GYMOS-MIG-011');
const primitiveEvidenceDirectory = join(root, 'docs/migration/evidence/GYMOS-MIG-012');

type ProcessState = { child: ChildProcess; errors: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: ProcessState | undefined;
let web: ProcessState | undefined;
let apiBase = '';
let webBase = '';
let testJwtSecret = '';

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

async function loginWithPassword(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${webBase}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function login(page: Page, email: string): Promise<void> {
  await loginWithPassword(page, email, fixture.password);
}

async function openGymWithTestSession(page: Page, userId: string, slug: string): Promise<void> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    authVersion: (await fixture.master.user.findUniqueOrThrow({ where: { id: userId }, select: { authVersion: true } })).authVersion,
    iss: 'gymos-v2',
    aud: 'gymos-api',
    iat: issuedAt,
    exp: issuedAt + 900,
  })).toString('base64url');
  const signature = createHmac('sha256', testJwtSecret).update(`${header}.${payload}`).digest('base64url');
  const token = `${header}.${payload}.${signature}`;
  await page.context().clearCookies();
  await page.context().addCookies([{
    name: 'gymos_access_token',
    value: token,
    url: webBase,
    httpOnly: true,
    sameSite: 'Lax',
  }]);
  await page.goto(`${webBase}/gyms/${slug}`);
}

async function contrastRatio(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((element) => {
    const parse = (value: string) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
    const luminance = (value: string) => {
      const linear = parse(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
    };
    const style = getComputedStyle(element);
    const values = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
    return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
  });
}

async function renderedGeometry(page: Page) {
  return page.locator('.gym-banner').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
}

async function expectResponsivePage(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await contrastRatio(page, '.gym-banner')).toBeGreaterThanOrEqual(4.5);
  expect(await contrastRatio(page, '.ui-badge-success')).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Add member' }).focus();
  await expect(page.getByRole('button', { name: 'Add member' })).toBeFocused();
  expect(await page.getByRole('button', { name: 'Add member' }).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.beforeAll(async () => {
  test.setTimeout(120_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(environment);
  const [apiPort, webPort] = await Promise.all([freePort(), freePort()]);
  apiBase = `http://127.0.0.1:${apiPort}`;
  webBase = `http://127.0.0.1:${webPort}`;
  testJwtSecret = randomBytes(32).toString('hex');
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
    JWT_SECRET: testJwtSecret,
  });
  await waitReady(`${apiBase}/`, api);
  web = start(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory, {
    ...cleanEnvironment,
    GYMOS_API_URL: apiBase,
    GYMOS_UI_TEST_HARNESS: '1',
  });
  await waitReady(`${webBase}/login`, web);
});

test('shared controls support keyboard use, failure recovery, and narrow screens', async ({ page }) => {
  await mkdir(primitiveEvidenceDirectory, { recursive: true });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${webBase}/test-ui`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const membersTab = page.getByRole('tab', { name: 'Members' });
  await membersTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Activity' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(membersTab).toBeFocused();

  await expect(page.getByText('Alex Morgan')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Jordan Silva')).toBeVisible();
  await expect(page.getByText('Showing 3–3 of 3')).toBeVisible();

  const opener = page.getByRole('button', { name: 'Open confirmation' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => {
    const dialog = document.querySelector('dialog');
    return dialog === document.activeElement || dialog?.contains(document.activeElement);
  })).toBe(true);
  await page.getByLabel('Member name').fill('Unsaved draft');
  await page.getByRole('button', { name: 'Save change' }).click();
  await expect(page.getByRole('button', { name: 'Processing…' })).toBeDisabled();
  await page.getByRole('button', { name: 'Processing…' }).click({ force: true });
  await expect(page.getByText('Confirm attempts: 1')).toBeVisible();
  await expect(page.locator('.ui-dialog .ui-feedback[role="alert"]')).toContainText('could not be saved');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Member name')).toHaveValue('Unsaved draft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();

  await page.screenshot({ path: join(primitiveEvidenceDirectory, 'mobile-320-shared-controls.png'), animations: 'disabled', fullPage: true });
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
  // The unauthenticated home route streams its server-component redirect to /login.
  // Wait for that client-side navigation to settle before starting the next login navigation.
  await expect(page).toHaveURL(/\/login$/);
  expect(await fixture.master.$transaction([
    fixture.master.user.count(), fixture.master.gym.count(), fixture.master.gymAccess.count(),
    fixture.master.operation.count(), fixture.master.platformAuditLog.count(),
  ])).toEqual(masterBefore);
  expect(await fixture.tenants[0].$transaction([fixture.tenants[0].member.count(), fixture.tenants[0].trainer.count(), fixture.tenants[0].auditLog.count()])).toEqual(alphaBefore);
  expect(await fixture.tenants[1].$transaction([fixture.tenants[1].member.count(), fixture.tenants[1].trainer.count(), fixture.tenants[1].auditLog.count()])).toEqual(betaBefore);

  const forcedBefore = await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.forcedUser.id }, select: { passwordHash: true } });
  await login(page, fixture.users.forcedUser.email);
  await expect(page).toHaveURL(/\/change-password$/);
  const restrictedCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'gymos_access_token');
  expect(restrictedCookie?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('gymos_access_token');
  const wrongCurrentPassword = await request.post(`${apiBase}/auth/change-password`, {
    headers: { authorization: `Bearer ${restrictedCookie?.value}` },
    data: { currentPassword: 'wrong-current-password', newPassword: 'GymOS-New-Password-42', confirmPassword: 'GymOS-New-Password-42' },
  });
  expect(wrongCurrentPassword.status()).toBe(400);
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/access`, {
    headers: { authorization: `Bearer ${restrictedCookie?.value}` },
  })).status()).toBe(403);
  const newPassword = 'GymOS-New-Password-42';
  await page.getByLabel('Temporary password').fill(fixture.password);
  await page.locator('#newPassword').fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.locator('.ui-feedback-success')).toContainText('Password updated');
  const forcedAfter = await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.forcedUser.id } });
  expect(forcedAfter.mustChangePassword).toBe(false);
  expect(forcedAfter.credentialExpiresAt).toBeNull();
  expect(forcedAfter.authVersion).toBe(1);
  expect(forcedAfter.passwordHash).not.toBe(forcedBefore.passwordHash);
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/access`, {
    headers: { authorization: `Bearer ${restrictedCookie?.value}` },
  })).status()).toBe(401);
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'gymos_access_token')).toBe(true);
  await page.getByRole('button', { name: 'Continue to sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'gymos_access_token')).toBe(false);
  await loginWithPassword(page, fixture.users.forcedUser.email, newPassword);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  await page.context().clearCookies();

  await login(page, fixture.users.ownerA.email);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  await expect(page.getByRole('heading', { name: 'Test Gym Alpha' })).toBeVisible();
  await expect(page.locator('.count-badge')).toHaveText('100');
  await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#0F766E');
  await page.getByLabel('Full name').fill('Browser Added Member');
  await page.getByRole('textbox', { name: 'Email address optional' }).fill(`browser-${environment.runId}@example.test`);
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByRole('status')).toContainText('Member added');
  await expect(page.getByText('Browser Added Member')).toBeVisible();

  const ownerCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'gymos_access_token');
  expect(ownerCookie?.httpOnly).toBe(true);
  const ownerToken = ownerCookie?.value;
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/members`, { headers: { authorization: `Bearer ${ownerToken}` } })).status()).toBe(403);
  await page.goto(`${webBase}/gyms/${fixture.gyms[1].slug}`);
  await expect(page.getByText('This page could not be found')).toBeVisible();

  const trainerLogin = await request.post(`${apiBase}/auth/login`, { data: { email: fixture.users.trainerUser.email, password: fixture.password } });
  expect(trainerLogin.ok()).toBeTruthy();
  const trainerResult = await trainerLogin.json();
  expect(trainerResult.gyms).toContainEqual(expect.objectContaining({ role: 'TRAINER' }));
  const trainerToken = trainerResult.accessToken as string;
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
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.forcedUser.id } })).mustChangePassword).toBe(false);
  expect(await fixture.master.gymAccess.count({ where: { userId: fixture.users.inactiveUser.id, linkStatus: 'REVOKED' } })).toBe(1);
  const mismatchedAccess = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.mismatchUser.id, gymId: fixture.gyms[0].id } } });
  const mismatchedActor = await fixture.tenants[0].member.findUniqueOrThrow({ where: { id: mismatchedAccess.tenantActorId! } });
  expect(mismatchedActor.identityId).not.toBe(fixture.users.mismatchUser.id);
  expect((await fixture.tenants[0].gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).masterGymId).toBe(fixture.gyms[0].id);
  expect((await fixture.tenants[1].gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).masterGymId).toBe(fixture.gyms[1].id);
});

test('V1 Classic branding stays readable and keeps identical geometry at approved widths', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(classicEvidenceDirectory, { recursive: true });
  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 1000 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'stress-320', width: 320, height: 700 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug);
    await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#0F766E');
    await expectResponsivePage(page);
    const alphaGeometry = await renderedGeometry(page);
    await page.screenshot({ path: join(classicEvidenceDirectory, `${viewport.name}-alpha.png`), animations: 'disabled' });

    await openGymWithTestSession(page, fixture.users.ownerB.id, fixture.gyms[1].slug);
    await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#7C3AED');
    await expectResponsivePage(page);
    const betaGeometry = await renderedGeometry(page);
    await page.screenshot({ path: join(classicEvidenceDirectory, `${viewport.name}-beta.png`), animations: 'disabled' });

    expect(betaGeometry).toEqual(alphaGeometry);
  }

  const alphaTheme = await fixture.master.theme.findUniqueOrThrow({ where: { gymId: fixture.gyms[0].id } });
  try {
    await fixture.master.theme.delete({ where: { gymId: fixture.gyms[0].id } });
    await page.setViewportSize({ width: 390, height: 844 });
    await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug);
    await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#007A35');
    await expectResponsivePage(page);

    await fixture.master.theme.create({ data: { gymId: fixture.gyms[0].id, primaryColor: 'not-a-color' } });
    await page.reload();
    await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#007A35');
    await expectResponsivePage(page);
    await page.screenshot({ path: join(classicEvidenceDirectory, 'mobile-390-safe-fallback.png'), animations: 'disabled' });
  } finally {
    await fixture.master.theme.upsert({
      where: { gymId: fixture.gyms[0].id },
      create: { gymId: fixture.gyms[0].id, primaryColor: alphaTheme.primaryColor, logoUrl: alphaTheme.logoUrl },
      update: { primaryColor: alphaTheme.primaryColor, logoUrl: alphaTheme.logoUrl },
    });
  }
});
