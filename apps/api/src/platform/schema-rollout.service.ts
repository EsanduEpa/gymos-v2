import { schemaRolloutInputSchema } from '@gymos/contracts/platform';
import { DatabaseService } from '../database.service.js';
import { GymProvisioningService } from '../gym-provisioning.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import type {
  Operation,
  Prisma,
  SchemaRolloutTarget,
} from '../generated/master/client.js';
import {
  OperationFoundationService,
  createLeaseHeartbeat,
} from '../operations/operation.service.js';
import {
  canonicalJson,
  contentDigest,
  OperationConflictError,
  OperationIntegrityError,
  requestDigest,
  type CompletedSteps,
  type StepCode,
  type StepEvidence,
} from '../operations/primitives.js';
import {
  appendMasterAudit,
  appendMasterVersionAudit,
} from '../operations/transaction-audit.js';
import {
  assertRunningApiCompatibility,
  reviewedTenantManifest,
  tenantManifestDigest,
  type TenantTemplateManifest,
} from '../tenancy/tenant-template-manifest.js';
import {
  TenantSchemaVerifier,
  verifyInstalledTenant,
  type InstalledTenantEvidence,
} from '../tenancy/tenant-schema-verifier.js';
import { verifyPinnedSources } from '../tenancy/pinned-deploy.js';

