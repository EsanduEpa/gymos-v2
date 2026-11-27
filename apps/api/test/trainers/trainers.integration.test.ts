import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
async function bearer(identityId: string, gymId = fixture.gyms[0]!.id) {
  const account = await fixture.master.gymAccount.upsert({
    where: { userId_gymId: { userId: identityId, gymId } },
    create: { userId: identityId, gymId, username: `trainer-test-${identityId}-${gymId}`, passwordHash: 'fixture-not-a-login-hash', status: 'ACTIVE' },
    update: { status: 'ACTIVE', mustChangePassword: false, credentialExpiresAt: null },
  });
  const session = await fixture.master.identitySession.create({
    data: { identityId, gymAccountId: account.id, authVersion: account.authVersion, deviceClass: 'SHARED', deviceLabel: 'Trainer integration test',
      refreshTokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
      idleExpiresAt: new Date(Date.now() + 600_000), absoluteExpiresAt: new Date(Date.now() + 900_000) },
  });
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
  if (run) console.info('[trainers-owned-cleanup]', JSON.stringify(await run.cleanup()));
  vi.unstubAllEnvs();
}, 120_000);

it('serves role-safe, Master-published trainer pages and versioned/audited shift approvals', async () => {
  const owner = await bearer(fixture.users.ownerA.id);
  const ownerB = await bearer(fixture.users.ownerB.id, fixture.gyms[1]!.id);
  const trainerIdentity = await bearer(fixture.users.trainerUser.id);
  const member = await bearer(fixture.users.memberUser.id);
  const gymA = fixture.gyms[0]!; const gymB = fixture.gyms[1]!;
  const trainer = await fixture.tenants[0]!.trainer.findFirstOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const profileMember = await fixture.tenants[0]!.member.findFirstOrThrow({ where: { identityId: fixture.users.memberUser.id } });

  const profile = await call(`/gyms/${gymA.slug}/trainers/${trainer.id}`, owner);
  expect(profile.status).toBe(200);
  expect(await profile.json()).toMatchObject({ trainer: { id: trainer.id }, recentSessions: { items: [], limit: 10, totalCount: 0, hasMore: false },
    stats: { relatedClientCount: 0, completedInLoadedWindow: 0, totalCompleted: 0, rating: null } });

  const sessionStart = new Date('2026-10-01T08:00:00.000Z');
  const summaryStates = ['COMPLETED', 'COMPLETED', 'ACTIVE', 'SCHEDULED', 'PENDING_CONFIRMATION', 'CANCELLED', 'DECLINED', 'MISSED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED'] as const;
  await fixture.tenants[0]!.pTSession.createMany({ data: summaryStates.map((state, index) => {
    const scheduledStartAt = new Date(sessionStart.getTime() + Math.min(index, 10) * 86_400_000);
    const confirmed = state !== 'PENDING_CONFIRMATION' && state !== 'DECLINED';
    const endedAt = ['COMPLETED', 'MISSED', 'CANCELLED'].includes(state) ? new Date(scheduledStartAt.getTime() + 3_600_000) : null;
    return { id: `profile_session_${index}_${run.runId}`, memberId: profileMember.id, trainerId: trainer.id, state, type: 'IN_PERSON' as const,
      scheduledStartAt, scheduledEndAt: new Date(scheduledStartAt.getTime() + 3_600_000), gymTimezone: 'Asia/Colombo', fee: '1500.0000', currency: 'LKR',
      configurationVersion: 1, confirmedAt: confirmed ? new Date(scheduledStartAt.getTime() - 3_600_000) : null,
      confirmationRate: confirmed ? '0.500000' : null, confirmationLevel: confirmed ? 'LEVEL_1' as const : null,
      startedAt: ['ACTIVE', 'COMPLETED'].includes(state) ? scheduledStartAt : null, endedAt,
      requestExpiresAt: state === 'PENDING_CONFIRMATION' ? new Date(scheduledStartAt.getTime() - 3_600_000) : null,
      confirmationShiftStart: confirmed ? '06:00' : null, confirmationShiftEnd: confirmed ? '14:00' : null,
      createdByIdentityId: fixture.users.ownerA.id, createdAt: scheduledStartAt, updatedAt: scheduledStartAt };
  }) });
  const pendingOnlyMember = await fixture.tenants[0]!.member.create({ data: { fullName: 'Pending-only history member', registrationState: 'PENDING' } });
  const nonQualifyingStates = ['PENDING_CONFIRMATION', 'CANCELLED', 'DECLINED', 'MISSED'] as const;
  await fixture.tenants[0]!.pTSession.createMany({ data: nonQualifyingStates.map((state, index) => {
    const scheduledStartAt = new Date(sessionStart.getTime() - (index + 1) * 86_400_000);
    const confirmed = state !== 'PENDING_CONFIRMATION' && state !== 'DECLINED';
    return { id: `profile_unrelated_${index}_${run.runId}`, memberId: pendingOnlyMember.id, trainerId: trainer.id, state, type: 'VIRTUAL' as const,
      scheduledStartAt, scheduledEndAt: new Date(scheduledStartAt.getTime() + 3_600_000), gymTimezone: 'Asia/Colombo', fee: '1500.0000', currency: 'LKR',
      configurationVersion: 1, confirmedAt: confirmed ? new Date(scheduledStartAt.getTime() - 3_600_000) : null,
      confirmationRate: confirmed ? '0.500000' : null, confirmationLevel: confirmed ? 'LEVEL_1' as const : null,
      startedAt: null, endedAt: ['CANCELLED', 'MISSED'].includes(state) ? new Date(scheduledStartAt.getTime() + 3_600_000) : null,
      requestExpiresAt: state === 'PENDING_CONFIRMATION' ? new Date(scheduledStartAt.getTime() - 3_600_000) : null,
      confirmationShiftStart: confirmed ? '06:00' : null, confirmationShiftEnd: confirmed ? '14:00' : null,
      createdByIdentityId: fixture.users.ownerA.id, createdAt: scheduledStartAt, updatedAt: scheduledStartAt };
  }) });
  const readEffectsBefore = await Promise.all([
    fixture.tenants[0]!.sessionStateEvent.count(),
    fixture.tenants[0]!.auditLog.count(),
    fixture.tenants[0]!.commandReceipt.count(),
  ]);
  const profileWithSessions = await call(`/gyms/${gymA.slug}/trainers/${trainer.id}`, owner);
  expect(profileWithSessions.status).toBe(200);
  const sessionSummary = await profileWithSessions.json();
  expect(sessionSummary.recentSessions).toMatchObject({ limit: 10, totalCount: 16, hasMore: true });
  expect(sessionSummary.recentSessions.items).toHaveLength(10);
  expect(sessionSummary.recentSessions.items[0]).toMatchObject({ id: `profile_session_11_${run.runId}`, state: 'COMPLETED', type: 'IN_PERSON' });
  expect(sessionSummary.recentSessions.items[1]).toMatchObject({ id: `profile_session_10_${run.runId}`, state: 'COMPLETED' });
  expect(sessionSummary.recentSessions.items.at(-1)).toMatchObject({ id: `profile_session_2_${run.runId}`, state: 'ACTIVE' });
  expect(Object.keys(sessionSummary.recentSessions.items[0]!).sort()).toEqual(['createdAt', 'id', 'scheduledEndAt', 'scheduledStartAt', 'state', 'type']);
  expect(sessionSummary.stats).toMatchObject({ relatedClientCount: 1, completedInLoadedWindow: 4, totalCompleted: 6, rating: null });
  expect(await Promise.all([
    fixture.tenants[0]!.sessionStateEvent.count(),
    fixture.tenants[0]!.auditLog.count(),
    fixture.tenants[0]!.commandReceipt.count(),
  ])).toEqual(readEffectsBefore);
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}`, member)).status).toBe(403);
  const foreignTrainer = await fixture.tenants[1]!.trainer.create({ data: { fullName: 'Foreign Trainer', email: `foreign-${run.runId}@example.test`, phone: '+94110000099', level: 'LEVEL_1',
    registrationState: 'COMPLETE', identityId: fixture.users.trainerUser.id, enrollmentOperationId: 'foreign-operation' } });
  expect((await call(`/gyms/${gymA.slug}/trainers/${foreignTrainer.id}`, owner)).status).toBe(404);
  expect((await call(`/gyms/${gymB.slug}/trainers`, owner)).status).toBe(403);

  const existingAccess = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.trainerUser.id, gymId: gymA.id } } });
  const identities = Array.from({ length: 105 }, (_, index) => ({
    id: `roster_user_${index}_${run.runId}`, email: `roster-${index}-${run.runId}@example.test`, passwordHash: 'synthetic-hash', createdAt: new Date(), updatedAt: new Date(),
  }));
  await fixture.master.user.createMany({ data: identities });
  const trainers = identities.map((identity, index) => ({ id: `roster_trainer_${index}_${run.runId}`, identityId: identity.id,
    enrollmentOperationId: `roster_op_${index}_${run.runId}`, fullName: `Roster ${String(index).padStart(3, '0')}`,
    email: identity.email, phone: '+94110000001', registrationState: 'COMPLETE' as const, status: index === 0 ? 'DEACTIVATED' as const : 'ACTIVE' as const,
    level: 'LEVEL_2' as const, specialisations: ['Strength'], yearsExperience: index % 81, shiftStart: null, shiftEnd: null, bio: `Bio ${index}`, version: 0 }));
  await fixture.tenants[0]!.trainer.createMany({ data: trainers });
  const receiptIds = trainers.map((trainerRow, index) => `roster_receipt_${index}_${run.runId}`);
  const operationIds = trainers.map(trainerRow => trainerRow.enrollmentOperationId!);
  await fixture.tenants[0]!.commandReceipt.createMany({ data: trainers.map((trainerRow, index) => ({ id: receiptIds[index]!, actorIdentityId: fixture.users.ownerA.id,
    commandKind: 'REGISTER_TRAINER', idempotencyKey: randomUUID(), requestDigest: `d1:${'a'.repeat(64)}`, resourceType: 'TRAINER', resourceId: trainerRow.id,
    sourceMasterOperationId: trainerRow.enrollmentOperationId!, state: 'COMMITTED' as const, committedAt: new Date(), safeResult: { trainerId: trainerRow.id } })) });
  await fixture.master.operation.createMany({ data: trainers.map((trainerRow, index) => ({ id: operationIds[index]!, kind: 'REGISTER_TRAINER' as const,
    actorIdentityId: fixture.users.ownerA.id, scopeKey: `gym:${gymA.id}`, idempotencyKey: randomUUID(), requestDigest: `d1:${'b'.repeat(64)}`,
    gymId: gymA.id, subjectIdentityId: identities[index]!.id, tenantActorId: trainerRow.id, tenantCommandReceiptId: receiptIds[index]!,
    state: 'COMPLETE' as const, step: 'MASTER_ACTIVATED', safeResult: { trainerId: trainerRow.id } })) });
  await fixture.master.gymAccess.createMany({ data: trainers.map((trainerRow, index) => ({ userId: identities[index]!.id, gymId: gymA.id, role: 'TRAINER' as const,
    linkStatus: 'ACTIVE' as const, actorKind: 'TRAINER' as const, tenantActorId: trainerRow.id, enrollmentOperationId: trainerRow.enrollmentOperationId })) });

  const firstPageResponse = await call(`/gyms/${gymA.slug}/trainers?page=1&pageSize=100`, owner);
  expect(firstPageResponse.status).toBe(200); const firstPage = await firstPageResponse.json();
  expect(firstPage).toMatchObject({ page: 1, pageSize: 100, totalCount: 106, totalPages: 2 });
  const secondPage = await (await call(`/gyms/${gymA.slug}/trainers?page=2&pageSize=100`, owner)).json();
  expect(secondPage.items).toHaveLength(6);
  const filtered = await (await call(`/gyms/${gymA.slug}/trainers?q=Roster%20001&status=ACTIVE&level=LEVEL_2`, owner)).json();
  expect(filtered).toMatchObject({ totalCount: 1, items: [{ id: trainers[1]!.id }] });
  expect((await call(`/gyms/${gymA.slug}/trainers?pageSize=101`, owner)).status).toBe(422);

  const directory = await call(`/gyms/${gymA.slug}/me/trainer-directory?page=1&pageSize=100`, member);
  expect(directory.status).toBe(200); const directoryBody = await directory.json();
  expect(directoryBody.items).toHaveLength(100); expect(directoryBody.totalCount).toBe(105);
  expect(directoryBody.items[0]).toHaveProperty('shiftStart', null);
  expect(directoryBody.items[0]).toHaveProperty('shiftEnd', null);
  expect(directoryBody.items.every((item: Record<string, unknown>) => !('email' in item) && !('phone' in item) && !('identityId' in item))).toBe(true);
  expect(directoryBody.items.some((item: { id: string }) => item.id === trainers[0]!.id)).toBe(false);
  expect((await call(`/gyms/${gymA.slug}/me/trainer-directory`, trainerIdentity)).status).toBe(403);
  const visibleTrainerId = directoryBody.items[0].id as string;
  const memberProfileResponse = await call(`/gyms/${gymA.slug}/me/trainers/${visibleTrainerId}/profile`, member);
  expect(memberProfileResponse.status).toBe(200);
  const memberProfile = await memberProfileResponse.json();
  expect(memberProfile).toMatchObject({ trainer: { id: visibleTrainerId, rating: null }, completedSessions: expect.any(Number) });
  expect(JSON.stringify(memberProfile)).not.toMatch(/identityId|email|phone|privateNote|healthNotes/);
  expect((await call(`/gyms/${gymA.slug}/me/trainers/${visibleTrainerId}/profile`, trainerIdentity)).status).toBe(403);
  expect((await call(`/gyms/${gymA.slug}/me/trainers/${visibleTrainerId}/profile`, owner)).status).toBe(403);
  expect((await call(`/gyms/${gymB.slug}/me/trainers/${visibleTrainerId}/profile`, member)).status).toBe(403);
  expect((await call(`/gyms/${gymA.slug}/me/trainers/${trainers[0]!.id}/profile`, member)).status).toBe(404);

  const receiptsBefore = await fixture.tenants[0]!.commandReceipt.count({ where: { commandKind: 'APPROVE_TRAINER_SHIFT' } });
  const auditsBefore = await fixture.tenants[0]!.auditLog.count({ where: { eventCode: 'TRAINER_SHIFT_APPROVED' } });
  const shift = { start: '22:00', end: '06:00', overnight: true, expectedVersion: trainer.version };
  const shiftResponse = await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, shift, 'PUT');
  expect(shiftResponse.status).toBe(200); const shiftResult = await shiftResponse.json();
  expect(shiftResult).toMatchObject({ trainerId: trainer.id, shift: { start: '22:00', end: '06:00', overnight: true }, timeZone: 'Asia/Colombo', version: trainer.version + 1 });
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, shift, 'PUT')).status).toBe(200);
  expect(await fixture.tenants[0]!.commandReceipt.count({ where: { commandKind: 'APPROVE_TRAINER_SHIFT' } })).toBe(receiptsBefore + 1);
  expect(await fixture.tenants[0]!.auditLog.count({ where: { eventCode: 'TRAINER_SHIFT_APPROVED' } })).toBe(auditsBefore + 1);
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, { ...shift, start: '10:00', end: '10:14', overnight: false }, 'PUT')).status).toBe(422);
  expect(await fixture.tenants[0]!.trainer.findUniqueOrThrow({ where: { id: trainer.id } })).toMatchObject({ version: trainer.version + 1, shiftStart: '22:00', shiftEnd: '06:00' });
  expect(await fixture.tenants[0]!.commandReceipt.count({ where: { commandKind: 'APPROVE_TRAINER_SHIFT' } })).toBe(receiptsBefore + 1);
  expect(await fixture.tenants[0]!.auditLog.count({ where: { eventCode: 'TRAINER_SHIFT_APPROVED' } })).toBe(auditsBefore + 1);
  const boundaryShifts = [
    { start: '08:00', end: '08:15', overnight: false, expectedVersion: trainer.version + 1 },
    { start: '06:00', end: '22:00', overnight: false, expectedVersion: trainer.version + 2 },
  ];
  const concurrentBoundaryResponses = await Promise.all([
    call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, boundaryShifts[0], 'PUT'),
    call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, boundaryShifts[0], 'PUT'),
  ]);
  expect(concurrentBoundaryResponses.map(response => response.status)).toEqual([200, 200]);
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, boundaryShifts[1], 'PUT')).status).toBe(200);
  const conflictingReplay = { ...boundaryShifts[1]!, start: '07:00', end: '23:00' };
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, owner, conflictingReplay, 'PUT')).status).toBe(409);
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, trainerIdentity, { ...shift, expectedVersion: trainer.version + 1 }, 'PUT')).status).toBe(403);
  expect((await call(`/gyms/${gymA.slug}/trainers/${trainer.id}/shift`, ownerB, { ...shift, expectedVersion: trainer.version + 1 }, 'PUT')).status).toBe(403);
  const finalShiftCounts = await Promise.all([
    fixture.tenants[0]!.commandReceipt.count({ where: { commandKind: 'APPROVE_TRAINER_SHIFT' } }),
    fixture.tenants[0]!.auditLog.count({ where: { eventCode: 'TRAINER_SHIFT_APPROVED' } }),
  ]);
  expect(finalShiftCounts).toEqual([receiptsBefore + 3, auditsBefore + 3]);
  expect(await fixture.tenants[1]!.commandReceipt.count({ where: { commandKind: 'APPROVE_TRAINER_SHIFT' } })).toBe(0);
  expect(await fixture.tenants[0]!.pTSession.findUniqueOrThrow({ where: { id: `profile_session_0_${run.runId}` },
    select: { confirmationShiftStart: true, confirmationShiftEnd: true } })).toEqual({ confirmationShiftStart: '06:00', confirmationShiftEnd: '14:00' });
  expect(existingAccess.linkStatus).toBe('ACTIVE');
});

it('notifies the gym owner and requesting trainer once per committed shift event', async () => {
  const owner = await bearer(fixture.users.ownerA.id);
  const otherOwner = await bearer(fixture.users.ownerB.id, fixture.gyms[1]!.id);
  const trainerToken = await bearer(fixture.users.trainerUser.id);
  const tenant = fixture.tenants[0]!;
  const trainer = await tenant.trainer.findFirstOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const path = `/gyms/${fixture.gyms[0]!.slug}`;
  const notices = async (token: string, scope = path) => (await call(`${scope}/me/notifications?limit=100`, token)).json();
  const before = await notices(owner);
  const submit = { start: '08:15', end: '16:15', overnight: false, expectedVersion: trainer.version, requestId: randomUUID() };
  expect((await call(`${path}/me/shift-request`, trainerToken, submit, 'PUT')).status).toBe(200);
  expect(await (await call(`${path}/me/shift-request`, trainerToken, submit, 'PUT')).json()).toMatchObject({ replayed: true });
  const submission = await notices(owner);
  expect(submission.unreadCount).toBe(before.unreadCount + 1);
  const notice = submission.items.find((item: { eventCode: string }) => item.eventCode === 'TRAINER_SHIFT_REQUESTED');
  expect(notice).toMatchObject({ linkKind: 'OWNER_TRAINER_SHIFT_REVIEW', resourceId: trainer.id, readAt: null });
  expect((await call(`${path}/me/notifications/${notice.id}/read`, trainerToken, undefined, 'POST')).status).toBe(404);
  expect(await (await call(`${path}/me/notifications/${notice.id}/read`, owner, undefined, 'POST')).json()).toMatchObject({ isRead: true, unreadCount: before.unreadCount });
  const view = await (await call(`${path}/me/profile`, trainerToken)).json();
  expect(view).toMatchObject({ shiftStart: trainer.shiftStart, shiftEnd: trainer.shiftEnd,
    pendingShift: { id: submit.requestId, start: submit.start, end: submit.end } });
  expect(await (await call(`${path}/trainers?shift=pending`, owner)).json()).toMatchObject({
    items: [expect.objectContaining({ id: trainer.id, hasPendingShift: true })], totalCount: 1,
  });
  const ownerPath = `${path}/trainers/${trainer.id}/shift`;
  const replace = { ...submit, start: '09:00', end: '17:00', requestId: randomUUID(), expectedVersion: view.version };
  expect((await call(`${path}/me/shift-request`, trainerToken, replace, 'PUT')).status).toBe(200);
  const approve = { requestId: submit.requestId, expectedVersion: view.version + 1, decision: 'APPROVE' };
  expect((await call(ownerPath, owner, approve, 'PUT')).status).toBe(409);
  approve.requestId = replace.requestId;
  expect((await call(ownerPath, trainerToken, approve, 'PUT')).status).toBe(403);
  expect((await call(ownerPath, otherOwner, approve, 'PUT')).status).toBe(403);
  expect((await call(ownerPath, owner, approve, 'PUT')).status).toBe(200);
  expect((await call(ownerPath, owner, approve, 'PUT')).status).toBe(200);
  expect(await (await call(`${path}/me/profile`, trainerToken)).json()).toMatchObject({
    shiftStart: '09:00', shiftEnd: '17:00', pendingShift: null, version: view.version + 2,
  });
  const decline = { ...submit, requestId: randomUUID(), expectedVersion: view.version + 2 };
  expect((await call(`${path}/me/shift-request`, trainerToken, decline, 'PUT')).status).toBe(200);
  const declineDecision = { requestId: decline.requestId, expectedVersion: view.version + 3, decision: 'DECLINE' };
  expect((await call(ownerPath, owner, declineDecision, 'PUT')).status).toBe(200);
  expect((await call(ownerPath, owner, declineDecision, 'PUT')).status).toBe(200);
  expect(await (await call(`${path}/me/profile`, trainerToken)).json()).toMatchObject({
    shiftStart: '09:00', shiftEnd: '17:00', pendingShift: null,
  });
  const trainerNotices = await notices(trainerToken);
  expect(trainerNotices.items.filter((item: { eventCode: string }) => item.eventCode.startsWith('TRAINER_SHIFT_'))).toMatchObject([
    { eventCode: 'TRAINER_SHIFT_DECLINED', linkKind: 'TRAINER_SHIFT_DETAILS', resourceId: trainer.id },
    { eventCode: 'TRAINER_SHIFT_APPROVED', linkKind: 'TRAINER_SHIFT_DETAILS', resourceId: trainer.id },
  ]);
  expect(await tenant.notification.count({ where: { recipientIdentityId: fixture.users.ownerA.id,
    eventCode: 'TRAINER_SHIFT_REQUESTED', resourceId: trainer.id } })).toBe(3);
  expect((await call(`${path}/me/notifications`, otherOwner)).status).toBe(403);
  expect((await notices(otherOwner, `/gyms/${fixture.gyms[1]!.slug}`)).items).toEqual([]);
});

it('allows profile edits and serves normalized photos only in the allowed gym context', async () => {
  vi.stubEnv('GYMOS_COACHING_DATA_KEY', randomBytes(32).toString('hex'));
  const trainerToken = await bearer(fixture.users.trainerUser.id);
  const memberToken = await bearer(fixture.users.memberUser.id);
  const ownerToken = await bearer(fixture.users.ownerA.id);
  const tenant = fixture.tenants[0]!;
  const path = `/gyms/${fixture.gyms[0]!.slug}/me`;
  const member = await (await call(`${path}/profile`, memberToken)).json();
  const notes = 'Synthetic member health note';
  const edit = await fetch(`${base}${path}/profile`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${memberToken}`, 'content-type': 'application/json', 'idempotency-key': randomUUID() },
    body: JSON.stringify({ expectedVersion: member.version, phone: member.phone, emergencyContact: member.emergencyContact, healthNotes: notes }),
  });
  expect(edit.status).toBe(200);
  expect(await (await call(`${path}/profile`, memberToken)).json()).toMatchObject({ healthNotes: notes });
  const ownerProfile = await call(`/gyms/${fixture.gyms[0]!.slug}/members/${member.memberId}`, ownerToken);
  expect(ownerProfile.status).toBe(200);
  expect(await ownerProfile.json()).toMatchObject({ healthNotes: null });
  const ownerCorrection = await fetch(`${base}/gyms/${fixture.gyms[0]!.slug}/members/${member.memberId}/profile`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json', 'idempotency-key': randomUUID() },
    body: JSON.stringify({ fullName: member.fullName, dateOfBirth: member.dateOfBirth, phone: member.phone,
      emergencyContact: member.emergencyContact, healthNotes: null, expectedVersion: member.version + 1, reason: 'MEMBER_REQUEST' }),
  });
  expect(ownerCorrection.status).toBe(403);
  expect(await (await call(`${path}/profile`, memberToken)).json()).toMatchObject({ healthNotes: notes });
  const latest = await tenant.commandReceipt.findFirstOrThrow({ where: { commandKind: 'UPDATE_SELF_MEMBER_PROFILE', resourceId: member.memberId } });
  expect(JSON.stringify(latest)).not.toContain(notes);

  const trainer = await (await call(`${path}/profile`, trainerToken)).json();
  const { default: sharp } = await import('sharp');
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#008875' } }).png().toBuffer();
  const upload = (accessToken: string, version: number, data: Buffer, requestKey = randomUUID()) => {
    const form = new FormData();
    form.set('photo', new Blob([new Uint8Array(data)], { type: 'image/png' }), 'photo.png');
    return fetch(`${base}${path}/profile/photo?version=${version}`, {
      method: 'PUT', headers: { authorization: `Bearer ${accessToken}`, 'idempotency-key': requestKey }, body: form,
    });
  };
  const key = randomUUID();
  expect((await upload(trainerToken, trainer.version, Buffer.from('<svg/>'))).status).toBe(422);
  expect((await upload(trainerToken, trainer.version, png, key)).status).toBe(200);
  expect(await (await upload(trainerToken, trainer.version, png, key)).json()).toMatchObject({ replayed: true });
  expect((await upload(memberToken, member.version + 1, png)).status).toBe(200);
  expect(await (await call(`${path}/profile`, trainerToken)).json()).toMatchObject({ hasPhoto: true });
  expect((await call(`${path}/profile/photo`, ownerToken)).status).toBe(403);
  const read = await call(`${path}/trainers/${trainer.trainerId}/photo`, memberToken);
  expect(read.status).toBe(200);
  expect(read.headers.get('content-type')).toBe('image/webp');
  expect(read.headers.get('cache-control')).toContain('no-store');
  expect((await sharp(Buffer.from(await read.arrayBuffer())).metadata()).format).toBe('webp');
  expect((await call(`/gyms/${fixture.gyms[1]!.slug}/me/trainers/${trainer.trainerId}/photo`, memberToken)).status).not.toBe(200);
  const encrypted = await tenant.profilePhoto.findUniqueOrThrow({ where: { trainerId: trainer.trainerId } });
  expect(encrypted.encryptedData).toMatch(/^v1\./);
  const removed = await fetch(`${base}${path}/profile/photo?version=${trainer.version + 1}`, {
    method: 'DELETE', headers: { authorization: `Bearer ${trainerToken}`, 'idempotency-key': randomUUID() },
  });
  expect(removed.status).toBe(200);
  expect((await call(`${path}/trainers/${trainer.trainerId}/photo`, memberToken)).status).toBe(404);
});
