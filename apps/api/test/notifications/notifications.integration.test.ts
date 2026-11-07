import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import type { DatabaseService as DatabaseServiceType } from '../../src/database.service.js';
import { appendTenantAudit } from '../../src/operations/transaction-audit.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { appendTenantNotification, notificationSourceEventKey } from '../../src/notifications.service.js';
import { recordInitialSession } from '../../src/sessions/session-commands.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let app: INestApplication;
let base: string;
const secret = randomBytes(32).toString('hex');
async function bearer(identityId: string, gymId = fixture.gyms[0]!.id) {
  const account = await fixture.master.gymAccount.upsert({ where: { userId_gymId: { userId: identityId, gymId } },
    create: { userId: identityId, gymId, username: `notifications-${identityId}-${gymId}`, passwordHash: 'fixture-not-a-login-hash', status: 'ACTIVE' },
    update: { status: 'ACTIVE', mustChangePassword: false, credentialExpiresAt: null } });
  const now = Date.now();
  const session = await fixture.master.identitySession.create({ data: { identityId, gymAccountId: account.id, authVersion: account.authVersion,
    deviceClass: 'SHARED', deviceLabel: 'Notification integration test', refreshTokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
    idleExpiresAt: new Date(now + 600_000), absoluteExpiresAt: new Date(now + 900_000) } });
  return new SignJWT({ authVersion: account.authVersion, sid: session.id, gaid: account.id }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
    .setIssuer('gymos-v2').setAudience('gymos-api').setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
async function call(path: string, accessToken: string, body?: unknown, method?: string) {
  return fetch(`${base}${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: {
    authorization: `Bearer ${accessToken}`, 'content-type': 'application/json',
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
  if (run) console.info('[notifications-owned-cleanup]', JSON.stringify(await run.cleanup()));
  vi.unstubAllEnvs();
}, 120_000);

it('keeps selected-gym notification reads and marks within the authenticated recipient', async () => {
  const ownerB = await bearer(fixture.users.ownerB.id, fixture.gyms[1]!.id);
  const trainer = await bearer(fixture.users.trainerUser.id);
  const member = await bearer(fixture.users.memberUser.id);
  const gymA = fixture.gyms[0]!;
  const gymB = fixture.gyms[1]!;
  const tenant = fixture.tenants[0]!;
  const old = new Date(Date.now() - 10_000);
  const owned = await tenant.notification.createMany({ data: [
    { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `source-member-1-${run.runId}`, eventCode: 'SESSION_BOOKED', title: 'Session confirmed', message: 'Your personal training session was confirmed.', linkKind: 'MEMBER_SESSIONS', resourceId: `session_${run.runId}`, createdAt: old },
    { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `source-member-2-${run.runId}`, eventCode: 'SESSION_DECLINED', title: 'Request declined', message: 'Your personal training session request was declined.', linkKind: 'MEMBER_SESSIONS', resourceId: `session2_${run.runId}`, createdAt: new Date() },
    { recipientIdentityId: fixture.users.trainerUser.id, sourceEventKey: `source-trainer-${run.runId}`, eventCode: 'HIRE_REQUEST', title: 'New session request', message: 'A member requested a personal training session.', linkKind: 'TRAINER_REQUESTS', resourceId: `session3_${run.runId}` },
  ] });
  await fixture.tenants[1]!.notification.create({ data: { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `foreign-${run.runId}`,
    eventCode: 'SESSION_BOOKED', title: 'Foreign', message: 'Foreign gym item', linkKind: 'MEMBER_SESSIONS', resourceId: `foreign_session_${run.runId}` } });
  expect(owned.count).toBe(3);

  const beforeRead = await tenant.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, readAt: null } });
  const listResponse = await call(`/gyms/${gymA.slug}/me/notifications?limit=1`, member);
  expect(listResponse.status).toBe(200);
  const list = await listResponse.json();
  expect(list.items).toHaveLength(1);
  expect(list.unreadCount).toBe(2);
  expect(JSON.stringify(list)).not.toContain(fixture.users.trainerUser.id);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, readAt: null } })).toBe(beforeRead);
  expect((await call(`/gyms/${gymB.slug}/me/notifications`, member)).status).toBe(403);
  expect((await call(`/gyms/${gymA.slug}/me/notifications`, ownerB)).status).toBe(403);
  expect((await call(`/gyms/${gymA.slug}/me/notifications?limit=101`, member)).status).toBe(422);

  const historyResponse = await call(`/gyms/${gymA.slug}/me/notification-history?pageSize=1&filter=ALL`, member);
  expect(historyResponse.status).toBe(200);
  const history = await historyResponse.json();
  expect(history.items).toHaveLength(1);
  expect(history.unreadCount).toBe(2);
  expect(history.nextCursor).toBeTruthy();
  const pageTwoItem = await tenant.notification.create({ data: { recipientIdentityId: fixture.users.memberUser.id,
    sourceEventKey: `after-snapshot-${run.runId}`, eventCode: 'SESSION_BOOKED', title: 'Later confirmation',
    message: 'A later personal training session was confirmed.', linkKind: 'MEMBER_SESSIONS', resourceId: `after-${run.runId}`,
    createdAt: new Date(Date.parse(history.asOf) + 1000), readAt: new Date(Date.parse(history.asOf) + 2000) } });
  const pageTwoResponse = await call(`/gyms/${gymA.slug}/me/notification-history?pageSize=1&filter=ALL&cursor=${encodeURIComponent(history.nextCursor)}`, member);
  expect(pageTwoResponse.status).toBe(200);
  const pageTwo = await pageTwoResponse.json();
  expect(pageTwo.items).toHaveLength(1);
  expect(pageTwo.items[0].id).not.toBe(pageTwoItem.id);
  expect(pageTwo.asOf).toBe(history.asOf);
  expect((await call(`/gyms/${gymA.slug}/me/notification-history?filter=INVALID`, member)).status).toBe(422);

  const target = await tenant.notification.findFirstOrThrow({ where: { recipientIdentityId: fixture.users.memberUser.id }, orderBy: { createdAt: 'asc' } });
  const readPath = `/gyms/${gymA.slug}/me/notifications/${target.id}/read`;
  expect((await call(readPath, member, {}, 'POST')).status).toBe(201);
  expect((await call(readPath, member, {}, 'POST')).status).toBe(201);
  expect((await call(readPath, trainer, {}, 'POST')).status).toBe(404);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, readAt: null } })).toBe(1);

  const through = list.asOf as string;
  await tenant.notification.create({ data: { recipientIdentityId: fixture.users.memberUser.id, sourceEventKey: `after-list-${run.runId}`,
    eventCode: 'SESSION_BOOKED', title: 'Session confirmed', message: 'Your personal training session was confirmed.',
    linkKind: 'MEMBER_SESSIONS', resourceId: `later_session_${run.runId}`, createdAt: new Date(Date.parse(through) + 1000) } });
  const markAll = await call(`/gyms/${gymA.slug}/me/notifications/read-all`, member, { through }, 'POST');
  expect(markAll.status).toBe(201);
  const markAllBody = await markAll.json();
  expect(markAllBody).toMatchObject({ changedCount: 1, unreadCount: 1, through });
  expect((await call(`/gyms/${gymA.slug}/me/notifications/read-all`, member, { through: new Date(Date.now() + 60_000).toISOString() }, 'POST')).status).toBe(422);
  expect(await fixture.tenants[1]!.notification.count({ where: { recipientIdentityId: fixture.users.memberUser.id, readAt: null } })).toBe(1);
});

it('keeps the account inbox identity-scoped and security history append-only', async () => {
  const pending = await bearer(fixture.users.pendingUser.id);
  const other = await bearer(fixture.users.memberUser.id);
  const account = await fixture.master.gymAccount.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.pendingUser.id, gymId: fixture.gyms[0]!.id } } });
  const first = await fixture.master.identitySecurityEvent.create({ data: { id: `security_${run.runId}_1`, identityId: fixture.users.pendingUser.id,
    gymAccountId: account.id, event: 'PASSWORD_CHANGED', createdAt: new Date(Date.now() - 1000) } });
  const application = await fixture.master.memberApplication.create({ data: { id: `application_${run.runId}`, gymId: fixture.gyms[0]!.id,
    identityId: fixture.users.pendingUser.id, fullName: 'Pending synthetic applicant', phone: '+94770000000', consentedAt: new Date(Date.now() - 500) } });
  await fixture.master.memberApplicationNotice.create({ data: { id: `application_notice_${run.runId}`, applicationId: application.id,
    gymId: fixture.gyms[0]!.id, recipientId: fixture.users.pendingUser.id, event: 'APPLICANT_SUBMITTED' } });
  const response = await call('/auth/notifications?pageSize=10', pending);
  expect(response.status).toBe(200);
  const page = await response.json();
  expect(page.items).toHaveLength(2);
  expect(page.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ sourceId: first.id, kind: 'SECURITY', target: { kind: 'ACCOUNT_SECURITY' } }),
    expect.objectContaining({ sourceId: `application_notice_${run.runId}`, kind: 'APPLICATION', target: { kind: 'APPLICATION_STATUS', applicationId: application.id } }),
  ]));
  expect(JSON.stringify(page.items)).not.toMatch(/example\.test|passwordHash|health|private note/i);
  expect((await call('/auth/notifications', other)).status).toBe(200);
  expect((await (await call('/auth/notifications', other)).json()).items).toHaveLength(0);
  expect((await call(`/auth/notifications/SECURITY/${first.id}/read`, other, {}, 'POST')).status).toBe(404);
  const mark = await call(`/auth/notifications/SECURITY/${first.id}/read`, pending, {}, 'POST');
  expect(mark.status).toBe(201);
  expect((await mark.json()).unreadCount).toBe(1);
  const markAll = await call('/auth/notifications/read-all', pending, { through: page.asOf }, 'POST');
  expect(markAll.status).toBe(201);
  expect((await markAll.json()).changedCount).toBe(1);
  const later = await fixture.master.identitySecurityEvent.create({ data: { id: `security_${run.runId}_later`, identityId: fixture.users.pendingUser.id,
    gymAccountId: account.id, event: 'SESSIONS_REVOKED', createdAt: new Date(Date.parse(page.asOf) + 1000) } });
  expect(later.id).toBeTruthy();
  expect((await (await call('/auth/notifications', pending)).json()).unreadCount).toBe(1);
  await expect(fixture.master.identitySecurityEvent.update({ where: { id: first.id }, data: { createdAt: new Date() } })).rejects.toThrow();
});

it('provides owner-only paged audit rows with a safe transition projection', async () => {
  const owner = await bearer(fixture.users.ownerA.id);
  const member = await bearer(fixture.users.memberUser.id);
  const gymA = fixture.gyms[0]!;
  const tenant = fixture.tenants[0]!;
  const receipt = await tenant.commandReceipt.create({ data: { id: `audit_receipt_${run.runId}`, actorIdentityId: fixture.users.ownerA.id,
    commandKind: 'TEST_AUDIT_FIXTURE', idempotencyKey: randomUUID(), requestDigest: requestDigest({ run: run.runId }),
    resourceType: 'TRAINER', resourceId: 'trainer_safe_id', state: 'COMMITTED', committedAt: new Date(), safeResult: {} } });
  await tenant.$transaction(async tx => {
    await appendTenantAudit(tx, { masterGymId: gymA.id, receiptId: receipt.id, actorIdentityId: fixture.users.ownerA.id,
      eventCode: 'TRAINER_SHIFT_APPROVED', resourceType: 'TRAINER', resourceId: 'trainer_safe_id', transition: { from: 'v1', to: 'v2', version: 2 } });
  });
  const before = await tenant.auditLog.count();
  const response = await call(`/gyms/${gymA.slug}/audit?actionType=TRAINER_SHIFT_APPROVED&page=1&pageSize=20`, owner);
  expect(response.status).toBe(200);
  const page = await response.json();
  expect(page).toMatchObject({ totalCount: 1, totalPages: 1, items: [{ eventCode: 'TRAINER_SHIFT_APPROVED', resourceId: 'trainer_safe_id', transition: { from: 'v1', to: 'v2', version: 2 } }] });
  expect(JSON.stringify(page)).not.toMatch(/healthNotes|passwordHash|token|databaseUrl/i);
  expect(await tenant.auditLog.count()).toBe(before);
  expect((await call(`/gyms/${gymA.slug}/audit`, member)).status).toBe(403);
  expect((await call(`/gyms/${fixture.gyms[1]!.slug}/audit`, owner)).status).toBe(403);
  expect((await call(`/gyms/${gymA.slug}/audit?actionType=UNKNOWN`, owner)).status).toBe(422);
});

it('deduplicates typed notification sources per gym recipient and rejects changed content', async () => {
  const tenant = fixture.tenants[0]!;
  const gym = fixture.gyms[0]!;
  const receipt = await createReceiptForNotification(tenant, fixture.users.ownerA.id, run.runId);
  const input = { masterGymId: gym.id, receiptId: receipt.id, eventCode: 'HIRE_REQUEST' as const,
    resourceId: `requested-session-${run.runId}`, recipientIdentityId: fixture.users.trainerUser.id };
  const first = await tenant.$transaction(tx => appendTenantNotification(tx, input));
  const replay = await tenant.$transaction(tx => appendTenantNotification(tx, input));
  expect(replay.id).toBe(first.id);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.trainerUser.id, sourceEventKey: first.sourceEventKey } })).toBe(1);

  const mismatchedKey = notificationSourceEventKey({ ...input, eventCode: 'SESSION_BOOKED' });
  await tenant.notification.create({ data: { recipientIdentityId: input.recipientIdentityId, sourceEventKey: mismatchedKey, eventCode: 'HIRE_REQUEST',
    title: 'Altered title', message: 'A member requested a personal training session.', linkKind: 'TRAINER_REQUESTS', resourceId: input.resourceId } });
  await expect(tenant.$transaction(tx => appendTenantNotification(tx, { ...input, eventCode: 'SESSION_BOOKED' }))).rejects.toThrow(/different content/);
  expect(await tenant.notification.count({ where: { sourceEventKey: mismatchedKey } })).toBe(1);
});

it('rolls a session creation and its required audit back when the notification source conflicts', async () => {
  const tenant = fixture.tenants[0]!;
  const gym = fixture.gyms[0]!;
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const ownerId = fixture.users.ownerA.id;
  const sessionId = `notification-rollback-${run.runId}`;
  const receipt = await createReceiptForNotification(tenant, ownerId, `${run.runId}_rollback`);
  const notificationInput = { masterGymId: gym.id, receiptId: receipt.id, eventCode: 'SESSION_BOOKED' as const,
    resourceId: sessionId, recipientIdentityId: fixture.users.memberUser.id };
  const sourceEventKey = notificationSourceEventKey(notificationInput);
  await tenant.notification.create({ data: { recipientIdentityId: notificationInput.recipientIdentityId, sourceEventKey,
    eventCode: 'SESSION_BOOKED', title: 'Corrupted source', message: 'A personal training session was confirmed.',
    linkKind: 'MEMBER_SESSIONS', resourceId: sessionId } });

  await expect(tenant.$transaction(async tx => {
    const start = new Date('2026-11-10T03:00:00.000Z');
    await tx.pTSession.create({ data: { id: sessionId, memberId: member.id, trainerId: trainer.id, state: 'SCHEDULED', type: 'IN_PERSON',
      scheduledStartAt: start, scheduledEndAt: new Date(start.getTime() + 60 * 60_000), gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR',
      confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1', configurationVersion: 0, confirmedAt: start,
      createdByIdentityId: ownerId, createdAt: start, updatedAt: start } });
    await recordInitialSession(tx, { masterGymId: gym.id, sessionId, receiptId: receipt.id, actorIdentityId: ownerId, command: 'OWNER_BOOK' });
    await appendTenantNotification(tx, notificationInput);
  })).rejects.toThrow(/different content/);
  expect(await tenant.pTSession.findUnique({ where: { id: sessionId } })).toBeNull();
  expect(await tenant.sessionStateEvent.count({ where: { sessionId } })).toBe(0);
  expect(await tenant.auditLog.count({ where: { receiptId: receipt.id } })).toBe(0);
  expect(await tenant.notification.count({ where: { recipientIdentityId: notificationInput.recipientIdentityId, sourceEventKey } })).toBe(1);
});

async function createReceiptForNotification(tenant: typeof fixture.tenants[number], actorId: string, runId: string) {
  return tenant.commandReceipt.create({ data: { id: `notification_receipt_${runId}`, actorIdentityId: actorId, commandKind: 'TEST_NOTIFICATION',
    idempotencyKey: randomUUID(), requestDigest: requestDigest({ runId }), state: 'COMMITTED', committedAt: new Date(), safeResult: {} } });
}

it('exposes scheduled-work health only to the selected gym owner', async () => {
  const path = `/gyms/${fixture.gyms[0]!.slug}/sessions/scheduled-work-health`;
  const response = await call(path, await bearer(fixture.users.ownerA.id));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ enabled: false, lastSuccessAt: null, overdue: 0, retrying: 0 });
  expect((await call(path, await bearer(fixture.users.memberUser.id))).status).toBe(403);
  expect((await call(path, await bearer(fixture.users.trainerUser.id))).status).toBe(403);
  expect((await call(path, await bearer(fixture.users.ownerB.id, fixture.gyms[1]!.id))).status).toBe(403);
});
