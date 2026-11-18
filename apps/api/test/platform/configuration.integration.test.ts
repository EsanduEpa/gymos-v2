import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { PayHereSandboxMerchantClient } from '../../src/payments/payhere-merchant.js';
import { DatabaseService } from '../../src/database.service.js';
import type { DatabaseService as DatabaseServiceType } from '../../src/database.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let app: INestApplication;
let base: string;
const secret = randomBytes(32).toString('hex');
async function bearer(identityId: string, gymId = fixture.gyms[0]!.id) {
  const account = await fixture.master.gymAccount.upsert({ where: { userId_gymId: { userId: identityId, gymId } },
    create: { userId: identityId, gymId, username: `configuration-${identityId}-${gymId}`, passwordHash: 'fixture-not-a-login-hash', status: 'ACTIVE' },
    update: { status: 'ACTIVE', mustChangePassword: false, credentialExpiresAt: null } });
  const now = Date.now();
  const session = await fixture.master.identitySession.create({ data: { identityId, gymAccountId: account.id, authVersion: account.authVersion,
    deviceClass: 'SHARED', deviceLabel: 'Configuration integration test', refreshTokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
    idleExpiresAt: new Date(now + 600_000), absoluteExpiresAt: new Date(now + 900_000) } });
  return new SignJWT({ authVersion: account.authVersion, sid: session.id, gaid: account.id }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
    .setIssuer('gymos-v2').setAudience('gymos-api').setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode(secret));
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
  const ownerA = await bearer(fixture.users.ownerA.id); const ownerB = await bearer(fixture.users.ownerB.id, fixture.gyms[1]!.id);
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
  const additionalPlanResponse = await call(`/gyms/${slugA}/membership-plans`, ownerA,
    { expectedVersion: planA.configurationVersion, name: 'Additional plan', price: '12.50', durationDays: 30 });
  expect(additionalPlanResponse.status).toBe(201);
  const additionalPlan = await additionalPlanResponse.json();
  const overlappingResponse = await call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA,
    { planId: additionalPlan.id, expectedMemberVersion: renewed.memberVersion, idempotencyKey: randomUUID(), startPolicy: 'IMMEDIATE' });
  expect(overlappingResponse.status).toBe(201);
  const overlapping = await overlappingResponse.json();
  expect(overlapping.startDate).toBe(renewed.startDate);
  const editedPlan = await call(`/gyms/${slugA}/membership-plans/${planA.id}`, ownerA, {
    action: 'EDIT', expectedVersion: additionalPlan.configurationVersion, expectedPlanVersion: planA.version,
    name: 'Day plan renewed', price: '8.25', durationDays: 1, includedPtCredits: 2,
  });
  expect(editedPlan.status).toBe(201);
  expect((await call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA,
    { ...renewalInput, expectedMemberVersion: overlapping.memberVersion, idempotencyKey: randomUUID(), startPolicy: 'IMMEDIATE' })).status).toBe(409);
  const concurrent = await Promise.all([0, 1].map(() => call(`/gyms/${slugA}/members/${memberA.id}/memberships`, ownerA,
    { ...renewalInput, expectedMemberVersion: overlapping.memberVersion, idempotencyKey: randomUUID(), startPolicy: 'NEXT_AVAILABLE' })));
  expect(concurrent.map(response => response.status).sort((left, right) => left - right)).toEqual([201, 409]);
  const queued = await concurrent.find(response => response.status === 201)!.json();
  expect(queued).toMatchObject({ startDate: renewed.endDateExclusive, planName: 'Day plan renewed', agreedPrice: '8.25' });

  for (const [credits, future] of [[3, false], [5, true]] as const) {
    const issued = await call(`/gyms/${slugA}/members/${memberA.id}/session-packs`, ownerA,
      { credits, price: '0', currency: 'LKR', validityDays: 30, idempotencyKey: randomUUID() });
    expect(issued.status).toBe(201);
    if (future) {
      const { pack } = await issued.json();
      const forward = (date: string) => new Date(Date.parse(date) + 86_400_000);
      await fixture.tenants[0]!.sessionPack.update({ where: { id: pack.id }, data: {
        startDate: forward(pack.startDate), endDateExclusive: forward(pack.endDateExclusive),
      } });
    }
  }
  const overviewPath = `/gyms/${slugA}/me/memberships`;
  await fixture.tenants[0]!.membershipPlan.create({ data: {
    name: 'Archived plan', price: '5', currency: 'LKR', durationDays: 7, status: 'INACTIVE',
  } });
  expect((await call(overviewPath, ownerA)).status).toBe(403);
  expect((await call(overviewPath, trainer)).status).toBe(403);
  expect((await call(`/gyms/${slugB}/me/memberships`, member)).status).toBe(403);
  const overviewResponse = await call(overviewPath, member);
  expect(overviewResponse.status).toBe(200);
  const overview = await overviewResponse.json();
  expect(overview.active).toHaveLength(2);
  expect(overview.active).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: renewed.termId, planName: 'Free Day', agreedPrice: '0', renewalStartsOn: queued.startDate }),
    expect.objectContaining({ id: overlapping.termId, planName: 'Additional plan', agreedPrice: '12.5', renewalStartsOn: null }),
  ]));
  expect(overview.upcoming).toEqual([expect.objectContaining({ id: queued.termId, startDate: queued.startDate })]);
  expect(overview.credits).toEqual({ available: 3, held: 0 });
  expect(overview.availablePlans).toEqual([
    { id: additionalPlan.id, name: 'Additional plan', price: '12.5', currency: 'LKR', durationDays: 30, includedPtCredits: 0 },
    { id: planA.id, name: 'Day plan renewed', price: '8.25', currency: 'LKR', durationDays: 1, includedPtCredits: 2 },
  ]);
  const termCount = await fixture.tenants[0]!.membershipTerm.count();
  await fixture.tenants[0]!.member.update({ where: { id: memberA.id }, data: { status: 'SUSPENDED' } });
  const eligible = await call(`/gyms/${slugA}/members/${memberA.id}/membership-eligibility`, ownerA);
  expect(eligible.status).toBe(200); const suspended = await eligible.json();
  expect(suspended).toMatchObject({ status: 'SUSPENDED', eligible: false });
  expect([renewed.termId, overlapping.termId]).toContain(suspended.term.id);
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

