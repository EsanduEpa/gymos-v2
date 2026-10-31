import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';

// Authentication scenarios must never persist bearer/password traffic in traces.
test.use({ trace: 'off', screenshot: 'off' });

const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const classicEvidenceDirectory = join(root, 'docs/migration/evidence/GYMOS-MIG-013/branding');
const primitiveEvidenceDirectory = join(root, 'docs/migration/evidence/GYMOS-MIG-012');

type ProcessState = { child: ChildProcess; errors: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: ProcessState | undefined;
let web: ProcessState | undefined;
let apiBase = '';
let webBase = '';
let testJwtSecret = '';
let apiEnvironment:NodeJS.ProcessEnv={NODE_ENV:'production'};
let scenarioStarted=false;

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

async function waitForSessionLifecycle(page: Page): Promise<void> {
  // Server-rendered shell text can be visible before the client listeners mount.
  // A real focus-triggered/initial BFF response proves the listener is active.
  const ready=page.waitForResponse(response=>response.url()===`${webBase}/api/session`&&response.request().method()==='GET'&&response.ok());
  await page.bringToFront();
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await ready;
}

async function openWithTestSession(page: Page, userId: string, path: string, expiresIn = 900): Promise<void> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    authVersion: (await fixture.master.user.findUniqueOrThrow({ where: { id: userId }, select: { authVersion: true } })).authVersion,
    iss: 'gymos-v2',
    aud: 'gymos-api',
    iat: issuedAt,
    exp: issuedAt + expiresIn,
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
  await page.goto(`${webBase}${path}`);
}

async function openGymWithTestSession(page: Page, userId: string, slug: string, expiresIn = 900): Promise<void> {
  await openWithTestSession(page, userId, `/gyms/${slug}`, expiresIn);
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
  apiEnvironment={
    ...cleanEnvironment,
    PORT: String(apiPort),
    MASTER_DATABASE_URL: environment.masterUrl,
    TENANT_DATABASE_URL: environment.masterUrl,
    PROVISION_DATABASE_URL: environment.masterUrl,
    JWT_SECRET: testJwtSecret,
  };
  api = start(process.execPath, [join(apiDirectory, 'dist/main.js')], apiDirectory, apiEnvironment);
  await waitReady(`${apiBase}/`, api);
  web = start(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory, {
    ...cleanEnvironment,
    GYMOS_API_URL: apiBase,
    GYMOS_WEB_ORIGIN: webBase,
    GYMOS_UI_TEST_HARNESS: '1',
  });
  await waitReady(`${webBase}/login`, web);
});

test.beforeEach(async()=>{
  if(!scenarioStarted){scenarioStarted=true;return;}
  // Isolate in-memory request budgets/pools without changing policy or the
  // persisted shared fixture. Every scenario still runs the real guarded API.
  await stop(api);
  api=start(process.execPath,[join(apiDirectory,'dist/main.js')],apiDirectory,apiEnvironment);
  await waitReady(`${apiBase}/`,api);
});

