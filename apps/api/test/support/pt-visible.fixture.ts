import { reserveSessionCredit } from '../../src/sessions/credit-holds.js';
import { recordInitialSession, applySessionCommand } from '../../src/sessions/session-commands.js';
import { randomBytes, randomUUID } from 'node:crypto';
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
  const tenant = fixture.tenants[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const config = await tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
  const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const now = clock!.now;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${today}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 2);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 90);
  const plan = await tenant.membershipPlan.create({ data: { name: 'Chrome synthetic membership', price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: start, endDateExclusive: end, agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: config.version, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: randomUUID(), requestDigest: `d1:${'a'.repeat(64)}` } });
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_PT_CHROME', idempotencyKey: randomUUID(), requestDigest: `d1:${'b'.repeat(64)}`, state: 'COMMITTED', committedAt: now, safeResult: {} } });
  const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: 8, price: '800', currency: 'LKR', totalMinorUnits: 80000n, creditBaseMinorUnits: 10000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1', validityDays: 90, startDate: start, endDateExclusive: end, commandReceiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id, idempotencyKey: randomUUID(), requestDigest: `d1:${'c'.repeat(64)}` } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 8, heldDelta: 0, consumedDelta: 0, expiredDelta: 0, sourceKey: `chrome-issue-${environment.runId}`, receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id } });
  // Separate historical delivery fixture: an already-started synthetic appointment.
  // No host-clock changes or relaxation of ordinary start/completion policy.
  const sessionId = randomUUID();
  const scheduledStartAt = new Date(Math.floor((now.getTime() - 30 * 60_000) / 900_000) * 900_000);
  await tenant.pTSession.create({ data: { id: sessionId, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
    scheduledStartAt, scheduledEndAt: new Date(scheduledStartAt.getTime() + 3_600_000), gymTimezone: 'Asia/Colombo', fee: '100', currency: 'LKR',
    confirmedAt: new Date(now.getTime() - 86_400_000), confirmationRate: config.level1BaseRate, confirmationLevel: 'LEVEL_1', availabilityVersion: 0,
    configurationVersion: config.version, createdByIdentityId: fixture.users.ownerA.id } });
  await tenant.$transaction(async tx => {
    await reserveSessionCredit(tx, { masterGymId: fixture.gyms[0]!.id, sessionId, memberId: member.id, trainerId: trainer.id,
      scheduledLocalDate: today, explicitPackId: pack.id, actorIdentityId: fixture.users.ownerA.id, receiptId: receipt.id });
    await recordInitialSession(tx, { masterGymId: fixture.gyms[0]!.id, sessionId, receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id, command: 'OWNER_BOOK' });
    await applySessionCommand(tx, { masterGymId: fixture.gyms[0]!.id, sessionId, receiptId: receipt.id, actorIdentityId: fixture.users.trainerUser.id,
      actorRole: 'TRAINER', actorTenantId: trainer.id, command: 'START', expectedVersion: 0 });
    await tx.pTSession.update({ where: { id: sessionId }, data: { startedAt: new Date(now.getTime() - 25 * 60_000) } });
  });
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
  const stopFile = `/tmp/gymos-pt-chrome-stop-${environment.runId}`;
  console.info('[visible-fixture-ready]', JSON.stringify({ url: webUrl, apiUrl, owner: fixture.users.ownerA.email, trainer: fixture.users.trainerUser.email, member: fixture.users.memberUser.email,
    multiOwner: fixture.users.multiOwner.email, password: fixture.password, gymA: fixture.gyms[0]!.slug, gymB: fixture.gyms[1]!.slug,
    readiness: 'API root returned HTTP 200; web /login returned GymOS HTML', stopFile, deliverySessionId: sessionId }));
  while (!existsSync(stopFile) && api.exitCode === null && web.exitCode === null) await new Promise(resolve => setTimeout(resolve, 1000));
  if (!existsSync(stopFile)) throw new Error(`Walkthrough server exited before stop request: api=${api.exitCode}, web=${web.exitCode}`);
}, 3_600_000);
