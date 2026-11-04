import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { TrainerLifecycleService } from '../../src/trainer-lifecycle.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { reserveSessionCredit } from '../../src/sessions/credit-holds.js';
import { withGymAccessFence } from '../../src/identity/gym-access-fence.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;

beforeAll(async () => {
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
}, 120_000);

afterAll(async () => {
  await fixture?.close();
  if (run) console.info('[trainer-lifecycle-owned-cleanup]', JSON.stringify(await run.cleanup()));
}, 120_000);

function sessionRow(input: { id: string; memberId: string; trainerId: string; start: Date; ownerId: string }) {
  return { id: input.id, memberId: input.memberId, trainerId: input.trainerId, state: 'SCHEDULED' as const,
    type: 'IN_PERSON' as const, scheduledStartAt: input.start, scheduledEndAt: new Date(input.start.getTime() + 60 * 60_000),
    gymTimezone: 'Asia/Colombo', fee: '100.0000', currency: 'LKR', confirmationRate: '0.400000', confirmationLevel: 'LEVEL_1' as const,
    configurationVersion: 0, confirmedAt: new Date(), createdByIdentityId: input.ownerId };
}

it('resumes an interrupted cancellation batch without duplicate release, and reactivation leaves history cancelled', async () => {
  const master = fixture.master;
  const tenant = fixture.tenants[0]!;
  const gym = fixture.gyms[0]!;
  const trainerIdentity = fixture.users.trainerUser;
  const owner = fixture.users.ownerA;
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: trainerIdentity.id } });
  const betaTenant = fixture.tenants[1]!;
  const betaGym = fixture.gyms[1]!;
  const betaTrainerId = `trainer-beta-${run.runId}`;
  const betaOperationId = `trainer-beta-op-${run.runId}`;
  const betaTrainer = await betaTenant.trainer.create({ data: { id: betaTrainerId, fullName: 'Trainer Alpha Other Gym', email: trainerIdentity.email,
    phone: '+94110000002', level: 'LEVEL_1', identityId: trainerIdentity.id, registrationState: 'COMPLETE', enrollmentOperationId: betaOperationId } });
  await master.operation.create({ data: { id: betaOperationId, kind: 'REGISTER_TRAINER', actorIdentityId: fixture.users.admin.id,
    scopeKey: `gym:${betaGym.id}`, idempotencyKey: `beta-trainer-${run.runId}`, requestDigest: requestDigest({ betaTrainerId }), gymId: betaGym.id,
    subjectIdentityId: trainerIdentity.id, tenantActorId: betaTrainer.id, state: 'TENANT_COMMITTED', step: 'TENANT_REGISTRATION_COMMITTED' } });
  const betaReceipt = await betaTenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.admin.id, commandKind: 'REGISTER_TRAINER',
    idempotencyKey: `beta-trainer-receipt-${run.runId}`, requestDigest: requestDigest({ betaTrainerId, receipt: true }), sourceMasterOperationId: betaOperationId,
    resourceType: 'TRAINER', resourceId: betaTrainer.id, state: 'COMMITTED', committedAt: new Date(), safeResult: { operationId: betaOperationId, state: 'COMPLETE', resourceIds: [betaTrainer.id] } } });
  await master.operation.update({ where: { id: betaOperationId }, data: { tenantCommandReceiptId: betaReceipt.id,
    state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { operationId: betaOperationId, state: 'COMPLETE' }, version: { increment: 1 } } });
  await master.gymAccess.create({ data: { userId: trainerIdentity.id, gymId: betaGym.id, role: 'TRAINER', linkStatus: 'ACTIVE',
    actorKind: 'TRAINER', tenantActorId: betaTrainer.id, enrollmentOperationId: betaOperationId } });
  const member = await tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const ownerLink = await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } } });
  const access = {
    identityId: owner.id, identityVersion: owner.authVersion, gymId: gym.id, slug: gym.slug, role: 'OWNER',
    databaseName: gym.databaseName, expectedTenantSchemaVersion: null, expectedTenantManifestDigest: null,
    expectedTenantOperationId: null, expectedTenantOperationState: 'COMPLETE', observedTenantSchemaVersion: null,
    observedTenantManifestDigest: null, accessVersion: ownerLink.version, actor: null,
  } as const;
  const schemaGate = { withVerifiedTenant: async (_access: unknown, work: (client: TenantClient) => Promise<unknown>) => work(tenant) };
  const service = new TrainerLifecycleService({ master } as never, {} as never, schemaGate as unknown as TenantSchemaGateService);

  const sessionDate = new Date(Date.now() + 48 * 60 * 60_000);
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(sessionDate);
  const date = new Date(`${localDate}T00:00:00.000Z`);
  const nextDate = new Date(date.getTime() + 90 * 86_400_000);
  const suffix = run.runId;
  const plan = await tenant.membershipPlan.create({ data: { name: `Lifecycle ${suffix}`, price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: date, endDateExclusive: nextDate,
    agreedPrice: '0', currency: 'LKR', planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: owner.id,
    idempotencyKey: `term-lifecycle-${suffix}`, requestDigest: requestDigest({ suffix, term: true }) } });
  const issueReceipt = await tenant.commandReceipt.create({ data: { actorIdentityId: owner.id, commandKind: 'TEST_PACK_ISSUE',
    idempotencyKey: `issue-lifecycle-${suffix}`, requestDigest: requestDigest({ suffix, issue: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const pack = await tenant.sessionPack.create({ data: { memberId: member.id, issuedCredits: 2, price: '100.0000', currency: 'LKR', validityDays: 90,
    totalMinorUnits: 10000n, creditBaseMinorUnits: 5000n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1',
    startDate: date, endDateExclusive: nextDate, commandReceiptId: issueReceipt.id, actorIdentityId: owner.id,
    idempotencyKey: `pack-lifecycle-${suffix}`, requestDigest: requestDigest({ suffix, pack: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: 2, heldDelta: 0, consumedDelta: 0,
    expiredDelta: 0, sourceKey: `issue-lifecycle-${suffix}`, receiptId: issueReceipt.id, actorIdentityId: owner.id } });
  const starts = [new Date(sessionDate.getTime()), new Date(sessionDate.getTime() + 3 * 60 * 60_000)];
  const sessionIds = [`lifecycle-a-${suffix}`, `lifecycle-b-${suffix}`];
  await tenant.pTSession.createMany({ data: starts.map((start, index) => sessionRow({ id: sessionIds[index]!, memberId: member.id,
    trainerId: trainer.id, start, ownerId: owner.id })) });
  for (let index = 0; index < sessionIds.length; index++) {
    const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: owner.id, commandKind: 'TEST_BOOKING',
      idempotencyKey: `booking-lifecycle-${index}-${suffix}`, requestDigest: requestDigest({ session: sessionIds[index] }), state: 'COMMITTED', committedAt: new Date(),
      resourceType: 'PT_SESSION', resourceId: sessionIds[index], safeResult: { state: 'COMPLETE', resourceIds: [sessionIds[index]!] } } });
    await tenant.$transaction(tx => reserveSessionCredit(tx, { masterGymId: gym.id, sessionId: sessionIds[index]!, memberId: member.id,
      trainerId: trainer.id, scheduledLocalDate: localDate, explicitPackId: pack.id, actorIdentityId: owner.id, receiptId: receipt.id }));
  }

  await tenant.$executeRawUnsafe(`CREATE FUNCTION fail_second_trainer_release() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventCode" = 'SESSION_CANCELLED' AND NEW."resourceId" = '${sessionIds[1]}' THEN RAISE EXCEPTION 'injected lifecycle notification interruption'; END IF; RETURN NEW; END $$`);
  await tenant.$executeRawUnsafe('CREATE TRIGGER fail_second_trainer_release BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION fail_second_trainer_release()');
  let releaseFence!: () => void;
  let confirmFence!: () => void;
  const enteredFence = new Promise<void>(resolve => { confirmFence = resolve; });
  const blockedFence = new Promise<void>(resolve => { releaseFence = resolve; });
  const fencePromise = withGymAccessFence(master, [{ identityId: trainerIdentity.id, gymId: gym.id, role: 'TRAINER', tenantActorId: trainer.id }], async () => {
    confirmFence();
    await blockedFence;
    return 'tenant-command-committed-under-fence';
  });
  await enteredFence;
  let interruption: unknown;
  const deactivation = service.execute(access as never, trainer.id, `deactivate-${suffix}`, { targetStatus: 'DEACTIVATED', expectedVersion: trainer.version,
    reason: 'Synthetic interruption test' }).then(() => undefined, error => { interruption = error; });
  const blockedResult = await Promise.race([deactivation.then(() => 'completed'), new Promise<string>(resolve => setTimeout(() => resolve('waiting'), 100))]);
  expect(blockedResult).toBe('waiting');
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: trainerIdentity.id, gymId: gym.id } } })).toMatchObject({ linkStatus: 'ACTIVE' });
  releaseFence();
  await expect(fencePromise).resolves.toBe('tenant-command-committed-under-fence');
  await deactivation;
  if (!interruption || (interruption as { status?: number }).status !== 503) {
    throw interruption ?? new Error('Injected lifecycle error did not occur');
  }
  const interruptedOperation = await master.operation.findFirstOrThrow({ where: { gymId: gym.id, kind: 'CHANGE_TRAINER_ACCESS',
    trainerLifecycleIntent: { is: { trainerId: trainer.id } } }, include: { trainerLifecycleIntent: true } });
  console.info('[trainer-lifecycle-interruption]', JSON.stringify({ code: interruptedOperation.errorCode,
    state: interruptedOperation.state, step: interruptedOperation.step, completedSteps: interruptedOperation.completedSteps,
    sessionStates: await tenant.pTSession.findMany({ where: { id: { in: sessionIds } }, orderBy: { id: 'asc' }, select: { id: true, state: true, version: true } }) }));
  await tenant.$executeRawUnsafe('DROP TRIGGER fail_second_trainer_release ON "Notification"');
  await tenant.$executeRawUnsafe('DROP FUNCTION fail_second_trainer_release()');

  const pendingOperation = interruptedOperation;
  expect(pendingOperation.state).toBe('FAILED_RETRYABLE');
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: trainerIdentity.id, gymId: gym.id } } })).toMatchObject({ linkStatus: 'REVOKED', version: 1 });
  await expect(withGymAccessFence(master, [{ identityId: trainerIdentity.id, gymId: gym.id, role: 'TRAINER', tenantActorId: trainer.id }], async () => 'must-not-run'))
    .rejects.toMatchObject({ status: 403 });
  expect(await tenant.trainer.findUniqueOrThrow({ where: { id: trainer.id } })).toMatchObject({ status: 'DEACTIVATED', version: trainer.version + 1 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: sessionIds[0]! } })).toMatchObject({ state: 'CANCELLED', version: 1 });
  expect(await tenant.pTSession.findUniqueOrThrow({ where: { id: sessionIds[1]! } })).toMatchObject({ state: 'SCHEDULED', version: 0 });

  const resumed = await service.resume(access as never, pendingOperation.id);
  expect(resumed).toMatchObject({ state: 'COMPLETE', targetStatus: 'DEACTIVATED', trainerId: trainer.id });
  expect(await tenant.pTSession.findMany({ where: { id: { in: sessionIds } }, orderBy: { id: 'asc' }, select: { state: true, version: true } }))
    .toEqual([{ state: 'CANCELLED', version: 1 }, { state: 'CANCELLED', version: 1 }]);
  expect(await tenant.sessionCreditHold.count({ where: { sessionId: { in: sessionIds }, state: 'RELEASED' } })).toBe(2);
  expect(await tenant.packCreditMovement.count({ where: { packId: pack.id, kind: 'RELEASE' } })).toBe(2);
  expect(await tenant.auditLog.count({ where: { eventCode: 'PT_SESSION_CANCELLED', resourceId: { in: sessionIds } } })).toBe(2);
  expect(await tenant.notification.count({ where: { eventCode: 'SESSION_CANCELLED', resourceId: { in: sessionIds }, recipientIdentityId: fixture.users.memberUser.id } })).toBe(2);
  expect(await service.execute(access as never, trainer.id, `deactivate-${suffix}`, { targetStatus: 'DEACTIVATED', expectedVersion: trainer.version,
    reason: 'Synthetic interruption test' })).toMatchObject({ operationId: pendingOperation.id, state: 'COMPLETE' });

  const reactivated = await service.execute(access as never, trainer.id, `reactivate-${suffix}`, { targetStatus: 'ACTIVE', expectedVersion: trainer.version + 1,
    reason: 'Synthetic reactivation test' });
  expect(reactivated).toMatchObject({ state: 'COMPLETE', targetStatus: 'ACTIVE' });
  expect(await tenant.pTSession.count({ where: { id: { in: sessionIds }, state: 'CANCELLED' } })).toBe(2);
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: trainerIdentity.id, gymId: gym.id } } }))
    .toMatchObject({ linkStatus: 'ACTIVE', version: 2 });
  // The other gym link of this identity is outside the operation's lock and mutation scope.
  expect(await master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: trainerIdentity.id, gymId: fixture.gyms[1]!.id } } }))
    .toMatchObject({ linkStatus: 'ACTIVE', version: 0 });
}, 120_000);