test('owner gym configuration keeps plan drafts on failure and saves exact zero plans', async ({ page }) => {
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0]!.slug}/owner/gym-config`);
  await expect(page.getByRole('heading', { name: 'Gym Configuration' })).toBeVisible();
  const profileTab = page.getByRole('tab', { name: 'Gym Profile' });
  await profileTab.focus();
  await page.keyboard.press('ArrowRight');
  const plansTab = page.getByRole('tab', { name: 'Membership Plans' });
  await expect(plansTab).toBeFocused();
  await expect(plansTab).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '+ Add New Plan' }).click();
  await page.getByLabel('Plan Name').fill('Browser Zero Plan');
  await page.getByLabel('Description').fill('Preserve this draft after server validation fails.');
  await page.getByLabel('Price (LKR)').fill('1.001');
  await page.getByRole('button', { name: 'Create Plan' }).click();
  await expect(page.locator('.ui-feedback[role="alert"]')).toContainText('Check the highlighted values');
  await expect(page.getByLabel('Plan Name')).toHaveValue('Browser Zero Plan');
  await expect(page.getByLabel('Description')).toHaveValue('Preserve this draft after server validation fails.');
  await expect(page.getByLabel('Price (LKR)')).toHaveValue('1.001');
  await page.getByLabel('Price (LKR)').fill('0');
  await page.getByRole('button', { name: 'Create Plan' }).click();
  await expect(page.locator('.ui-feedback[role="status"]')).toContainText('Membership plan created');
  await expect(page.getByText('LKR 0', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Membership Plans' }).click();
  await expect(page.getByText('Browser Zero Plan')).toBeVisible();
  await expect(page.getByText('LKR 0', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
test.afterEach(async ({page},testInfo)=>{
  if(testInfo.status===testInfo.expectedStatus)return;
  const token=(await page.context().cookies()).find(cookie=>cookie.name==='gymos_access_token')?.value;
  if(!token)return;
  // Status-only diagnostics; never retain headers, bearer values or bodies.
  for(const path of ['/auth/session','/admin/gyms']){
    const response=await fetch(`${apiBase}${path}`,{headers:{authorization:`Bearer ${token}`}}).catch(()=>null);
    console.info('[owned-browser-dependency-status]',{path,status:response?.status??0,remaining:response?.headers.get('x-ratelimit-remaining')??null});
  }
});

test('real browser and HTTP requests preserve two-gym isolation and pure reads', async ({ page, request }) => {
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
  const newPassword = randomBytes(24).toString('base64url');
  const wrongCurrentPassword = await request.post(`${apiBase}/auth/change-password`, {
    headers: { authorization: `Bearer ${restrictedCookie?.value}` },
    data: { currentPassword: 'wrong-current-password', newPassword, confirmPassword: newPassword },
  });
  expect(wrongCurrentPassword.status()).toBe(400);
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/access`, {
    headers: { authorization: `Bearer ${restrictedCookie?.value}` },
  })).status()).toBe(403);
  await page.getByLabel('Temporary password').fill(fixture.password);
  await page.locator('#newPassword').fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.locator('.ui-feedback-success')).toContainText('Password updated');
  const forcedAfter = await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.forcedUser.id } });
  expect(forcedAfter.mustChangePassword).toBe(false);
  expect(forcedAfter.credentialExpiresAt).toBeNull();
  expect(forcedAfter.authVersion).toBe(1);
  expect(forcedAfter.passwordHash !== forcedBefore.passwordHash).toBe(true);
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
  expect(Boolean(ownerCookie?.secure && ownerCookie.sameSite === 'Lax' && ownerCookie.path === '/')).toBe(true);
  const loginExp = JSON.parse(Buffer.from(ownerCookie!.value.split('.')[1], 'base64url').toString()).exp as number;
  console.info('[cookie-lifetime-metadata]', { expiryPastJwtSeconds: ownerCookie!.expires - loginExp, tokenRemainingSeconds: loginExp - Date.now() / 1000 });
  expect(ownerCookie!.expires <= loginExp && ownerCookie!.expires <= Date.now() / 1000 + 900).toBe(true);
  expect((await page.content()).includes(ownerCookie!.value)).toBe(false);

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