it('issues the snapshotted zero-value PT allowance once on enrollment and once on renewal', async () => {
  const gym = fixture.gyms[0]!;
  const tenant = fixture.tenants[0]!;
  const owner = await bearer(fixture.users.ownerA.id);
  const prefix = `/gyms/${gym.slug}`;
  const config = await tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' }, select: { version: true } });
  const planInput = { expectedVersion: config.version, name: 'Membership with PT', price: '1600.00', durationDays: 30, includedPtCredits: 3 };
  expect((await call(`${prefix}/membership-plans`, owner, { ...planInput, includedPtCredits: 1001 })).status).toBe(422);
  const create = await call(`${prefix}/membership-plans`, owner, planInput);
  expect(create.status).toBe(201);
  const plan = await create.json();
  expect(plan.includedPtCredits).toBe(3);

  const enrollmentInput = { fullName: 'Allowance Member', email: `allowance-${run.runId}@example.test`, phone: '+94770000500',
    dateOfBirth: '1990-01-20', membershipPlanId: plan.id, idempotencyKey: randomUUID() };
  const enrollmentPath = `${prefix}/member-registrations`;
  const enrollmentResponse = await call(enrollmentPath, owner, enrollmentInput);
  expect(enrollmentResponse.status).toBe(201);
  const { memberId, term: initialTerm, status } = await enrollmentResponse.json();
  expect(status).toBe('COMPLETE');
  const enrollmentReplay = await call(enrollmentPath, owner, enrollmentInput);
  expect(enrollmentReplay.status).toBe(201);
  expect(await enrollmentReplay.json()).toMatchObject({ memberId, term: { id: initialTerm.id }, replayed: true });

  const edited = await call(`${prefix}/membership-plans/${plan.id}`, owner, {
    ...planInput, action: 'EDIT', expectedVersion: plan.configurationVersion, expectedPlanVersion: plan.version,
    includedPtCredits: 5,
  });
  expect(edited.status).toBe(201);
  expect((await edited.json()).plan.includedPtCredits).toBe(5);
  const member = await tenant.member.findUniqueOrThrow({ where: { id: memberId } });
  const renewalInput = { planId: plan.id, expectedMemberVersion: member.version, idempotencyKey: randomUUID(), startPolicy: 'NEXT_AVAILABLE' };
  const renewalPath = `${prefix}/members/${memberId}/memberships`;
  const renewal = await call(renewalPath, owner, renewalInput);
  expect(renewal.status).toBe(201);
  const renewedTerm = await renewal.json();
  expect(renewedTerm).toMatchObject({ startDate: initialTerm.endDateExclusive, agreedPrice: '1600', replayed: false });
  const renewalReplay = await call(renewalPath, owner, renewalInput);
  expect(renewalReplay.status).toBe(201);
  expect(await renewalReplay.json()).toMatchObject({ termId: renewedTerm.termId, replayed: true });

  const terms = await tenant.membershipTerm.findMany({ where: { memberId }, orderBy: { startDate: 'asc' },
    include: { includedPtPack: { include: { creditMovements: true } } } });
  expect(terms.map(term => [term.id, term.includedPtCredits])).toEqual([[initialTerm.id, 3], [renewedTerm.termId, 5]]);
  for (const term of terms) {
    expect(term.agreedPrice.toString()).toBe('1600');
    const pack = term.includedPtPack!;
    expect(pack).toMatchObject({ membershipTermId: term.id, issuedCredits: term.includedPtCredits,
      startDate: term.startDate, endDateExclusive: term.endDateExclusive, totalMinorUnits: 0n, validityDays: 30 });
    expect(pack.price.toString()).toBe('0');
    expect(pack.creditMovements).toHaveLength(1);
    expect(pack.creditMovements[0]).toMatchObject({ kind: 'ISSUE', availableDelta: term.includedPtCredits, receiptId: pack.commandReceiptId });
    expect(await tenant.auditLog.count({ where: { eventCode: 'MEMBER_SESSION_PACK_ISSUED', receiptId: pack.commandReceiptId, resourceId: pack.id } })).toBe(1);
  }
  expect(await tenant.sessionPack.count({ where: { memberId } })).toBe(2);
});

