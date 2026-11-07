import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';
import { requestDigest } from '../../api/src/operations/primitives.js';
import { installBrowserSession } from './support/browser-session.js';

// Authentication scenarios must never persist bearer/password traffic in traces.
test.use({ trace: 'off', screenshot: 'off' });

const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api');
const webDirectory = join(root, 'apps/web');
const classicEvidenceDirectory = join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-013/branding');
const primitiveEvidenceDirectory = join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-012');

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

async function openWithTestSession(page: Page, userId: string, path: string, expiresIn = 900): Promise<string> {
  const slug = path.match(/^\/gyms\/([^/?#]+)/)?.[1];
  const gymId = fixture.gyms.find(gym => gym.slug === slug)?.id;
  const installed = await installBrowserSession({ page, master: fixture.master, identityId: userId, jwtSecret: testJwtSecret, origin: webBase,
    ...(gymId ? { gymId } : {}), accessLifetimeSeconds: expiresIn, ...(expiresIn < 0 ? { expired: true } : {}) });
  await page.goto(`${webBase}${path}`);
  return installed.accessToken;
}

function localDate(instant: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const parts = Object.fromEntries(values.map(value => [value.type, value.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function openGymWithTestSession(page: Page, userId: string, slug: string, expiresIn = 900): Promise<string> {
  const gym = fixture.gyms.find(row => row.slug === slug);
  const link = gym ? await fixture.master.gymAccess.findUnique({ where: { userId_gymId: { userId, gymId: gym.id } }, select: { role: true } }) : null;
  return openWithTestSession(page, userId, `/gyms/${slug}${link ? `/${link.role.toLowerCase()}` : ''}`, expiresIn);
}

async function fillMemberEnrollment(page: Page, input: { name: string; email: string; planId: string; key?: string }): Promise<string> {
  if (input.key) await page.getByLabel('Enrollment reference').fill(input.key);
  const key = await page.getByLabel('Enrollment reference').inputValue();
  await page.getByLabel('Full name').fill(input.name);
  await page.getByLabel('Email address').fill(input.email);
  await page.getByLabel('Phone').fill('+94112223346');
  await page.getByLabel('Date of birth').fill('1994-04-10');
  await page.getByLabel('Emergency contact').fill('Synthetic contact');
  await page.getByLabel('Health notes').fill('Private recovery boundary note');
  await page.getByLabel('Initial membership plan').selectOption(input.planId);
  return key;
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
    let background = style.backgroundColor;
    if (style.backgroundImage !== 'none') background = style.getPropertyValue('--gym-color') || background;
    else {
      let ancestor = element.parentElement;
      while (ancestor) {
        const ancestorStyle = getComputedStyle(ancestor);
        const channels = parse(ancestorStyle.backgroundColor);
        const alpha = ancestorStyle.backgroundColor.startsWith('rgba') ? Number(ancestorStyle.backgroundColor.match(/[\d.]+/g)?.[3] ?? 0) : 1;
        if (channels.length === 3 && alpha > 0.01) { background = ancestorStyle.backgroundColor; break; }
        ancestor = ancestor.parentElement;
      }
    }
    const values = [luminance(style.color), luminance(background)].sort((a, b) => b - a);
    return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
  });
}

async function renderedGeometry(page: Page) {
  return page.locator('.gym-banner, .owner-page-header').first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
}

async function expectResponsivePage(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (await page.locator('.gym-banner').count()) expect(await contrastRatio(page, '.gym-banner')).toBeGreaterThanOrEqual(4.5);
  if (await page.locator('.ui-badge-success').count()) expect(await contrastRatio(page, '.ui-badge-success')).toBeGreaterThanOrEqual(4.5);
  const memberButton = page.getByRole('button', { name: 'Add member' });
  const primaryAction = memberButton.count().then(count => count ? memberButton : page.locator('.ui-button-primary').first());
  const action = await primaryAction;
  await action.focus();
  await expect(action).toBeFocused();
  expect(await action.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
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

test('public member application entry stays available without an authenticated session', async ({ page }) => {
  for (const mode of ['light', 'dark'] as const) {
    await page.goto(`${webBase}/apply`);
    await page.evaluate(value => localStorage.setItem('gymos-appearance', value), mode);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Find your gym' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
    await expect(page.locator('.auth-shell')).toHaveCSS('background-color', mode === 'light' ? 'rgb(243, 246, 250)' : 'rgb(10, 21, 40)');
    await page.goto(`${webBase}/apply/${fixture.gyms[0]!.slug}`);
    await expect(page.getByRole('heading', { name: fixture.gyms[0]!.name })).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto(`${webBase}/recover`);
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await page.goto(`${webBase}/help`);
    await expect(page.getByRole('heading', { name: 'Account and gym help' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
    await openWithTestSession(page, fixture.users.pendingUser.id, '/no-access');
    await expect(page.getByRole('heading', { name: 'No active gym access' })).toBeVisible();
    await expect(page.locator('.application-status-shell .auth-illustration')).toBeVisible();
    await page.goto(`${webBase}/applications`);
    await expect(page.getByRole('heading', { name: 'Application status' })).toBeVisible();
    await expect(page.locator('.application-status-shell .auth-illustration')).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
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
  await expect(page).toHaveURL(/\/login(?:\?error=expired)?$/);
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

  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner`);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  await expect(page.getByRole('heading', { name: 'Live Gym Operations' })).toBeVisible();
  // The owner list reports the full published total, which can differ from
  // the raw tenant row count when a registration is still unpublished.
  const ownerListToken = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')?.value;
  const publishedList = await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/members?page=1&pageSize=25`, {
    headers: { authorization: `Bearer ${ownerListToken}` },
  });
  expect(publishedList.ok()).toBe(true);
  const publishedTotal = (await publishedList.json()).totalCount as number;
  expect(publishedTotal).toBeGreaterThan(100);
  await page.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner/members`);
  await expect(page.locator('.ui-pager')).toContainText(`of ${publishedTotal}`);
  await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#0F766E');
  const enrollmentPlan = await fixture.tenants[0].membershipPlan.create({ data: {
    name: `Browser Enrollment Plan ${environment.runId}`, price: '1.00', currency: 'LKR', durationDays: 30,
  } });
  await page.getByRole('link', { name: 'Register New Member' }).click();
  await page.getByLabel('Enrollment reference').fill(`browser-enroll-${environment.runId}`);
  await page.getByLabel('Full name').fill('Browser Added Member');
  await page.getByLabel('Email address', { exact: true }).fill(`browser-${environment.runId}@example.test`);
  await page.getByLabel('Phone').fill('+94000000001');
  await page.getByLabel('Date of birth').fill('1994-04-10');
  await page.getByLabel('Initial membership plan').selectOption(enrollmentPlan.id);
  await page.getByRole('button', { name: 'Register member' }).click();
  await expect(page.getByRole('heading', { name: 'One-time credential handoff' })).toBeVisible();
  await expect(page.getByText(/expires in 24 hours/)).toBeVisible();
  const createdMember = await fixture.tenants[0].member.findUniqueOrThrow({ where: { email: `browser-${environment.runId}@example.test` } });
  await page.getByRole('button', { name: 'I have recorded the password' }).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner/members/${createdMember.id}$`));

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

test('owner can acknowledge the original version-zero member credential without reissuing it', async ({ page }) => {
  const plan = await fixture.tenants[0].membershipPlan.create({ data: {
    name: 'Original Handoff Plan', price: '0.01', currency: 'LKR', durationDays: 7,
  } });
  const email = `original-handoff-${environment.runId}@example.test`;
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner/members/new`);
  await page.getByLabel('Full name').fill('Original Handoff Member');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone').fill('+94112223347');
  await page.getByLabel('Date of birth').fill('1994-02-03');
  await page.getByLabel('Initial membership plan').selectOption(plan.id);
  await page.getByRole('button', { name: 'Register member' }).click();
  await expect(page.getByRole('heading', { name: 'One-time credential handoff' })).toBeVisible();
  const delivery = await fixture.master.credentialDelivery.findFirstOrThrow({ where: { identity: { email } } });
  expect(delivery).toMatchObject({ version: 0, acknowledgedAt: null });
  await page.getByRole('button', { name: 'I have recorded the password' }).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner/members/(?!new$)[^/]+$`));
  expect((await fixture.master.credentialDelivery.findUniqueOrThrow({ where: { operationId: delivery.operationId } })).acknowledgedAt)
    .toBeInstanceOf(Date);
  expect(await fixture.tenants[0].member.count({ where: { email } })).toBe(1);
});

test('full member enrollment hands off a one-time credential and enforces first-login password change', async ({ page, browser, request }) => {
  const plan = await fixture.tenants[0].membershipPlan.create({ data: {
    name: 'Browser Enrollment Plan', price: '0.01', currency: 'LKR', durationDays: 30,
  } });
  const beforeBeta = await fixture.tenants[1].member.count();
  const email = `browser-enrollment-${environment.runId}@example.test`;
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner/members/new`);
  await expect(page.getByRole('heading', { name: 'Member details' })).toBeVisible();
  await page.getByLabel('Full name').fill('Browser Enrollment Member');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone').fill('+94112223344');
  await page.getByLabel('Date of birth').fill('1995-06-15');
  await page.getByLabel('Initial membership plan').selectOption(plan.id);
  await page.getByRole('button', { name: 'Register member' }).click();
  await expect(page.getByRole('heading', { name: 'One-time credential handoff' })).toBeVisible();
  const lostTemporaryPassword = await page.getByLabel('Temporary password').inputValue();
  let temporaryPassword = lostTemporaryPassword;
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(20);
  expect(JSON.stringify(await fixture.master.operation.findMany({ where: { kind: 'REGISTER_MEMBER' } }))).not.toContain(temporaryPassword);
  expect(JSON.stringify(await fixture.master.credentialDelivery.findMany())).not.toContain(temporaryPassword);
  await page.getByRole('button', { name: 'I lost this password — replace it' }).click();
  await expect.poll(() => page.getByLabel('Temporary password').inputValue()).not.toBe(lostTemporaryPassword);
  temporaryPassword = await page.getByLabel('Temporary password').inputValue();
  expect(await fixture.master.credentialDelivery.findFirstOrThrow({ where: { identity: { email } } }))
    .toMatchObject({ version: 1 });
  await page.getByRole('button', { name: 'I have recorded the password' }).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner/members/(?!new$)[^/]+$`), { timeout: 10_000 });
  const identity = await fixture.master.user.findUniqueOrThrow({ where: { email } });
  const member = await fixture.tenants[0].member.findUniqueOrThrow({ where: { email } });
  await fixture.tenants[0].membershipTerm.createMany({ data: Array.from({ length: 25 }, (_, index) => ({
    memberId: member.id, planId: plan.id, startDate: new Date(Date.UTC(2021, 0, index + 1)),
    endDateExclusive: new Date(Date.UTC(2021, 0, index + 2)), agreedPrice: '0.01', currency: 'LKR',
    planNameSnapshot: `Browser historical term ${index + 1}`, configurationVersion: 1,
    actorIdentityId: fixture.users.ownerA.id, idempotencyKey: `browser-history-${String(index + 1).padStart(8, '0')}`,
    requestDigest: `browser-history-digest-${index + 1}`,
  })) });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Browser Enrollment Member', exact: true, level: 1 })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('tab', { name: 'Membership & Packs' }).click();
  await expect(page.getByRole('navigation', { name: 'Membership history pages' })).toContainText('26 membership terms');
  await page.getByRole('link', { name: 'Next membership page' }).click();
  await expect(page).toHaveURL(/membershipPage=2/);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByText('Browser historical term 1', { exact: true })).toBeVisible();
  expect(identity.mustChangePassword).toBe(true);
  expect(identity.credentialExpiresAt?.getTime()).toBeGreaterThan(Date.now());
  const [alphaCount, betaCount] = await Promise.all([
    fixture.tenants[0].member.count({ where: { email } }),
    fixture.tenants[1].member.count(),
  ]);
  expect(alphaCount).toBe(1);
  expect(betaCount).toBe(beforeBeta);

  const memberContext = await browser.newContext();
  try {
    const memberPage = await memberContext.newPage();
    const revokedLogin = await request.post(`${apiBase}/auth/login`, { data: { email, password: lostTemporaryPassword } });
    expect(revokedLogin.status()).toBe(401);
    await loginWithPassword(memberPage, email, temporaryPassword);
    await expect(memberPage).toHaveURL(/\/change-password$/);
    const replacement = `${randomBytes(24).toString('base64url')}!7`;
    await memberPage.getByLabel('Temporary password').fill(temporaryPassword);
    await memberPage.locator('#newPassword').fill(replacement);
    await memberPage.getByLabel('Confirm new password').fill(replacement);
    await memberPage.getByRole('button', { name: 'Update password' }).click();
    await expect(memberPage.locator('.ui-feedback-success')).toContainText('Password updated');
    await memberPage.getByRole('button', { name: 'Continue to sign in' }).click();
    await loginWithPassword(memberPage, email, replacement);
    await expect(memberPage).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/member$`));
    await expect(memberPage.locator('.shell-gym-name')).toContainText('Test Gym Alpha');
    await expect(memberPage.getByRole('heading', { name: /Welcome back, Browser/ })).toBeVisible();
    const memberCookie = (await memberContext.cookies()).find(cookie => cookie.name === 'gymos_access_token');
    expect(memberCookie?.httpOnly).toBe(true);
    expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/access`, {
      headers: { authorization: `Bearer ${memberCookie?.value}` },
    })).status()).toBe(403);
    expect((await fixture.master.user.findUniqueOrThrow({ where: { id: identity.id } })).mustChangePassword).toBe(false);
  } finally { await memberContext.close(); }
});

test('existing identity explicitly consents, keeps its password, and enters the selected gym as a member', async ({ page, browser, request }) => {
  const plan = await fixture.tenants[1].membershipPlan.create({ data: {
    name: 'Existing Identity Plan', price: '12.50', currency: 'LKR', durationDays: 14,
  } });
  const identityBefore = await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.memberUser.id } });
  const alphaActor = await fixture.tenants[0].member.findFirstOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const alphaLink = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.memberUser.id, gymId: fixture.gyms[0].id } } });
  const betaBefore = await fixture.tenants[1].member.count();

  await openWithTestSession(page, fixture.users.ownerB.id, `/gyms/${fixture.gyms[1].slug}/owner/members/new`);
  await page.getByLabel('Full name').fill('Existing Account Member');
  await page.getByLabel('Email address').fill(fixture.users.memberUser.email);
  await page.getByLabel('Phone').fill('+94112223349');
  await page.getByLabel('Date of birth').fill('1992-04-10');
  await page.getByLabel('Initial membership plan').selectOption(plan.id);
  await expect(page.getByLabel('Initial membership plan')).toHaveValue(plan.id);
  await page.getByRole('button', { name: 'Register member' }).click();
  const consentLink = page.getByRole('link', { name: 'Review enrollment consent' });
  await expect(consentLink).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Existing Account Member');
  await expect(page.getByLabel('Email address')).toHaveValue(fixture.users.memberUser.email);
  await expect(page.getByLabel('Initial membership plan')).toHaveValue(plan.id);
  const consentPath = await consentLink.getAttribute('href');
  if (!consentPath) throw new Error('Expected a gym-bound consent URL');
  const operationId = consentPath.split('/').at(-1)!;
  expect(await fixture.tenants[1].member.count()).toBe(betaBefore);
  expect(await fixture.master.gymAccess.findUnique({ where: {
    userId_gymId: { userId: fixture.users.memberUser.id, gymId: fixture.gyms[1].id },
  } })).toBeNull();

  const identityContext = await browser.newContext();
  try {
    const identityPage = await identityContext.newPage();
    await openWithTestSession(identityPage, fixture.users.memberUser.id, `/gyms/${fixture.gyms[0].slug}/member`);
    await identityPage.goto(`${webBase}${consentPath}`);
    await expect(identityPage.getByRole('heading', { name: 'Review gym enrollment' })).toBeVisible();
    await identityPage.getByLabel('Current password').fill(fixture.password);
    await identityPage.getByRole('button', { name: 'Accept gym enrollment' }).click();
    await expect(identityPage.getByRole('status')).toContainText('consent is securely recorded');
  } finally { await identityContext.close(); }

  await page.getByRole('button', { name: 'Check consent and finish enrollment' }).click();
  await expect(page.getByText('The existing identity accepted the gym link. No password was created, changed or shared.')).toBeVisible();
  const [member, access, operation, identityAfter] = await Promise.all([
    fixture.tenants[1].member.findFirstOrThrow({ where: { email: fixture.users.memberUser.email } }),
    fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: {
      userId: fixture.users.memberUser.id, gymId: fixture.gyms[1].id,
    } } }),
    fixture.master.operation.findUniqueOrThrow({ where: { id: operationId } }),
    fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.memberUser.id } }),
  ]);
  expect(access).toMatchObject({ role: 'MEMBER', linkStatus: 'ACTIVE', tenantActorId: member.id });
  expect(operation).toMatchObject({ state: 'COMPLETE', tenantActorId: member.id });
  expect(identityAfter.passwordHash === identityBefore.passwordHash).toBe(true);
  expect(member.id).not.toBe(alphaActor.id);
  expect(member.identityId).toBe(alphaActor.identityId);
  expect(await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.memberUser.id, gymId: fixture.gyms[0].id } } })).toEqual(alphaLink);
  expect(await fixture.tenants[1].membershipTerm.count({ where: { memberId: member.id } })).toBe(1);
  expect(await fixture.master.credentialDelivery.count({ where: { operationId } })).toBe(0);

  const memberContext = await browser.newContext();
  try {
    const memberPage = await memberContext.newPage();
    const username = `member.${fixture.gyms[1].slug}@example.test`;
    const setup = await request.post(`${apiBase}/auth/gym-account/setup`, { data: { gymSlug: fixture.gyms[1].slug,
      legacyEmail: fixture.users.memberUser.email, legacyPassword: fixture.password, username, newPassword: `${fixture.password}-beta` } });
    expect(setup.status()).toBe(201);
    expect((await fixture.master.gymAccount.findUniqueOrThrow({ where: { username } })).gymId).toBe(fixture.gyms[1].id);
    await openWithTestSession(memberPage, fixture.users.memberUser.id, `/gyms/${fixture.gyms[1].slug}/member`);
    await expect(memberPage).toHaveURL(new RegExp(`/gyms/${fixture.gyms[1].slug}/member$`));
    await expect(memberPage.locator('.shell-gym-name')).toContainText('Test Gym Beta');
    await expect(memberPage.getByRole('heading', { name: /Welcome back, Member/ })).toBeVisible();
  } finally { await memberContext.close(); }
});

