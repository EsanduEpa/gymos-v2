import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import type { DatabaseService as DatabaseServiceType } from '../../src/database.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let app: INestApplication;
let base: string;
const secret = randomBytes(32).toString('hex');
async function bearer(identityId: string) {
  return new SignJWT({ authVersion: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
    .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
async function call(path: string, accessToken: string, body?: unknown, method?: string, headers: Record<string, string> = {}) {
  return fetch(`${base}${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: {
    authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...headers,
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

beforeAll(async () => {
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
  vi.stubEnv('JWT_SECRET', secret);
  vi.stubEnv('TENANT_DATABASE_URL', run.masterUrl);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService).useValue({ master: fixture.master } as DatabaseServiceType).compile();
  app = module.createNestApplication(); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
}, 120_000);

afterAll(async () => {
  await app?.close(); await fixture?.close();
  if (run) console.info('[configuration-owned-cleanup]', JSON.stringify(await run.cleanup()));
  vi.unstubAllEnvs();
});

it('isolates owner settings, preserves exact values, versions themes, and derives membership without read writes', async () => {
  const ownerA = await bearer(fixture.users.ownerA.id); const ownerB = await bearer(fixture.users.ownerB.id);
  const trainer = await bearer(fixture.users.trainerUser.id); const member = await bearer(fixture.users.memberUser.id);
  const slugA = fixture.gyms[0]!.slug; const slugB = fixture.gyms[1]!.slug;

  const configBefore = await fixture.tenants[0]!.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } });
  const termsBefore = await fixture.tenants[0]!.membershipTerm.count();
  const receiptsBefore = await fixture.tenants[0]!.commandReceipt.count();
  const auditsBefore = await fixture.tenants[0]!.auditLog.count();
  const read = await call(`/gyms/${slugA}/configuration`, ownerA); expect(read.status).toBe(200);
  const initial = await read.json(); expect(initial.configuration).toMatchObject({ currency: 'LKR', timezone: 'Asia/Colombo', version: configBefore.version });
  expect(await fixture.tenants[0]!.membershipTerm.count()).toBe(termsBefore);
  expect(await fixture.tenants[0]!.commandReceipt.count()).toBe(receiptsBefore);
  expect(await fixture.tenants[0]!.auditLog.count()).toBe(auditsBefore);
  expect((await fixture.tenants[0]!.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).version).toBe(configBefore.version);

  const forbiddenBody = { expectedVersion: configBefore.version, defaultSessionFee: '0', introSessionFee: '0', level2SessionFee: '',
    level1BaseRate: '0', cancellationWindowMinutes: 0, minimumSessionDurationMinutes: 15 };
  for (const access of [trainer, member]) expect((await call(`/gyms/${slugA}/configuration`, access, forbiddenBody)).status).toBe(403);
  expect((await call(`/gyms/${slugA}/configuration`, ownerA, forbiddenBody, 'POST', { 'x-gymos-support-context': 'A'.repeat(43) })).status).toBe(403);
  expect((await call(`/gyms/${slugA}/configuration`, ownerA, { ...forbiddenBody, injected: true })).status).toBe(422);
  expect((await call(`/gyms/${slugA}/configuration`, ownerA, { ...forbiddenBody, defaultSessionFee: '1.001' })).status).toBe(422);
  expect((await call(`/gyms/${slugA}/configuration`, ownerA, { ...forbiddenBody, expectedVersion: configBefore.version - 1 })).status).toBe(409);
  const changed = await call(`/gyms/${slugA}/configuration`, ownerA, { ...forbiddenBody, address: '12 Test Road' });
  expect(changed.status).toBe(201); const updated = await changed.json();
  expect(updated).toMatchObject({ version: configBefore.version + 1, defaultSessionFee: '0', level2SessionFee: null, introSessionFee: '0', level1BaseRate: '0', cancellationWindowMinutes: 0 });
  expect(await fixture.tenants[0]!.gymConfigurationVersion.count({ where: { configurationVersion: updated.version } })).toBe(1);
  expect((await fixture.tenants[0]!.gymConfigurationVersion.findUniqueOrThrow({ where: { gymConfigurationId_configurationVersion: { gymConfigurationId: 'current', configurationVersion: configBefore.version } } })).defaultSessionFee.toString()).toBe('50');
  expect((await (await call(`/gyms/${slugA}/configuration`, ownerA)).json()).configuration).toMatchObject({ address: '12 Test Road', defaultSessionFee: '0' });
  const untouchedB = await call(`/gyms/${slugB}/configuration`, ownerB); expect((await untouchedB.json()).configuration).toMatchObject({ address: '', defaultSessionFee: '50' });

  const planAResult = await call(`/gyms/${slugA}/membership-plans`, ownerA,
    { expectedVersion: updated.version, name: 'Free Day', description: '', price: '0.00', durationDays: 1 });
  expect(planAResult.status).toBe(201); const planA = await planAResult.json();
  expect(planA).toMatchObject({ price: '0', currency: 'LKR', durationDays: 1, status: 'ACTIVE' });
  expect((await call(`/gyms/${slugA}/membership-plans`, ownerA,
    { expectedVersion: updated.version, name: 'Duplicate submit', price: '1.00', durationDays: 1 })).status).toBe(409);
  expect((await call(`/gyms/${slugA}/membership-plans`, ownerA,
    { expectedVersion: updated.version + 1, name: 'Negative', price: '-1.00', durationDays: 1 })).status).toBe(422);
  expect((await call(`/gyms/${slugA}/membership-plans`, ownerA,
    { expectedVersion: updated.version + 1, name: 'Overprecision', price: '1.001', durationDays: 1 })).status).toBe(422);
  const planBResult = await call(`/gyms/${slugB}/membership-plans`, ownerB,
    { expectedVersion: 1, name: 'Gym B Plan', price: '2.50', durationDays: 30 });
  expect(planBResult.status).toBe(201); const planB = await planBResult.json();

  const memberA = await fixture.tenants[0]!.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const memberB = await fixture.tenants[1]!.member.findFirstOrThrow();
  expect((await call(`/gyms/${slugA}/members/${memberB.id}/membership-eligibility`, ownerA)).status).toBe(404);
  expect((await call(`/gyms/${slugA}/members/${memberA.id}/membership-eligibility`, trainer)).status).toBe(403);
  expect((await call(`/gyms/${slugA}/members/${memberA.id}/membership-eligibility`, member)).status).toBe(200);
  expect((await call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA,
    { planId: planB.id, expectedMemberVersion: memberA.version, idempotencyKey: randomUUID(), startPolicy: 'NEXT_AVAILABLE' })).status).toBe(404);

  const key = randomUUID(); const renewalInput = { planId: planA.id, expectedMemberVersion: memberA.version, idempotencyKey: key, startPolicy: 'NEXT_AVAILABLE' };
  const renewedResponse = await call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA, renewalInput); expect(renewedResponse.status).toBe(201);
  const renewed = await renewedResponse.json(); expect(renewed).toMatchObject({ agreedPrice: '0', currency: 'LKR', replayed: false });
  const replayResponse = await call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA, renewalInput); expect(replayResponse.status).toBe(201);
  expect(await replayResponse.json()).toMatchObject({ termId: renewed.termId, replayed: true });
  expect((await call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA,
    { ...renewalInput, expectedMemberVersion: renewed.memberVersion, idempotencyKey: randomUUID(), startPolicy: 'IMMEDIATE' })).status).toBe(409);
  const concurrent = await Promise.all([0, 1].map(() => call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA,
    { ...renewalInput, expectedMemberVersion: renewed.memberVersion, idempotencyKey: randomUUID(), startPolicy: 'NEXT_AVAILABLE' })));
  expect(concurrent.map(response => response.status).sort((left, right) => left - right)).toEqual([201, 409]);
  const termCount = await fixture.tenants[0]!.membershipTerm.count();
  await fixture.tenants[0]!.member.update({ where: { id: memberA.id }, data: { status: 'SUSPENDED' } });
  const eligible = await call(`/gyms/${slugA}/members/${memberA.id}/membership-eligibility`, ownerA);
  expect(eligible.status).toBe(200); const suspended = await eligible.json();
  expect(suspended).toMatchObject({ status: 'SUSPENDED', eligible: false, term: { endDateExclusive: renewed.endDateExclusive } });
  expect(await fixture.tenants[0]!.membershipTerm.count()).toBe(termCount);
  expect((await fixture.master.user.findUniqueOrThrow({ where: { id: fixture.users.memberUser.id } })).authVersion).toBe(0);

  const themeSettings = await (await call(`/gyms/${slugA}/theme/settings`, ownerA)).json();
  expect((await call(`/gyms/${slugA}/theme`, trainer, { expectedVersion: 0, primaryColor: '#123456' }, 'PATCH')).status).toBe(403);
  expect((await call(`/gyms/${slugA}/theme`, ownerA, { expectedVersion: 0, primaryColor: '#xyzxyz' }, 'PATCH')).status).toBe(422);
  expect((await call(`/gyms/${slugA}/theme`, ownerA, { expectedVersion: 0, logoUrl: 'data:image/svg+xml,bad' }, 'PATCH')).status).toBe(422);
  const themeSaved = await call(`/gyms/${slugA}/theme`, ownerA,
    { expectedVersion: themeSettings.theme.version, primaryColor: '#123456', logoUrl: 'https://example.test/logo.svg' }, 'PATCH');
  expect(themeSaved.status).toBe(200); expect(await themeSaved.json()).toMatchObject({ theme: { primaryColor: '#123456', version: themeSettings.theme.version + 1 } });
  expect((await call(`/gyms/${slugA}/theme`, ownerA, { expectedVersion: 0, primaryColor: '#654321' }, 'PATCH')).status).toBe(409);
  expect((await fixture.master.theme.findUniqueOrThrow({ where: { gymId: fixture.gyms[1]!.id } })).primaryColor).toBe('#7C3AED');
  await fixture.master.theme.update({ where: { gymId: fixture.gyms[0]!.id }, data: { logoUrl: 'http://unsafe.example/logo.png' } });
  expect((await (await call(`/gyms/${slugA}/theme`, ownerA)).json()).theme.logoUrl).toBeNull();

  const profile = await (await call(`/gyms/${slugA}/public-profile`, ownerA)).json();
  const profileUpdate = await call(`/gyms/${slugA}/public-profile`, ownerA, { expectedVersion: profile.version, name: 'New Public Name' }, 'PATCH');
  expect(profileUpdate.status).toBe(200); expect(await profileUpdate.json()).toEqual({ name: 'New Public Name', version: profile.version + 1 });
  expect((await fixture.tenants[0]!.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } })).address).toBe('12 Test Road');
}, 90_000);