it('fulfills a signed PayHere Sandbox membership checkout exactly once', async () => {
  const gym = fixture.gyms[0]!;
  const memberDb = fixture.tenants[0]!;
  const member = await memberDb.member.update({ where: { identityId: fixture.users.memberUser.id }, data: { status: 'ACTIVE' } });
  const memberToken = await bearer(fixture.users.memberUser.id);
  const owner = await bearer(fixture.users.ownerA.id);
  const plan = await memberDb.membershipPlan.create({
    data: { name: 'Sandbox member plan', price: '900.25', currency: 'LKR', durationDays: 45, includedPtCredits: 2 },
  });
  const existing = await call(`/gyms/${gym.slug}/members/${member.id}/memberships`, owner, {
    planId: plan.id, expectedMemberVersion: member.version, idempotencyKey: randomUUID(), startPolicy: 'IMMEDIATE',
  });
  expect(existing.status).toBe(201);
  const original = await existing.json();
  const checkoutPath = `/gyms/${gym.slug}/me/membership-checkouts`;
  const checkoutInput = { planId: plan.id, idempotencyKey: randomUUID(), firstName: 'Sandbox', lastName: 'Member',
    email: 'checkout@example.test', phone: '+94770000500', address: 'Synthetic address', city: 'Colombo', country: 'Sri Lanka' };
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_ID', '');
  expect((await call(checkoutPath, memberToken, checkoutInput)).status).toBe(503);
  expect(await memberDb.memberPaymentOrder.count()).toBe(0);

  const merchantId = '1234567';
  const merchantSecret = 'synthetic-membership-test-secret';
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_ID', merchantId);
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET', merchantSecret);
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_API_ORIGIN', 'https://payment-callback.example.test');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_WEB_ORIGIN', 'http://localhost:3002');
  expect((await call(checkoutPath, owner, checkoutInput)).status).toBe(403);
  const started = await call(checkoutPath, memberToken, checkoutInput);
  expect(started.status).toBe(201);
  const checkout = await started.json();
  const orderId = checkout.fields.order_id as string;
  expect(checkout).toMatchObject({ action: 'https://sandbox.payhere.lk/pay/checkout', fields: {
    merchant_id: merchantId, amount: '900.25', currency: 'LKR', items: 'Sandbox member plan',
    notify_url: `https://payment-callback.example.test/gyms/${gym.slug}/payments/payhere/membership-notify`,
    return_url: `http://localhost:3002/gyms/${gym.slug}/member/membership?paymentOrder=${orderId}`,
  } });
  expect(JSON.stringify(checkout)).not.toContain(merchantSecret);
  const retry = await call(checkoutPath, memberToken, checkoutInput);
  expect(retry.status).toBe(201);
  expect(await retry.json()).toEqual(checkout);
  expect(await memberDb.memberPaymentOrder.count()).toBe(1);
  expect((await call(`${checkoutPath}/${orderId}`, memberToken)).status).toBe(200);
  expect((await call(`${checkoutPath}/${orderId}`, owner)).status).toBe(403);

  const md5 = (value: string) => createHash('md5').update(value).digest('hex').toUpperCase();
  async function notify(options: { status: string; amount?: string; currency?: string; id?: string; slug?: string; good?: boolean; reference?: string }) {
    const { status, amount = '900.25', currency = 'LKR', id = orderId, slug = gym.slug, good = true, reference } = options;
    const body = new URLSearchParams({ merchant_id: merchantId, order_id: id, payhere_amount: amount, payhere_currency: currency,
      status_code: status, md5sig: good ? md5(merchantId + id + amount + currency + status + md5(merchantSecret)) : '0'.repeat(32),
      ...(reference ? { payment_id: reference } : {}) });
    return fetch(`${base}/gyms/${slug}/payments/payhere/membership-notify`, { method: 'POST', body });
  }
  expect((await notify({ status: '2', good: false })).status).toBe(403);
  expect((await notify({ status: '2', amount: '1.00' })).status).toBe(422);
  expect((await notify({ status: '2', currency: 'USD' })).status).toBe(422);
  expect((await notify({ status: '2', id: randomUUID() })).status).toBe(404);
  expect((await notify({ status: '2', slug: fixture.gyms[1]!.slug })).status).toBe(404);
  expect((await notify({ status: '-2' })).status).toBe(204);
  expect(await (await call(`${checkoutPath}/${orderId}`, memberToken)).json()).toMatchObject({ status: 'FAILED' });
  expect(await memberDb.membershipTerm.count({ where: { memberId: member.id, planId: plan.id } })).toBe(1);

  await memberDb.membershipPlan.update({ where: { id: plan.id }, data: { name: 'Changed price after checkout', price: '1200', includedPtCredits: 7 } });
  const confirmations = await Promise.all([
    notify({ status: '2', reference: 'unsigned-reference-one' }),
    notify({ status: '2', reference: 'unsigned-reference-two' }),
  ]);
  expect(confirmations.map(response => response.status)).toEqual([204, 204]);
  const order = await memberDb.memberPaymentOrder.findUniqueOrThrow({ where: { id: orderId }, include: { term: { include: { includedPtPack: true } } } });
  expect(order.status).toBe('CONFIRMED');
  expect(order.term).toMatchObject({
    startDate: new Date(`${original.endDateExclusive}T00:00:00.000Z`),
    planNameSnapshot: 'Sandbox member plan', includedPtCredits: 2,
    includedPtPack: { issuedCredits: 2, totalMinorUnits: 0n },
  });
  expect(order.term!.agreedPrice.toFixed(2)).toBe('900.25');
  expect(await memberDb.membershipTerm.count({ where: { memberId: member.id, planId: plan.id } })).toBe(2);
  expect(await memberDb.commandReceipt.count({ where: { commandKind: 'CONFIRM_MEMBERSHIP_CHECKOUT', resourceId: order.term!.id } })).toBe(1);
  expect((await notify({ status: '-1' })).status).toBe(204);
  expect(await (await call(`${checkoutPath}/${orderId}`, memberToken)).json()).toMatchObject({ status: 'CONFIRMED' });

  const secondAttempt = await call(checkoutPath, memberToken, { ...checkoutInput, idempotencyKey: randomUUID() });
  expect(secondAttempt.status).toBe(201);
  const secondOrderId = (await secondAttempt.json()).fields.order_id as string;
  await memberDb.member.update({ where: { id: member.id }, data: { status: 'SUSPENDED' } });
  expect((await notify({ status: '2', id: secondOrderId, amount: '1200.00' })).status).toBe(204);
  expect(await memberDb.memberPaymentOrder.findUniqueOrThrow({ where: { id: secondOrderId } }))
    .toMatchObject({ status: 'REVIEW_REQUIRED', termId: null });
  expect(await memberDb.membershipTerm.count({ where: { memberId: member.id, planId: plan.id } })).toBe(2);
}, 60_000);