test('trainer registration enforces owner and selected-gym access, then hands off a one-time credential', async ({ page, browser, request }) => {
  const email = `browser-trainer-${environment.runId}@example.test`;
  const trainerCounts = await Promise.all(fixture.tenants.map(tenant => tenant.trainer.count()));
  const beforeDenied = await Promise.all([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()]);
  const registration = { fullName: 'Denied Trainer', email: `denied-${email}`, phone: '+94112223348', level: 'LEVEL_1', yearsExperience: null,
    specialisations: [], shiftStart: null, shiftEnd: null, bio: null, idempotencyKey: `denied-trainer-${environment.runId}` };
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner`);
  let bearer = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')?.value;
  expect((await request.post(`${apiBase}/gyms/${fixture.gyms[1].slug}/trainer-registrations`, { headers: { authorization: `Bearer ${bearer}` }, data: registration })).status()).toBe(403);
  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${fixture.gyms[0].slug}/member`);
  bearer = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')?.value;
  expect((await request.post(`${apiBase}/gyms/${fixture.gyms[0].slug}/trainer-registrations`, { headers: { authorization: `Bearer ${bearer}` }, data: registration })).status()).toBe(403);
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner`);
  bearer = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')?.value;
  expect((await request.post(`${apiBase}/gyms/${fixture.gyms[0].slug}/trainer-registrations`, { headers: { authorization: `Bearer ${bearer}` }, data: { ...registration, email, idempotencyKey: `invalid-trainer-${environment.runId}`, shiftStart: '08:00' } })).status()).toBe(422);
  expect(await Promise.all([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()])).toEqual(beforeDenied);
  expect(await Promise.all(fixture.tenants.map(tenant => tenant.trainer.count()))).toEqual(trainerCounts);
  // Open the final destination directly. The gym root redirects owner sessions
  // to /owner, so navigating there and immediately calling goto again races
  // with that client redirect in CI.
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner/trainers/new`);
  await expect(page.getByRole('heading', { name: 'Add New Personal Trainer' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(page.getByRole('button', { name: 'Register trainer' })).toBeVisible();
  await page.getByLabel('Years of experience').fill('-1');
  await page.getByLabel('Full name').fill('Invalid Trainer');
  await page.getByLabel('Email address').fill(`invalid-${email}`);
  await page.getByLabel('Phone').fill('+94112223340');
  await page.getByRole('button', { name: 'Register trainer' }).click();
  expect(await page.getByLabel('Years of experience').evaluate(element => (element as HTMLInputElement).validity.rangeUnderflow)).toBe(true);
  expect(await Promise.all([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()])).toEqual(beforeDenied);
  expect(await Promise.all(fixture.tenants.map(tenant => tenant.trainer.count()))).toEqual(trainerCounts);
  await page.getByLabel('Full name').fill('Browser Enrollment Trainer');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone').fill('+94112223345');
  await page.getByLabel('Level').selectOption('LEVEL_2');
  await page.getByLabel('Years of experience').fill('5');
  await page.getByLabel('Specialisations').fill('Strength, Mobility');
  await page.getByLabel('Shift start').fill('08:00');
  await page.getByLabel('Shift end').fill('17:00');
  await page.getByLabel('Bio').fill('Browser-created trainer profile.');
  await page.getByRole('button', { name: 'Register trainer' }).click();
  await expect(page.getByText('Copy the one-time temporary password')).toBeVisible();
  const temporaryPassword = await page.getByLabel('Temporary password').inputValue();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(20);
  expect(JSON.stringify(await fixture.master.operation.findMany({ where: { kind: 'REGISTER_TRAINER' } }))).not.toContain(temporaryPassword);
  const identity = await fixture.master.user.findUniqueOrThrow({ where: { email } });
  expect(identity.mustChangePassword).toBe(true);
  expect(await fixture.tenants[0].trainer.count({ where: { email, level: 'LEVEL_2', yearsExperience: 5 } })).toBe(1);
  expect(await fixture.tenants[1].trainer.count()).toBe(trainerCounts[1]);

  const trainerContext = await browser.newContext();
  try {
    const trainerPage = await trainerContext.newPage();
    await loginWithPassword(trainerPage, email, temporaryPassword);
    await expect(trainerPage).toHaveURL(/\/change-password$/);
    const replacement = randomBytes(24).toString('base64url');
    await trainerPage.getByLabel('Temporary password').fill(temporaryPassword);
    await trainerPage.locator('#newPassword').fill(replacement);
    await trainerPage.getByLabel('Confirm new password').fill(replacement);
    await trainerPage.getByRole('button', { name: 'Update password' }).click();
    await expect(trainerPage.locator('.ui-feedback-success')).toContainText('Password updated');
    await trainerPage.getByRole('button', { name: 'Continue to sign in' }).click();
    await loginWithPassword(trainerPage, email, replacement);
    await expect(trainerPage).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/trainer/schedule$`));
    expect((await fixture.master.user.findUniqueOrThrow({ where: { id: identity.id } })).mustChangePassword).toBe(false);
  } finally { await trainerContext.close(); }
});

test('trainer roster/profile and member directory are usable at mobile width without exposing contact fields', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const gym = fixture.gyms[0]!;
  const tenant = fixture.tenants[0]!;
  const memberId = (await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } })).id;
  const trainerId = (await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } })).id;
  await tenant.trainer.update({ where: { id: trainerId }, data: { shiftStart: '09:00', shiftEnd: '18:00' } });
  const gymToday = localDate(new Date(), 'Asia/Colombo');
  const availabilityReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id,
    commandKind: 'TEST_AVAILABILITY', idempotencyKey: `member-request-availability-${environment.runId}`,
    requestDigest: requestDigest({ runId: environment.runId, availability: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const availabilityFrom = new Date(`${gymToday}T00:00:00.000Z`);
  const availabilityThrough = new Date(availabilityFrom); availabilityThrough.setUTCDate(availabilityThrough.getUTCDate() + 60);
  await tenant.pTAvailabilityRule.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({
    id: `member-request-avail-${weekday}-${environment.runId}`, trainerId, kind: 'WEEKLY_WINDOW' as const, weekday,
    startMinute: 540, endMinute: 1080, effectiveFrom: availabilityFrom, effectiveToExclusive: availabilityThrough,
    createdByIdentityId: fixture.users.ownerA.id, commandReceiptId: availabilityReceipt.id, updatedAt: new Date(),
  })) });
  const packStart = new Date(`${gymToday}T00:00:00.000Z`);
  const packEnd = new Date(packStart); packEnd.setUTCDate(packEnd.getUTCDate() + 90);
  const plan = await tenant.membershipPlan.create({ data: { name: `Task039 request term ${environment.runId}`, price: '0.00', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId, planId: plan.id, startDate: packStart, endDateExclusive: packEnd, agreedPrice: '0.00', currency: 'LKR',
    planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: `task039-request-term-${environment.runId}`,
    requestDigest: requestDigest({ runId: environment.runId, task: '039-request-term' }) } });
  const packReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id,
    commandKind: 'TEST_DIRECTORY_REQUEST_PACK', idempotencyKey: `task039-request-pack-${environment.runId}`,
    requestDigest: requestDigest({ runId: environment.runId, task: '039-request-pack' }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const pack = await tenant.sessionPack.create({ data: { memberId, issuedCredits: 2, price: '100.00', currency: 'LKR', totalMinorUnits: BigInt(10_000),
    creditBaseMinorUnits: BigInt(5_000), creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90,
    startDate: packStart, endDateExclusive: packEnd, commandReceiptId: packReceipt.id, actorIdentityId: fixture.users.ownerA.id,
    idempotencyKey: `task039-request-pack-${environment.runId}`, requestDigest: requestDigest({ runId: environment.runId, task: '039-request-pack' }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 2, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `task039-request-pack-issue-${environment.runId}`, receiptId: packReceipt.id, actorIdentityId: fixture.users.ownerA.id } });
  const sessionStart = new Date('2026-11-01T04:00:00.000Z');
  await tenant.pTSession.create({ data: { id: `task037-profile-${environment.runId}`, memberId, trainerId, state: 'COMPLETED', type: 'IN_PERSON',
    scheduledStartAt: sessionStart, scheduledEndAt: new Date(sessionStart.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR',
    confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: sessionStart,
    startedAt: sessionStart, endedAt: new Date(sessionStart.getTime() + 60 * 60_000), createdByIdentityId: fixture.users.ownerA.id,
    createdAt: sessionStart, updatedAt: sessionStart } });
  await tenant.mealPlan.create({ data: { memberId, trainerId, name: 'Calendar activity meal plan', entries: { create: [
    { sortOrder: 0, dayOfWeek: 1, mealType: 'Breakfast', foodItem: 'Oatmeal with berries', calories: 350 },
  ] } } });
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${gym.slug}/owner/trainers`);
  await expect(page.getByRole('heading', { name: 'Trainer Roster Management', level: 1 })).toBeVisible();
  const trainerRow = page.getByRole('row').filter({ hasText: 'Trainer Alpha' });
  const trainerProfileLink = trainerRow.getByRole('link', { name: 'View profile' });
  await expect(trainerProfileLink).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/gymos-task037-owner-roster-390.png', fullPage: true });

  await trainerProfileLink.click();
  await expect(page.getByRole('heading', { name: 'Trainer Alpha', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Approve recurring shift' })).toBeVisible();
  await expect(page.locator('.trainer-profile-session-metrics')).toContainText(/Related clients\s*1/);
  await expect(page.locator('.trainer-profile-session-metrics')).toContainText(/Completed sessions\s*1/);
  await expect(page.locator('.trainer-profile-session-metrics')).toContainText(/Completed in latest ten\s*1/);
  await expect(page.locator('.trainer-profile-sessions')).toContainText('COMPLETED');
  await expect(page.locator('.trainer-profile-sessions')).toContainText('Nov 1, 2026, 9:30 AM');
  await expect(page.getByText('Ratings are unavailable until members submit ratings.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/gymos-task037-owner-profile-390.png', fullPage: true });

  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/trainers`);
  await expect(page.getByRole('heading', { name: 'Find a trainer', level: 1 })).toBeVisible();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
    await page.setViewportSize(viewport);
    await expectResponsivePage(page);
    await page.screenshot({ path: `/tmp/gymos-member-directory-${viewport.width}.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const card = page.locator('.trainer-directory-card').filter({ hasText: 'Trainer Alpha' });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText(fixture.users.trainerUser.email);
  await expect(card).toContainText('Rating unavailable');
  await expect(card).toContainText('09:00–18:00 gym local time');
  const profileLink = card.getByRole('link', { name: 'View Trainer Alpha profile' });
  await expect(profileLink).toHaveAttribute('href', new RegExp(`/gyms/${gym.slug}/member/trainers/${trainerId}$`));
  await profileLink.click();
  await expect(page.getByRole('heading', { name: 'About your trainer' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request a private session' })).toHaveAttribute('href', new RegExp(`/gyms/${gym.slug}/member/trainers/${trainerId}/book`));
  await expectResponsivePage(page);
  await page.getByRole('link', { name: 'Request a private session' }).click();
  await expect(page.getByRole('heading', { name: 'Request a trainer', level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/gymos-task039-member-directory-390.png', fullPage: true });
  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/calendar?month=${gymToday.slice(0, 7)}`);
  await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
  await expect(page.getByRole('table', { name: `${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${gymToday.slice(0, 7)}-01T00:00:00Z`))} session calendar` })).toBeVisible();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
    await page.setViewportSize(viewport);
    await expectResponsivePage(page);
    await page.screenshot({ path: `/tmp/gymos-member-calendar-${viewport.width}.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: new RegExp(`${gymToday.slice(0, 7)}-02`) }).click();
  await expect(page.getByText('Meal plan activity')).toBeVisible();
  await expect(page.getByText('Oatmeal with berries')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/gymos-member-calendar-meal-390.png', fullPage: true });
  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/trainers`);
  await page.goto(`${webBase}/gyms/${gym.slug}/member/trainers/${trainerId}/book`);
  await expect(page).toHaveURL(new RegExp(`/gyms/${gym.slug}/member/trainers/${trainerId}/book`));
  await expect(page.getByRole('heading', { name: 'Request a trainer', level: 1 })).toBeVisible();
  await expect(page.getByText(/Session credits available today: 2/)).toBeVisible();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
    await page.setViewportSize(viewport);
    await expectResponsivePage(page);
    await page.screenshot({ path: `/tmp/gymos-member-request-${viewport.width}.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const requestDate = localDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'Asia/Colombo');
  const startingEffects = { sessions: await tenant.pTSession.count(), holds: await tenant.sessionCreditHold.count(), movements: await tenant.packCreditMovement.count() };
  const memberCookie = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token');
  expect((await request.get(`${apiBase}/auth/session`, { headers: { authorization: `Bearer ${memberCookie?.value}` } })).status()).toBe(200);
  expect((await request.get(`${apiBase}/gyms/${gym.slug}/me/session-request-options?trainerId=${encodeURIComponent(trainerId)}`, { headers: { authorization: `Bearer ${memberCookie?.value}` } })).status()).toBe(200);
  const slotsResponse = await request.get(`${apiBase}/gyms/${gym.slug}/session-slots?trainerId=${encodeURIComponent(trainerId)}&localDate=${requestDate}`, { headers: { authorization: `Bearer ${memberCookie?.value}` } });
  expect(slotsResponse.status()).toBe(200);
  expect((await slotsResponse.json()).slots.length).toBeGreaterThan(0);
  await page.getByLabel('Session date').fill(requestDate);
  const startTime = page.getByLabel(/Available start time/);
  await expect(startTime).toBeEnabled();
  await expect(startTime.locator('option')).not.toHaveCount(0);
  await startTime.selectOption({ index: 1 });
  await page.getByLabel('Note for the trainer (optional)').fill('Please focus on beginner strength training.');
  await page.getByRole('button', { name: 'Request session' }).click();
  await expect(page.getByRole('status')).toContainText('The trainer must accept before credit is reserved.');
  const requested = await tenant.pTSession.findFirstOrThrow({ where: { memberId, trainerId, state: 'PENDING_CONFIRMATION' }, orderBy: { createdAt: 'desc' } });
  expect({ sessions: await tenant.pTSession.count(), holds: await tenant.sessionCreditHold.count(), movements: await tenant.packCreditMovement.count() })
    .toEqual({ sessions: startingEffects.sessions + 1, holds: startingEffects.holds, movements: startingEffects.movements });

  await openWithTestSession(page, fixture.users.trainerUser.id, `/gyms/${gym.slug}/trainer/requests`);
  const acceptCard = page.locator('.session-request-card').filter({ hasText: 'Please focus on beginner strength training.' });
  await expect(acceptCard).toBeVisible();
  await acceptCard.getByRole('button', { name: 'Accept and reserve one credit' }).click();
  await expect.poll(async () => (await tenant.pTSession.findUniqueOrThrow({ where: { id: requested.id } })).state).toBe('SCHEDULED');
  await expect(page.getByRole('heading', { name: 'No pending requests' })).toBeVisible();
  expect((await tenant.pTSession.findUniqueOrThrow({ where: { id: requested.id } })).state).toBe('SCHEDULED');
  expect((await tenant.sessionCreditHold.findUniqueOrThrow({ where: { sessionId: requested.id } })).state).toBe('HELD');
  expect(await tenant.packCreditMovement.count()).toBe(startingEffects.movements + 1);

  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/trainers/${trainerId}/book`);
  const secondMemberCookie = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token');
  const secondSlotsResponse = await request.get(`${apiBase}/gyms/${gym.slug}/session-slots?trainerId=${encodeURIComponent(trainerId)}&localDate=${requestDate}`, { headers: { authorization: `Bearer ${secondMemberCookie?.value}` } });
  expect(secondSlotsResponse.status()).toBe(200);
  expect((await secondSlotsResponse.json()).slots.length).toBeGreaterThan(0);
  await page.getByLabel('Session date').fill(requestDate);
  const requestStart = page.getByLabel(/Available start time/);
  await expect(requestStart).toBeEnabled();
  await requestStart.selectOption({ index: 1 });
  await page.getByLabel('Note for the trainer (optional)').fill('Please review my shoulder warmup.');
  await page.getByRole('button', { name: 'Request session' }).click();
  await expect(page.getByRole('status')).toContainText('The trainer must accept before credit is reserved.');
  const declinedRequest = await tenant.pTSession.findFirstOrThrow({ where: { memberId, trainerId, state: 'PENDING_CONFIRMATION' }, orderBy: { createdAt: 'desc' } });
  await openWithTestSession(page, fixture.users.trainerUser.id, `/gyms/${gym.slug}/trainer/requests`);
  const declineCard = page.locator('.session-request-card').filter({ hasText: 'Please review my shoulder warmup.' });
  await expect(declineCard).toBeVisible();
  await declineCard.getByText('Add optional message for member').click();
  await declineCard.getByLabel('Message for member').fill('I am unavailable at that time. Please choose another slot.');
  await declineCard.getByRole('button', { name: 'Decline request' }).click();
  await expect.poll(async () => (await tenant.pTSession.findUniqueOrThrow({ where: { id: declinedRequest.id } })).state).toBe('DECLINED');
  expect(await tenant.sessionCreditHold.count()).toBe(startingEffects.holds + 1);
  expect(await tenant.packCreditMovement.count()).toBe(startingEffects.movements + 1);
  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/sessions?mode=month&month=${requestDate.slice(0, 7)}`);
  await expect(page.getByText('I am unavailable at that time. Please choose another slot.')).toBeVisible();
  const acceptedCard = page.locator('article').filter({ hasText: 'Please focus on beginner strength training.' });
  await acceptedCard.getByRole('button', { name: 'Cancel session' }).click();
  const cancelDialog = page.getByRole('dialog', { name: 'Cancel session' });
  await expect(cancelDialog).toBeVisible();
  await expect(acceptedCard).toContainText('No PT credit is used. The reservation is released.');
  await page.screenshot({ path: '/tmp/gymos-member-free-cancellation-quote.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(cancelDialog).not.toBeVisible();
  await expect(acceptedCard.getByRole('button', { name: 'Cancel session' }).first()).toBeFocused();
  await acceptedCard.getByRole('button', { name: 'Cancel session' }).click();
  await expect(cancelDialog).toBeVisible();
  await expect(acceptedCard).toContainText('No PT credit is used. The reservation is released.');
  await acceptedCard.getByRole('button', { name: 'Cancel session' }).last().click();
  await expect.poll(async () => (await tenant.pTSession.findUniqueOrThrow({ where: { id: requested.id } })).state).toBe('CANCELLED');
  await expect.poll(async () => (await tenant.sessionCreditHold.findUniqueOrThrow({ where: { sessionId: requested.id } })).state).toBe('RELEASED');

  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/trainers/${trainerId}/book`);
  await page.getByLabel('Session date').fill(requestDate);
  const withdrawalStart = page.getByLabel(/Available start time/);
  await expect(withdrawalStart).toBeEnabled();
  await withdrawalStart.selectOption({ index: 1 });
  await page.getByLabel('Note for the trainer (optional)').fill('Please withdraw this request.');
  await page.getByRole('button', { name: 'Request session' }).click();
  await expect(page.getByRole('status')).toContainText('The trainer must accept before credit is reserved.');
  const withdrawRequest = await tenant.pTSession.findFirstOrThrow({ where: { memberId, trainerId, state: 'PENDING_CONFIRMATION' }, orderBy: { createdAt: 'desc' } });
  await openWithTestSession(page, fixture.users.memberUser.id, `/gyms/${gym.slug}/member/sessions?mode=month&month=${requestDate.slice(0, 7)}`);
  const pendingCard = page.locator('article').filter({ hasText: 'Please withdraw this request.' });
  await pendingCard.getByRole('button', { name: 'Withdraw request' }).click();
  const withdrawDialog = page.getByRole('dialog', { name: 'Withdraw request' });
  await expect(withdrawDialog).toBeVisible();
  await expect(pendingCard).toContainText('This will withdraw the pending request without using a credit.');
  await page.screenshot({ path: '/tmp/gymos-member-pending-withdrawal-quote.png', animations: 'disabled' });
  await pendingCard.getByRole('button', { name: 'Withdraw request' }).last().click();
  await expect.poll(async () => (await tenant.pTSession.findUniqueOrThrow({ where: { id: withdrawRequest.id } })).state).toBe('CANCELLED');
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: withdrawRequest.id } })).toBe(0);
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
    await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner/members`);
    await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#0F766E');
    await expectResponsivePage(page);
    const alphaGeometry = await renderedGeometry(page);
    await page.screenshot({ path: join(classicEvidenceDirectory, `${viewport.name}-alpha.png`), animations: 'disabled' });

    await openWithTestSession(page, fixture.users.ownerB.id, `/gyms/${fixture.gyms[1].slug}/owner/members`);
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
    await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${fixture.gyms[0].slug}/owner/members`);
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

test('role shell supports keyboard drawer and gym-scoped context', async ({ page }) => {
  const evidence = join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-013');
  await mkdir(evidence, { recursive: true });
  const before = await fixture.master.$transaction([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()]);
  for (const [user, role, label] of [
    [fixture.users.ownerA, 'owner', 'Dashboard'],
    [fixture.users.trainerUser, 'trainer', 'My Schedule'],
    [fixture.users.memberUser, 'member', 'Home'],
  ] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openGymWithTestSession(page, user.id, fixture.gyms[0].slug);
    await expect(page).toHaveURL(new RegExp(`/${role === 'trainer' ? 'trainer/schedule' : role}$`));
    await expect(page.locator('.shell-account-menu')).toContainText(user.displayName!);
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.locator('.shell-sidebar').evaluate(el => el.getBoundingClientRect().width)).toBe(248);
    expect(await page.locator('.shell-header').evaluate(el => el.getBoundingClientRect().height)).toBe(76);
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
  await expect(page.getByRole('link', { name: 'Switch gym' })).toHaveCount(0);
  await openGymWithTestSession(page, fixture.users.multiOwner.id, fixture.gyms[1].slug);
  await expect(page.locator('.shell-gym-name')).toContainText('Test Gym Beta');
  await expect(page.locator('.gym-dashboard')).toHaveCSS('--gym-color', '#7C3AED');
  await expect(page.locator('main')).not.toContainText('Test Gym Alpha');
  const access = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.multiOwner.id, gymId: fixture.gyms[0].id } } });
  try {
    const revokedGymPage = await page.context().newPage();
    await openGymWithTestSession(revokedGymPage, fixture.users.multiOwner.id, fixture.gyms[0].slug);
    await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: access.userId, gymId: access.gymId } }, data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
    try {
      await revokedGymPage.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner`);
      await expect(revokedGymPage.getByRole('heading', { name: 'This page could not be found' })).toBeVisible();
      await expect(revokedGymPage.locator('.member-list')).toHaveCount(0);
    } finally { await revokedGymPage.close(); }
  } finally {
    await fixture.master.gymAccess.update({ where: { userId_gymId: { userId: access.userId, gymId: access.gymId } }, data: { linkStatus: 'ACTIVE', version: { increment: 1 } } });
  }
  expect(await fixture.master.$transaction([fixture.master.user.count(), fixture.master.gymAccess.count(), fixture.master.operation.count()])).toEqual(before);
});

test('web sessions enforce cookie, origin, expiry, revocation and logout boundaries', async ({ page, request }) => {
  const evidence = join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-020');
  await mkdir(evidence, { recursive: true });
  await openGymWithTestSession(page, fixture.users.ownerB.id, fixture.gyms[1].slug);
  await expect(page.locator('.shell-gym-name')).toContainText('Test Gym Beta');
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
  await expect(otherTab.locator('.shell-account-menu')).toContainText('Owner Beta');
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
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion).toBe(before);
  expect(await fixture.master.identitySession.findFirst({ where: { identityId: fixture.users.ownerB.id, revokedAt: { not: null } },
    select: { revocationReason: true } })).toMatchObject({ revocationReason: 'CURRENT_DEVICE_LOGOUT' });
  expect((await request.get(`${apiBase}/auth/session`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(401);
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/members`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(401);
  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('.member-list')).toHaveCount(0);
  await otherTab.close();
  await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug, -1);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  const shortLivedToken = await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug, 3);
  await expect(page.locator('.shell-gym-name')).toContainText('Test Gym Alpha');
  const renewedToken = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')?.value;
  expect(renewedToken).toBeTruthy();
  expect(renewedToken).not.toBe(shortLivedToken);
  expect((await page.request.get(`${webBase}/api/session`)).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  // A new identity in the shared cookie must never retain the old shell.
  await openGymWithTestSession(page, fixture.users.ownerA.id, fixture.gyms[0].slug);
  await expect(page.locator('.shell-account-menu')).toContainText('Owner Alpha');
  await fixture.master.gymAccount.update({ where: { userId_gymId: { userId: fixture.users.ownerA.id, gymId: fixture.gyms[0].id } },
    data: { authVersion: { increment: 1 } } });
  await page.reload();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await openGymWithTestSession(page, fixture.users.ownerB.id, fixture.gyms[1].slug);
  await expect(page.locator('.shell-account-menu')).toContainText('Owner Beta');
  await expect(page.locator('main')).not.toContainText('Alpha Person');
  await page.screenshot({ path: join(evidence, 'fresh-identity.png'), animations: 'disabled' });
});

