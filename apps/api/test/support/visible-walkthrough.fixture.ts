import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

const apiDirectory = process.cwd();
const webDirectory = join(apiDirectory, '../web');
let environment: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let api: ChildProcess | undefined;
let web: ChildProcess | undefined;
const stop = async (child?: ChildProcess) => { if (!child || child.exitCode !== null) return; child.kill('SIGTERM');
  await new Promise<void>(resolve => { child.once('exit', () => resolve()); setTimeout(resolve, 5000); }); };
function forward(child: ChildProcess, name: string) {
  let tail = '';
  child.stdout?.on('data', chunk => { tail = `${tail}${String(chunk)}`.slice(-16_000); });
  child.stderr?.on('data', chunk => { const output = String(chunk); tail = `${tail}${output}`.slice(-16_000); process.stderr.write(`[${name}] ${output}`); });
  return () => tail;
}
async function freePorts(count: number) {
  const servers: ReturnType<typeof createServer>[] = [];
  try {
    for (let index = 0; index < count; index++) {
      const server = createServer(); servers.push(server);
      await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    }
    return servers.map(server => { const address = server.address(); if (!address || typeof address === 'string') throw new Error('Port unavailable'); return address.port; });
  } finally { await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve())))); }
}
function localMidnight(date: string, zone: string) {
  const [year, month, day] = date.split('-').map(Number); const target = Date.UTC(year!, month! - 1, day!);
  for (let offset = -14 * 60; offset <= 14 * 60; offset++) {
    const candidate = new Date(target - offset * 60_000);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(candidate);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    if (`${values.year}-${values.month}-${values.day}` === date && values.hour === '00' && values.minute === '00') return candidate;
  }
  throw new Error(`No local midnight resolved for ${date} ${zone}`);
}
async function readyUntil(url: string, child: ChildProcess, name: string, verify: (response: Response) => Promise<boolean> = async response => response.ok) {
  const deadline = Date.now() + 30_000; let lastError = 'not responding';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${name} exited with code ${child.exitCode}`);
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok && await verify(response)) return; lastError = `${response.status} ${response.statusText}; content did not match readiness probe`; }
    catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`${name} readiness timed out at ${url}: ${lastError}`);
}

afterAll(async () => { await stop(web); await stop(api); await fixture?.close();
  if (environment) console.info('[visible-fixture-cleanup]', JSON.stringify(await environment.cleanup())); }, 120_000);

it('holds synthetic owned data for a visible review until its stop file appears', async () => {
  environment = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(environment);
  const [apiPort, webPort] = await freePorts(2);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const month = today.slice(0, 7); const [year, value] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year!, value!, 1)).toISOString().slice(0, 10);
  const tenant = fixture.tenants[0]!; const member = await tenant.member.findFirstOrThrow(); const trainer = await tenant.trainer.findFirstOrThrow();
  const config = await tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
  const sessionId = randomUUID(); const scheduledStartAt = new Date(Date.parse(`${today}T08:00:00Z`) - 330 * 60_000);
  await tenant.pTSession.create({ data: { id: sessionId, memberId: member.id, trainerId: trainer.id, state: 'COMPLETED', type: 'IN_PERSON',
    scheduledStartAt, scheduledEndAt: new Date(scheduledStartAt.getTime() + 3_600_000), gymTimezone: 'Asia/Colombo', fee: '250.0000', currency: 'LKR',
    confirmedAt: scheduledStartAt, confirmationRate: '0.200000', confirmationLevel: 'LEVEL_1', startedAt: scheduledStartAt,
    endedAt: new Date(scheduledStartAt.getTime() + 3_600_000), configurationVersion: config.version, createdByIdentityId: fixture.users.ownerA.id } });
  await tenant.revenueRecord.create({ data: { sessionId, category: 'COMPLETED_SESSION', amount: '250.0000', currency: 'LKR', sourceKey: `session:${sessionId}:completed` } });
  const period = await tenant.trainerPayPeriod.create({ data: { cadence: 'MONTHLY', localStartDate: new Date(`${month}-01T00:00:00.000Z`),
    localEndDateExclusive: new Date(`${nextMonth}T00:00:00.000Z`), timezone: 'Asia/Colombo',
    utcStartAt: localMidnight(`${month}-01`, 'Asia/Colombo'), utcEndAt: localMidnight(nextMonth, 'Asia/Colombo'), calculatedTotal: '50.0000' } });
  await tenant.payRecord.create({ data: { sessionId, periodId: period.id, amount: '50.0000', currency: 'LKR', sourceKey: `pay:${sessionId}`,
    confirmationRate: '0.200000', confirmationLevel: 'LEVEL_1' } });
  const plan = await tenant.membershipPlan.create({ data: { name: 'Synthetic month plan', price: '310.0000', currency: 'LKR', durationDays: 30 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: new Date(`${month}-01T00:00:00Z`),
    endDateExclusive: new Date(`${nextMonth}T00:00:00Z`), agreedPrice: '310.0000', currency: 'LKR', planNameSnapshot: plan.name,
    configurationVersion: config.version, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: randomUUID(), requestDigest: `d1:${'a'.repeat(64)}` } });
  const receipts = Array.from({ length: 23 }, () => ({ id: randomUUID(), actorIdentityId: fixture.users.ownerA.id, commandKind: 'FIXTURE_AUDIT',
    idempotencyKey: randomUUID(), requestDigest: `d1:${'b'.repeat(64)}`, state: 'COMMITTED' as const, safeResult: {}, committedAt: new Date() }));
  await tenant.commandReceipt.createMany({ data: receipts });
  await tenant.auditLog.createMany({ data: receipts.map((receipt, index) => { const id = randomUUID(); return { id,
    eventKey: `ta1:${createHash('sha256').update(id).digest('hex')}`, contentDigest: createHash('sha256').update(`synthetic:${id}`).digest('hex'),
    receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id, eventCode: index % 2 ? 'PT_SESSION_STARTED' : 'PT_SESSION_COMPLETED',
    resourceType: 'PT_SESSION', resourceId: sessionId, transition: { from: 'ACTIVE', to: 'COMPLETED', version: index }, createdAt: new Date(Date.now() - index * 1000) }; }) });
  const cleanEnv = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', TZ: 'UTC' };
  const apiUrl = `http://127.0.0.1:${apiPort}`; const webUrl = `http://127.0.0.1:${webPort}`;
  api = spawn(process.execPath, [join(apiDirectory, 'dist/main.js')], { cwd: apiDirectory, env: { ...cleanEnv, PORT: String(apiPort),
    MASTER_DATABASE_URL: environment.masterUrl, TENANT_DATABASE_URL: environment.masterUrl, PROVISION_DATABASE_URL: environment.masterUrl,
    JWT_SECRET: randomBytes(32).toString('hex') }, stdio: ['ignore', 'pipe', 'pipe'] });
  const apiLog = forward(api, 'gymos-api');
  try { await readyUntil(`${apiUrl}/`, api, 'GymOS API'); } catch (error) { throw new Error(`${String(error)}\n${apiLog()}`); }
  web = spawn(process.execPath, [join(webDirectory, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(webPort)],
    { cwd: webDirectory, env: { ...cleanEnv, GYMOS_API_URL: apiUrl, GYMOS_WEB_ORIGIN: webUrl }, stdio: ['ignore', 'pipe', 'pipe'] });
  const webLog = forward(web, 'gymos-web');
  try { await readyUntil(`${webUrl}/login`, web, 'GymOS web', async response => {
    const contentType = response.headers.get('content-type') ?? ''; const body = await response.text();
    return contentType.includes('text/html') && body.includes('GymOS') && body.includes('Sign in');
  }); } catch (error) { throw new Error(`${String(error)}\n${webLog()}`); }
  const stopFile = `/tmp/gymos-visible-stop-${environment.runId}`;
  console.info('[visible-fixture-ready]', JSON.stringify({ url: webUrl, apiUrl, owner: fixture.users.ownerA.email, trainer: fixture.users.trainerUser.email,
    multiOwner: fixture.users.multiOwner.email, password: fixture.password, gymA: fixture.gyms[0]!.slug, gymB: fixture.gyms[1]!.slug,
    readiness: 'API root returned HTTP 200; web /login returned GymOS HTML', stopFile }));
  while (!existsSync(stopFile) && api.exitCode === null && web.exitCode === null) await new Promise(resolve => setTimeout(resolve, 1000));
  if (!existsSync(stopFile)) throw new Error(`Walkthrough server exited before stop request: api=${api.exitCode}, web=${web.exitCode}`);
}, 3_600_000);
