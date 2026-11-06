import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { seedTwoGymFixture } from '../../api/test/fixtures/two-gym-fixture.js';
import { createDisposableEnvironment } from '../../api/test/support/disposable-environment.js';
import { installBrowserSession } from './support/browser-session.js';
import { requestDigest } from '../../api/src/operations/primitives.js';

test.use({ trace: 'off', screenshot: 'off' });
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDirectory = join(root, 'apps/api'); const webDirectory = join(root, 'apps/web');
const evidenceDirectory = join(root, 'apps/web/test-results/owner-session-booking');
type ProcessState = { child: ChildProcess; errors: () => string };
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: ProcessState | undefined; let web: ProcessState | undefined;
let apiBase = ''; let webBase = ''; let jwtSecret = ''; let memberId = ''; let trainerId = ''; let bookingDate = '';

async function freePort() {
  const server = createServer(); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Unable to reserve local port');
  const port = address.port; await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); return port;
}
function launch(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ProcessState {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'ignore', 'pipe'] }); let errors = '';
  child.stderr?.on('data', chunk => { errors = `${errors}${String(chunk)}`.slice(-5000); });
  child.on('error', error => { errors = `${errors}${error.message}`.slice(-5000); });
  return { child, errors: () => errors.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED_DATABASE_URL]') };
}
async function waitReady(url: string, processState: ProcessState) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (processState.child.exitCode !== null) throw new Error(`Server exited before ready: ${processState.errors()}`);
    try { if ((await fetch(url)).ok) return; } catch { /* server still starting */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not become ready: ${processState.errors()}`);
}
async function stop(processState: ProcessState | undefined) {
  if (!processState || processState.child.exitCode !== null) return;
  processState.child.kill('SIGTERM');
  await Promise.race([new Promise<void>(resolve => processState.child.once('exit', () => resolve())), new Promise(resolve => setTimeout(resolve, 10_000))]);
  if (processState.child.exitCode === null) processState.child.kill('SIGKILL');
}
async function loginAsOwner(page: Page) {
  const owner = fixture.users.ownerA;
  await installBrowserSession({ page, master: fixture.master, identityId: owner.id, jwtSecret, origin: webBase });
  await page.goto(`${webBase}/gyms/${fixture.gyms[0]!.slug}/owner/sessions/book`);
}

test.beforeAll('prepare owner booking fixture and web servers', async () => {
  test.setTimeout(120_000);
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  environment = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(environment);
  const tenant = fixture.tenants[0]!; const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`); const addDays = (days: number) => { const value = parseDate(today); value.setUTCDate(value.getUTCDate() + days); return value; };
  bookingDate = addDays(1).toISOString().slice(0, 10);
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } }); memberId = member.id; trainerId = trainer.id;
  const plan = await tenant.membershipPlan.create({ data: { name: `Owner booking ${environment.runId}`, price: '0', currency: 'LKR', durationDays: 90 } });
  const ownerId = fixture.users.ownerA.id;
  await tenant.membershipTerm.create({ data: { memberId, planId: plan.id, startDate: parseDate(today), endDateExclusive: addDays(90), agreedPrice: '0', currency: 'LKR',
    planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: ownerId, idempotencyKey: `owner-booking-term-${environment.runId}`, requestDigest: requestDigest({ run: environment.runId, term: true }) } });
  const issueReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_BOOKING_PACK', idempotencyKey: `owner-booking-pack-receipt-${environment.runId}`,
    requestDigest: requestDigest({ run: environment.runId, packReceipt: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const pack = await tenant.sessionPack.create({ data: { memberId, issuedCredits: 3, price: '100.00', currency: 'LKR', totalMinorUnits: BigInt(10_000),
    creditBaseMinorUnits: BigInt(3_333), creditRemainder: 1, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90, startDate: parseDate(today), endDateExclusive: addDays(90),
    commandReceiptId: issueReceipt.id, actorIdentityId: ownerId, idempotencyKey: `owner-booking-pack-${environment.runId}`, requestDigest: requestDigest({ run: environment.runId, pack: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 3, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `owner-booking-pack-issue-${environment.runId}`, receiptId: issueReceipt.id, actorIdentityId: ownerId } });
  const availabilityReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_BOOKING_AVAILABILITY',
    idempotencyKey: `owner-booking-availability-${environment.runId}`, requestDigest: requestDigest({ run: environment.runId, availability: true }),
    state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  await tenant.pTAvailabilityRule.create({ data: { trainerId, kind: 'DATED_WINDOW', localDate: parseDate(bookingDate), startMinute: 900, endMinute: 1020,
    createdByIdentityId: ownerId, commandReceiptId: availabilityReceipt.id } });

  const [apiPort, webPort] = await Promise.all([freePort(), freePort()]); apiBase = `http://127.0.0.1:${apiPort}`; webBase = `http://127.0.0.1:${webPort}`;
  jwtSecret = randomBytes(32).toString('hex');
  const clean: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', TZ: 'UTC' };
  api = launch(process.execPath, [join(apiDirectory, 'dist/main.js')], apiDirectory, { ...clean, PORT: String(apiPort), MASTER_DATABASE_URL: environment.masterUrl,
    TENANT_DATABASE_URL: environment.masterUrl, PROVISION_DATABASE_URL: environment.masterUrl, JWT_SECRET: jwtSecret });
  await waitReady(`${apiBase}/`, api);
  web = launch(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)], webDirectory,
    { ...clean, GYMOS_API_URL: apiBase, GYMOS_WEB_ORIGIN: webBase });
  await waitReady(`${webBase}/login`, web);
});