test('platform appearance persists across reloads and supports responsive keyboard workflows', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openWithTestSession(page, fixture.users.admin.id, '/admin');
  await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atlas Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.platform-metric').nth(2).locator('strong')).toHaveText('—');
  await page.getByRole('button', { name: 'Refresh first 25 gyms', exact: true }).click();
  await expect(page.locator('.platform-health-tag')).toHaveText('Summaries are current');
  const expectedMembers = (await Promise.all(fixture.tenants.map(tenant => tenant.member.count()))).reduce((sum, count) => sum + count, 0);
  await expect(page.locator('.platform-metric').nth(2).locator('strong')).toHaveText(expectedMembers.toLocaleString('en-US'));
  const evidence = join(webDirectory, 'test-results/ui-transformation/super-admin');
  await mkdir(evidence, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  const geometry: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const mode of ['light', 'dark'] as const) {
    await page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await page.locator('.platform-metrics').boundingBox();
      expect(box).not.toBeNull();
      if (mode === 'light') geometry[String(width)] = box!;
      else expect(box).toEqual(geometry[String(width)]);
      const firstMetric = page.locator('.platform-metric').first();
      await expect(firstMetric).toHaveCSS('background-color', mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(23, 36, 59)');
      expect(await contrastRatio(page, '.platform-metric')).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ path: join(evidence, `${mode}-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
    await expect(page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.setViewportSize({ width: 1440, height: 1000 });
    const row = page.getByRole('table', { name: 'Registered gym tenants' }).getByRole('row').filter({ has: page.getByText('Test Gym Alpha', { exact: true }) });
    const support = row.getByRole('button', { name: 'Open support', exact: true });
    await support.click();
    const dialog = page.getByRole('dialog', { name: 'Enter read-only support', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Enter support', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /^Support reason/ })).toBeFocused();
    expect(await fixture.master.supportSession.count({ where: { actorIdentityId: fixture.users.admin.id } })).toBe(0);
    await dialog.getByRole('textbox', { name: /^Support reason/ }).fill('Synthetic workspace access review');
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      const modalBox = await dialog.boundingBox();
      expect(modalBox).not.toBeNull();
      expect(modalBox!.x + modalBox!.width / 2).toBeCloseTo(width / 2, 0);
      expect(modalBox!.height).toBeLessThanOrEqual(width < 768 ? 812 : 968);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: join(evidence, `${mode}-support-dialog-${width}.png`), animations: 'disabled' });
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(support).toBeFocused();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('.shell-sidebar')).toHaveCSS('width', '80px');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await expect(page.locator('.shell-sidebar')).toHaveCSS('width', '248px');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(drawer).toBeVisible();
  await page.screenshot({ path: join(evidence, 'dark-mobile-navigation.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.ui-button-primary').first()).toHaveCSS('transition-duration', '0s');
  expect(errors).toEqual([]);
});

test('platform form reserves one pending gym with safe status and a stable retry key', async ({ page, request }) => {
  await openWithTestSession(page, fixture.users.admin.id, '/admin');
  const before = await fixture.master.gym.count();
  const key = await page.locator('input[name="requestKey"]').inputValue();
  const input = { name: 'Browser reserved gym', slug: `browser-reserved-${environment.runId}`, ownerEmail: `browser-owner-${environment.runId}@example.test`, currency: 'LKR', timezone: 'Asia/Colombo' };
  await page.getByLabel('Gym name', { exact: true }).fill(input.name);
  await page.getByRole('textbox', { name: /^Gym slug/ }).fill(input.slug);
  await page.getByRole('textbox', { name: /^Owner email/ }).fill(input.ownerEmail);
  await page.getByLabel('Currency', { exact: true }).selectOption(input.currency);
  await page.getByRole('textbox', { name: /^Timezone/ }).fill(input.timezone);
  await page.getByRole('button', { name: 'Create gym', exact: true }).click();
  const status = page.getByRole('region', { name: 'Provisioning status' });
  await expect(status).toContainText('PENDING');
  await expect(page.getByLabel('Gym name', { exact: true })).toHaveValue(input.name);
  await expect(page.getByRole('textbox', { name: /^Gym slug/ })).toHaveValue(input.slug);
  await expect(page.getByRole('textbox', { name: /^Owner email/ })).toHaveValue(input.ownerEmail);
  await expect(status).toContainText('remains unavailable');
  const cookie = (await page.context().cookies()).find(item => item.name === 'gymos_access_token')!;
  const replay = await request.post(`${apiBase}/admin/gyms`, { headers: { authorization: `Bearer ${cookie.value}`, 'idempotency-key': key }, data: input });
  expect(replay.status()).toBe(202);
  const result = await replay.json();
  await expect(status.locator('code')).toHaveText(result.operationId);
  expect(await fixture.master.gym.count()).toBe(before + 1);
  expect(await fixture.master.user.count({ where: { email: input.ownerEmail } })).toBe(0);
  const stored = await fixture.master.operation.findUniqueOrThrow({ where: { id: result.operationId } });
  expect((await page.content()).includes(stored.databaseName!)).toBe(false);
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await expect(status.locator('code')).toHaveText(result.operationId);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mkdir(join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-021'), { recursive: true });
  await page.screenshot({ path: join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-021/pending-320.png'), fullPage: true, animations: 'disabled' });
  await promisify(execFile)(process.execPath,[join(apiDirectory,'scripts/provision-gym.mjs'),'resume',stored.id],{
    env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',GYMOS_OWNED_RUN_ID:environment.runId,MASTER_DATABASE_URL:environment.masterUrl,PROVISION_DATABASE_URL:environment.masterUrl,TENANT_DATABASE_URL:environment.masterUrl},timeout:30_000,
  });
  await environment.registerProvisionedDatabase(await fixture.master.operation.findUniqueOrThrow({where:{id:stored.id}}));
  await page.goto(`${webBase}/admin`);
  const row=page.getByRole('table',{name:'Registered gym tenants'}).getByRole('row').filter({has:page.getByText(input.name,{exact:true})});
  await row.locator('summary').filter({ hasText: 'Setup details' }).click();
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
  const evidence=join(webDirectory,'test-results/migration-evidence/GYMOS-MIG-024');await mkdir(evidence,{recursive:true});
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:width<400?844:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===768) await expect(alpha.getByRole('button',{name:'Open support'})).toBeVisible();
    await page.screenshot({path:join(evidence,`registry-${width}.png`),fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:1280,height:720});
  await alpha.getByRole('button',{name:'Open support'}).focus();
  await page.keyboard.press('Enter');
  const reason=page.getByRole('textbox',{name:/^Support reason/});await reason.fill('Synthetic owner-summary diagnosis');
  await page.getByRole('button',{name:'Enter support',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  // The server action can change the URL before the streamed owner shell has
  // rendered its selected gym. Read support context from a fresh document.
  await page.goto('about:blank');
  await page.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner`);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[0].slug}/owner$`));
  await expect(page.locator('[data-support-session] .support-banner')).toContainText('Viewing Test Gym Alpha');
  await expect(page.getByRole('main').getByRole('heading',{name:'Test Gym Alpha',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add member'})).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Alpha Person');
  const supportCookie=(await page.context().cookies()).find(cookie=>cookie.name==='gymos_support_context')!;
  expect(supportCookie.httpOnly&&supportCookie.secure&&supportCookie.sameSite==='Lax').toBe(true);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:width<400?844:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:join(evidence,`support-alpha-${width}.png`),fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:1280,height:720});
  const oldTab=await page.context().newPage();await oldTab.goto(`${webBase}/gyms/${fixture.gyms[0].slug}/owner`);
  await expect(oldTab.locator('.support-banner')).toContainText('Viewing Test Gym Alpha');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'All Gyms'}).click();
  const beta=page.getByRole('table',{name:'Registered gym tenants'}).getByRole('row').filter({has:page.getByText('Test Gym Beta',{exact:true})});
  await beta.getByRole('button',{name:'Open support'}).click();
  await page.getByRole('textbox',{name:/^Support reason/}).fill('Synthetic second-gym diagnosis');
  await page.getByRole('button',{name:'Enter support',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[1].slug}/owner$`));
  // A support-context broadcast can redirect an older Alpha document while
  // the Beta navigation is still streaming. Read the new context from a fresh
  // document so no stale shell state can satisfy the Beta assertions.
  await page.goto('about:blank');
  await page.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[1].slug}/owner$`));
  await expect(page.locator('[data-support-session] .support-banner')).toContainText('Viewing Test Gym Beta');
  await expect(page.getByRole('main').getByRole('heading',{name:'Test Gym Beta',exact:true})).toBeVisible();
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
  await expect(ownerPage.locator('.shell-header')).toContainText('Test Gym Alpha');
  await expect(ownerPage.getByRole('main').getByRole('heading',{name:'Live Gym Operations',exact:true})).toBeVisible();
  await waitForSessionLifecycle(ownerPage);
  await openWithTestSession(page,fixture.users.admin.id,'/admin');
  const row=()=>page.getByRole('table',{name:'Registered gym tenants'}).getByRole('row').filter({has:page.getByText('Test Gym Alpha',{exact:true})});
  await row().getByRole('button',{name:'Suspend gym',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Suspend this gym?'});await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await expect(dialog).toContainText('Give a reason');
  expect((await fixture.master.gym.findUniqueOrThrow({where:{id:fixture.gyms[0].id}})).status).toBe('ACTIVE');
  await dialog.getByRole('textbox',{name:/^Lifecycle reason/}).fill('Synthetic owner-requested suspension');
  const evidence=join(webDirectory,'test-results/migration-evidence/GYMOS-MIG-025');await mkdir(evidence,{recursive:true});
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
  await expect(ownerPage.locator('.shell-header')).toContainText('Test Gym Alpha');
  await expect(ownerPage.getByRole('main').getByRole('heading',{name:'Live Gym Operations',exact:true})).toBeVisible();
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
  await expect(page.locator('.shell-gym-name')).toContainText('Test Gym Beta');
  const before = (await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion;
  await stop(api);
  const failedPage = await page.context().newPage();
  await failedPage.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(failedPage.getByRole('heading', { name: 'Could not load this workspace' })).toBeVisible();
  await expect(failedPage.getByRole('button', { name: 'Try again' })).toBeVisible();
  await failedPage.close();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?error=logout-uncertain(?:&|$)/);
  await expect(page.locator('.ui-feedback[role="alert"]')).toContainText('server could not confirm session revocation');
  expect((await page.context().cookies()).some(item => item.name === 'gymos_access_token')).toBe(false);
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.ownerB.id } })).authVersion).toBe(before);
  await page.screenshot({ path: join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-020/backend-unavailable.png'), animations: 'disabled' });
  await page.goto(`${webBase}/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(page).toHaveURL(/\/login$/);
});

