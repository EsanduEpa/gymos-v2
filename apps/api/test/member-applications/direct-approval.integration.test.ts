import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import { AuthController } from '../../src/auth.controller.js';
import type { DatabaseService as DatabaseServiceType } from '../../src/database.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let app: INestApplication;
let base: string;
const secret = randomBytes(32).toString('hex');
const password = 'Applicant-Owned-Password-2026!';
async function token(identityId: string, authVersion = 0) {
  return new SignJWT({ authVersion }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
    .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
async function call(path: string, body: unknown, bearer?: string) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body) });
}
beforeAll(async () => {
  run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run);
  vi.stubEnv('JWT_SECRET', secret); vi.stubEnv('TENANT_DATABASE_URL', run.masterUrl);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService).useValue({ master: fixture.master } as DatabaseServiceType).compile();
  app = module.createNestApplication(); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
}, 120_000);
afterAll(async () => {
  await app?.close(); await fixture?.close();
  if (run) console.info('[direct-approval-owned-cleanup]', JSON.stringify(await run.cleanup()));
  vi.unstubAllEnvs();
}, 120_000);

it('activates a self-applicant only after owner approval reconciles, preserving credentials and tenant scope', async () => {
  const gym = fixture.gyms[0]!; const tenant = fixture.tenants[0]!;
  const plan = await tenant.membershipPlan.create({ data: { name: 'Applicant test plan', price: '1250', currency: 'LKR', durationDays: 30 } });
  const email = `direct-applicant-${run.runId}@example.test`;
  const submitted = await call('/gyms/applications', { slug: gym.slug, fullName: 'Direct Applicant', email, phone: '+94770000000', password, consent: true });
  expect(submitted.status).toBe(201);
  const identity = await fixture.master.user.findUniqueOrThrow({ where: { email } });
  expect(await argon2.verify(identity.passwordHash, password)).toBe(true);
  expect(await fixture.master.gymAccess.count({ where: { userId: identity.id, gymId: gym.id } })).toBe(0);
  const ownerToken = (await new AuthController({ master: fixture.master } as DatabaseServiceType).login({
    email: fixture.users.ownerA.email, password: fixture.password,
  })).accessToken;
  const queueResponse = await fetch(`${base}/gyms/${gym.slug}/owner/applications`, { headers: { authorization: `Bearer ${ownerToken}` } });
  expect(queueResponse.status).toBe(200);
  const application = (await queueResponse.json()).items.find((item: { email: string }) => item.email === email);
  expect(application).toBeTruthy();
  const approved = await call(`/gyms/${gym.slug}/owner/applications/${application.id}/approve`, {
    decision: 'APPROVE', expectedVersion: application.version, membershipPlanId: plan.id, dateOfBirth: '1995-06-15',
  }, ownerToken);
  expect(approved.status).toBe(201);
  expect(await approved.json()).toMatchObject({ id: application.id, state: 'APPROVED' });
  const access = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: identity.id, gymId: gym.id } } });
  expect(access).toMatchObject({ role: 'MEMBER', linkStatus: 'ACTIVE', actorKind: 'MEMBER' });
  expect(await tenant.member.count({ where: { identityId: identity.id, registrationState: 'COMPLETE' } })).toBe(1);
  expect(await tenant.membershipTerm.count({ where: { member: { identityId: identity.id } } })).toBe(1);
  expect(await tenant.sessionPack.count({ where: { member: { identityId: identity.id } } })).toBe(0);
  expect(await argon2.verify((await fixture.master.user.findUniqueOrThrow({ where: { id: identity.id } })).passwordHash, password)).toBe(true);
  expect(await fixture.master.gymAccess.count({ where: { userId: identity.id, gymId: fixture.gyms[1]!.id } })).toBe(0);
  expect((await call(`/gyms/${gym.slug}/owner/applications/${application.id}/approve`, {
    decision: 'APPROVE', expectedVersion: application.version, membershipPlanId: plan.id, dateOfBirth: '1995-06-15',
  }, ownerToken)).status).toBe(201);
  expect(await tenant.member.count({ where: { identityId: identity.id } })).toBe(1);

  const existingEmail = `existing-applicant-${run.runId}@example.test`;
  const existing = await fixture.master.user.create({ data: { email: existingEmail, displayName: 'Existing Applicant',
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  const existingSubmission = await call(`/gyms/${gym.slug}/me/applications`, {
    fullName: 'Existing Applicant', phone: '+94770000001', consent: true,
  }, await token(existing.id));
  expect(existingSubmission.status).toBe(201);
  const existingQueue = await fetch(`${base}/gyms/${gym.slug}/owner/applications`, { headers: { authorization: `Bearer ${ownerToken}` } });
  const existingApplication = (await existingQueue.json()).items.find((item: { email: string }) => item.email === existingEmail);
  expect(existingApplication).toBeTruthy();
  const existingApproval = await call(`/gyms/${gym.slug}/owner/applications/${existingApplication.id}/approve`, {
    decision: 'APPROVE', expectedVersion: existingApplication.version, membershipPlanId: plan.id, dateOfBirth: '1993-04-21',
  }, ownerToken);
  expect(existingApproval.status).toBe(201);
  expect(await existingApproval.json()).toMatchObject({ state: 'APPROVED' });
  expect(await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: existing.id, gymId: gym.id } } })).toMatchObject({ linkStatus: 'ACTIVE', role: 'MEMBER' });
  expect(await argon2.verify((await fixture.master.user.findUniqueOrThrow({ where: { id: existing.id } })).passwordHash, password)).toBe(true);
}, 120_000);
