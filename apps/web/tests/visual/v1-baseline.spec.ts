/* eslint-disable @typescript-eslint/no-explicit-any -- V1 generated types exist only inside the disposable runtime. */
import { test, expect } from '@playwright/test';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, lstat, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { createDisposableEnvironment } from '../../../api/test/support/disposable-environment';
import { clock, gymA, gymB, memberId, trainerId, roles, seedV1 } from './v1-fixture';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const original = resolve(root, '../gymos');
const evidence = join(root, 'apps/web/tests/visual/fixtures/v1-baseline');
const viewports = [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 700 }];
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

async function snapshot() {
  const git = async (...args: string[]) => (await execute('git', ['-C', original, ...args])).stdout;
  const files = (await git('ls-files', '-z', '--cached', '--others', '--exclude-standard')).split('\0').filter(Boolean).sort();
  const hashes = Object.fromEntries(await Promise.all(files.map(async path => [path, sha(await readFile(join(original, path)))])));
  const protectedGenerated: Record<string, string> = {};
  for (const file of ['node_modules/.prisma/client/schema.prisma', 'node_modules/.prisma/client/index.js']) {
    protectedGenerated[file] = sha(await readFile(join(original, file)));
  }
  const generatedDirectory = join(original, '.next');
  const generatedFiles = await readdir(generatedDirectory, { recursive: true }).catch(() => []);
  const generatedMetadata = await Promise.all(generatedFiles.sort().map(async file => {
    const info = await lstat(join(generatedDirectory, file));
    return [file, info.size, info.mtimeMs, info.isSymbolicLink()];
  }));
  protectedGenerated['.next file metadata digest'] = sha(JSON.stringify(generatedMetadata));
  return { revision: (await git('rev-parse', 'HEAD')).trim(), status: await git('status', '--porcelain=v1'), hashes, protectedGenerated };
}
async function freePort() {
  const server = createServer();
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No local port');
  await new Promise<void>(r => server.close(() => r()));
  return address.port;
}

