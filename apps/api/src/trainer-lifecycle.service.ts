import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { trainerLifecycleResultSchema, trainerStatusInputSchema } from '@gymos/contracts';
import { DatabaseService } from './database.service.js';
import { TenantDatabaseService } from './tenant-database.service.js';
import type { GymRequest } from './gym-access.guard.js';
import type { Prisma } from './generated/master/client.js';
import { OperationFoundationService, createLeaseHeartbeat } from './operations/operation.service.js';
import { OperationConflictError, OperationIntegrityError, type CompletedSteps } from './operations/primitives.js';
import { appendMasterAudit, appendMasterVersionAudit } from './operations/transaction-audit.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { CommandReceiptFoundationService } from './operations/receipt.service.js';
import { applySessionCommand } from './sessions/session-commands.js';
import { resolveSessionCreditHold } from './sessions/credit-holds.js';
import { appendTenantNotification } from './notifications.service.js';

type GymAccess = NonNullable<GymRequest['gymAccess']>;
type StatusInput = z.infer<typeof trainerStatusInputSchema>;

@Injectable()
export class TrainerLifecycleService {
  constructor(private readonly database: DatabaseService, private readonly tenants: TenantDatabaseService,
    private readonly tenantGate: TenantSchemaGateService) {}

  private async authorizeOwner(tx: Prisma.TransactionClient, access: GymAccess) {
    const [user, link, gym, clock] = await Promise.all([
      tx.user.findUnique({ where: { id: access.identityId }, select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
      tx.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } }, select: { role: true, linkStatus: true, version: true } }),
      tx.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
      tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`,
    ]);
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword
      || (user.credentialExpiresAt && user.credentialExpiresAt <= clock[0]!.now)
      || link?.role !== 'OWNER' || link.linkStatus !== 'ACTIVE' || link.version !== access.accessVersion || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Gym access changed; reload and try again');
    }
  }

  private result(operation: { id: string; gymId: string | null; state: string; version: number; trainerLifecycleIntent: { trainerId: string; targetStatus: string } | null; leaseExpiresAt?: Date | null }) {
    const intent = operation.trainerLifecycleIntent;
    if (!intent || !operation.gymId) throw new NotFoundException('Trainer lifecycle operation unavailable');
    return trainerLifecycleResultSchema.parse({ operationId: operation.id, gymId: operation.gymId, trainerId: intent.trainerId,
      targetStatus: intent.targetStatus, state: operation.state, version: operation.version, retryable: operation.state === 'FAILED_RETRYABLE' });
  }

  async status(access: GymAccess, operationId: string) {
    const operation = await this.database.master.operation.findFirst({ where: { id: operationId, actorIdentityId: access.identityId,
      gymId: access.gymId, kind: 'CHANGE_TRAINER_ACCESS' }, include: { trainerLifecycleIntent: true } });
    if (!operation) throw new NotFoundException('Trainer lifecycle operation unavailable');
    return this.result(operation);
  }

  async execute(access: GymAccess, trainerId: string, key: string, input: StatusInput) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Trainer status is owner-only');
    try {
      const outcome = await this.tenantGate.withVerifiedTenant(access, async tenant => {
        const trainer = await tenant.trainer.findFirst({ where: { id: trainerId, registrationState: 'COMPLETE' },
          select: { id: true, identityId: true, enrollmentOperationId: true, status: true, version: true } });
        if (!trainer?.identityId || !trainer.enrollmentOperationId) throw new NotFoundException('Trainer not found');
        const isDeactivation = input.targetStatus === 'DEACTIVATED';
        const priorStatus = isDeactivation ? 'ACTIVE' : 'DEACTIVATED';
        const claim = await new OperationFoundationService(this.database.master).claim({ actorIdentityId: access.identityId,
          kind: 'CHANGE_TRAINER_ACCESS', gymId: access.gymId, idempotencyKey: key,
          intent: { command: 'TRAINER_STATUS', trainerId, targetStatus: input.targetStatus, expectedVersion: input.expectedVersion, reason: input.reason },
          prepare: async (tx, operation) => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`trainer-lifecycle:${access.gymId}:${trainerId}`}, 0))`;
            await this.authorizeOwner(tx, access);
            if (trainer.status !== priorStatus || trainer.version !== input.expectedVersion) throw new OperationConflictError('Trainer status/version changed');
            const linkRows = await tx.$queryRaw<{ userId: string; gymId: string; role: string; linkStatus: string; version: number; actorKind: string | null; tenantActorId: string | null; enrollmentOperationId: string | null }[]>`
              SELECT "userId", "gymId", "role"::text AS "role", "linkStatus"::text AS "linkStatus", "version", "actorKind"::text AS "actorKind", "tenantActorId", "enrollmentOperationId"
              FROM "GymAccess" WHERE "userId" = ${trainer.identityId} AND "gymId" = ${access.gymId} FOR UPDATE`;
            const link = linkRows[0];
            if (!link || link.role !== 'TRAINER' || link.actorKind !== 'TRAINER' || link.tenantActorId !== trainerId
              || link.enrollmentOperationId !== trainer.enrollmentOperationId || link.linkStatus !== (isDeactivation ? 'ACTIVE' : 'REVOKED')) {
              throw new OperationConflictError('Trainer access link changed');
            }
            const pending = await tx.operation.findFirst({ where: { gymId: access.gymId, id: { not: operation.id }, kind: 'CHANGE_TRAINER_ACCESS',
              state: { notIn: ['COMPLETE', 'FAILED_FINAL'] }, trainerLifecycleIntent: { is: { trainerId } } }, select: { id: true } });
            if (pending) throw new OperationConflictError('Resume the existing trainer lifecycle operation first');
            await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: trainer.identityId, tenantActorId: trainerId, version: { increment: 1 } } });
            await tx.trainerLifecycleIntent.create({ data: { operationId: operation.id, trainerId, expectedTrainerVersion: input.expectedVersion,
              expectedAccessVersion: link.version, targetStatus: input.targetStatus, reason: input.reason } });
            await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
              stepCode: 'TRAINER_STATUS_RESERVED', eventCode: 'TRAINER_STATUS_REQUESTED', resourceType: 'TRAINER', resourceId: trainerId,
              transition: { from: priorStatus, to: input.targetStatus, version: input.expectedVersion } });
          },
        });
        if (claim.replayed && claim.operation.state === 'COMPLETE') return this.result({ ...claim.operation,
          trainerLifecycleIntent: await this.database.master.trainerLifecycleIntent.findUnique({ where: { operationId: claim.operation.id } }) });
        return this.resumeInTenant(access, claim.operation.id, tenant);
      });
      return outcome;
    } catch (error) {
      if (error instanceof OperationConflictError) throw new ConflictException('Trainer status/version or lifecycle intent changed');
      throw error;
    }
  }

  async resume(access: GymAccess, operationId: string) {
    const status = await this.status(access, operationId);
    if (status.state === 'COMPLETE') return status;
    return this.tenantGate.withVerifiedTenant(access, tenant => this.resumeInTenant(access, operationId, tenant));
  }

  private async resumeInTenant(access: GymAccess, operationId: string, tenant: import('./generated/tenant/client.js').PrismaClient) {
    const master = this.database.master;
    const initial = await master.operation.findFirst({ where: { id: operationId, actorIdentityId: access.identityId, gymId: access.gymId,
      kind: 'CHANGE_TRAINER_ACCESS' }, include: { trainerLifecycleIntent: true, gym: true } });
    if (!initial?.trainerLifecycleIntent || !initial.gym) throw new NotFoundException('Trainer lifecycle operation unavailable');
    const intent = initial.trainerLifecycleIntent;
    const operationService = new OperationFoundationService(master);
    let lease;
    try { lease = await operationService.acquireLease(operationId, initial.version); }
    catch (error) { if (error instanceof OperationConflictError) throw new ConflictException('Trainer lifecycle operation is active or requires recovery after its lease expires'); throw error; }
    const heartbeat = createLeaseHeartbeat(operationService, lease);
    const checkpoint = async (step: 'TRAINER_ACCESS_PREPARED' | 'TRAINER_STATUS_APPLIED' | 'TRAINER_SESSIONS_RECONCILED' | 'TRAINER_ACCESS_FINALIZED', effects?: (tx: Prisma.TransactionClient) => Promise<void>, complete = false) => heartbeat.run(async current => {
      const updated = await operationService.checkpoint(current, { step,
        evidence: { gymId: access.gymId, subjectIdentityId: initial.subjectIdentityId!, tenantActorId: intent.trainerId,
          trainerId: intent.trainerId, targetStatus: intent.targetStatus, expectedTrainerVersion: intent.expectedTrainerVersion,
          expectedAccessVersion: intent.expectedAccessVersion },
        ...(complete ? { finalResult: { operationId, state: 'COMPLETE' as const, step, version: initial.version + 1, resourceIds: [intent.trainerId] } } : {}),
        localEffects: effects,
      });
      return { lease: updated.lease, value: undefined };
    });
    const done = (await master.operation.findUniqueOrThrow({ where: { id: operationId } })).completedSteps as CompletedSteps;
    try {
      await heartbeat.run(async current => ({ lease: await operationService.reconcileLease(current, async operation => {
        const steps = operation.completedSteps as CompletedSteps;
        const masterAccess = await master.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
        const expectedMasterStatus = intent.targetStatus === 'DEACTIVATED'
          ? (steps.TRAINER_ACCESS_PREPARED ? 'REVOKED' : 'ACTIVE')
          : (steps.TRAINER_ACCESS_FINALIZED ? 'ACTIVE' : 'REVOKED');
        const expectedMasterVersion = intent.expectedAccessVersion + (expectedMasterStatus === 'ACTIVE'
          ? (intent.targetStatus === 'ACTIVE' && steps.TRAINER_ACCESS_FINALIZED ? 1 : 0)
          : (intent.targetStatus === 'DEACTIVATED' && steps.TRAINER_ACCESS_PREPARED ? 1 : 0));
        if (!masterAccess || masterAccess.linkStatus !== expectedMasterStatus || masterAccess.version !== expectedMasterVersion) throw new OperationIntegrityError('Trainer Master access evidence changed');
        const tenantTrainer = await tenant.trainer.findUnique({ where: { id: intent.trainerId }, select: { identityId: true, status: true, version: true } });
        const priorStatus = intent.targetStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
        if (!tenantTrainer || tenantTrainer.identityId !== initial.subjectIdentityId
          || (steps.TRAINER_STATUS_APPLIED
            ? tenantTrainer.status !== intent.targetStatus || tenantTrainer.version !== intent.expectedTrainerVersion + 1
            : !((tenantTrainer.status === priorStatus && tenantTrainer.version === intent.expectedTrainerVersion)
              || (tenantTrainer.status === intent.targetStatus && tenantTrainer.version === intent.expectedTrainerVersion + 1)))) {
          throw new OperationIntegrityError('Trainer tenant status requires review');
        }
        const statusReceipt = await tenant.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
          actorIdentityId: access.identityId, commandKind: 'CHANGE_TRAINER_STATUS', idempotencyKey: `trainer-status:${operationId}`,
        } } });
        if (statusReceipt && (statusReceipt.state !== 'COMMITTED' || statusReceipt.resourceId !== intent.trainerId)) throw new OperationIntegrityError('Trainer status receipt requires review');
      }), value: undefined }));
      if (!done.TRAINER_ACCESS_PREPARED) await checkpoint('TRAINER_ACCESS_PREPARED', async tx => {
        await this.authorizeOwner(tx, access);
        if (intent.targetStatus === 'DEACTIVATED') {
          const changed = await tx.gymAccess.updateMany({ where: { userId: initial.subjectIdentityId!, gymId: access.gymId,
            role: 'TRAINER', linkStatus: 'ACTIVE', version: intent.expectedAccessVersion, tenantActorId: intent.trainerId },
            data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
          if (changed.count !== 1) throw new OperationConflictError('Trainer access changed');
          await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'TRAINER_ACCESS_REVOKED',
            resourceType: 'TRAINER', resourceId: intent.trainerId, committedVersion: intent.expectedAccessVersion + 1,
            transition: { from: 'ACTIVE', to: 'REVOKED', version: intent.expectedAccessVersion + 1 } });
        } else {
          const current = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
          if (!current || current.linkStatus !== 'REVOKED' || current.version !== intent.expectedAccessVersion) throw new OperationConflictError('Trainer access changed');
        }
      });

      let operation = await master.operation.findUniqueOrThrow({ where: { id: operationId } });
      if (!(operation.completedSteps as CompletedSteps).TRAINER_STATUS_APPLIED) {
        const expectedStatus = intent.targetStatus === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
        const observed = await tenant.trainer.findFirst({ where: { id: intent.trainerId }, select: { identityId: true, status: true, version: true } });
        if (!observed || observed.identityId !== initial.subjectIdentityId) throw new OperationIntegrityError('Trainer reciprocal identity changed');
        const expectedNextVersion = intent.expectedTrainerVersion + 1;
        const tenantReceipt = new CommandReceiptFoundationService(tenant);
        const statusReceipt = await tenantReceipt.execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
          commandKind: 'CHANGE_TRAINER_STATUS', idempotencyKey: `trainer-status:${operationId}`,
          normalizedIntent: { operationId, trainerId: intent.trainerId, targetStatus: intent.targetStatus, expectedVersion: intent.expectedTrainerVersion } }, async tx => {
          await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${intent.trainerId} FOR UPDATE`;
          const row = await tx.trainer.findUnique({ where: { id: intent.trainerId } });
          if (!row || row.identityId !== initial.subjectIdentityId) throw new OperationIntegrityError('Trainer reciprocal identity changed');
          if (row.status === expectedStatus && row.version === intent.expectedTrainerVersion) {
            await tx.trainer.update({ where: { id: row.id, version: intent.expectedTrainerVersion }, data: { status: intent.targetStatus as 'ACTIVE' | 'DEACTIVATED', version: { increment: 1 } } });
          } else if (row.status !== intent.targetStatus || row.version !== expectedNextVersion) {
            throw new OperationConflictError('Trainer status changed');
          }
          return { result: { operationId, state: 'TENANT_COMMITTED', step: 'TRAINER_STATUS_APPLIED', version: expectedNextVersion,
            resourceIds: [intent.trainerId] }, resourceType: 'TRAINER', resourceId: intent.trainerId,
          audits: [{ actorIdentityId: access.identityId, eventCode: intent.targetStatus === 'DEACTIVATED' ? 'TRAINER_DEACTIVATED' : 'TRAINER_REACTIVATED',
            resourceType: 'TRAINER', resourceId: intent.trainerId, transition: { from: expectedStatus, to: intent.targetStatus, version: expectedNextVersion } }] };
        });
        if (!statusReceipt.result.operationId) throw new OperationIntegrityError('Trainer status receipt is incomplete');
        await checkpoint('TRAINER_STATUS_APPLIED');
      }

      if (intent.targetStatus === 'DEACTIVATED') await this.cancelFutureSessions(access, intent.trainerId, operationId, tenant, heartbeat);
      operation = await master.operation.findUniqueOrThrow({ where: { id: operationId } });
      if (!(operation.completedSteps as CompletedSteps).TRAINER_SESSIONS_RECONCILED) await checkpoint('TRAINER_SESSIONS_RECONCILED');
      operation = await master.operation.findUniqueOrThrow({ where: { id: operationId } });
      if (!(operation.completedSteps as CompletedSteps).TRAINER_ACCESS_FINALIZED) await checkpoint('TRAINER_ACCESS_FINALIZED', async tx => {
        await this.authorizeOwner(tx, access);
        if (intent.targetStatus === 'ACTIVE') {
          const changed = await tx.gymAccess.updateMany({ where: { userId: initial.subjectIdentityId!, gymId: access.gymId,
            role: 'TRAINER', linkStatus: 'REVOKED', version: intent.expectedAccessVersion, tenantActorId: intent.trainerId },
            data: { linkStatus: 'ACTIVE', version: { increment: 1 } } });
          if (changed.count !== 1) throw new OperationConflictError('Trainer access changed');
          await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'TRAINER_ACCESS_REACTIVATED',
            resourceType: 'TRAINER', resourceId: intent.trainerId, committedVersion: intent.expectedAccessVersion + 1,
            transition: { from: 'REVOKED', to: 'ACTIVE', version: intent.expectedAccessVersion + 1 } });
        } else {
          const current = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
          if (!current || current.linkStatus !== 'REVOKED' || current.version !== intent.expectedAccessVersion + 1) throw new OperationConflictError('Trainer revocation changed');
        }
      }, true);
      await heartbeat.stop();
      return this.status(access, operationId);
    } catch (error) {
      const held = await heartbeat.stop().catch(() => null);
      if ((await master.operation.findUnique({ where: { id: operationId }, select: { state: true } }))?.state === 'COMPLETE') return this.status(access, operationId);
      if (held) await operationService.fail(held, error instanceof OperationConflictError ? 'FAILED_FINAL' : 'FAILED_RETRYABLE',
        error instanceof OperationIntegrityError ? 'TRAINER_LIFECYCLE_REVIEW_REQUIRED' : 'TRAINER_LIFECYCLE_INTERRUPTED').catch(() => undefined);
      if (error instanceof OperationConflictError) throw new ConflictException('Trainer lifecycle changed; resume or inspect the original operation');
      throw new ServiceUnavailableException({ statusCode: 503, message: 'Trainer status operation is pending recovery', operationId, retryable: true });
    }
  }

  private async cancelFutureSessions(access: GymAccess, trainerId: string, operationId: string,
    tenant: import('./generated/tenant/client.js').PrismaClient,
    heartbeat: ReturnType<typeof createLeaseHeartbeat>) {
    const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
    if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new OperationIntegrityError('Gym configuration binding changed');
    for (;;) {
      const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
      const now = clock!.now;
      const sessions = await tenant.pTSession.findMany({ where: { trainerId, state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED'] }, scheduledStartAt: { gt: now } },
        orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 50, select: { id: true, version: true } });
      if (!sessions.length) return;
      for (const candidate of sessions) {
        await heartbeat.run(async lease => {
          const receiptService = new CommandReceiptFoundationService(tenant);
          const commandKey = `trainer-release:${createHash('sha256').update(`${operationId}\0${candidate.id}`).digest('hex')}`;
          await receiptService.execute({ masterGymId: access.gymId, actorIdentityId: access.identityId,
            commandKind: 'TRAINER_LIFECYCLE_RELEASE', idempotencyKey: commandKey,
            normalizedIntent: { operationId, sessionId: candidate.id, targetStatus: 'DEACTIVATED' } }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${candidate.id} FOR UPDATE`;
            const current = await tx.pTSession.findUnique({ where: { id: candidate.id }, select: { id: true, state: true, version: true, scheduledStartAt: true,
              member: { select: { identityId: true } } } });
            const [databaseClock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            if (!current || !['PENDING_CONFIRMATION', 'SCHEDULED'].includes(current.state) || current.scheduledStartAt <= databaseClock!.now) {
              return { result: { operationId, state: 'COMPLETE', step: 'TRAINER_ACCESS_FINALIZED', version: current?.version ?? candidate.version,
                resourceIds: [candidate.id] }, resourceType: 'PT_SESSION', resourceId: candidate.id,
                audits: [{ actorIdentityId: access.identityId, eventCode: 'TRAINER_SESSION_RELEASE_SKIPPED', resourceType: 'PT_SESSION', resourceId: candidate.id,
                  transition: { from: 'PENDING_OR_SCHEDULED', to: 'UNCHANGED', version: current?.version ?? candidate.version } }] };
            }
            const updated = await applySessionCommand(tx, { masterGymId: access.gymId, sessionId: current.id, receiptId: receipt.id,
              actorIdentityId: access.identityId, actorRole: 'SYSTEM', command: 'LIFECYCLE_RELEASE', expectedVersion: current.version });
            const hold = await tx.sessionCreditHold.findUnique({ where: { sessionId: current.id }, select: { state: true } });
            if (current.state === 'SCHEDULED' && hold?.state !== 'HELD') throw new OperationIntegrityError('Scheduled session credit hold requires review');
            if (hold?.state === 'HELD') await resolveSessionCreditHold(tx, { masterGymId: access.gymId, sessionId: current.id,
              receiptId: receipt.id, actorIdentityId: access.identityId, resolution: 'RELEASE', gymLocalDate: new Intl.DateTimeFormat('en-CA', {
                timeZone: configuration.timezone!, year: 'numeric', month: '2-digit', day: '2-digit' }).format(databaseClock!.now) });
            if (!current.member.identityId) throw new OperationIntegrityError('Session member identity requires review');
            await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_CANCELLED',
              resourceId: current.id, recipientIdentityId: current.member.identityId });
            return { result: { operationId, state: 'COMPLETE', step: 'TRAINER_ACCESS_FINALIZED', version: updated.version,
              resourceIds: [current.id] }, resourceType: 'PT_SESSION', resourceId: current.id,
              audits: [{ actorIdentityId: access.identityId, eventCode: 'TRAINER_SESSION_RELEASED', resourceType: 'PT_SESSION', resourceId: current.id,
                transition: { from: current.state, to: updated.state, version: updated.version } }] };
          });
          return { lease, value: undefined };
        });
      }
    }
  }
}