test('browser recovers an unpublished tenant commit after Master activation fails without duplicate effects', async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  const slug = fixture.gyms[0].slug;
  const email = `activation-browser-${environment.runId}@example.test`;
  const plan = await fixture.tenants[0].membershipPlan.create({ data: { name: 'Activation Recovery Plan', price: '12.3456', currency: 'LKR', durationDays: 14 } });
  const betaBefore = await fixture.tenants[1].member.count();
  await fixture.master.$executeRawUnsafe(`CREATE FUNCTION fail_member_activation_browser() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'MEMBER_ACCESS_ACTIVATED' THEN RAISE EXCEPTION 'injected member activation failure'; END IF; RETURN NEW; END $$`);
  await fixture.master.$executeRawUnsafe(`CREATE TRIGGER fail_member_activation_browser BEFORE INSERT ON "PlatformAuditLog"
    FOR EACH ROW EXECUTE FUNCTION fail_member_activation_browser()`);
  try {
    await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${slug}/owner/members/new`);
    const key = await fillMemberEnrollment(page, { name: 'Activation Recovery Member', email, planId: plan.id });
    await page.getByRole('button', { name: 'Register member' }).click();
    await expect(page.locator('.ui-feedback[role="alert"]')).toContainText('Enrollment is pending recovery');
    await expect(page.getByLabel('Full name')).toHaveValue('Activation Recovery Member');
    await expect(page.getByLabel('Enrollment reference')).toHaveValue(key);
    await expect(page.getByLabel('Initial membership plan')).toHaveValue(plan.id);
    const operation = await fixture.master.operation.findFirstOrThrow({ where: { kind: 'REGISTER_MEMBER', idempotencyKey: key, gymId: fixture.gyms[0].id } });
    expect(operation.state).toBe('TENANT_COMMITTED');
    const member = await fixture.tenants[0].member.findUniqueOrThrow({ where: { email } });
    expect(await fixture.tenants[0].membershipTerm.count({ where: { memberId: member.id } })).toBe(1);
    expect(await fixture.tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: operation.id } })).toBe(1);
    expect(await fixture.tenants[0].auditLog.count({ where: { resourceId: member.id } })).toBe(1);
    expect(await fixture.master.credentialDelivery.count({ where: { operationId: operation.id } })).toBe(0);
    const link = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: member.identityId!, gymId: fixture.gyms[0].id } } });
    expect(link.linkStatus).toBe('PENDING');
    const bearer = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
    const headers = { authorization: `Bearer ${bearer}` };
    const roster = await request.get(`${apiBase}/gyms/${slug}/members?q=${encodeURIComponent(email)}`, { headers });
    expect(roster.status()).toBe(200);
    expect((await roster.json()).items).toEqual([]);
    expect((await request.get(`${apiBase}/gyms/${slug}/members/${member.id}`, { headers })).status()).toBe(404);
    const pendingContext = await browser.newContext();
    try {
      const pendingPage = await pendingContext.newPage();
      await openWithTestSession(pendingPage, member.identityId!, '/test-ui');
      const pendingToken = (await pendingContext.cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
      expect((await request.get(`${apiBase}/gyms/${slug}/access`, { headers: { authorization: `Bearer ${pendingToken}` } })).status()).toBe(403);
      const session = await request.get(`${apiBase}/auth/session`, { headers: { authorization: `Bearer ${pendingToken}` } });
      expect(session.status()).toBe(200);
      expect(JSON.stringify(await session.json())).not.toContain(member.id);
    } finally { await pendingContext.close(); }
    const repeated = await request.post(`${apiBase}/gyms/${slug}/member-registrations`, { headers, data: {
      fullName: 'Activation Recovery Member', email, phone: '+94112223346', dateOfBirth: '1994-04-10',
      emergencyContact: 'Synthetic contact', healthNotes: 'Private recovery boundary note', membershipPlanId: plan.id, idempotencyKey: key,
    } });
    expect([409, 500, 503]).toContain(repeated.status());
    expect(await fixture.master.operation.count({ where: { idempotencyKey: key, kind: 'REGISTER_MEMBER' } })).toBe(1);
    expect(await fixture.tenants[0].member.count({ where: { email } })).toBe(1);
    expect(await fixture.tenants[0].membershipTerm.count({ where: { memberId: member.id } })).toBe(1);
    await fixture.master.$executeRawUnsafe('DROP TRIGGER fail_member_activation_browser ON "PlatformAuditLog"');
    await fixture.master.$executeRawUnsafe('DROP FUNCTION fail_member_activation_browser()');
    await expect(page.getByLabel('Initial membership plan')).toHaveValue(plan.id);
    await page.getByRole('button', { name: 'Register member' }).click();
    await expect(page.getByRole('heading', { name: 'One-time credential handoff' })).toBeVisible();
    const password = await page.getByLabel('Temporary password').inputValue();
    expect(password.length).toBeGreaterThanOrEqual(20);
    const complete = await fixture.master.operation.findUniqueOrThrow({ where: { id: operation.id } });
    expect(complete.state).toBe('COMPLETE');
    expect(await fixture.tenants[0].membershipTerm.count({ where: { memberId: member.id } })).toBe(1);
    expect(await fixture.tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: operation.id } })).toBe(1);
    expect(await fixture.tenants[0].auditLog.count({ where: { resourceId: member.id } })).toBe(1);
    expect(await fixture.master.platformAuditLog.count({ where: { operationId: operation.id, eventCode: 'MEMBER_ACCESS_ACTIVATED' } })).toBe(1);
    expect(await fixture.tenants[1].member.count()).toBe(betaBefore);
    const replay = await request.post(`${apiBase}/gyms/${slug}/member-registrations`, { headers, data: {
      fullName: 'Activation Recovery Member', email, phone: '+94112223346', dateOfBirth: '1994-04-10',
      emergencyContact: 'Synthetic contact', healthNotes: 'Private recovery boundary note', membershipPlanId: plan.id, idempotencyKey: key,
    } });
    expect(replay.status()).toBe(201);
    expect(await replay.json()).toMatchObject({ status: 'COMPLETE', replayed: true, operationId: operation.id, memberId: member.id });
    expect(JSON.stringify(await replay.json())).not.toContain(password);
    expect(JSON.stringify(await fixture.master.operation.findUniqueOrThrow({ where: { id: operation.id } }))).not.toContain(password);
    await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new Error('denied'); } }));
    await page.getByRole('button', { name: 'Copy temporary password' }).click();
    await expect(page.locator('.ui-feedback[role="alert"]')).toContainText('Clipboard access was denied');
    await page.getByRole('button', { name: 'I have recorded the password' }).click();
    await expect(page).toHaveURL(new RegExp(`/gyms/${slug}/owner/members/${member.id}$`));
    expect(await page.content()).not.toContain(password);
    expect((await fixture.master.credentialDelivery.findUniqueOrThrow({ where: { operationId: operation.id } })).acknowledgedAt).toBeInstanceOf(Date);
  } finally {
    await fixture.master.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_member_activation_browser ON "PlatformAuditLog"');
    await fixture.master.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_member_activation_browser()');
  }
});

test('a lost browser action response recovers through the saved enrollment reference without replaying a secret', async ({ page, request }) => {
  test.setTimeout(90_000);
  const slug = fixture.gyms[0].slug;
  const email = `lost-browser-response-${environment.runId}@example.test`;
  const plan = await fixture.tenants[0].membershipPlan.create({ data: { name: 'Lost Response Plan', price: '0.0001', currency: 'LKR', durationDays: 7 } });
  const betaBefore = await fixture.tenants[1].member.count();
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${slug}/owner/members/new`);
  const details = { name: 'Lost Response Member', email, planId: plan.id };
  const key = await fillMemberEnrollment(page, details);
  let intercepted = 0;
  let finishIntercept!: () => void;
  const interceptedDone = new Promise<void>(resolve => { finishIntercept = resolve; });
  const actionUrl = `**/gyms/${slug}/owner/members/new`;
  await page.route(actionUrl, async route => {
    if (route.request().method() !== 'POST' || !route.request().headers()['next-action']) { await route.continue(); return; }
    intercepted++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.fulfill({ status: 503, contentType: 'text/plain', body: 'synthetic response loss' });
    finishIntercept();
  });
  await page.getByRole('button', { name: 'Register member' }).click();
  await interceptedDone;
  await expect.poll(async () => fixture.master.operation.count({ where: { kind: 'REGISTER_MEMBER', idempotencyKey: key } })).toBe(1);
  await page.unroute(actionUrl);
  expect(intercepted).toBe(1);
  const operation = await fixture.master.operation.findFirstOrThrow({ where: { kind: 'REGISTER_MEMBER', idempotencyKey: key } });
  expect(operation.state).toBe('COMPLETE');
  const member = await fixture.tenants[0].member.findUniqueOrThrow({ where: { email } });
  expect(await fixture.tenants[0].membershipTerm.count({ where: { memberId: member.id } })).toBe(1);
  expect(await fixture.master.credentialDelivery.count({ where: { operationId: operation.id } })).toBe(1);
  await page.goto('about:blank');
  await page.goto(`${webBase}/gyms/${slug}/owner/members/new`);
  await fillMemberEnrollment(page, { ...details, key });
  await page.getByRole('button', { name: 'Register member' }).click();
  await expect(page.getByRole('heading', { name: 'Member registered' })).toBeVisible();
  await expect(page.getByText(/one-time password is not replayable/)).toBeVisible();
  expect(await page.getByLabel('Temporary password').count()).toBe(0);
  expect(await fixture.tenants[0].member.count({ where: { email } })).toBe(1);
  expect(await fixture.tenants[0].membershipTerm.count({ where: { memberId: member.id } })).toBe(1);
  expect(await fixture.tenants[0].commandReceipt.count({ where: { sourceMasterOperationId: operation.id } })).toBe(1);
  expect(await fixture.tenants[1].member.count()).toBe(betaBefore);
  const bearer = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  const replay = await request.post(`${apiBase}/gyms/${slug}/member-registrations`, { headers: { authorization: `Bearer ${bearer}` }, data: {
    fullName: details.name, email, phone: '+94112223346', dateOfBirth: '1994-04-10', emergencyContact: 'Synthetic contact',
    healthNotes: 'Private recovery boundary note', membershipPlanId: plan.id, idempotencyKey: key,
  } });
  expect(replay.status()).toBe(201);
  expect(await replay.json()).toMatchObject({ replayed: true, operationId: operation.id, memberId: member.id });
  expect((await replay.json()).temporaryPassword).toBeUndefined();
  await page.getByRole('button', { name: 'Issue a replacement password' }).click();
  await expect(page.getByRole('heading', { name: 'One-time credential handoff' })).toBeVisible();
  const replacement = await page.getByLabel('Temporary password').inputValue();
  expect(replacement.length).toBeGreaterThanOrEqual(20);
  expect((await fixture.master.credentialDelivery.findUniqueOrThrow({ where: { operationId: operation.id } })).version).toBe(1);
  await page.getByRole('button', { name: 'I have recorded the password' }).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${slug}/owner/members/${member.id}$`));
  expect(await page.content()).not.toContain(replacement);
});

test('member roster and profile keep role, tenant, privacy, empty, and dependency-error boundaries', async ({ page, request }) => {
  test.setTimeout(90_000);
  const alpha = fixture.gyms[0].slug;
  const beta = fixture.gyms[1].slug;
  const betaMember = await fixture.tenants[1].member.findFirstOrThrow();
  // Task 039 above intentionally adds a term, pack and sessions to the linked
  // fixture member. Keep this empty-profile assertion independent from that
  // journey by using a separate active, unlinked synthetic member.
  const profileMember = await fixture.tenants[0].member.findFirstOrThrow({ where: { fullName: 'Alpha Person 002' } });
  const before = await Promise.all([
    fixture.master.operation.count(), fixture.master.platformAuditLog.count(), fixture.tenants[0].auditLog.count(),
    fixture.tenants[0].membershipTerm.count(), fixture.tenants[1].auditLog.count(),
  ]);
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${alpha}/owner/members`);
  await expect(page.getByRole('heading', { name: 'Member Management' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Gym members' })).toBeVisible();
  const memberEvidence = join(webDirectory, 'test-results/migration-evidence/GYMOS-MIG-032');
  await mkdir(memberEvidence, { recursive: true });
  await page.screenshot({ path: join(memberEvidence, 'roster-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.getByLabel('Search').fill('no-member-matches-012345');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No matching members.')).toBeVisible();
  await expect(page.getByText(/Showing 0–0 of/)).toBeVisible();
  await page.getByLabel('Search').fill(profileMember.email!);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Gym members' })).toContainText(profileMember.fullName);
  const ownerCookie = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  const ownerHeaders = { authorization: `Bearer ${ownerCookie}` };
  const ownerProfile = await request.get(`${apiBase}/gyms/${alpha}/members/${profileMember.id}`, { headers: ownerHeaders });
  expect(ownerProfile.status()).toBe(200);
  const profile = await ownerProfile.json();
  expect(profile.accountState).toBe('BASIC');
  expect(profile.memberships).toEqual([]);
  expect(profile.sessionPacks).toEqual([]);
  expect(profile.recentSessions).toEqual([]);
  for (const id of [betaMember.id, 'missing-member-id']) {
    const denied = await request.get(`${apiBase}/gyms/${alpha}/members/${id}`, { headers: ownerHeaders });
    expect(denied.status()).toBe(404);
    expect(await denied.json()).toEqual({ message: 'Member not found', error: 'Not Found', statusCode: 404 });
  }
  expect((await request.get(`${apiBase}/gyms/${beta}/members`, { headers: ownerHeaders })).status()).toBe(403);

  for (const actor of [fixture.users.memberUser, fixture.users.trainerUser, fixture.users.admin]) {
    await openWithTestSession(page, actor.id, '/test-ui');
    const token = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
    const headers = { authorization: `Bearer ${token}` };
    const list = await request.get(`${apiBase}/gyms/${alpha}/members`, { headers });
    const detail = await request.get(`${apiBase}/gyms/${alpha}/members/${profileMember.id}`, { headers });
    expect(list.status()).toBe(403);
    expect(detail.status()).toBe(403);
    const session = await request.get(`${apiBase}/auth/session`, { headers });
    expect(session.status()).toBe(200);
    const serialized = JSON.stringify(await session.json());
    for (const forbidden of ['healthNotes', 'passwordHash', 'credentialDelivery', 'databaseName', 'Private recovery boundary note']) {
      expect(serialized).not.toContain(forbidden);
    }
  }

  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${alpha}/owner/members/${profileMember.id}`);
  await expect(page.getByRole('heading', { name: profileMember.fullName, level: 1 })).toBeVisible();
  const tabs = page.getByRole('tablist').first();
  const overview = tabs.getByRole('tab', { name: 'Overview' });
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Attendance' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Membership & Packs' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(overview).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  await tabs.getByRole('tab', { name: 'Membership & Packs' }).click();
  await page.getByLabel('Session credits').fill('3');
  await page.getByLabel('Validity in days').fill('90');
  await page.getByLabel('Agreed pack price').fill('0');
  await page.getByRole('button', { name: 'Issue pack' }).click();
  await expect(page.getByText('Issued 3 session credits. No payment was recorded.')).toBeVisible();
  await expect(page.locator('.session-pack-panel')).toContainText('3 sessions issued');
  await expect(page.locator('.session-pack-panel')).toContainText('3 available');
  expect(await fixture.tenants[0]!.sessionPack.count({ where: { memberId: profileMember.id } })).toBe(1);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(memberEvidence, 'profile-320.png'), fullPage: true, animations: 'disabled' });
  await fixture.tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: null } });
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Profile unavailable', level: 1 })).toBeVisible();
    await expect(page.locator('.ui-feedback[role="alert"]')).toContainText('profile could not be loaded');
    await page.screenshot({ path: join(memberEvidence, 'profile-error-320.png'), fullPage: true, animations: 'disabled' });
    await fixture.tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo' } });
    await page.getByRole('link', { name: 'Retry' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: profileMember.fullName, level: 1 })).toBeVisible();
  } finally {
    await fixture.tenants[0].gymConfiguration.update({ where: { id: 'current' }, data: { timezone: 'Asia/Colombo' } });
  }
  const after = await Promise.all([
    fixture.master.operation.count(), fixture.master.platformAuditLog.count(), fixture.tenants[0].auditLog.count(),
    fixture.tenants[0].membershipTerm.count(), fixture.tenants[1].auditLog.count(),
  ]);
  expect(after).toEqual([before[0], before[1], before[2] + 1, before[3], before[4]]);
});

test('member roster and profile expose accessible loading states while tenant reads wait', async ({ page }) => {
  test.setTimeout(90_000);
  const slug = fixture.gyms[0].slug;
  const member = await fixture.tenants[0].member.findFirstOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  await openWithTestSession(page, fixture.users.ownerA.id, `/gyms/${slug}/owner`);
  for (const path of [`/gyms/${slug}/owner/members`, `/gyms/${slug}/owner/members/${member.id}`]) {
    let release!: () => void;
    let acquired!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { acquired = resolve; });
    const transaction = fixture.tenants[0].$transaction(async tx => {
      await tx.$executeRawUnsafe('LOCK TABLE "Member" IN ACCESS EXCLUSIVE MODE');
      acquired();
      await held;
    }, { timeout: 30_000 });
    try {
      await ready;
      await page.goto(`${webBase}${path}`, { waitUntil: 'commit' });
      await expect(page.getByRole('status')).toContainText(path.endsWith('/members') ? 'Loading members…' : 'Loading member profile…');
    } finally {
      release();
      await transaction;
    }
    await page.goto(`${webBase}${path}`);
    await expect(page.getByRole('heading', { name: path.endsWith('/members') ? 'Member Management' : member.fullName, level: 1 })).toBeVisible();
  }
});

test('owner appearance upgrades live operations with accurate metrics and recoverable refresh', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = `/gyms/${fixture.gyms[0].slug}/owner`;
  await openWithTestSession(page, fixture.users.ownerA.id, base);
  await expect(page.locator('.owner-workspace')).toBeVisible();
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  const response = await request.get(`${apiBase}/gyms/${fixture.gyms[0].slug}/dashboard`, { headers: { authorization: `Bearer ${token}` } });
  expect(response.ok()).toBe(true);
  const snapshot = await response.json();
  await expect(page.locator('.dashboard-metric').nth(0).locator('strong')).toHaveText(String(snapshot.metrics.activeSessionsToday.value));
  await expect(page.locator('.dashboard-metric').nth(1).locator('strong')).toHaveText(String(snapshot.metrics.activeSessions.value));
  await expect(page.locator('.dashboard-metric').nth(3).locator('strong')).toHaveText(String(snapshot.metrics.trainersWithSessionsToday.value));
  await expect(page.locator('.owner-request-summary')).toContainText(`${snapshot.metrics.pendingRequests.value} pending PT`);
  await expect(page.locator('main')).not.toContainText('Members in Gym');
  const evidence = join(webDirectory, 'test-results/ui-transformation/gym-owner');
  await mkdir(evidence, { recursive: true });
  const geometry: Record<number, unknown> = {};
  for (const mode of ['light', 'dark'] as const) {
    await page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await page.locator('.dashboard-metrics').boundingBox();
      if (mode === 'light') geometry[width] = box;
      else expect(box).toEqual(geometry[width]);
      await expect(page.locator('.dashboard-metric').first()).toHaveCSS('background-color', mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(23, 36, 59)');
      expect(await contrastRatio(page, '.dashboard-metric')).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ path: join(evidence, `${mode}-dashboard-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('.shell-sidebar')).toHaveCSS('width', '80px');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Members', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Member Management' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await page.goto(`${webBase}${base}`);
  const values = await page.locator('.dashboard-metric strong').allTextContents();
  expect(errors).toEqual([]);
  await page.route(`**${base}`, route => route.request().method() === 'POST' && route.request().headers()['next-action'] ? route.abort('failed') : route.continue());
  const abortedRefresh = page.waitForEvent('requestfailed', request => request.method() === 'POST' && Boolean(request.headers()['next-action']));
  await page.getByRole('button', { name: 'Refresh live status', exact: true }).click();
  expect((await abortedRefresh).failure()?.errorText).toMatch(/ERR_(FAILED|ABORTED)/);
  await expect(page.locator('.owner-dashboard-live').getByRole('alert')).toContainText('last loaded values remain visible');
  expect(await page.locator('.dashboard-metric strong').allTextContents()).toEqual(values);
  // Depending on the Next runtime, the deliberately aborted transport may also
  // emit a page error. Only that expected message is allowed during injection.
  expect(errors.filter(message => message !== 'Failed to fetch')).toEqual([]);
  errors.length = 0;
  await page.unroute(`**${base}`);
  await page.getByRole('button', { name: 'Refresh live status', exact: true }).click();
  await expect(page.locator('.owner-dashboard-live').getByRole('alert')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 844 });
  const menu = page.getByRole('button', { name: 'Open navigation menu' });
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Refresh live status', exact: true })).toHaveCSS('transition-duration', '0s');
  expect(errors).toEqual([]);
});