type Fault = (point: string, operationId: string) => Promise<void>;
export class SchemaRolloutService {
  constructor(
    private readonly database: DatabaseService,
    private readonly physical: GymProvisioningService,
    private readonly tenants: TenantDatabaseService,
    private readonly fault?: Fault,
  ) {}
  private get master() {
    return this.database.master;
  }
  private async actor(id: string, tx: Prisma.TransactionClient = this.master) {
    const user = await tx.user.findUnique({ where: { id } });
    const [{ now }] = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`;
    if (
      user?.globalRole !== 'SUPER_ADMIN' ||
      user.mustChangePassword ||
      (user.credentialExpiresAt && user.credentialExpiresAt <= now)
    )
      throw new OperationIntegrityError(
        'Controlled platform actor unavailable',
      );
  }
  async reserve(actorIdentityId: string, value: unknown) {
    await this.actor(actorIdentityId);
    const input = schemaRolloutInputSchema.parse(value);
    const manifest = reviewedTenantManifest(
      input.targetVersion,
      input.targetDigest,
    );
    if (!manifest)
      throw new OperationIntegrityError('Reviewed target manifest unavailable');
    assertRunningApiCompatibility(manifest);
    await verifyPinnedSources('tenant', manifest.migrations);
    const digest = requestDigest({ command: 'SCHEMA_ROLLOUT', ...input });
    const rollout = await this.master.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`rollout:${actorIdentityId}:${input.idempotencyKey}`},0))`;
      const existing = await tx.schemaRollout.findUnique({
        where: {
          actorIdentityId_idempotencyKey: {
            actorIdentityId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.requestDigest !== digest)
          throw new OperationConflictError();
        return existing;
      }
      const created = await tx.schemaRollout.create({
        data: {
          actorIdentityId,
          idempotencyKey: input.idempotencyKey,
          requestDigest: digest,
          targetVersion: manifest.version,
          targetDigest: input.targetDigest,
          orderedGymIds: input.gymIds,
          batchSize: input.batchSize,
        },
      });
      await appendMasterVersionAudit(tx, {
        actorIdentityId,
        eventCode: 'SCHEMA_ROLLOUT_RESERVED',
        resourceType: 'SCHEMA_ROLLOUT',
        resourceId: created.id,
        committedVersion: 0,
        transition: { to: 'CANARY_PENDING', version: 0 },
      });
      return created;
    });
    await this.ensureTargets(rollout.id);
    return this.status(actorIdentityId, rollout.id);
  }
  private async ensureTargets(id: string) {
    const rollout = await this.master.schemaRollout.findUniqueOrThrow({
      where: { id },
    });
    const targetManifest = reviewedTenantManifest(
      rollout.targetVersion,
      rollout.targetDigest,
    );
    if (!targetManifest)
      throw new OperationIntegrityError('Pinned target unavailable');
    for (const [ordinal, gymId] of (
      rollout.orderedGymIds as string[]
    ).entries()) {
      await new OperationFoundationService(this.master).claim({
        actorIdentityId: rollout.actorIdentityId,
        kind: 'ROLLOUT_TENANT_SCHEMA',
        gymId,
        idempotencyKey: `schema:${id}:${ordinal}`,
        intent: { rolloutId: id, ordinal },
        intendedTenantTemplateVersion: rollout.targetVersion,
        intendedTenantManifestDigest: rollout.targetDigest,
        prepare: async (tx, operation) => {
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`gym-lifecycle:${gymId}`},0))`;
          await this.actor(rollout.actorIdentityId, tx);
          const gym = await tx.gym.findUniqueOrThrow({
            where: { id: gymId },
            include: { expectedTenantOperation: true },
          });
          const source = reviewedTenantManifest(
            gym.expectedTenantSchemaVersion,
            gym.expectedTenantManifestDigest,
          );
          if (
            !['ACTIVE', 'SUSPENDED'].includes(gym.status) ||
            !source ||
            gym.expectedTenantOperation?.state !== 'COMPLETE' ||
            gym.expectedTenantOperation.gymId !== gym.id ||
            gym.expectedTenantOperation.appliedTenantTemplateVersion !==
              source.version ||
            gym.expectedTenantOperation.appliedTenantManifestDigest !==
              gym.expectedTenantManifestDigest
          )
            throw new OperationIntegrityError('Source tenant is not eligible');
          if (
            source.migrations.length > targetManifest.migrations.length ||
            source.migrations.some(
              (entry, index) =>
                canonicalJson(entry) !==
                canonicalJson(targetManifest.migrations[index]),
            )
          )
            throw new OperationIntegrityError(
              'Only reviewed additive forward manifests are supported',
            );
          const inFlight = await tx.operation.findFirst({
            where: {
              gymId,
              id: { not: operation.id },
              state: { notIn: ['COMPLETE', 'FAILED_FINAL'] },
              OR: [
                { kind: 'CHANGE_ACCESS', lifecycleIntent: { isNot: null } },
                {
                  kind: 'ROLLOUT_TENANT_SCHEMA',
                  schemaRolloutTarget: { isNot: null },
                },
              ],
            },
            select: { id: true },
          });
          if (inFlight)
            throw new OperationConflictError(
              'Gym already has controlled maintenance',
            );
          const owner = await tx.operation.findFirst({
            where: {
              gymId,
              kind: 'PROVISION_GYM',
              databaseName: gym.databaseName,
              state: 'COMPLETE',
            },
            select: { id: true },
          });
          if (!owner)
            throw new OperationIntegrityError(
              'Positive physical ownership proof is required',
            );
          await tx.schemaRolloutTarget.create({
            data: {
              operationId: operation.id,
              rolloutId: id,
              ordinal,
              databaseName: gym.databaseName,
              ownershipOperationId: owner.id,
              sourceOperationId: gym.expectedTenantOperationId!,
              sourceVersion: source.version,
              sourceDigest: gym.expectedTenantManifestDigest!,
              expectedGymVersion: gym.version,
            },
          });
        },
      });
    }
  }
  async status(actorIdentityId: string, id: string) {
    const rollout = await this.master.schemaRollout.findFirst({
      where: { id, actorIdentityId },
      include: {
        targets: {
          orderBy: { ordinal: 'asc' },
          include: {
            operation: {
              select: {
                id: true,
                gymId: true,
                state: true,
                version: true,
                step: true,
                appliedTenantTemplateVersion: true,
              },
            },
          },
        },
      },
    });
    if (!rollout) throw new OperationConflictError('Rollout unavailable');
    return {
      rolloutId: rollout.id,
      state: rollout.state,
      version: rollout.version,
      targetVersion: rollout.targetVersion,
      total: (rollout.orderedGymIds as string[]).length,
      targets: rollout.targets.map((target) => ({
        operationId: target.operation.id,
        gymId: target.operation.gymId,
        state: target.operation.state,
        version: target.operation.version,
        step: target.operation.step,
        installedVersion: target.operation.appliedTenantTemplateVersion,
      })),
    };
  }
  private async progress(id: string, state: string) {
    await this.master.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SchemaRollout" WHERE "id"=${id} FOR UPDATE`;
      const current = await tx.schemaRollout.findUniqueOrThrow({
        where: { id },
      });
      if (current.state === state || current.state === 'COMPLETE') return;
      await tx.schemaRollout.update({
        where: { id, version: current.version },
        data: { state, version: { increment: 1 } },
      });
      await appendMasterVersionAudit(tx, {
        actorIdentityId: current.actorIdentityId,
        eventCode: 'SCHEMA_ROLLOUT_PROGRESS',
        resourceType: 'SCHEMA_ROLLOUT',
        resourceId: id,
        committedVersion: current.version + 1,
        transition: {
          from: current.state,
          to: state,
          version: current.version + 1,
        },
      });
    });
  }
  async runNext(actorIdentityId: string, id: string) {
    await this.actor(actorIdentityId);
    await this.status(actorIdentityId, id);
    await this.ensureTargets(id);
    const rollout = await this.master.schemaRollout.findUniqueOrThrow({
      where: { id },
      include: {
        targets: { orderBy: { ordinal: 'asc' }, include: { operation: true } },
      },
    });
    if (['COMPLETE', 'CANARY_READY', 'STOPPED_REPAIR'].includes(rollout.state))
      return this.status(actorIdentityId, id);
    const eligible =
      rollout.state === 'CANARY_PENDING'
        ? rollout.targets.slice(0, 1)
        : rollout.targets;
    for (const target of eligible
      .filter((value) => value.operation.state !== 'COMPLETE')
      .slice(0, rollout.state === 'CANARY_PENDING' ? 1 : rollout.batchSize)) {
      await this.runTarget(target.operation, target);
      const result = await this.master.operation.findUniqueOrThrow({
        where: { id: target.operationId },
      });
      if (result.state !== 'COMPLETE') {
        await this.progress(id, 'STOPPED_REPAIR');
        return this.status(actorIdentityId, id);
      }
      await this.fault?.('AFTER_TARGET_COMMIT', target.operationId);
    }
    const complete = await this.master.schemaRolloutTarget.count({
      where: { rolloutId: id, operation: { is: { state: 'COMPLETE' } } },
    });
    await this.progress(
      id,
      complete === rollout.targets.length
        ? 'COMPLETE'
        : rollout.state === 'CANARY_PENDING'
          ? 'CANARY_READY'
          : 'BATCH_READY',
    );
    return this.status(actorIdentityId, id);
  }
  async approveCanary(
    actorIdentityId: string,
    id: string,
    expectedVersion: number,
    reason: string,
  ) {
    await this.actor(actorIdentityId);
    if (reason.trim().length < 10 || reason.length > 500)
      throw new OperationIntegrityError(
        'Review reason must be 10–500 characters',
      );
    const candidate = await this.master.schemaRollout.findFirstOrThrow({
      where: { id, actorIdentityId },
      include: {
        targets: { where: { ordinal: 0 }, include: { operation: true } },
      },
    });
    const canary = candidate.targets[0];
    const manifest = reviewedTenantManifest(
      candidate.targetVersion,
      candidate.targetDigest,
    );
    if (!canary || !manifest)
      throw new OperationIntegrityError('Canary evidence unavailable');
    const gym = await this.master.gym.findUniqueOrThrow({
      where: { id: canary.operation.gymId! },
      include: { expectedTenantOperation: true },
    });
    if (
      gym.expectedTenantSchemaVersion !== manifest.version ||
      gym.expectedTenantManifestDigest !== candidate.targetDigest ||
      gym.expectedTenantOperation?.state !== 'COMPLETE'
    )
      throw new OperationIntegrityError('Canary is not currently verified');
    const actual = await this.physical.withRolloutTarget(canary.operation, () =>
      this.tenants.withAdministrativeRead(gym.databaseName, async (tx) => {
        const evidence = await verifyInstalledTenant(tx, manifest);
        const marker = await tx.schemaState.findUnique({
          where: { id: 'current' },
        });
        const binding = await tx.gymConfiguration.findUnique({
          where: { id: 'current' },
          select: { masterGymId: true },
        });
        if (
          binding?.masterGymId !== gym.id ||
          marker?.state !== 'VERIFIED' ||
          marker.lastOperationId !== gym.expectedTenantOperationId ||
          marker.appliedManifestDigest !== candidate.targetDigest ||
          marker.appliedTemplateVersion !== manifest.version ||
          canonicalJson(marker.verifiedMigrations) !==
            canonicalJson(manifest.migrations)
        )
          throw new OperationIntegrityError(
            'Canary binding/marker requires reviewed repair',
          );
        return evidence;
      }),
    );
    await this.master.$transaction(async (tx) => {
      const currentGym = await tx.gym.findUniqueOrThrow({
        where: { id: gym.id },
        select: { version: true, expectedTenantOperationId: true },
      });
      if (
        currentGym.version !== gym.version ||
        currentGym.expectedTenantOperationId !== gym.expectedTenantOperationId
      )
        throw new OperationConflictError('Canary changed during review');
      const rollout = await tx.schemaRollout.findUniqueOrThrow({
        where: { id },
        include: {
          targets: { where: { ordinal: 0 }, include: { operation: true } },
        },
      });
      if (
        rollout.actorIdentityId !== actorIdentityId ||
        rollout.state !== 'CANARY_READY' ||
        rollout.version !== expectedVersion ||
        rollout.targets[0]?.operation.state !== 'COMPLETE'
      )
        throw new OperationConflictError('Canary review is stale');
      await tx.schemaRolloutApproval.create({
        data: {
          rolloutId: id,
          actorIdentityId,
          expectedVersion,
          reason: reason.trim(),
          canaryEvidenceDigest: contentDigest({
            actual,
            gymVersion: gym.version,
            verifiedOperationId: gym.expectedTenantOperationId,
          }),
        },
      });
      const changed = await tx.schemaRollout.updateMany({
        where: { id, version: expectedVersion, state: 'CANARY_READY' },
        data: { state: 'BATCH_READY', version: { increment: 1 } },
      });
      if (changed.count !== 1) throw new OperationConflictError();
      await appendMasterVersionAudit(tx, {
        actorIdentityId,
        eventCode: 'SCHEMA_CANARY_APPROVED',
        resourceType: 'SCHEMA_ROLLOUT',
        resourceId: id,
        committedVersion: expectedVersion + 1,
        transition: {
          from: 'CANARY_READY',
          to: 'BATCH_READY',
          version: expectedVersion + 1,
        },
      });
    });
    return this.status(actorIdentityId, id);
  }
  private async inspect(
    operation: Operation,
    target: SchemaRolloutTarget,
    manifest: TenantTemplateManifest,
  ) {
    const source = reviewedTenantManifest(
      target.sourceVersion,
      target.sourceDigest,
    );
    if (!source)
      throw new OperationIntegrityError('Source manifest unavailable');
    return this.tenants.withMaintenanceDatabase(target.databaseName, (tenant) =>
      tenant.$transaction(async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const binding = await tx.gymConfiguration.findUnique({
          where: { id: 'current' },
          select: { masterGymId: true },
        });
        if (binding?.masterGymId !== operation.gymId)
          throw new OperationIntegrityError(
            'Restored or intact tenant binding evidence is required',
          );
        let evidence: InstalledTenantEvidence;
        let installedTarget = true;
        try {
          evidence = await verifyInstalledTenant(tx, manifest);
        } catch {
          installedTarget = false;
          try {
            evidence = await verifyInstalledTenant(tx, source);
          } catch {
            throw new OperationIntegrityError(
              'Actual migration history/postconditions require isolated restore or reviewed forward repair',
            );
          }
        }
        const marker = await tx.schemaState.findUnique({
          where: { id: 'current' },
        });
        const markerValid = Boolean(
          marker?.state === 'VERIFIED' &&
          canonicalJson(marker.verifiedMigrations) ===
            canonicalJson(evidence.verifiedMigrations) &&
          ((marker.appliedTemplateVersion === source.version &&
            marker.appliedManifestDigest === target.sourceDigest &&
            marker.lastOperationId === target.sourceOperationId) ||
            (marker.appliedTemplateVersion === manifest.version &&
              marker.appliedManifestDigest === tenantManifestDigest(manifest) &&
              marker.lastOperationId === operation.id)),
        );
        return { evidence, installedTarget, markerValid };
      }),
    );
  }
  async reviewTarget(
    actorIdentityId: string,
    operationId: string,
    expectedVersion: number,
    reason: string,
  ) {
    await this.actor(actorIdentityId);
    if (reason.trim().length < 10 || reason.length > 500)
      throw new OperationIntegrityError(
        'Review reason must be 10–500 characters',
      );
    const operation = await this.master.operation.findUniqueOrThrow({
      where: { id: operationId },
      include: { schemaRolloutTarget: { include: { rollout: true } } },
    });
    const target = operation.schemaRolloutTarget;
    if (
      !target ||
      target.rollout.actorIdentityId !== actorIdentityId ||
      operation.version !== expectedVersion
    )
      throw new OperationConflictError('Repair review is stale');
    const [{ now }] = await this.master.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`;
    if (
      operation.attemptCount === 0 ||
      operation.state === 'COMPLETE' ||
      (operation.leaseExpiresAt && operation.leaseExpiresAt > now)
    )
      throw new OperationConflictError(
        'A live/completed worker cannot be reviewed',
      );
    const manifest = reviewedTenantManifest(
      operation.intendedTenantTemplateVersion,
      operation.intendedTenantManifestDigest,
    );
    if (!manifest)
      throw new OperationIntegrityError('Reviewed target unavailable');
    await verifyPinnedSources('tenant', manifest.migrations);
    const observed = await this.physical.withRolloutTarget(operation, () =>
      this.inspect(operation, target, manifest),
    );
    await this.master.$transaction(async (tx) => {
      const changed = await tx.operation.updateMany({
        where: {
          id: operationId,
          version: expectedVersion,
          state: { not: 'COMPLETE' },
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
        },
        data: {
          state: 'PENDING',
          errorCode: null,
          leaseToken: null,
          leaseExpiresAt: null,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new OperationConflictError('Repair review changed');
      await tx.schemaRepairReview.create({
        data: {
          operationId,
          actorIdentityId,
          approvedAttempt: operation.attemptCount + 1,
          reason: reason.trim(),
          observedVersion: observed.evidence.templateVersion,
          observedDigest: observed.evidence.manifestDigest,
          schemaEvidenceDigest: observed.evidence.schemaEvidenceDigest,
        },
      });
      await appendMasterAudit(tx, {
        actorIdentityId,
        operationId,
        gymId: operation.gymId,
        stepCode: 'SCHEMA_REPAIR_REVIEW',
        eventCode: 'SCHEMA_REPAIR_APPROVED',
        resourceType: 'GYM',
        resourceId: operation.gymId!,
        eventOrdinal: expectedVersion,
        transition: { to: 'PENDING', version: expectedVersion + 1 },
      });
    });
    await this.progress(
      target.rolloutId,
      target.ordinal === 0 ? 'CANARY_PENDING' : 'BATCH_READY',
    );
    return this.status(actorIdentityId, target.rolloutId);
  }
  private async runTarget(initial: Operation, target: SchemaRolloutTarget) {
    const manifest = reviewedTenantManifest(
      initial.intendedTenantTemplateVersion,
      initial.intendedTenantManifestDigest,
    );
    if (!manifest)
      throw new OperationIntegrityError('Pinned manifest unavailable');
    const service = new OperationFoundationService(this.master);
    const lease = await service.acquireLease(initial.id, initial.version);
    const heartbeat = createLeaseHeartbeat(service, lease);
    let paused = false;
    const checkpoint = (
      step: StepCode,
      evidence: StepEvidence,
      effects?: (tx: Prisma.TransactionClient) => Promise<void>,
      complete = false,
    ) =>
      heartbeat.run(async (current) => {
        const result = await service.checkpoint(current, {
          step,
          evidence,
          localEffects: effects,
          ...(complete
            ? {
                finalResult: {
                  operationId: initial.id,
                  state: 'COMPLETE' as const,
                  resourceIds: [initial.gymId!],
                  version: target.expectedGymVersion + 2,
                },
              }
            : {}),
        });
        return { lease: result.lease, value: undefined };
      });
    const block = async () => {
      await checkpoint(
        'SCHEMA_ADMISSION_BLOCKED',
        { gymId: initial.gymId! },
        async (tx) => {
          await this.actor(initial.actorIdentityId, tx);
          const changed = await tx.gym.updateMany({
            where: {
              id: initial.gymId!,
              version: target.expectedGymVersion,
              expectedTenantOperationId: target.sourceOperationId,
              databaseName: target.databaseName,
              status: { in: ['ACTIVE', 'SUSPENDED'] },
            },
            data: {
              expectedTenantSchemaVersion: manifest.version,
              expectedTenantManifestDigest: tenantManifestDigest(manifest),
              expectedTenantOperationId: initial.id,
              version: { increment: 1 },
            },
          });
          if (changed.count !== 1)
            throw new OperationConflictError('Schema registry changed');
          await appendMasterVersionAudit(tx, {
            actorIdentityId: initial.actorIdentityId,
            gymId: initial.gymId,
            eventCode: 'SCHEMA_ADMISSION_BLOCKED',
            resourceType: 'GYM',
            resourceId: initial.gymId!,
            committedVersion: target.expectedGymVersion + 1,
            transition: {
              to: 'APPLYING',
              version: target.expectedGymVersion + 1,
            },
          });
        },
      );
    };
    try {
      const review = await this.master.schemaRepairReview.findUnique({
        where: {
          operationId_approvedAttempt: {
            operationId: initial.id,
            approvedAttempt: initial.attemptCount + 1,
          },
        },
      });
      if (initial.attemptCount > 0 && !review)
        throw new OperationIntegrityError(
          'Interrupted schema work requires explicit evidence review',
        );
      if (initial.attemptCount === 0) await block();
      this.tenants.pauseAdministrativeReads(target.databaseName);
      paused = true;
      await this.drain(target.databaseName);
      await verifyPinnedSources('tenant', manifest.migrations);
      await this.physical.withRolloutTarget(initial, async (deploy) => {
        const observed = await this.inspect(initial, target, manifest);
        if (
          (!observed.markerValid ||
            (observed.installedTarget &&
              target.sourceVersion !== manifest.version)) &&
          !review
        )
          throw new OperationIntegrityError(
            'Unexpected installed/marker state requires review',
          );
        if (
          review &&
          (observed.evidence.manifestDigest !== review.observedDigest ||
            observed.evidence.schemaEvidenceDigest !==
              review.schemaEvidenceDigest)
        )
          throw new OperationIntegrityError('Reviewed installation changed');
        await heartbeat.run(async (current) => ({
          lease: await service.reconcileLease(current, async (operation) => {
            const gym = await this.master.gym.findUniqueOrThrow({
              where: { id: initial.gymId! },
            });
            const blocked = Boolean(
              (operation.completedSteps as CompletedSteps)
                .SCHEMA_ADMISSION_BLOCKED,
            );
            if (
              gym.databaseName !== target.databaseName ||
              gym.version !== target.expectedGymVersion + (blocked ? 1 : 0) ||
              gym.expectedTenantOperationId !==
                (blocked ? initial.id : target.sourceOperationId)
            )
              throw new OperationIntegrityError('Schema registry changed');
          }),
          value: undefined,
        }));
        let current = await this.master.operation.findUniqueOrThrow({
          where: { id: initial.id },
        });
        if (
          !(current.completedSteps as CompletedSteps).SCHEMA_ADMISSION_BLOCKED
        )
          await block();
        this.tenants.pauseAdministrativeReads(target.databaseName);
        paused = true;
        await this.drain(target.databaseName);
        await this.fault?.('AFTER_SCHEMA_BLOCK', initial.id);
        await heartbeat.run(async (current) => ({
          lease: await service.heartbeat(current),
          value: undefined,
        }));
        await this.tenants.withMaintenanceDatabase(
          target.databaseName,
          (tenant) =>
            tenant.schemaState.upsert({
              where: { id: 'current' },
              create: {
                id: 'current',
                state: 'APPLYING',
                lastOperationId: initial.id,
              },
              update: {
                state: 'APPLYING',
                lastOperationId: initial.id,
                version: { increment: 1 },
              },
            }),
        );
        if (!observed.installedTarget) await deploy(manifest);
        await this.fault?.('AFTER_SCHEMA_APPLY', initial.id);
        const evidence = await this.tenants.withMaintenanceDatabase(
          target.databaseName,
          (tenant) =>
            new TenantSchemaVerifier(tenant).verifyAndAttest(
              { masterGymId: initial.gymId!, operationId: initial.id },
              manifest,
            ),
        );
        await this.fault?.('AFTER_SCHEMA_ATTESTATION', initial.id);
        current = await this.master.operation.findUniqueOrThrow({
          where: { id: initial.id },
        });
        if (!(current.completedSteps as CompletedSteps).SCHEMA_APPLIED)
          await checkpoint('SCHEMA_APPLIED', {
            appliedTenantTemplateVersion: evidence.templateVersion,
            appliedTenantManifestDigest: evidence.manifestDigest,
          });
        if (!(current.completedSteps as CompletedSteps).SCHEMA_BOUND)
          await checkpoint('SCHEMA_BOUND', { gymId: initial.gymId! });
        await this.fault?.('AFTER_SCHEMA_BOUND', initial.id);
        await this.drain(target.databaseName);
        await checkpoint(
          'SCHEMA_COMPLETE',
          { gymId: initial.gymId! },
          async (tx) => {
            await this.actor(initial.actorIdentityId, tx);
            const changed = await tx.gym.updateMany({
              where: {
                id: initial.gymId!,
                version: target.expectedGymVersion + 1,
                expectedTenantOperationId: initial.id,
                databaseName: target.databaseName,
              },
              data: { version: { increment: 1 } },
            });
            if (changed.count !== 1)
              throw new OperationConflictError('Schema registry changed');
            await appendMasterVersionAudit(tx, {
              actorIdentityId: initial.actorIdentityId,
              gymId: initial.gymId,
              eventCode: 'TENANT_SCHEMA_ROLLED_FORWARD',
              resourceType: 'GYM',
              resourceId: initial.gymId!,
              committedVersion: target.expectedGymVersion + 2,
              transition: {
                to: 'VERIFIED',
                version: target.expectedGymVersion + 2,
              },
            });
          },
          true,
        );
        if (
          (
            await this.master.gym.findUniqueOrThrow({
              where: { id: initial.gymId! },
            })
          ).status === 'ACTIVE'
        )
          this.tenants.resumeDatabase(target.databaseName);
      });
      await heartbeat.stop();
    } catch (error) {
      const current = await heartbeat.stop().catch(() => null);
      if (
        (
          await this.master.operation.findUniqueOrThrow({
            where: { id: initial.id },
          })
        ).state === 'COMPLETE'
      )
        return;
      if (current)
        await service
          .fail(current, 'REPAIR_REQUIRED', 'SCHEMA_EVIDENCE_REVIEW_REQUIRED')
          .catch(() => undefined);
      // A missing/failed marker is a gate, never permission to adopt/drop/reset.
      if (error instanceof OperationConflictError) throw error;
    } finally {
      if (paused) this.tenants.resumeAdministrativeReads(target.databaseName);
    }
  }
  private async drain(name: string) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.tenants.suspendAndDrain(name),
        new Promise<never>((_yes, no) => {
          timer = setTimeout(
            () => no(new OperationIntegrityError('Drain needs review')),
            10_000,
          );
          timer.unref();
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
