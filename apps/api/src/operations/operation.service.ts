import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient, Operation, OperationKind } from '../generated/master/client.js';
import {
  appendStep, canonicalJson, gymScope, idempotencyKey, OperationConflictError,
  OperationIntegrityError, provisionScope, reference, requestDigest, safeResult,
  stateForSteps, type CompletedSteps, type SafeResult, type StepCode,
  type StepEvidence, type SupportedKind,
} from './primitives.js';
import { appendMasterAudit } from './transaction-audit.js';

type Tx = Prisma.TransactionClient;
export type Lease = { operationId: string; token: string; version: number; requiresReconciliation: boolean };
export const OPERATION_LEASE_MS = 30_000;
export const OPERATION_HEARTBEAT_MS = 10_000;
async function dbNow(tx: Tx): Promise<Date> {
  const [value] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return value.now;
}
async function lockKey(tx: Tx, key: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
async function lockedOperation(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Operation" WHERE "id" = ${id} FOR UPDATE`;
  const operation = await tx.operation.findUnique({ where: { id } });
  if (!operation) throw new OperationConflictError('Operation unavailable');
  return operation;
}
async function assertLease(tx: Tx, lease: Lease) {
  const operation = await lockedOperation(tx, lease.operationId);
  const now = await dbNow(tx);
  if (operation.leaseToken !== lease.token || operation.version !== lease.version
    || !operation.leaseExpiresAt || operation.leaseExpiresAt <= now || operation.state === 'COMPLETE') {
    throw new OperationConflictError('Operation lease is stale or expired');
  }
  return { operation, now };
}
function supportedKind(kind: OperationKind): SupportedKind {
  if (!['PROVISION_GYM', 'REGISTER_MEMBER', 'REGISTER_TRAINER', 'CHANGE_ACCESS'].includes(kind)) throw new OperationConflictError('Workflow checkpoints not commissioned for this kind');
  return kind as SupportedKind;
}
function checkpointEffects(evidence: StepEvidence): Prisma.OperationUncheckedUpdateManyInput {
  // The explicit map prevents caller JSON becoming arbitrary Prisma updates.
  const result: Prisma.OperationUncheckedUpdateManyInput = {};
  for (const key of ['gymId', 'subjectIdentityId', 'ownerThemeId', 'tenantActorId', 'tenantCommandReceiptId', 'tenantMembershipId', 'appliedTenantTemplateVersion', 'appliedTenantManifestDigest'] as const) {
    if (evidence[key] !== undefined) result[key] = evidence[key];
  }
  return result;
}
// Internal primitive only. It does not authorize a user, create physical DBs,
// initialize/provision gyms, run migrations or expose an HTTP controller.
export class OperationFoundationService {
  constructor(private readonly master: PrismaClient) {}

  async claim(input: {
    actorIdentityId: string; kind: OperationKind; idempotencyKey: string;
    intent: unknown; gymId?: string; requestedSlug?: string; supportContextId?: string;
    intendedTenantTemplateVersion?: string; intendedTenantManifestDigest?: string;
    protectedFingerprint?: string;
    prepare?: (tx: Tx, operation: Operation) => Promise<void>;
  }) {
    reference(input.actorIdentityId); idempotencyKey(input.idempotencyKey);
    const scopeKey = input.kind === 'PROVISION_GYM' ? provisionScope(input.requestedSlug ?? '') : gymScope(input.gymId ?? '');
    if (input.kind === 'PROVISION_GYM' && (!input.intendedTenantTemplateVersion
      || !/^[a-f0-9]{64}$/.test(input.intendedTenantManifestDigest ?? ''))) throw new TypeError('Provisioning needs a pinned reviewed manifest');
    const digest = requestDigest({ commandVersion: '1', actorIdentityId: input.actorIdentityId,
      kind: input.kind, scopeKey, supportContextId: input.supportContextId ?? null,
      intendedTenantTemplateVersion: input.intendedTenantTemplateVersion ?? null,
      intendedTenantManifestDigest: input.intendedTenantManifestDigest ?? null, intent: input.intent }, input.protectedFingerprint);
    return this.master.$transaction(async tx => {
      // Claim the key independent of requested slug, before any Gym/email check.
      await lockKey(tx, canonicalJson([input.actorIdentityId, input.kind, input.idempotencyKey,
        input.kind === 'PROVISION_GYM' ? null : scopeKey]));
      const existing = await tx.operation.findFirst({ where: {
        actorIdentityId: input.actorIdentityId, kind: input.kind, idempotencyKey: input.idempotencyKey,
        ...(input.kind === 'PROVISION_GYM' ? {} : { scopeKey }),
      } });
      if (existing) {
        if (existing.scopeKey !== scopeKey || existing.requestDigest !== digest) throw new OperationConflictError();
        return { operation: existing, replayed: true,
          result: existing.state === 'COMPLETE' ? safeResult(existing.safeResult) : null };
      }
      const operation = await tx.operation.create({ data: {
        actorIdentityId: input.actorIdentityId, kind: input.kind, scopeKey,
        idempotencyKey: input.idempotencyKey, requestDigest: digest,
        requestedSlug: input.kind === 'PROVISION_GYM' ? input.requestedSlug : null,
        gymId: input.gymId ?? null, supportContextId: input.supportContextId ?? null,
        databaseName: input.kind === 'PROVISION_GYM' ? `gymos_${randomUUID().replaceAll('-', '')}` : null,
        intendedTenantTemplateVersion: input.intendedTenantTemplateVersion ?? null,
        intendedTenantManifestDigest: input.intendedTenantManifestDigest ?? null,
      } });
      await input.prepare?.(tx, operation);
      const prepared = input.prepare ? await tx.operation.findUniqueOrThrow({ where: { id: operation.id } }) : operation;
      return { operation: prepared, replayed: false, result: null };
    });
  }

  async acquireLease(operationId: string, expectedVersion: number): Promise<Lease> {
    return this.master.$transaction(async tx => {
      const operation = await lockedOperation(tx, reference(operationId));
      const now = await dbNow(tx);
      if (operation.version !== expectedVersion || ['COMPLETE', 'FAILED_FINAL', 'REPAIR_REQUIRED'].includes(operation.state)
        || (operation.leaseExpiresAt && operation.leaseExpiresAt > now)) throw new OperationConflictError('Operation cannot be leased');
      const token = randomUUID();
      const requiresReconciliation = operation.attemptCount > 0;
      const changed = await tx.operation.updateMany({ where: { id: operationId, version: expectedVersion }, data: {
        leaseToken: token, leaseExpiresAt: new Date(now.getTime() + OPERATION_LEASE_MS),
        leaseRequiresReconciliation: requiresReconciliation, attemptCount: { increment: 1 },
        lastAttemptAt: now, version: { increment: 1 },
      } });
      if (changed.count !== 1) throw new OperationConflictError();
      return { operationId, token, version: expectedVersion + 1, requiresReconciliation };
    });
  }

  async heartbeat(lease: Lease): Promise<Lease> {
    return this.master.$transaction(async tx => {
      const { now } = await assertLease(tx, lease);
      const changed = await tx.operation.updateMany({ where: { id: lease.operationId, version: lease.version, leaseToken: lease.token }, data: {
        leaseExpiresAt: new Date(now.getTime() + OPERATION_LEASE_MS), version: { increment: 1 },
      } });
      if (changed.count !== 1) throw new OperationConflictError();
      return { ...lease, version: lease.version + 1 };
    });
  }

  // Verification reads the SAME target outside any Master transaction. The
  // second CAS transaction rejects a changed/expired lease after external I/O.
  async reconcileLease(lease: Lease, verifier: (operation: Operation) => Promise<void>): Promise<Lease> {
    const snapshot = await this.master.operation.findUnique({ where: { id: reference(lease.operationId) } });
    const [{ now: before }] = await this.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    if (!snapshot || snapshot.version !== lease.version || snapshot.leaseToken !== lease.token
      || !snapshot.leaseExpiresAt || snapshot.leaseExpiresAt <= before) throw new OperationConflictError('Reconciliation lease is stale');
    if (!snapshot.leaseRequiresReconciliation) return { ...lease, requiresReconciliation: false };
    await verifier(snapshot);
    return this.master.$transaction(async tx => {
      const { operation } = await assertLease(tx, lease);
      if (!operation.leaseRequiresReconciliation) throw new OperationConflictError('Reconciliation state changed');
      await tx.operation.update({ where: { id: operation.id, version: lease.version }, data: {
        leaseRequiresReconciliation: false, version: { increment: 1 },
      } });
      await appendMasterAudit(tx, { actorIdentityId: operation.actorIdentityId, operationId: operation.id,
        stepCode: 'RECONCILED', eventCode: 'OPERATION_RECONCILED', resourceType: 'OPERATION', resourceId: operation.id,
        eventOrdinal: operation.attemptCount, gymId: operation.gymId, transition: { to: operation.state } });
      return { ...lease, version: lease.version + 1, requiresReconciliation: false };
    });
  }

  async checkpoint(lease: Lease, input: {
    step: StepCode; evidence: StepEvidence; finalResult?: SafeResult;
    localEffects?: (tx: Tx, operation: Operation) => Promise<void>;
  }): Promise<{ lease: Lease; state: string; result: SafeResult | null }> {
    return this.master.$transaction(async tx => {
      const { operation, now } = await assertLease(tx, lease);
      if (operation.leaseRequiresReconciliation) throw new OperationConflictError('Reconcile target evidence before resuming');
      const kind = supportedKind(operation.kind);
      const previous = operation.completedSteps as CompletedSteps;
      const steps = appendStep(kind, previous, input.step, input.evidence, now);
      if (steps === previous) return { lease, state: operation.state, result: operation.safeResult ? safeResult(operation.safeResult) : null };
      // Evidence may not rebind the persisted physical target or pinned manifest.
      if ((input.evidence.databaseName && input.evidence.databaseName !== operation.databaseName)
        || (input.evidence.appliedTenantTemplateVersion && input.evidence.appliedTenantTemplateVersion !== operation.intendedTenantTemplateVersion)
        || (input.evidence.appliedTenantManifestDigest && input.evidence.appliedTenantManifestDigest !== operation.intendedTenantManifestDigest)) throw new OperationIntegrityError();
      const state = stateForSteps(kind, steps);
      const result = input.finalResult ? safeResult(input.finalResult) : null;
      if (state === 'COMPLETE' && (!result || result.operationId !== operation.id || (result.state !== undefined && result.state !== 'COMPLETE'))) throw new OperationIntegrityError('Completion needs safe result bound to operation');
      if (state !== 'COMPLETE' && result) throw new OperationIntegrityError('Final result supplied before completion');
      await input.localEffects?.(tx, operation); // Master effects only; no external work.
      const boundGymId = input.evidence.gymId ?? operation.gymId;
      if (operation.kind === 'PROVISION_GYM' && boundGymId) {
        const gym = await tx.gym.findUnique({ where: { id: boundGymId }, select: { slug: true, databaseName: true } });
        if (!gym || gym.slug !== operation.requestedSlug || gym.databaseName !== operation.databaseName) throw new OperationIntegrityError('Operation Gym target binding mismatch');
      }
      const themeId = input.evidence.ownerThemeId ?? operation.ownerThemeId;
      if (themeId) {
        const theme = await tx.theme.findUnique({ where: { id: themeId }, select: { gymId: true } });
        if (!theme || theme.gymId !== boundGymId) throw new OperationIntegrityError('Operation Theme binding mismatch');
      }
      if (operation.leaseExpiresAt! <= await dbNow(tx)) throw new OperationConflictError('Checkpoint outlived lease');
      await tx.operation.update({ where: { id: operation.id, version: lease.version }, data: {
        ...checkpointEffects(input.evidence), completedSteps: steps as Prisma.InputJsonValue,
        state, step: input.step, version: { increment: 1 },
        ...(input.step === 'TENANT_TEMPLATE_VERIFIED' ? { tenantSchemaVerifiedAt: now } : {}),
        ...(result ? { safeResult: result as Prisma.InputJsonValue, leaseToken: null, leaseExpiresAt: null } : {}),
      } });
      await appendMasterAudit(tx, { actorIdentityId: operation.actorIdentityId,
        operationId: operation.id, stepCode: input.step, eventCode: 'OPERATION_CHECKPOINT',
        resourceType: 'OPERATION', resourceId: operation.id,
        gymId: input.evidence.gymId ?? operation.gymId, transition: { from: operation.state, to: state } });
      return { lease: { ...lease, version: lease.version + 1 }, state, result };
    });
  }

  async releaseLease(lease: Lease): Promise<void> {
    await this.master.$transaction(async tx => {
      const { operation } = await assertLease(tx, lease);
      const state = stateForSteps(supportedKind(operation.kind), operation.completedSteps as CompletedSteps);
      await tx.operation.update({ where: { id: operation.id, version: lease.version }, data: {
        state, leaseToken: null, leaseExpiresAt: null, version: { increment: 1 },
      } });
      await appendMasterAudit(tx, { actorIdentityId: operation.actorIdentityId, operationId: operation.id,
        stepCode: 'YIELDED', eventCode: 'OPERATION_YIELDED', resourceType: 'OPERATION', resourceId: operation.id,
        eventOrdinal: operation.attemptCount, gymId: operation.gymId, transition: { from: operation.state, to: state } });
    });
  }

  async fail(lease: Lease, state: 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'REPAIR_REQUIRED', errorCode: string): Promise<Lease> {
    reference(errorCode);
    return this.master.$transaction(async tx => {
      const { operation } = await assertLease(tx, lease);
      await tx.operation.update({ where: { id: operation.id, version: lease.version }, data: {
        state, errorCode, leaseToken: null, leaseExpiresAt: null, version: { increment: 1 },
      } });
      await appendMasterAudit(tx, { actorIdentityId: operation.actorIdentityId, operationId: operation.id,
        stepCode: operation.step, eventCode: 'OPERATION_FAILED', resourceType: 'OPERATION', resourceId: operation.id,
        eventOrdinal: operation.attemptCount, gymId: operation.gymId, transition: { from: operation.state, to: state } });
      return { ...lease, version: lease.version + 1 };
    });
  }
}

// Serialize heartbeat and checkpoint calls through one lease holder. A worker
// must stop new work on heartbeat rejection. No timer owns external side effects.
export function createLeaseHeartbeat(service: OperationFoundationService, initial: Lease) {
  let current = initial;
  let stopped = false;
  let failure: unknown;
  let chain = Promise.resolve();
  const timer = setInterval(() => {
    if (stopped) return;
    chain = chain.then(async () => { if (!stopped) current = await service.heartbeat(current); }).catch(error => { failure = error; stopped = true; clearInterval(timer); });
  }, OPERATION_HEARTBEAT_MS);
  timer.unref();
  return {
    async run<T>(action: (lease: Lease) => Promise<{ lease: Lease; value: T }>): Promise<T> {
      let result!: T;
      const task = chain.then(async () => {
        if (failure || stopped) throw failure ?? new OperationConflictError('Heartbeat stopped');
        const next = await action(current); current = next.lease; result = next.value;
      });
      chain = task.catch(() => {});
      await task; return result;
    },
    async stop() { stopped = true; clearInterval(timer); await chain; if (failure) throw failure; return current; },
  };
}