test('owner appearance covers directories profiles sessions finance and configuration in both themes', async ({ page, request }) => {
  test.setTimeout(480_000);
  const base = `/gyms/${fixture.gyms[0].slug}/owner`;
  const member = await fixture.tenants[0].member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await fixture.tenants[0].trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const evidence = join(webDirectory, 'test-results/ui-transformation/gym-owner');
  await mkdir(evidence, { recursive: true });
  await openWithTestSession(page, fixture.users.ownerA.id, `${base}/members`, 3600);
  const paths = ['/members', '/members/new', `/members/${member.id}`, '/trainers', '/trainers/new', `/trainers/${trainer.id}`, '/sessions', '/sessions?view=list&mode=month', '/sessions/book', '/financials', '/financials?tab=expenses', '/financials?tab=payroll', '/analytics', '/gym-config', '/audit', '/subscription'];
  for (const mode of ['light', 'dark'] as const) {
    await page.getByRole('button', { name: mode === 'light' ? 'Atlas Light' : 'Midnight Blue', exact: true }).click();
    for (const [index, path] of paths.entries()) {
      await page.goto(`${webBase}${base}${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
      await expect(page.locator('.owner-workspace')).toBeVisible();
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth).catch(() => false),
          { message: `${mode} ${path} at ${width}px` }).toBe(true);
        await page.screenshot({ path: join(evidence, `${mode}-screen-${index}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
    }
    await page.goto(`${webBase}${base}/gym-config`);
    for (const name of ['Gym Profile', 'Membership Plans', 'PT Session Rates', 'Trainer Pay Rates', 'Cancellation Policy']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth).catch(() => false),
        { message: `${mode} config ${name}` }).toBe(true);
    }
  }
  await page.goto(`${webBase}${base}/members`);
  await page.getByLabel('Search', { exact: true }).fill('no-owner-ui-match');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No matching members.', { exact: true })).toBeVisible();
  await page.getByLabel('Search', { exact: true }).fill(member.fullName);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Gym members' })).toContainText(member.fullName);
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'gymos_access_token')!.value;
  expect((await request.get(`${apiBase}/gyms/${fixture.gyms[1].slug}/dashboard`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(403);
  await page.goto(`${webBase}${base}/financials?tab=expenses`);
  const expenseForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Save expense', exact: true }) });
  await expect(expenseForm.getByRole('checkbox')).toHaveCSS('width', '18px');
  await expect(expenseForm.getByRole('checkbox')).toHaveCSS('height', '18px');
  await expenseForm.getByLabel('Amount (LKR)').fill('12.34');
  await expenseForm.getByLabel('Description', { exact: true }).fill('Owner UI verification expense');
  await expenseForm.getByRole('button', { name: 'Save expense', exact: true }).click();
  await expect(expenseForm.locator('.ui-feedback-success')).toBeVisible();
  expect(await fixture.tenants[0].expenseRecord.count({ where: { description: 'Owner UI verification expense' } })).toBe(1);
  expect(await fixture.tenants[1].expenseRecord.count({ where: { description: 'Owner UI verification expense' } })).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openWithTestSession(page, fixture.users.multiOwner.id, base);
  await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Switch gym', exact: true })).toHaveCount(0);
  await openWithTestSession(page, fixture.users.multiOwner.id, `/gyms/${fixture.gyms[1].slug}/owner`);
  await expect(page).toHaveURL(new RegExp(`/gyms/${fixture.gyms[1].slug}/owner$`));
  await expect(page.locator('.workspace-header-gym')).toHaveText('Test Gym Beta');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await openWithTestSession(page, fixture.users.memberUser.id, `${base}/members`);
  await expect(page.locator('.owner-workspace')).toHaveCount(0);
});