it('fulfills a paid PT pack once from its offer snapshot and scopes payment history and receipts', async () => {
  const [gym, otherGym] = fixture.gyms;
  const memberDb = fixture.tenants[0]!;
  const member = await memberDb.member.update({ where: { identityId: fixture.users.memberUser.id }, data: { status: 'ACTIVE' } });
  const memberToken = await bearer(fixture.users.memberUser.id);
  const owner = await bearer(fixture.users.ownerA.id);
  const otherOwner = await bearer(fixture.users.ownerB.id, otherGym.id);
  const rootPath = `/gyms/${gym.slug}`;
  const offersPath = `${rootPath}/pt-pack-offers`;
  const checkoutPath = `${rootPath}/me/pt-pack-checkouts`;
  const merchantId = '1234567';
  const merchantSecret = 'synthetic-pack-testing-secret';
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_ID', merchantId);
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET', merchantSecret);
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_API_ORIGIN', 'https://payment-callback.example.test');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_WEB_ORIGIN', 'http://localhost:3002');

  const offerInput = { name: 'Five sessions', credits: 5, price: '901.01', validityDays: 60, idempotencyKey: randomUUID() };
  expect((await call(offersPath, memberToken, offerInput)).status).toBe(403);
  const createOffer = await call(offersPath, owner, offerInput);
  expect(createOffer.status).toBe(201);
  const offer = await createOffer.json();
  expect(offer).toMatchObject({ price: '901.01', currency: 'LKR', credits: 5, validityDays: 60, status: 'ACTIVE' });
  expect(await (await call(offersPath, owner, offerInput)).json()).toEqual(offer);
  expect(await (await call(`${rootPath}/me/pt-pack-offers`, memberToken)).json()).toMatchObject({ offers: [{ id: offer.id }] });
  expect(await (await call(`/gyms/${otherGym.slug}/pt-pack-offers`, otherOwner)).json()).toEqual({ offers: [] });

  const checkoutInput = { offerId: offer.id, idempotencyKey: randomUUID(), firstName: 'Synthetic', lastName: 'Buyer',
    email: 'packs@example.test', phone: '+94770000500', address: 'Synthetic address', city: 'Colombo', country: 'Sri Lanka' };
  const checkout = await call(checkoutPath, memberToken, checkoutInput);
  expect(checkout.status).toBe(201);
  const fields = (await checkout.json()).fields;
  const orderId = fields.order_id as string;
  expect(fields).toMatchObject({ amount: '901.01', currency: 'LKR', items: 'Five sessions',
    return_url: `http://localhost:3002${rootPath}/member/membership?paymentOrder=${orderId}&paymentKind=PT_PACK`,
    notify_url: `https://payment-callback.example.test${rootPath}/payments/payhere/pt-pack-notify` });
  expect((await call(`${rootPath}/me/payments/${orderId}/receipt`, memberToken)).status).toBe(404);
  expect((await call(`${offersPath}/${offer.id}`, owner, { action: 'ARCHIVE', expectedVersion: offer.version })).status).toBe(201);
  expect(await (await call(`${rootPath}/me/pt-pack-offers`, memberToken)).json()).toEqual({ offers: [] });
  expect((await call(checkoutPath, memberToken, { ...checkoutInput, idempotencyKey: randomUUID() })).status).toBe(404);

  const md5 = (value: string) => createHash('md5').update(value).digest('hex').toUpperCase();
  const notify = (status: string, route = 'pt-pack-notify') => {
    const amount = '901.01';
    const body = new URLSearchParams({ merchant_id: merchantId, order_id: orderId, payhere_amount: amount, payhere_currency: 'LKR',
      status_code: status, md5sig: md5(merchantId + orderId + amount + 'LKR' + status + md5(merchantSecret)) });
    return fetch(`${base}${rootPath}/payments/payhere/${route}`, { method: 'POST', body });
  };
  expect((await notify('2', 'membership-notify')).status).toBe(404);
  expect((await notify('-2')).status).toBe(204);
  expect(await memberDb.memberPaymentOrder.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({ status: 'FAILED', packId: null });
  const confirmed = await Promise.all([notify('2'), notify('2')]);
  expect(confirmed.map(response => response.status)).toEqual([204, 204]);
  const order = await memberDb.memberPaymentOrder.findUniqueOrThrow({
    where: { id: orderId }, include: { pack: { include: { creditMovements: true } } },
  });
  expect(order).toMatchObject({ status: 'CONFIRMED', pack: {
    issuedCredits: 5, validityDays: 60, totalMinorUnits: 90101n, creditBaseMinorUnits: 18020n, creditRemainder: 1,
    creditMovements: [{ kind: 'ISSUE', availableDelta: 5 }],
  } });
  expect(await memberDb.commandReceipt.count({ where: { commandKind: 'CONFIRM_PT_PACK_CHECKOUT', resourceId: order.packId } })).toBe(1);
  expect((await call(`${rootPath}/payments`, memberToken)).status).toBe(403);
  expect((await (await call(`${rootPath}/me/payments`, memberToken)).json()).items).toContainEqual(expect.objectContaining({
    orderId, status: 'CONFIRMED', kind: 'PT_PACK', itemName: 'Five sessions', amount: '901.01',
  }));
  expect((await (await call(`${rootPath}/payments`, owner)).json()).items).toContainEqual(expect.objectContaining({
    orderId, memberId: member.id, memberName: member.fullName,
  }));
  const receipt = await call(`${rootPath}/me/payments/${orderId}/receipt`, memberToken);
  expect(receipt.status).toBe(200);
  expect(await receipt.json()).toMatchObject({ orderId, amount: '901.01', memberName: member.fullName, provider: 'PAYHERE_SANDBOX' });
  expect((await call(`/gyms/${otherGym.slug}/payments/${orderId}/receipt`, otherOwner)).status).toBe(404);
  expect((await notify('-3')).status).toBe(204);
  expect(await (await call(`${rootPath}/payments/${orderId}/receipt`, owner)).json()).toMatchObject({ orderId, status: 'CHARGEBACK' });
}, 60_000);

it('reconciles GymOS recurring billing and recovers in the seven-day window without affecting the other gym', async () => {
  const gymA = fixture.gyms[0]!;
  const gymB = fixture.gyms[1]!;
  const ownerA = await bearer(fixture.users.ownerA.id, gymA.id);
  const ownerB = await bearer(fixture.users.ownerB.id, gymB.id);
  const member = await bearer(fixture.users.memberUser.id, gymA.id);
  const route = `/gyms/${gymA.slug}/gymos-subscription`;
  const otherRoute = `/gyms/${gymB.slug}/gymos-subscription`;
  const merchantId = '1234567';
  const merchantSecret = 'synthetic-gymos-subscription-secret';
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_ID', merchantId);
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET', merchantSecret);
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_API_ORIGIN', 'https://payment-callback.example.test');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_WEB_ORIGIN', 'http://localhost:3002');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_APP_ID', 'synthetic-app-id');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_APP_SECRET', 'synthetic-app-secret');
  const getSubscription = vi.spyOn(PayHereSandboxMerchantClient.prototype, 'getSubscription').mockImplementation(async (subscriptionId, orderId) => ({
    subscriptionId, orderId, amount: '3500.00', currency: 'LKR', status: 'ACTIVE',
  }));
  const getPayments = vi.spyOn(PayHereSandboxMerchantClient.prototype, 'getSubscriptionPayments');
  const stopSubscription = vi.spyOn(PayHereSandboxMerchantClient.prototype, 'stopSubscription').mockResolvedValue(undefined);
  try {
    expect((await call(route, member)).status).toBe(403);
    expect((await call(route, ownerB)).status).toBe(403);
    expect(await (await call(otherRoute, ownerB)).json()).toMatchObject({ tier: null, status: 'NOT_STARTED' });
    const checkout = { tier: 'STARTER', idempotencyKey: randomUUID(), firstName: 'Sandbox', lastName: 'Owner',
      email: 'owner@example.test', phone: '+94770000500', address: 'Synthetic address', city: 'Colombo', country: 'Sri Lanka' };
    const started = await call(`${route}/checkout`, ownerA, checkout);
    expect(started.status).toBe(201);
    const { fields } = await started.json();
    expect(fields).toMatchObject({ amount: '3500.00', currency: 'LKR', recurrence: '1 Month', duration: 'Forever' });
    const orderId: string = fields.order_id;
    const resumed = await call(`${route}/checkout`, ownerA, { ...checkout, idempotencyKey: randomUUID() });
    expect((await resumed.json()).fields.order_id).toBe(orderId);
    expect((await call(`${route}/checkout`, ownerA, { ...checkout, tier: 'GROWTH', idempotencyKey: randomUUID() })).status).toBe(409);
    expect(await (await call(route, ownerA)).json()).toMatchObject({ status: 'PENDING', pendingTier: 'STARTER' });

    const providerId = '420075032251';
    const checksum = (value: string) => createHash('md5').update(value).digest('hex').toUpperCase();
    const notify = (status: string, paymentId: string, signature?: string, slug = gymA.slug) => fetch(`${base}/gyms/${slug}/payments/payhere/subscription-notify`, {
      method: 'POST', body: new URLSearchParams({
        merchant_id: merchantId, order_id: orderId, payhere_amount: '3500.00', payhere_currency: 'LKR', status_code: status,
        subscription_id: providerId, payment_id: paymentId,
        md5sig: signature ?? checksum(merchantId + orderId + '3500.00LKR' + status + checksum(merchantSecret)),
      }),
    });
    expect((await notify('2', 'verified-one', 'A'.repeat(32))).status).toBe(403);
    expect((await notify('2', 'verified-one', undefined, gymB.slug)).status).toBe(404);
    expect(getSubscription).not.toHaveBeenCalled();
    getPayments.mockResolvedValue([]);
    expect((await notify('2', 'unverified-ref')).status).toBe(503);
    expect(await fixture.master.gymosSubscriptionPayment.count()).toBe(0);
    const first = { paymentId: 'verified-one', orderId, amount: '3500.00', currency: 'LKR', status: 'RECEIVED' } as const;
    getPayments.mockResolvedValue([first]);
    const repeated = await Promise.all([notify('2', first.paymentId), notify('2', first.paymentId)]);
    expect(repeated.map(response => response.status)).toEqual([204, 204]);
    expect(await fixture.master.gymosSubscriptionPayment.count({ where: { orderId } })).toBe(1);
    expect(await (await call(route, ownerA)).json()).toMatchObject({ tier: 'STARTER', status: 'ACTIVE', canStart: false, canStop: true });

    const oneDayPast = new Date(Date.now() - 86_400_000);
    await fixture.master.gymosSubscriptionOrder.update({ where: { id: orderId }, data: { paidThrough: oneDayPast } });
    expect((await notify('-2', 'failed-attempt')).status).toBe(204);
    expect(await (await call(route, ownerA)).json()).toMatchObject({
      tier: 'STARTER', status: 'GRACE', paidThrough: oneDayPast.toISOString(),
      graceEndsAt: new Date(oneDayPast.getTime() + 7 * 86_400_000).toISOString(),
    });
    const second = { ...first, paymentId: 'verified-two' };
    getPayments.mockResolvedValue([first, second]);
    expect((await notify('2', second.paymentId)).status).toBe(204);
    expect(await fixture.master.gymosSubscriptionPayment.count({ where: { orderId } })).toBe(2);
    expect(await (await call(route, ownerA)).json()).toMatchObject({ tier: 'STARTER', status: 'ACTIVE' });
    expect(await (await call(otherRoute, ownerB)).json()).toMatchObject({ tier: null, status: 'NOT_STARTED' });

    await fixture.master.gymosSubscriptionOrder.update({ where: { id: orderId }, data: { paidThrough: new Date(Date.now() - 8 * 86_400_000) } });
    expect(await (await call(route, ownerA)).json()).toMatchObject({ tier: 'STARTER', status: 'PAST_DUE' });
    expect((await call(`${route}/stop`, ownerA, {}, 'POST')).status).toBe(204);
    expect(stopSubscription).toHaveBeenCalledWith(providerId, orderId);
    const replacement = await call(`${route}/checkout`, ownerA, { ...checkout, tier: 'GROWTH', idempotencyKey: randomUUID() });
    expect(replacement.status).toBe(201);
    expect((await replacement.json()).fields).toMatchObject({ amount: '7500.00', currency: 'LKR' });
    expect(await (await call(route, ownerA)).json()).toMatchObject({ tier: 'STARTER', status: 'PAST_DUE', pendingTier: 'GROWTH' });
  } finally {
    getSubscription.mockRestore();
    getPayments.mockRestore();
    stopSubscription.mockRestore();
  }
}, 90_000);