test.afterAll('stop owner booking servers and clean fixtures', async () => {
  await stop(web); await stop(api); await fixture?.close();
  if (environment) console.info('[owner-session-booking-cleanup]', JSON.stringify(await environment.cleanup()));
});

test('owner can choose a same-gym member/trainer and see the committed quote, credit allocation and slot result', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsOwner(page);
  await expect(page.getByRole('heading', { name: 'Book Personal Training Session' })).toBeVisible();
  await page.getByLabel(/^Select member/).selectOption(memberId);
  await page.getByLabel(/^Select personal trainer/).selectOption(trainerId);
  await page.getByLabel(/Session date/).fill(bookingDate);
  const startTime = page.getByLabel(/^Available start time/);
  await startTime.selectOption(await startTime.locator('option').filter({ hasText: '15:00' }).getAttribute('value') ?? '');
  await page.getByLabel('Session notes (optional)').fill('Synthetic owner booking');
  await page.getByRole('button', { name: 'Confirm and book' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Session booked and one credit is held.' })).toBeVisible();
  await expect(page.getByText(/Held credit #1: 33\.34 LKR allocated value\./)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open booking details' })).toHaveAttribute('href', /\/sessions\//);
  const session = await fixture.tenants[0]!.pTSession.findFirstOrThrow({ where: { memberId, trainerId, notes: 'Synthetic owner booking' } });
  expect(session.state).toBe('SCHEDULED'); expect(session.gymTimezone).toBe('Asia/Colombo');
  expect(await fixture.tenants[0]!.sessionCreditHold.count({ where: { sessionId: session.id, creditOrdinal: 1, creditValueMinorUnits: BigInt(3334), state: 'HELD' } })).toBe(1);
  const bookingNotices = await fixture.tenants[0]!.notification.findMany({ where: { resourceId: session.id, eventCode: 'SESSION_BOOKED' }, select: { recipientIdentityId: true } });
  expect(bookingNotices.map(item => item.recipientIdentityId).sort()).toEqual([fixture.users.memberUser.id, fixture.users.trainerUser.id].sort());
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(evidenceDirectory, 'owner-booking-390.png'), fullPage: true });
});
