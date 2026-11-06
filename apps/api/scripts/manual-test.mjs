// Persistent, synthetic manual-testing sandbox. Never reads the project's .env.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import pg from 'pg';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as Master } from '../dist/generated/master/client.js';
import { PrismaClient as Tenant } from '../dist/generated/tenant/client.js';
import { TenantSchemaVerifier } from '../dist/tenancy/tenant-schema-verifier.js';
import { TenantRegistryService } from '../dist/tenancy/tenant-registry.service.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest } from '../dist/tenancy/tenant-template-manifest.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const statePath = `${root}.env.manual-test.json`;
const execute = promisify(execFile);
const cleanEnv = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', TZ: 'UTC' };
const docker = async (args, extra = {}) => (await execute('docker', args, { timeout: 30_000, env: { ...cleanEnv, ...extra } })).stdout.trim();
const digest = value => `d1:${createHash('sha256').update(value).digest('hex')}`;
const day = (base, n) => new Date(base.getTime() + n * 86400_000);
const dateOnly = d => new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);
async function save(state) { await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 }); }
async function localDocker() {
  if (!(await docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'])).startsWith('unix://')) throw new Error('Local Docker is required');
}
async function verify(state) {
  await localDocker();
  const container = JSON.parse(await docker(['inspect', state.container]))[0];
  const binding = container.NetworkSettings.Ports?.['5432/tcp']?.[0];
  if (container.Id !== state.containerId || container.Config.Labels?.['gymos.manual-test'] !== state.runId
    || binding?.HostIp !== '127.0.0.1' || binding.HostPort !== state.port) throw new Error('Test container ownership mismatch');
  for (const urlText of [state.masterUrl, state.provisionUrl]) {
    const url = new URL(urlText);
    if (url.hostname !== '127.0.0.1' || url.port !== state.port || !['/gymos_manual_master', '/postgres'].includes(url.pathname)) throw new Error('Invalid sandbox target');
  }
}
async function migrate(state, name, kind) {
  const url = new URL(state.masterUrl); url.pathname = `/${name}`;
  await execute('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--config', `prisma.${kind}.config.ts`], {
    cwd: root, env: { ...cleanEnv, MASTER_DATABASE_URL: url.href, TENANT_DATABASE_URL: url.href }, timeout: 120_000,
  });
}
async function receipt(tenant, actorId, kind, resourceId, createdAt = new Date()) {
  return tenant.commandReceipt.create({ data: { actorIdentityId: actorId, commandKind: kind, idempotencyKey: randomUUID(),
    requestDigest: digest(resourceId), resourceType: 'PT_SESSION', resourceId, state: 'COMMITTED', committedAt: createdAt,
    safeResult: { resourceId }, createdAt, updatedAt: createdAt } });
}
async function publish(master, tenant, gym, owner, identity, kind, details) {
  const operationId = randomUUID();
  const model = kind === 'MEMBER' ? tenant.member : tenant.trainer;
  const actor = await model.create({ data: { ...details, email: identity.email, identityId: identity.id,
    registrationState: 'COMPLETE', enrollmentOperationId: operationId } });
  const committed = await tenant.commandReceipt.create({ data: { actorIdentityId: owner.id, commandKind: `REGISTER_${kind}`,
    idempotencyKey: randomUUID(), requestDigest: digest(operationId), resourceType: kind, resourceId: actor.id,
    sourceMasterOperationId: operationId, state: 'COMMITTED', committedAt: new Date(), safeResult: { resourceId: actor.id } } });
  await master.operation.create({ data: { id: operationId, kind: `REGISTER_${kind}`, actorIdentityId: owner.id,
    scopeKey: `gym:${gym.id}`, idempotencyKey: randomUUID(), requestDigest: digest(operationId), gymId: gym.id,
    subjectIdentityId: identity.id, tenantActorId: actor.id, tenantCommandReceiptId: committed.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { resourceId: actor.id } } });
  await master.gymAccess.create({ data: { userId: identity.id, gymId: gym.id, role: kind, linkStatus: 'ACTIVE',
    actorKind: kind, tenantActorId: actor.id, enrollmentOperationId: operationId } });
  return actor;
}
async function seedGym(state, master, users, index, today) {
  const suffix = ['alpha', 'beta', 'gamma'][index];
  const name = `gymos_${randomBytes(16).toString("hex")}`;
  const admin = new pg.Client({ connectionString: state.provisionUrl }); await admin.connect();
  try { await admin.query(`CREATE DATABASE "${name}"`); } finally { await admin.end(); }
  await migrate(state, name, 'tenant');
  const url = new URL(state.masterUrl); url.pathname = `/${name}`;
  const tenant = new Tenant({ adapter: new PrismaPg({ connectionString: url.href, max: 3 }) });
  try {
    const gym = await master.gym.create({ data: { name: `Test Gym ${suffix[0].toUpperCase()}${suffix.slice(1)}`, slug: `test-${suffix}`,
      databaseName: name, status: 'ACTIVE', theme: { create: { primaryColor: ['#0F766E', '#7C3AED', '#EA580C'][index] } } } });
    const operationId = randomUUID();
    await master.operation.create({ data: { id: operationId, kind: 'PROVISION_GYM', actorIdentityId: users.admin.id,
      scopeKey: `provision-gym:${gym.slug}`, idempotencyKey: randomUUID(), requestDigest: digest(gym.slug), requestedSlug: gym.slug,
      gymId: gym.id, databaseName: name, intendedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version,
      intendedTenantManifestDigest: tenantManifestDigest(), appliedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version,
      appliedTenantManifestDigest: tenantManifestDigest(), tenantSchemaVerifiedAt: new Date(), state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId, state: 'COMPLETE' } } });
    const evidence = await new TenantSchemaVerifier(tenant).verifyAndAttest({ masterGymId: gym.id, operationId });
    await new TenantRegistryService({ master }).observeVerifiedTenant({ gymId: gym.id, operationId, expectedGymVersion: 0,
      actorIdentityId: users.admin.id, evidence });
    const config = await tenant.gymConfiguration.update({ where: { id: 'current' }, data: { currency: 'LKR', timezone: 'Asia/Colombo',
      address: `${index + 1} Example Road (synthetic)`, defaultSessionFee: '2500', level2SessionFee: '3500', introSessionFee: '1000',
      version: { increment: 1 } } });
    await master.gymAccess.create({ data: { userId: users.owner.id, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' } });
    const trainer = await publish(master, tenant, gym, users.owner, users.trainer, 'TRAINER', {
      fullName: 'Test Trainer', phone: '+94000000000', level: 'LEVEL_1', shiftStart: '06:00', shiftEnd: '22:00', specialisations: ['Strength', 'Mobility'], yearsExperience: 5,
    });
    const plan = await tenant.membershipPlan.create({ data: { name: '90 Day Test Membership', price: '15000', currency: 'LKR', durationDays: 90 } });
    const members = [];
    for (let n = 0; n < 20; n++) {
      // Four main logins are shared across gyms. Additional member identities have
      // unshared random credentials so all 60 members have valid enrollment bindings.
      const identity = n === 0 ? users.member : await master.user.create({ data: {
        email: `${suffix}.member${String(n + 1).padStart(2, '0')}@example.test`, displayName: `Test ${suffix} Member ${n + 1}`,
        passwordHash: await argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id }),
      } });
      const member = await publish(master, tenant, gym, users.owner, identity, 'MEMBER', {
        fullName: n === 0 ? 'Test Member' : `${suffix[0].toUpperCase()}${suffix.slice(1)} Member ${String(n + 1).padStart(2, '0')}`,
        dateOfBirth: new Date(`199${n % 10}-06-15T00:00:00Z`), healthNotes: 'Synthetic test profile',
      });
      await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: day(today, -30), endDateExclusive: day(today, 60),
        agreedPrice: plan.price, currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: config.version,
        actorIdentityId: users.owner.id, idempotencyKey: randomUUID(), requestDigest: digest(member.id) } });
      const issue = await receipt(tenant, users.owner.id, 'ISSUE_SESSION_PACK', member.id, day(today, -29));
      const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: 12, price: '30000', currency: 'LKR',
        totalMinorUnits: 3000000n, creditBaseMinorUnits: 250000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1',
        validityDays: 90, startDate: day(today, -30), endDateExclusive: day(today, 60), commandReceiptId: issue.id,
        actorIdentityId: users.owner.id, idempotencyKey: randomUUID(), requestDigest: digest(issue.id), createdAt: day(today, -29) } });
      await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 12, heldDelta: 0, consumedDelta: 0,
        expiredDelta: 0, sourceKey: `issue:${pack.id}`, receiptId: issue.id, actorIdentityId: users.owner.id, createdAt: day(today, -29) } });
      for (const future of [false, true]) {
        const stateName = future ? (n % 5 === 4 ? 'PENDING_CONFIRMATION' : 'SCHEDULED') : n % 5 < 3 ? 'COMPLETED' : n % 5 === 3 ? 'MISSED' : 'CANCELLED';
        const consumed = ['COMPLETED', 'MISSED'].includes(stateName);
        const sessionDay = day(today, (future ? 1 : -10) + Math.floor(n / 4));
        // 4 sessions a day, 90 minutes apart, in Asia/Colombo.
        const start = new Date(`${sessionDay.toISOString().slice(0, 10)}T${String(8 + Math.floor((n % 4) * 1.5)).padStart(2, '0')}:${n % 2 ? '30' : '00'}:00+05:30`);
        const end = new Date(start.getTime() + 3600000);
        const confirmed = stateName !== 'PENDING_CONFIRMATION';
        const bookedAt = stateName === 'PENDING_CONFIRMATION' ? new Date() : day(start, -2);
        const requestExpiresAt = stateName === 'PENDING_CONFIRMATION'
          ? new Date(Math.min(bookedAt.getTime() + 12 * 3600_000, start.getTime() - 3600_000)) : null;
        const session = await tenant.pTSession.create({ data: { memberId: member.id, trainerId: trainer.id, state: stateName,
          type: n % 3 === 0 ? 'VIRTUAL' : 'IN_PERSON', scheduledStartAt: start, scheduledEndAt: end, gymTimezone: 'Asia/Colombo',
          fee: '2500', currency: 'LKR', configurationVersion: config.version,
          ...(confirmed ? { confirmedAt: bookedAt, confirmationRate: '0.4', confirmationLevel: 'LEVEL_1', confirmationShiftStart: '06:00', confirmationShiftEnd: '22:00' } : {}),
          startedAt: stateName === 'COMPLETED' ? start : null, endedAt: future ? null : end, requestExpiresAt,
          notes: future ? 'Synthetic upcoming PT session' : 'Synthetic historical PT session', createdByIdentityId: confirmed ? users.owner.id : identity.id, createdAt: bookedAt } });
        const booking = await receipt(tenant, users.owner.id, future && !confirmed ? 'REQUEST_PT_SESSION' : 'BOOK_PT_SESSION', session.id, bookedAt);
        if (stateName === 'PENDING_CONFIRMATION') {
          await tenant.sessionStateEvent.create({ data: { sessionId: session.id, fromState: null, toState: 'PENDING_CONFIRMATION',
            committedVersion: 0, actorIdentityId: identity.id, receiptId: booking.id, eventKey: `seed:${session.id}:0`, createdAt: bookedAt } });
          continue;
        }
        const hold = await tenant.sessionCreditHold.create({ data: { sessionId: session.id, packId: pack.id,
          state: future ? 'HELD' : consumed ? 'CONSUMED' : 'RELEASED', creditOrdinal: future ? 2 : 1,
          creditValueMinorUnits: 250000n, heldAt: bookedAt, resolvedAt: future ? null : end } });
        await tenant.packCreditMovement.create({ data: { packId: pack.id, holdId: hold.id, kind: 'HOLD', availableDelta: -1, heldDelta: 1,
          consumedDelta: 0, expiredDelta: 0, creditOrdinal: hold.creditOrdinal, sourceKey: `hold:${hold.id}`, receiptId: booking.id,
          actorIdentityId: users.owner.id, createdAt: bookedAt } });
        await tenant.sessionStateEvent.create({ data: { sessionId: session.id, fromState: null,
          toState: confirmed ? 'SCHEDULED' : 'PENDING_CONFIRMATION', committedVersion: 0, actorIdentityId: users.owner.id,
          receiptId: booking.id, eventKey: `seed:${session.id}:0`, createdAt: bookedAt } });
        if (!future) {
          const settled = await receipt(tenant, users.owner.id, `SEED_${stateName}`, session.id, end);
          let version = 1;
          if (stateName === 'COMPLETED') {
            await tenant.sessionStateEvent.create({ data: { sessionId: session.id, fromState: 'SCHEDULED', toState: 'ACTIVE', committedVersion: version++,
              actorIdentityId: users.trainer.id, receiptId: settled.id, eventKey: `seed:${session.id}:1`, createdAt: start } });
          }
          await tenant.sessionStateEvent.create({ data: { sessionId: session.id, fromState: stateName === 'COMPLETED' ? 'ACTIVE' : 'SCHEDULED', toState: stateName,
            committedVersion: version, actorIdentityId: users.owner.id, receiptId: settled.id, eventKey: `seed:${session.id}:${version}`, createdAt: end } });
          await tenant.pTSession.update({ where: { id: session.id }, data: { version } });
          await tenant.packCreditMovement.create({ data: { packId: pack.id, holdId: hold.id, kind: consumed ? 'CONSUME' : 'RELEASE',
            availableDelta: consumed ? 0 : 1, heldDelta: -1, consumedDelta: consumed ? 1 : 0, expiredDelta: 0,
            creditOrdinal: hold.creditOrdinal, sourceKey: `resolve:${hold.id}`, receiptId: settled.id, actorIdentityId: users.owner.id, createdAt: end } });
          await tenant.sessionSettlement.create({ data: { sessionId: session.id, kind: consumed ? stateName : 'FREE_CANCELLED', creditConsumed: consumed,
            creditValue: '2500', currency: 'LKR', sourceReceiptId: settled.id, createdAt: end } });
          if (consumed) {
            await tenant.revenueRecord.create({ data: { sessionId: session.id, category: stateName === 'COMPLETED' ? 'COMPLETED_SESSION' : 'MISSED_LATE',
              amount: '2500', currency: 'LKR', sourceKey: `revenue:${session.id}`, createdAt: end } });
            const month = start.toISOString().slice(0, 7);
            const first = new Date(`${month}-01T00:00:00Z`); const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
            const period = await tenant.trainerPayPeriod.upsert({ where: { cadence_localStartDate: { cadence: 'MONTHLY', localStartDate: first } },
              create: { cadence: 'MONTHLY', localStartDate: first, localEndDateExclusive: next, timezone: 'Asia/Colombo',
                utcStartAt: new Date(first.getTime() - 19800000), utcEndAt: new Date(next.getTime() - 19800000), calculatedTotal: '1000' },
              update: { calculatedTotal: { increment: '1000' } } });
            await tenant.payRecord.create({ data: { sessionId: session.id, periodId: period.id, amount: '1000', currency: 'LKR',
              sourceKey: `pay:${session.id}`, confirmationRate: '0.4', confirmationLevel: 'LEVEL_1', createdAt: end } });
          }
        }
      }
      members.push(member);
    }
    await tenant.workoutPlan.create({ data: { memberId: members[0].id, trainerId: trainer.id, name: 'Test Strength Plan', exercises: { create: [
      { sortOrder: 0, name: 'Squat', sets: 3, reps: 10, weightKg: '20' }, { sortOrder: 1, name: 'Plank', sets: 3, durationMinutes: 1 },
    ] } } });
    await tenant.mealPlan.create({ data: { memberId: members[0].id, trainerId: trainer.id, name: 'Test Balanced Meal Plan', entries: { create: [
      { sortOrder: 0, dayOfWeek: 1, mealType: 'Breakfast', foodItem: 'Oats and fruit', calories: 400 },
      { sortOrder: 1, dayOfWeek: 1, mealType: 'Lunch', foodItem: 'Rice, lentils and vegetables', calories: 600 },
    ] } } });
    await master.gymRegistrySummary.create({ data: { gymId: gym.id, memberCount: 20, trainerCount: 1,
      observedAt: new Date(), schemaVersion: TENANT_TEMPLATE_MANIFEST.version, health: 'VERIFIED' } });
    return { id: gym.id, slug: gym.slug, database: name, members: await tenant.member.count(), sessions: await tenant.pTSession.count(),
      states: await tenant.pTSession.groupBy({ by: ['state'], _count: true }) };
  } finally { await tenant.$disconnect(); }
}
async function setup() {
  try { await access(statePath); throw new Error(`Sandbox already exists. Use pnpm manual:start; state is in ${statePath}`); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  await localDocker();
  const runId = randomBytes(8).toString('hex'); const password = randomBytes(24).toString('hex');
  const state = { runId, container: `gymos-manual-${runId}`, password: `GymTest-${randomBytes(6).toString('hex')}`,
    jwtSecret: randomBytes(32).toString('hex'), ready: false };
  state.containerId = await docker(['run', '-d', '--name', state.container, '--label', `gymos.manual-test=${runId}`,
    '--restart', 'unless-stopped', '-p', '127.0.0.1::5432', '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=gymos_manual_master', 'postgres:17'], { POSTGRES_PASSWORD: password });
  const info = JSON.parse(await docker(['inspect', state.container]))[0];
  state.port = info.NetworkSettings.Ports['5432/tcp'][0].HostPort;
  state.masterUrl = `postgresql://postgres:${password}@127.0.0.1:${state.port}/gymos_manual_master`;
  state.provisionUrl = `postgresql://postgres:${password}@127.0.0.1:${state.port}/postgres`;
  await save(state); await verify(state);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const client = new pg.Client({ connectionString: state.masterUrl, connectionTimeoutMillis: 1000 });
    try { await client.connect(); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); } finally { await client.end(); }
  }
  if (!ready) throw new Error('Sandbox PostgreSQL did not become ready');
  await migrate(state, 'gymos_manual_master', 'master');
  const master = new Master({ adapter: new PrismaPg({ connectionString: state.masterUrl, max: 3 }) });
  try {
    const passwordHash = await argon2.hash(state.password, { type: argon2.argon2id }); const users = {};
    for (const role of ['admin', 'owner', 'trainer', 'member']) users[role] = await master.user.create({ data: {
      email: `${role}@gymos.test`, displayName: `Test ${role}`, passwordHash, globalRole: role === 'admin' ? 'SUPER_ADMIN' : 'USER',
    } });
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const today = dateOnly(new Date(`${localDate}T00:00:00Z`)); state.gyms = [];
    for (let index = 0; index < 3; index++) { state.gyms.push(await seedGym(state, master, users, index, today)); console.log(`Seeded ${state.gyms.at(-1).slug}: 20 members, 40 PT sessions`); }
    state.accounts = Object.fromEntries(Object.entries(users).map(([role, user]) => [role, user.email]));
    state.ready = true; await save(state);
    console.log(`Sandbox ready. Four main accounts are saved privately in .env.manual-test.json. Run pnpm manual:start.`);
  } finally { await master.$disconnect(); }
}
async function check() {
  const state = JSON.parse(await readFile(statePath, 'utf8')); await verify(state);
  if (!state.ready || !state.apiUrl) throw new Error('Run pnpm manual:start first');
  const tokens = {};
  for (const [role, email] of Object.entries(state.accounts)) {
    const response = await fetch(`${state.apiUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: state.password }) });
    if (!response.ok) throw new Error(`${role} login failed (${response.status}); after repeated checks, allow the login rate limit to reset`);
    const data = await response.json();
    if (role !== 'admin' && data.gyms.length !== 3) throw new Error(`${role} must have access to all 3 gyms`);
    if (role === 'admin' && data.globalRole !== 'SUPER_ADMIN') throw new Error('Admin role mismatch');
    tokens[role] = data.accessToken;
  }
  const get = async (path, role = 'owner') => {
    const response = await fetch(`${state.apiUrl}${path}`, { headers: { authorization: `Bearer ${tokens[role]}` } });
    if (!response.ok) throw new Error(`${role} ${path} returned ${response.status}`);
    return response.json();
  };
  for (const gym of state.gyms) {
    const options = await get(`/gyms/${gym.slug}/session-booking-options?memberPageSize=50`);
    if (options.members.totalCount !== 20 || options.trainers.totalCount !== 1 || !options.members.items.every(m => m.eligibility === 'ELIGIBLE'))
      throw new Error(`${gym.slug} booking eligibility mismatch`);
    await get(`/gyms/${gym.slug}/sessions`);
    await get(`/gyms/${gym.slug}/me/sessions`, 'trainer');
    await get(`/gyms/${gym.slug}/me/sessions`, 'member');
    const url = new URL(state.masterUrl); url.pathname = `/${gym.database}`;
    const tenant = new Tenant({ adapter: new PrismaPg({ connectionString: url.href, max: 1 }) });
    try {
      if (await tenant.member.count() !== 20 || await tenant.pTSession.count() !== 40) throw new Error(`${gym.slug} seed counts differ from baseline`);
      const packs = await tenant.sessionPack.findMany({ include: { creditMovements: true } });
      for (const pack of packs) {
        const balance = pack.creditMovements.reduce((b, m) => [b[0] + m.availableDelta, b[1] + m.heldDelta, b[2] + m.consumedDelta, b[3] + m.expiredDelta], [0, 0, 0, 0]);
        if (balance.some(v => v < 0) || balance.reduce((a, b) => a + b, 0) !== pack.issuedCredits) throw new Error('Pack balance mismatch');
      }
      if (await tenant.sessionCreditHold.count({ where: { session: { state: 'PENDING_CONFIRMATION' } } }) !== 0) throw new Error('Pending requests must not reserve credits');
    } finally { await tenant.$disconnect(); }
    console.log(`${gym.slug}: 20 members, 40 sessions, eligible bookings, role access and credit balances verified`);
  }
  console.log('All four logins and three isolated gym databases passed.');
}
async function portFree(port) {
  const server = createServer();
  return new Promise(resolve => { server.once('error', () => resolve(false)); server.listen(port, '127.0.0.1', () => server.close(() => resolve(true))); });
}
async function start() {
  const state = JSON.parse(await readFile(statePath, 'utf8')); await verify(state);
  if (!state.ready) throw new Error('Sandbox seed was incomplete; inspect its private state file');
  const apiPort = 3001;
  const existingWeb = !await portFree(3000);
  const webPort = existingWeb ? 3002 : 3000;
  if (!await portFree(apiPort) || !await portFree(webPort)) throw new Error('Sandbox ports are occupied');
  const apiEnv = { ...cleanEnv, PORT: String(apiPort), MASTER_DATABASE_URL: state.masterUrl, TENANT_DATABASE_URL: state.masterUrl,
    PROVISION_DATABASE_URL: state.provisionUrl, JWT_SECRET: state.jwtSecret };
  const api = spawn(process.execPath, ['dist/main.js'], { cwd: `${root}apps/api`, env: apiEnv, stdio: 'inherit' });
  const web = spawn(process.execPath, ['node_modules/next/dist/bin/next', existingWeb ? 'start' : 'dev', '-H', '127.0.0.1', '-p', String(webPort)], {
    cwd: `${root}apps/web`, env: { ...cleanEnv, NODE_ENV: existingWeb ? 'production' : 'development', GYMOS_API_URL: `http://127.0.0.1:${apiPort}`, GYMOS_WEB_ORIGIN: `http://localhost:${webPort}` }, stdio: 'inherit' });
  const stop = () => { api.kill('SIGTERM'); web?.kill('SIGTERM'); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  api.on('exit', () => web?.kill('SIGTERM')); web?.on('exit', () => api.kill('SIGTERM'));
  state.webUrl = `http://localhost:${webPort}`; state.apiUrl = `http://127.0.0.1:${apiPort}`; await save(state);
  if (existingWeb) console.log('Port 3000 is occupied; starting a separate test web app on port 3002 from the existing web build.');
  console.log(`\nManual test app: ${state.webUrl}/login\nAccounts: ${Object.values(state.accounts).join(', ')}\nPassword: ${state.password}\n`);
}
try {
  const command = process.argv[2];
  if (command === 'setup') await setup(); else if (command === 'start') await start(); else if (command === 'check') await check();
  else throw new Error('Usage: node apps/api/scripts/manual-test.mjs setup|start|check');
} catch (error) { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[DATABASE_URL]')); process.exitCode = 1; }