test('role shell supports keyboard drawer, safe switching and current context', async ({ page }) => {
  const evidence = join(root, 'docs/migration/evidence/GYMOS-MIG-013');
  await mkdir(evidence, { recursive: true });
  const before = await fixture.master.$transaction([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()]);
  for (const [user, role, label] of [
    [fixture.users.ownerA, 'owner', 'Members'],
    [fixture.users.trainerUser, 'trainer', 'Trainer workspace'],
    [fixture.users.memberUser, 'member', 'Member workspace'],
  ] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openGymWithTestSession(page, user.id, fixture.gyms[0].slug);
    await expect(page).toHaveURL(new RegExp(`/${role}$`));
    await expect(page.locator('.shell-profile')).toContainText(user.displayName!);
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.locator('.shell-sidebar').evaluate(el => el.getBoundingClientRect().width)).toBe(224);
    expect(await page.locator('.shell-header').evaluate(el => el.getBoundingClientRect().height)).toBe(52);
    await expect(page.getByRole('link', { name: /Subscription|Financials|Notifications|Support/ })).toHaveCount(0);
    if (role !== 'owner') await expect(page.getByRole('button', { name: 'Add member' })).toHaveCount(0);
    await page.screenshot({ path: join(evidence, `${role}-1440.png`), animations: 'disabled' });
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    await menu.focus(); await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Shift+Tab');
    await expect(drawer.getByRole('button', { name: 'Sign out' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
    await page.screenshot({ path: join(evidence, `${role}-320-drawer.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden(); await expect(menu).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await menu.click(); await page.mouse.click(300, 300); await expect(drawer).toBeHidden();
    await menu.click(); await drawer.getByRole('link', { name: label, exact: true }).click();
    await expect(drawer).toBeHidden();
    await page.screenshot({ path: join(evidence, `${role}-320.png`), animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openGymWithTestSession(page, fixture.users.multiOwner.id, fixture.gyms[0].slug);
  await page.getByRole('link', { name: 'Switch gym' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a gym' })).toBeVisible();
  await page.getByRole('link', { name: /Test Gym Beta/ }).click();
  await expect(page.getByRole('heading', { name: 'Test Gym Beta', exact: true })).toBeVisible();
  await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#7C3AED');
  await expect(page.locator('main')).not.toContainText('Test Gym Alpha');
  await page.getByRole('link', { name: 'Switch gym' }).click();
  const access = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.multiOwner.id, gymId: fixture.gyms[0].id } } });
  try {
    await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: access.userId, gymId: access.gymId } }, data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
    await page.getByRole('link', { name: /Test Gym Alpha/ }).click();
    await expect(page.getByRole('heading', { name: 'This page could not be found' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
    await page.getByRole('link', { name: 'Return to Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Test Gym Beta', exact: true })).toBeVisible();
  } finally {
    await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: access.userId, gymId: access.gymId } }, data: { linkStatus: 'ACTIVE', version: { increment: 1 } } });
  }
  expect(await fixture.master.$transaction([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()])).toEqual(before);
});

test('web sessions enforce cookie, origin, expiry, revocation and logout boundaries', async ({ page, request }) => {
  const evidence = join(root, 'docs/migration/evidence/GYMOS-MIG-020');
  await mkdir(evidence, { recursive: true });
  await openGymWithTestSession(page, fixture.users.ownerB.id, fixture.gyms[1].slug);
  await expect(page.getByRole('heading', { name: 'Test Gym Beta', exact: true })).toBeVisible();
  const cookie = (await page.context().cookies()).find(item => item.name === 'gymos_access_token');
  const token = cookie!.value;
  expect((await page.content()).includes(token)).toBe(false);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie.includes('gymos_access_token') }))).toEqual({ local: 0, session: 0, cookie: false });
  const privateResponse = await page.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  expect(privateResponse?.headers()['cache-control']).toContain('no-store');
  const sessionResponse = await page.request.get(`${webBase}/api/session`);
  expect(sessionResponse.headers()['cache-control']).toContain('no-store');
  expect((await sessionResponse.text()).includes(token)).toBe(false);
  const before = (await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion;
  const rejectedOrigins: Record<string, string>[] = [{ origin: 'https://foreign.example' }, {}, { origin: 'null' }, { origin: webBase, 'sec-fetch-site': 'cross-site' }, { origin: webBase.replace('http:', 'https:') }];
  for (const headers of rejectedOrigins) {
    expect((await page.request.post(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`, { headers, form: { ignored: 'true' } })).status()).toBe(403);
  }
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion).toBe(before);
  const otherTab = await page.context().newPage();
  await otherTab.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(otherTab.locator('.shell-profile')).toContainText('Owner Beta');
  await waitForSessionLifecycle(otherTab);
  await waitForSessionLifecycle(page);
  // A focus-triggered 401 during logout must not abort delivery of the
  // Server Action's cookie deletion response.
  let logoutStarted = false;
  await page.route('**/api/session', route => logoutStarted ? route.fulfill({ status: 401 }) : route.continue());
  await page.route(`**/gyms/${fixture.gyms[1].slug}/owner`, async route => {
    if (route.request().method() === 'POST') {
      logoutStarted = true;
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.unrouteAll({ behavior: 'wait' });
  await expect(otherTab).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).some(item => item.name === 'gymos_access_token')).toBe(false);
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion).toBe(before + 1);
  expect((await request.get(`${apiBase}/auth/session`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(401);
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/members`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(401);
  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('.member-list')).toHaveCount(0);
  await otherTab.close();
  await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug, -1);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug, 3);
  await expect(page.getByRole('heading', { name: 'Test Gym Alpha', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login\?error=expired$/, { timeout: 10_000 });
  // A new identity in the shared cookie must never retain the old shell.
  await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug);
  await expect(page.locator('.shell-profile')).toContainText('Owner Alpha');
  await fixture.master.user.update({ where: { id: fixture.users.ownerA.id }, data: { authVersion: { increment: 1 } } });
  await page.reload();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await openGymWithTestSession(page, fixture.users.ownerB.id, fixture.gyms[1].slug);
  await expect(page.locator('.shell-profile')).toContainText('Owner Beta');
  await expect(page.locator('main')).not.toContainText('Alpha Person');
  await page.screenshot({ path: join(evidence, 'fresh-identity.png'), animations: 'disabled' });
});

test('platform form reserves one pending gym with safe status and a stable retry key', async ({ page, request }) => {
  await openWithTestSession(page, fixture.users.admin.id, '/admin');
  const before = await fixture.master.gym.count();
  const key = await page.locator('input[name="requestKey"]').inputValue();
  const input = { name: 'Browser reserved gym', slug: `browser-reserved-${environment.runId}`, ownerEmail: `browser-owner-${environment.runId}@example.test`, currency: 'LKR', timezone: 'Asia/Colombo' };
  await page.getByLabel('Gym name', { exact: true }).fill(input.name);
  await page.getByRole('textbox', { name: /^Gym slug/ }).fill(input.slug);
  await page.getByRole('textbox', { name: /^Owner email/ }).fill(input.ownerEmail);
  await page.getByLabel('Currency', { exact: true }).fill(input.currency);
  await page.getByRole('textbox', { name: /^Timezone/ }).fill(input.timezone);
  await page.getByRole('button', { name: 'Create gym', exact: true }).click();
  const status = page.getByRole('region', { name: 'Provisioning status' });
  await expect(status).toContainText('PENDING');
  await expect(status).toContainText('remains unavailable');
  const cookie = (await page.context().cookies()).find(item => item.name === 'gymos_access_token')!;
  const replay = await request.post(`${apiBase}/admin/gyms`, { headers: { authorization: `Bearer ${cookie.value}`, 'idempotency-key': key }, data: input });
  expect(replay.status()).toBe(202);
  const result = await replay.json();
  await expect(status).toContainText(result.operationId);
  expect(await fixture.master.gym.count()).toBe(before + 1);
  expect(await fixture.master.user.count({ where: { email: input.ownerEmail } })).toBe(0);
  const stored = await fixture.master.operation.findUniqueOrThrow({ where: { id: result.operationId } });
  expect((await page.content()).includes(stored.databaseName!)).toBe(false);
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await expect(status).toContainText(result.operationId);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mkdir(join(root, 'docs/migration/evidence/GYMOS-MIG-021'), { recursive: true });
  await page.screenshot({ path: join(root, 'docs/migration/evidence/GYMOS-MIG-021/pending-320.png'), fullPage: true, animations: 'disabled' });
  await promisify(execFile)(process.execPath,[join(apiDirectory,'scripts/provision-gym.mjs'),'resume',stored.id],{
    env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',GYMOS_OWNED_RUN_ID:environment.runId,MASTER_DATABASE_URL:environment.masterUrl,PROVISION_DATABASE_URL:environment.masterUrl,TENANT_DATABASE_URL:environment.masterUrl},timeout:30_000,
  });
  await environment.registerProvisionedDatabase(await fixture.master.operation.findUniqueOrThrow({where:{id:stored.id}}));
  await page.goto(`${webBase}/admin`);
  const row=page.getByRole('table',{name:'Registered gym tenants'}).getByRole('row').filter({has:page.getByText(input.name,{exact:true})});
  await row.getByRole('button',{name:'Owner credential handoff'}).click();
  await expect(row.getByRole('button',{name:'I delivered this credential'})).toBeVisible();
  expect(await fixture.master.credentialDelivery.count({where:{operationId:stored.id}})).toBe(1);
  // A second handoff request cannot retrieve the secret. Explicitly reissue it.
  await row.getByRole('button',{name:'Owner credential handoff'}).click();
  await row.getByRole('button',{name:'Reissue lost handoff',exact:true}).click();
  const confirmation=page.getByRole('dialog',{name:'Reissue lost handoff?'});await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(row.getByRole('button',{name:'I delivered this credential'})).toBeVisible();
  expect((await fixture.master.credentialDelivery.findUniqueOrThrow({where:{operationId:stored.id}})).version).toBe(1);
  await row.getByRole('button',{name:'I delivered this credential'}).click();
  await expect(row).toContainText('Handoff acknowledged.');
  expect(await row.locator('.credential-handoff output').count()).toBe(0);
  expect((await fixture.master.credentialDelivery.findUniqueOrThrow({where:{operationId:stored.id}})).acknowledgedAt!==null).toBe(true);

});

test('platform registry supports audited read-only gym selection, switching, exit and narrow keyboard navigation', async ({ page }) => {
  // Earlier full-suite journeys intentionally create a member. Compare the
  // snapshot with current persisted actors, while retaining the seed invariant.
  const expectedAlphaMembers=await fixture.tenants[0].member.count();
  expect(expectedAlphaMembers).toBeGreaterThanOrEqual(fixture.expected.alphaMembers);
  const execute=promisify(execFile);
  for(const gym of fixture.gyms) await execute(process.execPath,[join(apiDirectory,'scripts/provision-gym.mjs'),'refresh-summary',gym.id,fixture.users.admin.id],{
    env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',GYMOS_OWNED_RUN_ID:environment.runId,MASTER_DATABASE_URL:environment.masterUrl,PROVISION_DATABASE_URL:environment.masterUrl,TENANT_DATABASE_URL:environment.masterUrl},timeout:20_000,
  });
  await openWithTestSession(page,fixture.users.admin.id,'/admin');
  const table=page.getByRole('table',{name:'Registered gym tenants'});
  const alpha=table.getByRole('row').filter({has:page.getByText('Test Gym Alpha',{exact:true})});
  await expect.poll(()=>alpha.getByRole('cell').nth(2).evaluate(element=>element.firstChild?.textContent?.trim())).toBe(String(expectedAlphaMembers));
  await expect(table).toBeVisible();
  const evidence=join(root,'docs/migration/evidence/GYMOS-MIG-024');await mkdir(evidence,{recursive:true});
  await page.screenshot({path:join(evidence,'registry-desktop.png'),fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:join(evidence,'registry-320.png'),fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:1280,height:720});
  await alpha.getByRole('button',{name:'View dashboard'}).focus();
  await page.keyboard.press('Enter');
  const reason=page.getByRole('textbox',{name:/^Support reason/});await reason.fill('Synthetic owner-summary diagnosis');
  await page.getByRole('button',{name:'Enter support',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  await expect(page.locator('.support-banner')).toContainText('Viewing Test Gym Alpha');
  await expect(page.locator('.support-banner')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Test Gym Alpha',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add member'})).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Alpha Person');
  const supportCookie=(await page.context().cookies()).find(cookie=>cookie.name==='gymos_support_context')!;
  expect(supportCookie.httpOnly&&supportCookie.secure&&supportCookie.sameSite==='Lax').toBe(true);
  await page.screenshot({path:join(evidence,'support-alpha-desktop.png'),fullPage:true,animations:'disabled'});
  const oldTab=await page.context().newPage();await oldTab.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner`);
  await expect(oldTab.locator('.support-banner')).toContainText('Viewing Test Gym Alpha');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'All Gyms'}).click();
  const beta=page.getByRole('table',{name:'Registered gym tenants'}).getByRole('row').filter({has:page.getByText('Test Gym Beta',{exact:true})});
  await beta.getByRole('button',{name:'View dashboard'}).click();
  await page.getByRole('textbox',{name:/^Support reason/}).fill('Synthetic second-gym diagnosis');
  await page.getByRole('button',{name:'Enter support',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[1].slug}/owner$`));
  await expect(page.locator('.support-banner')).toContainText('Viewing Test Gym Beta');
  await expect(page.locator('.support-banner')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Test Gym Beta',exact:true})).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Test Gym Alpha');
  await expect(oldTab).toHaveURL(/\/admin$/);
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await expect(page.getByRole('dialog',{name:'Navigation menu'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open navigation menu'})).toBeFocused();
  await page.screenshot({path:join(evidence,'support-beta-320.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Exit support',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);
  expect((await page.context().cookies()).some(cookie=>cookie.name==='gymos_support_context')).toBe(false);
  // The exit action may still finish its /admin RSC navigation after the
  // cookie is cleared. Start protected navigation in a fresh document so a
  // client redirect from the exiting document cannot abort this assertion.
  const deniedTab=await page.context().newPage();
  await deniedTab.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(deniedTab).toHaveURL(/\/admin$/);
  await expect(deniedTab.locator('.support-banner')).toHaveCount(0);
  await deniedTab.close();
  await oldTab.close();
});

test('platform lifecycle confirms suspension and verified reactivation while old owner navigation stays protected', async ({page,browser})=>{
 const ownerContext=await browser.newContext();const ownerPage=await ownerContext.newPage();
 try{
  await openGymWithTestSession(ownerPage,fixture.users.ownerA.id,fixture.gyms[0].slug);
  await expect(ownerPage.getByRole('heading',{name:'Test Gym Alpha',exact:true})).toBeVisible();
  await waitForSessionLifecycle(ownerPage);
  await openWithTestSession(page,fixture.users.admin.id,'/admin');
  const row=()=>page.getByRole('table',{name:'Registered gym tenants'}).getByRole('row').filter({has:page.getByText('Test Gym Alpha',{exact:true})});
  await row().getByRole('button',{name:'Suspend gym',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Suspend this gym?'});await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await expect(dialog).toContainText('Give a reason');
  expect((await fixture.master.gym.findUniqueOrThrow({where:{id:fixture.gyms[0].id}})).status).toBe('ACTIVE');
  await dialog.getByRole('textbox',{name:/^Lifecycle reason/}).fill('Synthetic owner-requested suspension');
  const evidence=join(root,'docs/migration/evidence/GYMOS-MIG-025');await mkdir(evidence,{recursive:true});
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:join(evidence,'suspend-confirmation-320.png'),fullPage:true,animations:'disabled'});
  await dialog.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(row().getByRole('button',{name:'Reactivate gym',exact:true})).toBeVisible();
  await expect(row()).toContainText('SUSPENDED');
  // Live session eviction can win before a reload. Verify that behavior and
  // the fresh-document denial independently, rather than racing the two.
  await waitForSessionLifecycle(ownerPage);
  await expect(ownerPage).toHaveURL(/\/no-access$/);
  await expect(ownerPage.getByRole('heading',{name:'No active gym access'})).toBeVisible();
  await expect(ownerPage.locator('.member-list')).toHaveCount(0);
  const deniedPage=await ownerContext.newPage();
  await deniedPage.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner`);
  await expect(deniedPage.getByRole('heading',{name:'This page could not be found'})).toBeVisible();
  await expect(deniedPage.locator('.member-list')).toHaveCount(0);await deniedPage.close();
  expect((await fixture.master.gym.findUniqueOrThrow({where:{id:fixture.gyms[1].id}})).status).toBe('ACTIVE');
  await row().getByRole('button',{name:'Reactivate gym',exact:true}).click();
  const reactivate=page.getByRole('dialog',{name:'Reactivate this gym?'});await expect(reactivate).toBeVisible();
  await reactivate.getByRole('textbox',{name:/^Lifecycle reason/}).fill('Synthetic verified reactivation check');
  await reactivate.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(row().getByRole('button',{name:'Suspend gym',exact:true})).toBeVisible();
  await ownerPage.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner`);
  await expect(ownerPage.getByRole('heading',{name:'Test Gym Alpha',exact:true})).toBeVisible();
  await page.setViewportSize({width:1280,height:720});await expect(row()).toBeVisible();
  await page.screenshot({path:join(evidence,'reactivated-registry.png'),fullPage:true,animations:'disabled'});
 }finally{await ownerContext.close();}
});

test('request budgets stay enabled in each owned API scenario',async({page,request})=>{
  await openWithTestSession(page,fixture.users.admin.id,'/admin');
  const token=(await page.context().cookies()).find(cookie=>cookie.name==='gymos_access_token')!.value;
  let denied=false;
  for(let attempt=0;attempt<110;attempt++){
    const response=await request.get(`${apiBase}/auth/session`,{headers:{authorization:`Bearer ${token}`}});
    if(attempt===0)expect(response.status()).toBe(200);
    if(response.status()===429){denied=true;break;}
    expect(response.status()).toBe(200);
  }
  expect(denied).toBe(true);
});

test('logout clears the browser even when API revocation is unavailable', async ({ page }) => {
  await openGymWithTestSession(page, fixture.users.ownerB.id, fixture.gyms[1].slug);
  await expect(page.getByRole('heading', { name: 'Test Gym Beta', exact: true })).toBeVisible();
  const before = (await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion;
  await stop(api);
  const failedPage = await page.context().newPage();
  await failedPage.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(failedPage.getByRole('heading', { name: 'Could not load this workspace' })).toBeVisible();
  await expect(failedPage.getByRole('button', { name: 'Try again' })).toBeVisible();
  await failedPage.close();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?error=logout-uncertain$/);
  await expect(page.locator('.ui-feedback[role="alert"]')).toContainText('could not confirm sign-out on other devices');
  expect((await page.context().cookies()).some(item => item.name === 'gymos_access_token')).toBe(false);
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion).toBe(before);
  await page.screenshot({ path: join(root, 'docs/migration/evidence/GYMOS-MIG-020/backend-unavailable.png'), animations: 'disabled' });
  await page.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(page).toHaveURL(/\/login$/);
});