test('capture synthetic V1 references without changing the original checkout', async ({ browser }) => {
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw Error('Requires explicit owned Docker permission');
  await rm(join(evidence, 'images'), { recursive: true, force: true });
  await mkdir(join(evidence, 'images'), { recursive: true });
  const harnessHashes = Object.fromEntries(await Promise.all(['apps/web/tests/visual/v1-baseline.spec.ts', 'apps/web/tests/visual/v1-fixture.ts', 'apps/web/tests/visual/verify-v1-evidence.mjs', 'apps/web/playwright.config.v1-visual.ts'].map(async file => [file, sha(await readFile(join(root, file)))])));
  const before = await snapshot();
  expect(before.revision).toBe('058aa8532741c4cb84289589fd2cf89282882988');
  expect(before.status).toBe('');
  const work = await mkdtemp(join(tmpdir(), 'gymos-v1-visual-'));
  const copy = join(work, 'v1');
  let environment: Awaited<ReturnType<typeof createDisposableEnvironment>> | undefined;
  let server: ChildProcess | undefined;
  let db: any;
  const captures: any[] = [];
  const assertions: any[] = [];
  const failures: string[] = [];
  const dialogs: any[] = [];
  let diagnostics = '';
  try {
    // Copy tracked source only; exclude all secret/config files and generated outputs.
    for (const file of Object.keys(before.hashes)) {
      if (/(^|\/)\.env(?:\.|$)/.test(file)) continue;
      await mkdir(dirname(join(copy, file)), { recursive: true });
      await cp(join(original, file), join(copy, file));
    }
    await symlink(join(original, 'node_modules'), join(copy, 'node_modules'), 'dir');
    // The installed V1 client is stale. Generate solely into the disposable copy.
    const schemaPath = join(copy, 'prisma/schema.prisma');
    await writeFile(schemaPath, (await readFile(schemaPath, 'utf8')).replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../generated"'));
    for (const file of Object.keys(before.hashes).filter(file => /\.[cm]?tsx?$/.test(file))) {
      const path = join(copy, file);
      await writeFile(path, (await readFile(path, 'utf8')).replaceAll('@prisma/client', '@/generated'));
    }
    await writeFile(join(copy, 'next.config.ts'), (await readFile(join(copy, 'next.config.ts'), 'utf8')).replace('poweredByHeader: false,', 'poweredByHeader: false,\n  devIndicators: false,'));
    // Freeze source-level application time without freezing the Next compiler/watch clock.
    for (const file of Object.keys(before.hashes).filter(file => /\.[cm]?tsx?$/.test(file))) {
      const path = join(copy, file);
      await writeFile(path, (await readFile(path, 'utf8')).replaceAll('new Date()', `new Date('${clock}')`).replaceAll('Date.now()', `(${Date.parse(clock)})`).replace(/<(Area|Bar|Line|Pie)(?=[\s>])/g, '<$1 isAnimationActive={false}'));
    }
    const changePasswordClient = join(copy, 'app/(auth)/change-password/change-password-form.tsx');
    await writeFile(changePasswordClient, (await readFile(changePasswordClient, 'utf8')).replace('}), 1600)', '}), 60000)'));
    // Render the unchanged authored special-state components in a fixture-only route.
    await mkdir(join(copy, 'app/(dashboard)/visual-reference'), { recursive: true });
    await writeFile(join(copy, 'app/(dashboard)/visual-reference/page.tsx'), `"use client"; import { useSearchParams } from 'next/navigation'; import ErrorState from '../error'; import MissingState from '../not-found'; import LoadingState from '../owner/loading'; export default function Reference() { const state = useSearchParams().get('state'); return state === 'error' ? <ErrorState error={new Error('Synthetic dependency unavailable')} reset={() => {}} /> : state === 'not-found' ? <MissingState /> : <LoadingState />; }`);
    environment = await createDisposableEnvironment();
    await environment.verifyOwnership(environment.masterName);
    const childEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, TZ: 'UTC', NODE_ENV: 'development' as const, NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: environment.masterUrl, AUTH_SECRET: randomBytes(48).toString('hex') };
    const require = createRequire(join(copy, 'package.json'));
    await execute(process.execPath, [require.resolve('prisma/build/index.js'), 'generate', '--schema', schemaPath], { cwd: copy, env: childEnv, timeout: 60_000 });
    await execute(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema', join(copy, 'prisma/schema.prisma')], { cwd: copy, env: childEnv, timeout: 60_000 });
    const fixture = await seedV1(copy, environment.masterUrl);
    db = fixture.db;
    const counts = async () => Object.fromEntries(await Promise.all(['gym', 'user', 'membership', 'sessionPack', 'pTSession', 'revenueRecord', 'expenseRecord', 'auditLog', 'payPeriod', 'payRecord', 'gymSubscription', 'notification'].map(async model => [model, await db[model].count()])));
    const seededCounts = await counts();
    const portable = { schema: 'Synthetic visual fixture v1; IDs are fixture-local references, not migration IDs', clock, gyms: await db.gym.findMany(), people: await db.user.findMany({ select: { id: true, gymId: true, fullName: true, email: true, phone: true, role: true, memberStatus: true, trainerStatus: true, trainerLevel: true, specialisations: true, yearsExperience: true, bio: true, healthNotes: true, shiftStart: true, shiftEnd: true } }), data: Object.fromEntries(await Promise.all(['membershipPlan', 'membership', 'sessionPack', 'pTSession', 'workoutPlan', 'workoutExercise', 'mealPlan', 'mealPlanEntry', 'bodyMetric', 'revenueRecord', 'expenseRecord', 'categoryBudget', 'payPeriod', 'payRecord', 'auditLog', 'notification', 'gymSubscription'].map(async model => [model, await db[model].findMany()]))) };
    await writeFile(join(evidence, 'synthetic-records.json'), JSON.stringify(portable, null, 2));
    await writeFile(join(evidence, 'fixture.json'), JSON.stringify({ clock, locale: 'en-US', timezone: 'UTC', currency: 'V1 source $ formatting (reference only; V2 DEC-06 applies)', gyms: [gymA, gymB], roles, counts: seededCounts, source: 'Programmatically generated synthetic values only; no original data or configuration read', readSideEffectsPrecreated: ['GymSubscription for both gyms', 'Current PayPeriod for both gyms'], knownDifferences: ['V1 has no per-gym theme; use two names and platform Classic colors', 'V1 monetary floats remain reference-only'], credentials: 'Random runtime-only; excluded from output' }, null, 2));
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: copy, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [server.stdout, server.stderr]) stream?.on('data', chunk => { diagnostics = (diagnostics + chunk.toString()).slice(-30_000); });
    for (let i = 0; i < 150; i++) {
      if (server.exitCode !== null) throw Error('Disposable Next server exited');
      try { if ((await fetch(`${base}/login`)).ok) break; } catch { /* booting */ }
      if (i === 149) throw Error('Disposable server did not start');
      await new Promise(r => setTimeout(r, 500));
    }
    const { encode } = await import(pathToFileURL(require.resolve('next-auth/jwt')).href);
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'UTC', deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(({ clock }) => {
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args: any[]) { super(...(args.length ? args : [clock]) as [any]); }
        static now() { return new NativeDate(clock).getTime(); }
      } as DateConstructor;
    }, { clock });
    // Network is confined to the disposable loopback runtime.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol)) return route.abort().catch(() => undefined);
      return route.continue().catch(() => undefined);
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(60_000);
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push({ type: dialog.type(), message: dialog.message() }); await dialog.dismiss(); });
    let currentRole = '';
    async function as(role: keyof typeof roles | 'public', required = false) {
      currentRole = role;
      await context.clearCookies();
      if (role === 'public') return;
      const actor = roles[role];
      const token = await encode({ secret: childEnv.AUTH_SECRET, salt: 'authjs.session-token', token: { ...actor, email: `${actor.id}@example.test`, mustChangePassword: required, checkedAt: Date.parse(clock) }, maxAge: 86400 * 365 });
      await context.addCookies([{ name: 'authjs.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    }
    async function go(path: string) {
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        response = await page.goto(`${base}${path}`);
        if (response && response.status() < 500) break;
        if (attempt < 3) await page.waitForTimeout(1_000);
      }
      if (!response || response.status() >= 500) throw Error(`Page failed after 3 attempts: ${path}`);
      await page.locator('body').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
    }
    async function shot(id: string, state: string, widths = viewports, note = '') {
      for (const viewport of widths) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(100);
        const name = `${id}-${state}-${viewport.width}.png`;
        const data = await page.screenshot({ path: join(evidence, 'images', name), fullPage: true, animations: 'disabled', caret: 'hide', mask: [page.locator('code.select-all')], maskColor: '#8B8E98' });
        captures.push({ id, state, role: currentRole, route: new URL(page.url()).pathname, viewport, deviceScaleFactor: 1, browser: browser.version(), capturedAt: new Date().toISOString(), font: await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), clock, image: `images/${name}`, sha256: sha(data), imageDimensions: { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }, outcome: 'captured', referenceOnly: id === 'O14' || /payment|receipt|billing/.test(state), horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), note });
      }
      const cropTarget = page.locator('div.fixed.inset-0 > div.bg-white').last();
      if (await cropTarget.isVisible().catch(() => false)) {
        const name = `${id}-${state}-overlay-crop-${page.viewportSize()!.width}.png`;
        const data = await cropTarget.screenshot({ path: join(evidence, 'images', name), animations: 'disabled', caret: 'hide' });
        captures.push({ ...captures.at(-1), state: `${state}-overlay-crop`, image: `images/${name}`, sha256: sha(data), imageDimensions: { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }, crop: 'Original overlay panel bounds' });
      }
      if (['O01', 'O10', 'O11'].includes(id) && ['baseline', 'chart-hover'].includes(state)) {
        const chart = page.locator('.recharts-wrapper').first();
        if (await chart.isVisible().catch(() => false)) {
          const name = `${id}-${state}-chart-crop-${page.viewportSize()!.width}.png`;
          const data = await chart.screenshot({ path: join(evidence, 'images', name), animations: 'disabled' });
          captures.push({ ...captures.at(-1), state: `${state}-chart-crop`, image: `images/${name}`, sha256: sha(data), imageDimensions: { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }, crop: 'Original chart wrapper bounds' });
        }
      }
      console.log(`Captured ${id} ${state}`);
    }
    const mobileDesktop = [viewports[0], viewports[2]];
    async function scenario(id: string, state: string, run: () => Promise<void>) {
      const effectsBefore = await counts();
      try { await run(); const effectsAfter = await counts(); assertions.push({ name: `${id}/${state}`, passed: true, effectsBefore, effectsAfter }); } catch (error) { failures.push(`${id}/${state}: ${String(error).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED]')}`); console.log(`FAILED ${id}/${state}: ${String(error).slice(0, 350)}`); const secrets = await page.locator('code.select-all').allTextContents().catch(() => []); let text = await page.locator('body').innerText().catch(() => '[Page unavailable]'); for (const secret of secrets) text = text.replaceAll(secret, '[REDACTED]'); await writeFile(join(evidence, 'last-failure.txt'), text.slice(0, 10000)); }
    }
    async function button(name: string | RegExp) { await page.getByRole('button', { name, exact: typeof name === 'string' }).first().click(); }
    const routes: Array<[string, keyof typeof roles | 'public', string]> = [
      ['A01', 'public', '/login'], ['A02', 'owner', '/change-password'], ['S01', 'admin', '/admin'],
      ['O01', 'owner', '/owner'], ['O02', 'owner', '/owner/members'], ['O03', 'owner', '/owner/members/new'], ['O04', 'owner', `/owner/members/${memberId}`], ['O05', 'owner', '/owner/trainers'], ['O06', 'owner', '/owner/trainers/new'], ['O07', 'owner', `/owner/trainers/${trainerId}`], ['O08', 'owner', '/owner/sessions'], ['O09', 'owner', '/owner/sessions/book'], ['O10', 'owner', '/owner/financials'], ['O11', 'owner', '/owner/analytics'], ['O12', 'owner', '/owner/gym-config'], ['O13', 'owner', '/owner/audit-log'], ['O14', 'owner', '/owner/subscription'],
      ['T01', 'trainer', '/trainer/schedule'], ['T02', 'trainer', '/trainer/clients'], ['T03', 'trainer', `/trainer/clients/${memberId}`], ['T04', 'trainer', `/trainer/plans/workout/new?clientId=${memberId}`], ['T05', 'trainer', `/trainer/plans/meal/new?clientId=${memberId}`], ['T06', 'trainer', '/trainer/earnings'], ['M01', 'member', '/member/trainers'], ['M02', 'member', `/member/trainers/${trainerId}/book`], ['M03', 'member', '/member/sessions'],
    ];
    for (const [id, role, path] of routes) await scenario(id, 'baseline', async () => {
      await as(role); await go(path); await shot(id, 'baseline');
      expect(new URL(page.url()).pathname).toBe(path.split('?')[0]);
    });
    const afterReads = await counts();
    assertions.push({ name: 'All 26 baseline GETs preserve persisted effect counts', before: seededCounts, after: afterReads, passed: JSON.stringify(seededCounts) === JSON.stringify(afterReads) });
    expect(afterReads).toEqual(seededCounts);

    // Additional source-rendered states: no DOM text substitutions or fake screenshots.
    await as('owner');
    for (const [id, path, tabs] of [
      ['O04', `/owner/members/${memberId}`, ['Attendance History', 'Billing History']],
      ['O08', '/owner/sessions', ['Monthly Member Overview']],
      ['O10', '/owner/financials', ['Expense Management', 'Deferred Revenue', 'Trainer Payroll', 'P&L Report', 'Export Data']],
      ['O12', '/owner/gym-config', ['Membership Plans', 'PT Session Rates', 'Trainer Pay Rates', 'Cancellation Policy']],
    ] as Array<[string, string, string[]]>) {
      for (const tab of tabs) await scenario(id, tab, async () => { await go(path); await button(tab); await shot(id, tab.toLowerCase().replace(/[^a-z]+/g, '-'), mobileDesktop); });
    }
    await as('trainer');
    for (const tab of ['Workout Plans', 'Meal Plans', 'Session History']) await scenario('T03', tab, async () => { await go(`/trainer/clients/${memberId}`); await button(tab); await shot('T03', tab.toLowerCase().replace(/ /g, '-'), mobileDesktop); });

    // Auth feedback is produced by the actual disposable Auth.js runtime.
    await scenario('A01', 'auth-feedback', async () => {
      await as('public'); await go('/login');
      await page.locator('input[type=email]').fill('missing@example.test');
      await page.locator('input[type=password]').fill('Synthetic-invalid-credential');
      await button('Sign In to Dashboard');
      await expect(page.getByText('Invalid email or password.', { exact: true })).toBeVisible();
      await shot('A01', 'invalid-credentials', mobileDesktop);
      for (let i = 0; i < 5; i++) { await button('Sign In to Dashboard'); await expect(page.getByRole('button', { name: 'Sign In to Dashboard' })).toBeEnabled(); }
      await expect(page.getByText(/Too many sign-in attempts/)).toBeVisible();
      await shot('A01', 'rate-limited', mobileDesktop);
      await page.locator('input[type=email]').fill('member-03@example.test');
      await page.locator('input[type=password]').fill(fixture.password);
      await button('Sign In to Dashboard');
      await expect(page.getByText(/no longer active/)).toBeVisible();
      await shot('A01', 'inactive-account', mobileDesktop);
    });
    await scenario('A02', 'required-and-validation', async () => {
      await as('owner', true); await go('/change-password');
      await shot('A02', 'required', mobileDesktop);
      await page.locator('[name=currentPassword]').fill('Wrong-synthetic-password');
      await page.locator('[name=newPassword]').fill('short');
      await page.locator('[name=confirmPassword]').fill('different');
      await button('Update password');
      await expect(page.getByRole('alert')).toBeVisible();
      await shot('A02', 'validation-error', mobileDesktop);
    });
    await as('owner');
    // Populated filtering, true no-match states and real second pages.
    for (const [id, path] of [['O02', '/owner/members'], ['O05', '/owner/trainers'], ['T02', '/trainer/clients'], ['M01', '/member/trainers']]) {
      await scenario(id, 'filter-and-empty', async () => {
        await as(id === 'T02' ? 'trainer' : id === 'M01' ? 'member' : 'owner'); await go(path);
        const search = page.locator('input[type=search], input[placeholder*="Search"]').first();
        await search.fill('Synthetic'); await shot(id, 'filtered', mobileDesktop);
        await search.fill('NoSuchSyntheticPerson'); await shot(id, 'no-matches', mobileDesktop);
        await search.fill('');
        const next = page.getByRole('button', { name: 'Next page', exact: true });
        if (await next.count() && await next.isEnabled()) { await next.click(); await shot(id, 'page-2', mobileDesktop); }
      });
    }
    for (const [id, action] of [['O04', 'Suspend Member'], ['O04', 'Issue New Pack'], ['O07', 'Deactivate Trainer'], ['O08', 'Mark Complete'], ['O10', 'Log Expense']]) {
      await scenario(id, action, async () => {
        await as('owner'); await go(routes.find(row => row[0] === id)![2]); await button(action);
        await shot(id, action.toLowerCase().replace(/ /g, '-'), mobileDesktop);
      });
    }
    await scenario('O04', 'pack-error', async () => {
      await as('owner'); await go(`/owner/members/${memberId}`); await button('Issue New Pack');
      await page.locator('[name=totalSessions]').fill('-1'); await button('Confirm & Issue Pack');
      await expect(page.getByText(/Total sessions must|at least|positive/i).first()).toBeVisible();
      await shot('O04', 'pack-validation-error', mobileDesktop);
    });
    await scenario('O04', 'payment-reference', async () => {
      await as('owner'); await go(`/owner/members/${memberId}`); await button('Billing History');
      await button('Download Receipt');
      await button('Record Desk Payment'); await shot('O04', 'desk-payment-reference', mobileDesktop, 'Deferred payment/receipt control; reference only. Native receipt alert recorded in manifest.');
    });
    await scenario('O04', 'no-pack', async () => { await as('owner'); await go('/owner/members/visual-member-03'); await shot('O04', 'without-pack', mobileDesktop); });
    await scenario('O07', 'shift-feedback', async () => {
      await as('owner'); await go(`/owner/trainers/${trainerId}`); await button(/Approve|Save Shift/);
      await expect(page.getByText('Shift hours approved and updated!', { exact: true })).toBeVisible(); await shot('O07', 'shift-success', mobileDesktop);
    });
    await scenario('O08', 'daily-filter', async () => {
      await as('owner'); await go('/owner/sessions');
      await page.getByLabel('Filter sessions by status').selectOption('MISSED'); await shot('O08', 'missed-filter', mobileDesktop);
      await page.getByLabel('Search sessions by member or trainer').fill('Nobody'); await shot('O08', 'empty-filter', mobileDesktop);
    });
    await scenario('O08', 'monthly-more', async () => {
      await as('owner'); await go('/owner/sessions'); await button('Monthly Member Overview'); await button(/^More/); await shot('O08', 'monthly-more-overlay', mobileDesktop);
    });
    await scenario('O10', 'budget-dialog', async () => { await as('owner'); await go('/owner/financials'); await button('Expense Management'); await button('Set Monthly Budgets'); await shot('O10', 'budget-dialog', mobileDesktop); });
    for (const status of ['CLOSED', 'APPROVED']) await scenario('O10', `payroll-${status}`, async () => {
      await db.payPeriod.update({ where: { id: `${gymA}-period` }, data: { status } });
      await as('owner'); await go('/owner/financials'); await button('Trainer Payroll'); await shot('O10', `payroll-${status.toLowerCase()}`, mobileDesktop);
    });
    await db.payPeriod.update({ where: { id: `${gymA}-period` }, data: { status: 'OPEN' } });
    await scenario('O10', 'payroll-native-confirm', async () => { await as('owner'); await go('/owner/financials'); await button('Trainer Payroll'); await button('Close Pay Period'); await shot('O10', 'payroll-confirm-dismissed', mobileDesktop, 'Native confirm text recorded separately; Playwright dismisses it without mutation.'); });
    await scenario('O11', 'chart-tooltip', async () => { await as('owner'); await go('/owner/analytics'); await page.setViewportSize(viewports[0]); await page.locator('.recharts-wrapper').first().hover(); await shot('O11', 'chart-hover', mobileDesktop); });
    await scenario('O12', 'inline-plan', async () => { await as('owner'); await go('/owner/gym-config'); await button('Membership Plans'); await button('+ Add New Plan'); await shot('O12', 'add-plan-inline', mobileDesktop); });
    await scenario('O12', 'save-profile', async () => {
      await as('owner'); await go('/owner/gym-config'); await button('Save Profile Settings');
      await expect(page.getByText(/successfully/i).first()).toBeVisible(); await shot('O12', 'profile-success', mobileDesktop);
    });
    await scenario('O13', 'filter-pagination', async () => {
      await as('owner'); await go('/owner/audit-log'); await button('Next'); await shot('O13', 'page-2', mobileDesktop);
      await page.locator('select').first().selectOption('MEMBER_CREATED'); await expect(page.getByText('MEMBER_CREATED', { exact: true }).first()).toBeVisible(); await shot('O13', 'filtered', mobileDesktop);
      await page.locator('select').first().selectOption('MEMBER_SUSPENDED'); await expect(page.getByText('No audit log records found.')).toBeVisible(); await shot('O13', 'empty-filter', mobileDesktop);
    });
    await scenario('T01', 'decline-notes', async () => {
      await as('trainer'); await go('/trainer/schedule'); await button('Decline'); await shot('T01', 'decline-dialog', mobileDesktop);
      await go('/trainer/schedule'); await button(/Log Notes|Edit Notes/); await shot('T01', 'notes-dialog', mobileDesktop);
    });
    for (const [id, path, add] of [['T04', '/trainer/plans/workout/new', 'Add Exercise'], ['T05', '/trainer/plans/meal/new', 'Add Meal']]) await scenario(id, 'dynamic-draft', async () => {
      await as('trainer'); await go(`${path}?clientId=${memberId}`); await button(add);
      await shot(id, 'row-added', mobileDesktop);
      const trash = page.locator('button').filter({ has: page.locator('svg.lucide-trash2, svg.lucide-trash-2') });
      await trash.last().click(); await shot(id, 'row-removed', mobileDesktop);
      if (id === 'T05') { await page.locator('input[type=number]').first().fill('650'); await shot(id, 'edited-macro-totals', mobileDesktop); }
      await page.locator('form button[type=submit]').click();
      expect(await page.locator('input:invalid').count()).toBeGreaterThan(0); await shot(id, 'native-validation', mobileDesktop, 'Native validation state; browser tooltip is not part of page pixels.');
    });
    await scenario('M03', 'cancellation', async () => { await as('member'); await go('/member/sessions'); await button(/Cancel|Withdraw/); await shot('M03', 'cancellation-warning', mobileDesktop); });

    // Create fixture-only accounts through original actions. No plaintext credential is saved.
    for (const [id, kind] of [['O03', 'member'], ['O06', 'trainer']]) await scenario(id, 'registration-states', async () => {
      await as('owner'); const path = `/owner/${kind}s/new`; await go(path);
      await page.locator('form button[type=submit]').click();
      expect(await page.locator('input:invalid').count()).toBeGreaterThan(0); await shot(id, 'native-validation', mobileDesktop);
      async function fillRegistration(email: string) {
        await page.locator('[name=fullName]').fill(`Synthetic New ${kind}`); await page.locator('[name=email]').fill(email); await page.locator('[name=phone]').fill('000-000-0000');
        if (kind === 'member') { await page.locator('[name=dateOfBirth]').fill('1995-06-15'); await page.locator('[name=membershipPlanId]').selectOption('visual-plan'); }
      }
      await fillRegistration('member-00@example.test'); await page.locator('form button[type=submit]').click();
      await expect(page.getByText(/already|exists|registered/i).last()).toBeVisible(); await shot(id, 'duplicate-email-error', mobileDesktop);
      await fillRegistration(`new-${kind}@example.test`);
      let release!: () => void;
      const gate = new Promise<void>(r => { release = r; });
      await page.route(`**${path}`, async route => { if (route.request().method() === 'POST') await gate; await route.continue().catch(() => undefined); });
      await page.locator('form button[type=submit]').click();
      try { await expect(page.locator('form button[type=submit]')).toBeDisabled(); await shot(id, 'submitting', mobileDesktop); } finally { release(); }
      await expect(page.getByText(/can now sign in/)).toBeVisible();
      await shot(id, 'one-time-handoff-redacted', mobileDesktop);
      await button('Copy temporary password'); await expect(page.getByRole('button', { name: 'Copy temporary password' })).toContainText('Copied'); await shot(id, 'handoff-copy', mobileDesktop);
      await page.unrouteAll({ behavior: 'wait' });
      const created = await db.user.count({ where: { email: `new-${kind}@example.test`, mustChangePassword: true } });
      assertions.push({ name: `${kind} registration creates one forced-change synthetic identity`, count: created, passed: created === 1 }); expect(created).toBe(1);
    });
    // Safe two-gym and role negative reads: actual source authorization, no V2 parity claim.
    await scenario('O04', 'foreign-resource-denial', async () => { await as('owner'); await go('/owner/members/visual-beta-member'); await expect(page.getByText('Member record not found.')).toBeVisible(); await shot('O04', 'foreign-resource-denied', mobileDesktop); });
    await scenario('T03', 'foreign-client-denial', async () => { await as('trainer'); await go('/trainer/clients/visual-beta-member'); await expect(page.getByText('Client not found.')).toBeVisible(); await shot('T03', 'foreign-client-denied', mobileDesktop); });
    await as('member'); await go('/owner'); expect(new URL(page.url()).pathname).toBe('/member/trainers');
    assertions.push({ name: 'Member owner-route denial redirects to member directory', passed: true });

    // Alternate empty gym fixtures, without deleting populated reference rows.
    for (const [id, path] of [['O01', '/owner'], ['O02', '/owner/members'], ['O05', '/owner/trainers'], ['O08', '/owner/sessions'], ['O09', '/owner/sessions/book'], ['O10', '/owner/financials'], ['O11', '/owner/analytics'], ['O13', '/owner/audit-log']]) await scenario(id, 'empty-gym', async () => { await as('beta'); await go(path); await shot(id, 'empty-gym', mobileDesktop); });
    await scenario('L02', 'drawer-and-notifications', async () => {
      await as('owner'); await go('/owner'); await page.setViewportSize(viewports[2]); await button('Open navigation menu'); await shot('L02', 'drawer-open', [viewports[2], viewports[3]]);
      await page.keyboard.press('Escape'); await button(/^Notifications/); await shot('L02', 'unread-notifications', mobileDesktop);
      await as('beta'); await go('/owner'); await button(/^Notifications/); await shot('L02', 'empty-notifications', mobileDesktop);
    });
    await scenario('S01', 'selected-context', async () => {
      await as('admin'); await go('/admin'); await page.locator('select').selectOption(gymA); await expect(page.getByText(/Viewing Synthetic Alpha Fitness as platform admin/)).toBeVisible(); await shot('S01', 'selected-gym', mobileDesktop);
      await button('Stop Impersonating'); await expect(page.getByText(/Viewing Synthetic Alpha Fitness as platform admin/)).toHaveCount(0); await shot('S01', 'stopped-view', mobileDesktop);
    });
    await scenario('O14', 'subscription-banner-reference', async () => {
      await db.gymSubscription.update({ where: { gymId: gymA }, data: { status: 'GRACE_PERIOD' } });
      await as('owner'); await go('/owner/subscription'); await shot('O14', 'grace-banner-reference', mobileDesktop);
      await db.gymSubscription.update({ where: { gymId: gymA }, data: { status: 'ACTIVE' } });
    });
    for (const [role, entry, destination] of [['owner', '/', '/owner'], ['trainer', '/trainer', '/trainer/schedule'], ['member', '/member', '/member/trainers']] as const) {
      await as(role); await go(entry); expect(new URL(page.url()).pathname).toBe(destination); assertions.push({ name: `${entry} ${role} redirect`, destination, passed: true });
    }

    await scenario('A01', 'submitting', async () => {
      await as('public'); await go('/login'); await page.locator('input[type=email]').fill('pending@example.test'); await page.locator('input[type=password]').fill('Synthetic-invalid-password');
      let release!: () => void; const gate = new Promise<void>(r => { release = r; });
      await page.route('**/api/auth/callback/credentials', async route => { await gate; await route.continue().catch(() => undefined); });
      try { await button('Sign In to Dashboard'); await expect(page.getByText('Signing in...', { exact: true })).toBeVisible(); await shot('A01', 'submitting', mobileDesktop); }
      finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
    });
    await scenario('A02', 'password-updated', async () => {
      await as('owner'); await go('/change-password');
      await page.locator('[name=currentPassword]').fill(fixture.password);
      await page.locator('[name=newPassword]').fill('Synthetic-new-password-456'); await page.locator('[name=confirmPassword]').fill('Synthetic-new-password-456');
      let release!: () => void; const gate = new Promise<void>(r => { release = r; });
      await page.route('**/change-password', async route => { if (route.request().method() === 'POST') await gate; await route.continue().catch(() => undefined); });
      try { await button('Update password'); await expect(page.getByText('Saving...', { exact: true })).toBeVisible(); await shot('A02', 'submitting', mobileDesktop); }
      finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
      await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible(); await shot('A02', 'updated-confirmation', mobileDesktop);
    });
    for (const [id, role, path] of [['O09', 'owner', '/owner/sessions/book'], ['M02', 'member', `/member/trainers/${trainerId}/book`]] as const) await scenario(id, 'collision-and-pending', async () => {
      await as(role); await go(path);
      if (role === 'owner') { await page.locator('[name=clientId]').selectOption(memberId); await page.locator('[name=trainerId]').selectOption(trainerId); }
      await page.locator('[name=date]').fill('2026-10-24'); await page.locator('[name=time]').fill('14:00');
      let release!: () => void; const gate = new Promise<void>(r => { release = r; });
      await page.route(`**${path}`, async route => { if (route.request().method() === 'POST') await gate; await route.continue().catch(() => undefined); });
      try { await page.locator('form button[type=submit]').click(); await expect(page.locator('form button[type=submit]')).toBeDisabled(); await shot(id, 'submitting', mobileDesktop); }
      finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
      await expect(page.getByText(/overlap|already|busy|booked|conflict|unavailable/i).last()).toBeVisible(); await shot(id, 'collision-error', mobileDesktop);
    });
    await scenario('M02', 'no-credits-and-missing', async () => {
      await db.sessionPack.update({ where: { id: 'visual-pack-00' }, data: { remainingSessions: 0 } });
      await as('member'); await go(`/member/trainers/${trainerId}/book`); await shot('M02', 'no-credits', mobileDesktop);
      await db.sessionPack.update({ where: { id: 'visual-pack-00' }, data: { remainingSessions: 8 } });
      await go('/member/trainers/missing-fixture/book'); await expect(page.getByText('Trainer not found.')).toBeVisible(); await shot('M02', 'missing-trainer', mobileDesktop);
    });
    await scenario('M03', 'withdrawal-warning', async () => { await as('member'); await go('/member/sessions'); await button('Withdraw Request'); await shot('M03', 'withdrawal-warning', mobileDesktop); });
    await scenario('T03', 'empty-plans-history', async () => {
      await as('trainer'); await go('/trainer/clients/visual-member-01');
      for (const tab of ['Workout Plans', 'Meal Plans']) { await button(tab); await shot('T03', `empty-${tab.toLowerCase().replace(/ /g, '-')}`, mobileDesktop); }
    });
    // Empty trainer/member views use test-only session identities backed by real synthetic users.
    for (const role of ['trainer', 'member'] as const) {
      const actor = role === 'trainer' ? { id: 'visual-trainer-27', role: 'PERSONAL_TRAINER', gymId: gymB, fullName: 'Synthetic Empty Trainer' } : { id: 'visual-beta-member', role: 'GYM_MEMBER', gymId: gymB, fullName: 'Synthetic Empty Member' };
      await db.user.update({ where: { id: actor.id }, data: { gymId: gymB, trainerStatus: 'ACTIVE' } });
      await context.clearCookies(); currentRole = `empty-${role}`;
      const token = await encode({ secret: childEnv.AUTH_SECRET, salt: 'authjs.session-token', token: { ...actor, email: `${actor.id}@example.test`, checkedAt: Date.parse(clock) }, maxAge: 86400 * 365 });
      await context.addCookies([{ name: 'authjs.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
      for (const [id, path] of (role === 'trainer' ? [['T01', '/trainer/schedule'], ['T02', '/trainer/clients'], ['T06', '/trainer/earnings']] : [['M01', '/member/trainers'], ['M03', '/member/sessions']])) await scenario(id, 'empty', async () => { await go(path); await shot(id, 'empty', mobileDesktop); });
    }
    await scenario('M02', 'no-gym', async () => {
      await context.clearCookies(); currentRole = 'no-gym-member';
      const token = await encode({ secret: childEnv.AUTH_SECRET, salt: 'authjs.session-token', token: { ...roles.member, gymId: null, checkedAt: Date.parse(clock) }, maxAge: 86400 * 365 });
      await context.addCookies([{ name: 'authjs.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
      await go(`/member/trainers/${trainerId}/book`); await expect(page.getByText('No gym assigned.')).toBeVisible(); await shot('M02', 'no-gym', mobileDesktop, 'Synthetic session projection with no gym; no original identity accessed.');
    });
    for (const state of ['error', 'not-found', 'loading']) await scenario('X', state, async () => { await as('owner'); await go(`/visual-reference?state=${state}`); await shot(state === 'error' ? 'X01' : state === 'not-found' ? 'X02' : 'X03', state, mobileDesktop, 'Original special-state component rendered by a disposable fixture route.'); });
    await scenario('O07', 'shift-failure', async () => {
      await as('owner'); await go(`/owner/trainers/${trainerId}`);
      await db.user.update({ where: { id: trainerId }, data: { gymId: gymB } });
      try { await button('Approve Shift Hours'); await expect(page.getByText('Failed to approve shift hours')).toBeVisible(); await shot('O07', 'shift-failure', mobileDesktop, 'Fixture trainer reassigned after page load to exercise actual stale-resource rejection. V1 styles this failure green.'); }
      finally { await db.user.update({ where: { id: trainerId }, data: { gymId: gymA } }); }
    });
    for (const [state, open, value, submit] of [['expense-error', 'Log Expense', '0', 'Save Expense'], ['budget-error', 'Set Monthly Budgets', '-1', 'Set Budget']]) await scenario('O10', state, async () => {
      await as('owner'); await go('/owner/financials'); if (state === 'budget-error') await button('Expense Management'); await button(open);
      await page.locator('[name=amount]').fill(value); await button(submit);
      await expect(page.getByText(/positive|negative/i).last()).toBeVisible(); await shot('O10', state, mobileDesktop);
    });
    await scenario('O12', 'server-validation', async () => {
      await as('owner'); await go('/owner/gym-config'); await button('PT Session Rates');
      await page.locator('form').evaluate((form: HTMLFormElement) => { form.noValidate = true; });
      await page.locator('[name=defaultSessionFee]').fill('-1'); await page.locator('form button[type=submit]').click();
      await expect(page.getByText(/negative|greater|positive|least/i).last()).toBeVisible(); await shot('O12', 'rates-error', mobileDesktop, 'Native validation bypassed only for this disposable request to capture actual server rejection feedback.');
    });
    await scenario('O13', 'loading', async () => {
      await as('owner'); await go('/owner/audit-log');
      let release!: () => void; const gate = new Promise<void>(r => { release = r; });
      await page.route('**/owner/audit-log', async route => { if (route.request().method() === 'POST') await gate; await route.continue().catch(() => undefined); });
      try { await page.locator('select').first().selectOption('MEMBER_CREATED'); await expect(page.getByText('Loading audit records...')).toBeVisible(); await shot('O13', 'loading', mobileDesktop); }
      finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
    });
    for (const [id, role, path] of [['O08', 'owner', '/owner/sessions'], ['T06', 'trainer', '/trainer/earnings']] as const) await scenario(id, 'pagination', async () => {
      await as(role); await go(path); await button('Next page'); await shot(id, 'page-2', mobileDesktop);
    });
    await scenario('O10', 'empty-tabs', async () => {
      await as('beta'); await go('/owner/financials');
      for (const tab of ['Expense Management', 'Deferred Revenue', 'Trainer Payroll']) { await button(tab); await shot('O10', `empty-${tab.toLowerCase().replace(/ /g, '-')}`, mobileDesktop); }
    });
    await scenario('O14', 'alert-only-controls', async () => { await as('owner'); await go('/owner/subscription'); await button('Update Payment Method'); await button('Switch Plan'); await shot('O14', 'alert-controls-reference', mobileDesktop, 'Native placeholder alert text recorded; no billing capability.'); });
    await scenario('O12', 'unchecked-policy', async () => {
      await db.gym.update({ where: { id: gymA }, data: { noShowDeduction: false, lateCancelDeduction: false } });
      await as('owner'); await go('/owner/gym-config'); await button('Cancellation Policy'); await shot('O12', 'policy-unchecked', mobileDesktop);
    });
    await scenario('T05', 'negative-numeric-reference', async () => { await as('trainer'); await go(`/trainer/plans/meal/new?clientId=${memberId}`); await page.locator('input[type=number]').first().fill('-10'); await shot('T05', 'negative-numeric-reference', mobileDesktop, 'V1 has no minimum on macro inputs. Reference only; V2 validators must enforce approved bounds.'); });
    assertions.push({ name: 'At least all 104 required baseline images were captured', passed: captures.length >= 104 });
    await writeFile(join(evidence, 'manifest.json'), JSON.stringify({ version: 1, harnessHashes, sourcePackages: Object.fromEntries(['next', 'react', 'react-dom', 'next-auth', '@prisma/client', 'recharts'].map(name => [name, require(`${name}/package.json`).version])), sourceRevision: before.revision, v2StartingRevision: (await execute('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim(), clock, browser: browser.version(), runtime: process.version, locale: 'en-US', timezone: 'UTC', deviceScaleFactor: 1, animation: 'Playwright animations disabled; reduced motion; frozen Date, timers continue', masks: ['Temporary credentials in code elements only; source content never altered'], copyAdaptations: ['next.config devIndicators=false', 'Source-level zero-argument Date and Date.now frozen; Next compiler clock remains real', 'Prisma generator output redirected into copy; source imports use that fresh client', 'Fixture-only /visual-reference renders unchanged authored X01-X03 components', 'Recharts Area/Bar/Line/Pie animation disabled without changing data', 'Password-success signout delay extended from 1.6s to 60s for transient-state capture'], captures, dialogs, assertions, failures, browserErrors }, null, 2));
    await context.close();
    expect(failures).toEqual([]);
  } finally {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM');
      await Promise.race([new Promise(r => server!.once('exit', r)), new Promise(r => setTimeout(r, 5000))]);
      if (server.exitCode === null) server.kill('SIGKILL');
    }
    await db?.$disconnect();
    const cleanup = await environment?.cleanup();
    const after = await snapshot();
    await rm(work, { recursive: true, force: true });
    await writeFile(join(evidence, 'preservation.json'), JSON.stringify({ before, after, unchanged: JSON.stringify(before) === JSON.stringify(after), cleanup, disposableCopyRemoved: true }, null, 2));
    expect(after).toEqual(before);
    // Avoid credentials/SQL/URLs in diagnostics. Kept only on failure for local troubleshooting.
    if (failures.length) await writeFile(join(evidence, 'capture-errors.json'), JSON.stringify(failures, null, 2));
    else { await rm(join(evidence, 'capture-errors.json'), { force: true }); await rm(join(evidence, 'last-failure.txt'), { force: true }); }
    if (!captures.length) console.log(diagnostics.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED]').slice(-3000));
  }
});
