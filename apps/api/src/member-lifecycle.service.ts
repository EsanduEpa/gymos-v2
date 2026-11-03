import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { memberLifecycleResultSchema, memberStatusCommandSchema } from '@gymos/contracts';
import { DatabaseService } from './database.service.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import type { GymRequest } from './gym-access.guard.js';
import type { Prisma } from './generated/master/client.js';
import { OperationFoundationService, createLeaseHeartbeat } from './operations/operation.service.js';
import { OperationConflictError, OperationIntegrityError, type CompletedSteps } from './operations/primitives.js';
import { appendMasterAudit, appendMasterVersionAudit } from './operations/transaction-audit.js';
import { CommandReceiptFoundationService } from './operations/receipt.service.js';
import { applySessionCommand } from './sessions/session-commands.js';
import { resolveSessionCreditHold } from './sessions/credit-holds.js';
import { appendTenantNotification } from './notifications.service.js';

type GymAccess = NonNullable<GymRequest['gymAccess']>;
type StatusInput = z.infer<typeof memberStatusCommandSchema>;
type TenantClient = import('./generated/tenant/client.js').PrismaClient;

@Injectable()
export class MemberLifecycleService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

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

  private result(operation: { id: string; gymId: string | null; state: string; version: number; memberLifecycleIntent: { memberId: string; targetStatus: string } | null; safeResult?: unknown }) {
    const intent = operation.memberLifecycleIntent;
    if (!intent || !operation.gymId) throw new NotFoundException('Member lifecycle operation unavailable');
    const stored = operation.state === 'COMPLETE' && operation.safeResult && typeof operation.safeResult === 'object'
      ? (operation.safeResult as Record<string, unknown>).resourceIds : undefined;
    return memberLifecycleResultSchema.parse({ operationId: operation.id, gymId: operation.gymId, memberId: intent.memberId,
      targetStatus: intent.targetStatus, state: operation.state, version: operation.version,
      retryable: operation.state === 'FAILED_RETRYABLE', cancelledSessionCount: Array.isArray(stored) ? Math.max(0, stored.length - 1) : 0 });
  }

  async status(access: GymAccess, operationId: string) {
    const operation = await this.database.master.operation.findFirst({ where: { id: operationId, actorIdentityId: access.identityId,
      gymId: access.gymId, kind: 'CHANGE_MEMBER_STATUS' }, include: { memberLifecycleIntent: true } });
    if (!operation) throw new NotFoundException('Member lifecycle operation unavailable');
    return this.result(operation);
  }

  async execute(access: GymAccess, memberId: string, key: string, input: StatusInput) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Member status is owner-only');
    try {
      return await this.tenantGate.withVerifiedTenant(access, async tenant => {
        const member = await tenant.member.findFirst({ where: { id: memberId, registrationState: 'COMPLETE' },
          select: { id: true, identityId: true, enrollmentOperationId: true, status: true, version: true } });
        if (!member?.identityId || !member.enrollmentOperationId) throw new NotFoundException('Member not found');
        const claim = await new OperationFoundationService(this.database.master).claim({ actorIdentityId: access.identityId,
            kind: 'CHANGE_MEMBER_STATUS', gymId: access.gymId, idempotencyKey: key,
            intent: { command: 'MEMBER_STATUS', memberId, targetStatus: input.targetStatus, expectedVersion: input.expectedVersion, reason: input.reason },
            prepare: async (tx, operation) => {
              await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`member-lifecycle:${access.gymId}:${memberId}`}, 0))`;
              await this.authorizeOwner(tx, access);
              if (member.version !== input.expectedVersion) throw new OperationConflictError('Member status/version changed');
              if (member.status === input.targetStatus) throw new OperationConflictError('Member already has this status');
              const rows = await tx.$queryRaw<{ userId: string; gymId: string; role: string; linkStatus: string; version: number; actorKind: string | null; tenantActorId: string | null; enrollmentOperationId: string | null }[]>`
                SELECT "userId", "gymId", "role"::text AS "role", "linkStatus"::text AS "linkStatus", "version", "actorKind"::text AS "actorKind", "tenantActorId", "enrollmentOperationId"
                FROM "GymAccess" WHERE "userId" = ${member.identityId} AND "gymId" = ${access.gymId} FOR UPDATE`;
              const link = rows[0];
              const wasActive = member.status === 'ACTIVE';
              if (!link || link.role !== 'MEMBER' || link.actorKind !== 'MEMBER' || link.tenantActorId !== memberId
                || link.enrollmentOperationId !== member.enrollmentOperationId || link.linkStatus !== (wasActive ? 'ACTIVE' : 'REVOKED')) {
                throw new OperationConflictError('Member access link changed');
              }
              const pending = await tx.operation.findFirst({ where: { gymId: access.gymId, id: { not: operation.id }, kind: 'CHANGE_MEMBER_STATUS',
                state: { notIn: ['COMPLETE', 'FAILED_FINAL'] }, memberLifecycleIntent: { is: { memberId } } }, select: { id: true } });
              if (pending) throw new OperationConflictError('Resume the existing member lifecycle operation first');
              await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: member.identityId, tenantActorId: memberId, version: { increment: 1 } } });
              await tx.memberLifecycleIntent.create({ data: { operationId: operation.id, memberId, expectedMemberVersion: input.expectedVersion,
                expectedAccessVersion: link.version, targetStatus: input.targetStatus, reason: input.reason } });
              await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
                stepCode: 'MEMBER_STATUS_RESERVED', eventCode: 'MEMBER_STATUS_REQUESTED', resourceType: 'MEMBER', resourceId: memberId,
                transition: { from: member.status, to: input.targetStatus, version: input.expectedVersion } });
            },
          });
        if (claim.replayed && claim.operation.state === 'COMPLETE') {
          const intent = await this.database.master.memberLifecycleIntent.findUnique({ where: { operationId: claim.operation.id } });
          return this.result({ ...claim.operation, memberLifecycleIntent: intent });
        }
        return this.resumeInTenant(access, claim.operation.id, tenant);
      });
    } catch (error) {
      if (error instanceof OperationConflictError) throw new ConflictException('Member status/version or lifecycle intent changed');
      throw error;
    }
  }

  async resume(access: GymAccess, operationId: string) {
    const current = await this.status(access, operationId);
    if (current.state === 'COMPLETE') return current;
    const operation = await this.database.master.operation.findFirst({ where: { id: operationId, gymId: access.gymId, actorIdentityId: access.identityId,
      kind: 'CHANGE_MEMBER_STATUS' }, include: { memberLifecycleIntent: true } });
    if (!operation?.memberLifecycleIntent || !operation.subjectIdentityId) throw new NotFoundException('Member lifecycle operation unavailable');
    return this.tenantGate.withVerifiedTenant(access, tenant => this.resumeInTenant(access, operationId, tenant));
  }

  private async resumeInTenant(access: GymAccess, operationId: string, tenant: TenantClient) {
    const master = this.database.master;
    const initial = await master.operation.findFirst({ where: { id: operationId, actorIdentityId: access.identityId, gymId: access.gymId,
      kind: 'CHANGE_MEMBER_STATUS' }, include: { memberLifecycleIntent: true, gym: true } });
    if (!initial?.memberLifecycleIntent || !initial.gym || !initial.subjectIdentityId) throw new NotFoundException('Member lifecycle operation unavailable');
    const intent = initial.memberLifecycleIntent;
    const ops = new OperationFoundationService(master);
    let lease;
    try { lease = await ops.acquireLease(operationId, initial.version); }
    catch (error) { if (error instanceof OperationConflictError) throw new ConflictException('Member lifecycle operation is active or needs recovery after lease expiry'); throw error; }
    const heartbeat = createLeaseHeartbeat(ops, lease);
    const evidence = { gymId: access.gymId, subjectIdentityId: initial.subjectIdentityId, tenantActorId: intent.memberId, memberId: intent.memberId,
      targetStatus: intent.targetStatus, expectedMemberVersion: intent.expectedMemberVersion, expectedAccessVersion: intent.expectedAccessVersion };
    const checkpoint = async (step: 'MEMBER_ACCESS_PREPARED' | 'MEMBER_STATUS_APPLIED' | 'MEMBER_SESSIONS_RECONCILED' | 'MEMBER_ACCESS_FINALIZED', effects?: (tx: Prisma.TransactionClient) => Promise<void>, complete = false, finalResult?: unknown) => heartbeat.run(async current => {
      const updated = await ops.checkpoint(current, { step, evidence,
        ...(complete ? { finalResult: finalResult ?? { operationId, state: 'COMPLETE' as const, step, version: initial.version + 1, resourceIds: [intent.memberId] } } : {}),
        localEffects: effects });
      return { lease: updated.lease, value: undefined };
    });
    const prior = (await tenant.member.findUnique({ where: { id: intent.memberId }, select: { status: true } }))?.status;
    try {
      await heartbeat.run(async current => ({ lease: await ops.reconcileLease(current, async operation => {
        const steps = operation.completedSteps as CompletedSteps;
        const masterAccess = await master.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
        const shouldBeActive = intent.targetStatus === 'ACTIVE' && Boolean(steps.MEMBER_ACCESS_FINALIZED);
        const prepared = Boolean(steps.MEMBER_ACCESS_PREPARED);
        const accessMatches = intent.targetStatus === 'ACTIVE'
          ? (shouldBeActive ? masterAccess?.linkStatus === 'ACTIVE' && masterAccess.version === intent.expectedAccessVersion + 1
            : masterAccess?.linkStatus === 'REVOKED' && masterAccess.version === intent.expectedAccessVersion)
          : (prepared ? masterAccess?.linkStatus === 'REVOKED' && [intent.expectedAccessVersion, intent.expectedAccessVersion + 1].includes(masterAccess.version)
            : (masterAccess?.linkStatus === 'ACTIVE' && masterAccess.version === intent.expectedAccessVersion)
              || (masterAccess?.linkStatus === 'REVOKED' && masterAccess.version === intent.expectedAccessVersion));
        if (!accessMatches) throw new OperationIntegrityError('Member Master access evidence changed');
        const member = await tenant.member.findUnique({ where: { id: intent.memberId }, select: { identityId: true, status: true, version: true } });
        if (!member || member.identityId !== initial.subjectIdentityId || (steps.MEMBER_STATUS_APPLIED
          ? member.status !== intent.targetStatus || member.version !== intent.expectedMemberVersion + 1
          : member.version !== intent.expectedMemberVersion || (member.status !== intent.targetStatus && member.status !== prior))) throw new OperationIntegrityError('Member tenant status requires review');
      }), value: undefined }));

      const done = (await master.operation.findUniqueOrThrow({ where: { id: operationId } })).completedSteps as CompletedSteps;
      if (!done.MEMBER_ACCESS_PREPARED) await checkpoint('MEMBER_ACCESS_PREPARED', async tx => {
        await this.authorizeOwner(tx, access);
        if (intent.targetStatus !== 'ACTIVE') {
          const current = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
          if (current?.role !== 'MEMBER' || current.tenantActorId !== intent.memberId) throw new OperationConflictError('Member access changed');
          if (current.linkStatus === 'ACTIVE' && current.version === intent.expectedAccessVersion) {
            const changed = await tx.gymAccess.updateMany({ where: { userId: initial.subjectIdentityId!, gymId: access.gymId, role: 'MEMBER', linkStatus: 'ACTIVE', version: intent.expectedAccessVersion, tenantActorId: intent.memberId },
              data: { linkStatus: 'REVOKED', version: { increment: 1 } } });
            if (changed.count !== 1) throw new OperationConflictError('Member access changed');
            await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_ACCESS_REVOKED', resourceType: 'MEMBER', resourceId: intent.memberId,
              committedVersion: intent.expectedAccessVersion + 1, transition: { from: 'ACTIVE', to: 'REVOKED', version: intent.expectedAccessVersion + 1 } });
          } else if (current.linkStatus !== 'REVOKED' || current.version !== intent.expectedAccessVersion) throw new OperationConflictError('Member access changed');
        } else {
          const link = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
          if (!link || link.linkStatus !== 'REVOKED' || link.version !== intent.expectedAccessVersion) throw new OperationConflictError('Member access changed');
        }
      });

      let operation = await master.operation.findUniqueOrThrow({ where: { id: operationId } });
      if (!(operation.completedSteps as CompletedSteps).MEMBER_STATUS_APPLIED) {
        const receiptService = new CommandReceiptFoundationService(tenant);
        const receipt = await receiptService.execute({ masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'CHANGE_MEMBER_STATUS',
          idempotencyKey: `member-status:${operationId}`, normalizedIntent: { operationId, memberId: intent.memberId, targetStatus: intent.targetStatus, expectedVersion: intent.expectedMemberVersion } }, async tx => {
          await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${intent.memberId} FOR UPDATE`;
          const row = await tx.member.findUnique({ where: { id: intent.memberId } });
          if (!row || row.identityId !== initial.subjectIdentityId) throw new OperationIntegrityError('Member reciprocal identity changed');
          if (row.status !== intent.targetStatus && row.version === intent.expectedMemberVersion) {
            await tx.member.update({ where: { id: row.id, version: intent.expectedMemberVersion }, data: { status: intent.targetStatus as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED', version: { increment: 1 } } });
          } else if (row.status !== intent.targetStatus || row.version !== intent.expectedMemberVersion + 1) throw new OperationConflictError('Member status changed');
          return { result: { operationId, state: 'TENANT_COMMITTED', step: 'MEMBER_STATUS_APPLIED', version: intent.expectedMemberVersion + 1, resourceIds: [intent.memberId] },
            resourceType: 'MEMBER', resourceId: intent.memberId, audits: [{ actorIdentityId: access.identityId,
              eventCode: intent.targetStatus === 'ACTIVE' ? 'MEMBER_REACTIVATED' : intent.targetStatus === 'SUSPENDED' ? 'MEMBER_SUSPENDED' : 'MEMBER_DEACTIVATED',
              resourceType: 'MEMBER', resourceId: intent.memberId, transition: { from: row.status, to: intent.targetStatus, version: intent.expectedMemberVersion + 1 } }] };
        });
        if (!receipt.result.operationId) throw new OperationIntegrityError('Member status receipt is incomplete');
        await checkpoint('MEMBER_STATUS_APPLIED');
      }

      if (intent.targetStatus !== 'ACTIVE') await this.cancelFutureSessions(access, intent.memberId, operationId, intent.targetStatus, tenant, heartbeat);
      const cancelledIds = await this.releasedSessionIds(access, operationId, tenant);
      operation = await master.operation.findUniqueOrThrow({ where: { id: operationId } });
      if (!(operation.completedSteps as CompletedSteps).MEMBER_SESSIONS_RECONCILED) await checkpoint('MEMBER_SESSIONS_RECONCILED');
      operation = await master.operation.findUniqueOrThrow({ where: { id: operationId } });
      if (!(operation.completedSteps as CompletedSteps).MEMBER_ACCESS_FINALIZED) await checkpoint('MEMBER_ACCESS_FINALIZED', async tx => {
        await this.authorizeOwner(tx, access);
        if (intent.targetStatus === 'ACTIVE') {
          const changed = await tx.gymAccess.updateMany({ where: { userId: initial.subjectIdentityId!, gymId: access.gymId, role: 'MEMBER', linkStatus: 'REVOKED', version: intent.expectedAccessVersion, tenantActorId: intent.memberId },
            data: { linkStatus: 'ACTIVE', version: { increment: 1 } } });
          if (changed.count !== 1) throw new OperationConflictError('Member access changed');
          await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_ACCESS_REACTIVATED', resourceType: 'MEMBER', resourceId: intent.memberId,
            committedVersion: intent.expectedAccessVersion + 1, transition: { from: 'REVOKED', to: 'ACTIVE', version: intent.expectedAccessVersion + 1 } });
        } else {
          const link = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: initial.subjectIdentityId!, gymId: access.gymId } } });
          if (!link || link.linkStatus !== 'REVOKED' || ![intent.expectedAccessVersion, intent.expectedAccessVersion + 1].includes(link.version)) throw new OperationConflictError('Member access revocation changed');
        }
      }, true, { operationId, state: 'COMPLETE', step: 'MEMBER_ACCESS_FINALIZED', version: initial.version + 1, resourceIds: [intent.memberId, ...cancelledIds] });
      await heartbeat.stop();
      return this.status(access, operationId);
    } catch (error) {
      const held = await heartbeat.stop().catch(() => null);
      if ((await master.operation.findUnique({ where: { id: operationId }, select: { state: true } }))?.state === 'COMPLETE') return this.status(access, operationId);
      if (held) await ops.fail(held, error instanceof OperationConflictError ? 'FAILED_FINAL' : 'FAILED_RETRYABLE',
        error instanceof OperationIntegrityError ? 'MEMBER_LIFECYCLE_REVIEW_REQUIRED' : 'MEMBER_LIFECYCLE_INTERRUPTED').catch(() => undefined);
      if (error instanceof OperationConflictError) throw new ConflictException('Member lifecycle changed; resume or inspect the original operation');
      throw new ServiceUnavailableException({ statusCode: 503, message: 'Member status operation is pending recovery', operationId, retryable: true });
    }
  }

  private async releasedSessionIds(access: GymAccess, operationId: string, tenant: TenantClient) {
    const rows = await tenant.commandReceipt.findMany({ where: { actorIdentityId: access.identityId, commandKind: 'MEMBER_LIFECYCLE_RELEASE', state: 'COMMITTED',
      audits: { some: { eventCode: 'MEMBER_SESSION_RELEASED' } } },
      select: { resourceId: true, safeResult: true } });
    return [...new Set(rows.filter(row => row.resourceId && row.safeResult && typeof row.safeResult === 'object' && !Array.isArray(row.safeResult)
      && (row.safeResult as Record<string, unknown>).operationId === operationId).map(row => row.resourceId!) )].sort();
  }

  private async cancelFutureSessions(access: GymAccess, memberId: string, operationId: string, targetStatus: string, tenant: TenantClient,
    heartbeat: ReturnType<typeof createLeaseHeartbeat>) {
    const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
    if (!configuration?.timezone || configuration.masterGymId !== access.gymId) throw new OperationIntegrityError('Gym configuration binding changed');
    for (;;) {
      const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
      const sessions = await tenant.pTSession.findMany({ where: { memberId, state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED'] }, scheduledStartAt: { gt: clock!.now } },
        orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 50, select: { id: true, version: true } });
      if (!sessions.length) return;
      for (const candidate of sessions) {
        await heartbeat.run(async lease => {
          const receipts = new CommandReceiptFoundationService(tenant);
          const key = `member-release:${createHash('sha256').update(`${operationId}\0${candidate.id}`).digest('hex')}`;
          await receipts.execute({ masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'MEMBER_LIFECYCLE_RELEASE', idempotencyKey: key,
            normalizedIntent: { operationId, sessionId: candidate.id, targetStatus } }, async (tx, receipt) => {
            await tx.$queryRaw`SELECT "id" FROM "PTSession" WHERE "id" = ${candidate.id} FOR UPDATE`;
            const current = await tx.pTSession.findUnique({ where: { id: candidate.id }, select: { id: true, state: true, version: true, scheduledStartAt: true, member: { select: { identityId: true } } } });
            const [now] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
            if (!current || !['PENDING_CONFIRMATION', 'SCHEDULED'].includes(current.state) || current.scheduledStartAt <= now!.now) return {
              result: { operationId, state: 'COMPLETE', step: 'MEMBER_SESSIONS_RECONCILED', version: current?.version ?? candidate.version, resourceIds: [candidate.id] },
              resourceType: 'PT_SESSION', resourceId: candidate.id, audits: [{ actorIdentityId: access.identityId, eventCode: 'MEMBER_SESSION_RELEASE_SKIPPED', resourceType: 'PT_SESSION', resourceId: candidate.id,
                transition: { from: 'PENDING_OR_SCHEDULED', to: 'UNCHANGED', version: current?.version ?? candidate.version } }] };
            const updated = await applySessionCommand(tx, { masterGymId: access.gymId, sessionId: current.id, receiptId: receipt.id,
              actorIdentityId: access.identityId, actorRole: 'SYSTEM', command: 'LIFECYCLE_RELEASE', expectedVersion: current.version });
            const hold = await tx.sessionCreditHold.findUnique({ where: { sessionId: current.id }, select: { state: true } });
            if (current.state === 'SCHEDULED' && hold?.state !== 'HELD') throw new OperationIntegrityError('Scheduled session credit hold requires review');
            if (hold?.state === 'HELD') await resolveSessionCreditHold(tx, { masterGymId: access.gymId, sessionId: current.id, receiptId: receipt.id,
              actorIdentityId: access.identityId, resolution: 'RELEASE', gymLocalDate: new Intl.DateTimeFormat('en-CA', { timeZone: configuration.timezone!, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now!.now) });
            if (!current.member.identityId) throw new OperationIntegrityError('Session member identity requires review');
            await appendTenantNotification(tx, { masterGymId: access.gymId, receiptId: receipt.id, eventCode: 'SESSION_CANCELLED', resourceId: current.id, recipientIdentityId: current.member.identityId });
            return { result: { operationId, state: 'COMPLETE', step: 'MEMBER_SESSIONS_RECONCILED', version: updated.version, resourceIds: [current.id] },
              resourceType: 'PT_SESSION', resourceId: current.id, audits: [{ actorIdentityId: access.identityId, eventCode: 'MEMBER_SESSION_RELEASED', resourceType: 'PT_SESSION', resourceId: current.id,
                transition: { from: current.state, to: updated.state, version: updated.version } }] };
          });
          return { lease, value: undefined };
        });
      }
    }
  }
}
