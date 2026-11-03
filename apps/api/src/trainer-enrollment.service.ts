import { createHmac, randomBytes } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import argon2 from 'argon2';
import type { Prisma } from './generated/master/client.js';
import { trainerRegistrationInputSchema, trainerRegistrationResultSchema } from '@gymos/contracts';
import { z } from 'zod';
import { DatabaseService } from './database.service.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { CommandReceiptFoundationService } from './operations/receipt.service.js';
import { OperationFoundationService, createLeaseHeartbeat } from './operations/operation.service.js';
import { appendMasterAudit } from './operations/transaction-audit.js';
import { OperationConflictError, OperationIntegrityError, protectedIntentFingerprint, type CompletedSteps } from './operations/primitives.js';
import { CredentialService } from './identity/credential.service.js';
import type { GymRequest } from './gym-access.guard.js';
import { normalizeIdentityEmail } from './identity/email.js';
import { IdentityFoundationService } from './identity/identity.service.js';

type TrainerRegistrationInput = z.infer<typeof trainerRegistrationInputSchema>;
const normalizeSpecialisations = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];

@Injectable()
export class TrainerEnrollmentService {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService,
    private readonly credentials: CredentialService) {}

  private async assertOwner(tx: Prisma.TransactionClient, access: NonNullable<GymRequest['gymAccess']>) {
    const [user, link, gym, clock] = await Promise.all([
      tx.user.findUnique({ where: { id: access.identityId }, select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
      tx.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } }, select: { role: true, linkStatus: true, version: true } }),
      tx.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
      tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
    ]);
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword
      || user.credentialExpiresAt && user.credentialExpiresAt <= clock[0]!.now
      || link?.role !== 'OWNER' || link.linkStatus !== 'ACTIVE' || link.version !== access.accessVersion || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Gym access changed; retry with current access');
    }
  }

  async enroll(access: NonNullable<GymRequest['gymAccess']>, input: TrainerRegistrationInput) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can register trainers');
    const email = normalizeIdentityEmail(input.email);
    const normalized = { ...input, email, specialisations: normalizeSpecialisations(input.specialisations) };
    const fingerprintKey = process.env.JWT_SECRET;
    if (!fingerprintKey || fingerprintKey.length < 32) throw new ServiceUnavailableException('Trainer enrollment is unavailable');
    const protectedFingerprint = protectedIntentFingerprint(JSON.stringify(['trainer-profile-v1', normalized]),
      `trainer-enrollment:${access.gymId}:${access.identityId}:${input.idempotencyKey}`,
      createHmac('sha256', fingerprintKey).update('gymos-trainer-enrollment-intent-v1').digest());
    const service = new OperationFoundationService(this.database.master);
    let claim;
    try {
      claim = await service.claim({ actorIdentityId: access.identityId, kind: 'REGISTER_TRAINER', gymId: access.gymId,
        idempotencyKey: input.idempotencyKey,
        intent: { fullName: input.fullName, email, phone: input.phone, level: input.level,
          yearsExperience: input.yearsExperience, specialisations: normalized.specialisations,
          shiftStart: input.shiftStart, shiftEnd: input.shiftEnd, bio: input.bio },
        protectedFingerprint,
        prepare: async (tx, operation) => {
          await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
          await this.assertOwner(tx, access);
          const existing = await tx.user.findUnique({ where: { email }, select: { id: true, globalRole: true } });
          if (existing) {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`trainer-enrollment:${access.gymId}:${existing.id}`}, 0))`;
            const [link, pending] = await Promise.all([
              tx.gymAccess.findUnique({ where: { userId_gymId: { userId: existing.id, gymId: access.gymId } }, select: { role: true } }),
              tx.operation.findFirst({ where: { gymId: access.gymId, subjectIdentityId: existing.id, kind: 'REGISTER_TRAINER',
                state: { in: ['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED', 'FAILED_RETRYABLE'] } }, select: { id: true } }),
            ]);
            if (existing.globalRole !== 'USER') throw new ConflictException('This identity cannot join this gym');
            if (link) throw new ConflictException('This identity already has a role in this gym');
            if (pending) throw new ConflictException('A trainer enrollment for this identity is awaiting consent or recovery');
            await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: existing.id, version: { increment: 1 } } });
            await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
              stepCode: 'CONSENT_REQUIRED', eventCode: 'TRAINER_ENROLLMENT_CONSENT_REQUIRED', resourceType: 'IDENTITY', resourceId: existing.id,
              transition: { to: 'PENDING' } });
            return;
          }
          const user = await tx.user.create({ data: { email, displayName: input.fullName,
            passwordHash: await argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id }) } });
          await tx.gymAccess.create({ data: { userId: user.id, gymId: access.gymId, role: 'TRAINER', actorKind: 'TRAINER',
            linkStatus: 'PENDING', enrollmentOperationId: operation.id } });
          await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: user.id, version: { increment: 1 } } });
          await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
            stepCode: 'MASTER_PREPARED', eventCode: 'TRAINER_ENROLLMENT_PREPARED', resourceType: 'IDENTITY', resourceId: user.id,
            transition: { to: 'PENDING' } });
        },
      });
    } catch (error) {
      if (error instanceof OperationConflictError) throw new ConflictException('Trainer enrollment key conflicts with a previous request');
      throw error;
    }

    const operationId = claim.operation.id;
    let operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
    if (operation.gymId !== access.gymId || operation.actorIdentityId !== access.identityId || !operation.subjectIdentityId) {
      throw new OperationIntegrityError('Trainer enrollment operation binding is incomplete');
    }
    const identityId = operation.subjectIdentityId;
    if (operation.state === 'FAILED_FINAL' || operation.state === 'REPAIR_REQUIRED') {
      throw new ConflictException('Trainer enrollment requires owner recovery before it can continue');
    }
    const link = await this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: identityId, gymId: access.gymId } },
      select: { role: true, linkStatus: true, enrollmentOperationId: true, tenantActorId: true, actorKind: true } });
    if (!link) return trainerRegistrationResultSchema.parse({ operationId, status: 'PENDING', replayed: claim.replayed, consentRequired: true });
    if (link.role !== 'TRAINER' || link.enrollmentOperationId !== operationId || !['PENDING', 'ACTIVE'].includes(link.linkStatus)) {
      throw new ConflictException('Trainer access binding conflicts with this request');
    }
    const proof = await this.database.master.enrollmentProof.findUnique({ where: { identityId_gymId_role_enrollmentOperationId: {
      identityId, gymId: access.gymId, role: 'TRAINER', enrollmentOperationId: operationId,
    } }, select: { consumedAt: true } });
    if (proof && !proof.consumedAt) throw new ServiceUnavailableException('Trainer consent is being recovered');
    const reusedIdentity = Boolean(proof?.consumedAt);
    if (operation.state === 'COMPLETE') {
      if (!operation.tenantActorId) throw new OperationIntegrityError('Completed trainer enrollment has no tenant actor');
      const credential = reusedIdentity ? null : await this.credentials.issueTemporaryCredential({ actorIdentityId: access.identityId, gymId: access.gymId, operationId });
      return trainerRegistrationResultSchema.parse({ operationId, trainerId: operation.tenantActorId, status: 'COMPLETE', replayed: true,
        ...(credential ? { credentialDeliveryVersion: credential.deliveryVersion,
          ...(credential.status === 'ISSUED' ? { temporaryPassword: credential.temporaryPassword,
            credentialExpiresAt: credential.expiresAt.toISOString() } : {}) } : {}),
      });
    }

    let lease = await service.acquireLease(operationId, operation.version);
    const heartbeat = createLeaseHeartbeat(service, lease);
    const checkpoint = (step: 'MASTER_PREPARED' | 'TENANT_REGISTRATION_COMMITTED' | 'MASTER_ACTIVATED', evidence: {
      gymId: string; subjectIdentityId?: string; tenantActorId?: string; tenantCommandReceiptId?: string;
    }, final = false, effects?: (tx: Prisma.TransactionClient) => Promise<void>) => heartbeat.run(async current => {
      const changed = await service.checkpoint(current, { step, evidence,
        ...(final ? { finalResult: { operationId, state: 'COMPLETE' as const, version: 1,
          resourceIds: [evidence.tenantActorId!], publicationState: 'ACTIVE' as const,
          refreshScopes: [`people:trainers:${evidence.tenantActorId}`] } } : {}),
        ...(effects ? { localEffects: tx => effects(tx) } : {}),
      });
      return { lease: changed.lease, value: undefined };
    });
    try {
      await heartbeat.run(async current => ({ lease: await service.reconcileLease(current, async observed => {
        if (observed.gymId !== access.gymId || observed.subjectIdentityId !== identityId) throw new OperationIntegrityError('Trainer recovery binding changed');
        const actor = await this.database.master.user.findUnique({ where: { id: identityId }, select: { id: true } });
        const accessLink = await this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: identityId, gymId: access.gymId } } });
        if (!actor || accessLink?.role !== 'TRAINER' || accessLink.enrollmentOperationId !== operationId) throw new OperationIntegrityError('Prepared trainer access is missing');
        if ((observed.completedSteps as CompletedSteps).TENANT_REGISTRATION_COMMITTED) {
          await this.tenantGate.withVerifiedTenant(access, async tenant => {
            const receipt = await tenant.commandReceipt.findUnique({ where: { sourceMasterOperationId: operationId } });
            if (!receipt || receipt.state !== 'COMMITTED' || receipt.id !== observed.tenantCommandReceiptId
              || receipt.resourceId !== observed.tenantActorId || receipt.resourceType !== 'TRAINER') throw new OperationIntegrityError('Trainer receipt is inconsistent');
          });
        }
      }), value: undefined }));

      operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
      let trainerId: string | undefined = operation.tenantActorId ?? undefined;
      let receiptId = operation.tenantCommandReceiptId;
      if (!(operation.completedSteps as CompletedSteps).MASTER_PREPARED) {
        await checkpoint('MASTER_PREPARED', { gymId: access.gymId, subjectIdentityId: identityId });
        operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
      }
      if (!(operation.completedSteps as CompletedSteps).TENANT_REGISTRATION_COMMITTED) {
        const committed = await this.tenantGate.withVerifiedTenant(access, tenant => new CommandReceiptFoundationService(tenant).execute({
          masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'REGISTER_TRAINER',
          idempotencyKey: operationId, sourceMasterOperationId: operationId, protectedFingerprint,
          normalizedIntent: { fullName: input.fullName, email, phone: input.phone, level: input.level,
            yearsExperience: input.yearsExperience, specialisations: normalized.specialisations,
            shiftStart: input.shiftStart, shiftEnd: input.shiftEnd, bio: input.bio },
        }, async (tx, _receipt) => {
          const trainer = await tx.trainer.create({ data: { fullName: input.fullName, email, phone: input.phone,
            level: input.level, yearsExperience: input.yearsExperience, specialisations: normalized.specialisations,
            shiftStart: input.shiftStart, shiftEnd: input.shiftEnd, bio: input.bio,
            identityId, registrationState: 'COMPLETE', enrollmentOperationId: operationId, status: 'ACTIVE' },
            select: { id: true } });
          return { result: { operationId, resourceIds: [trainer.id], publicationState: 'PENDING', refreshScopes: [`people:trainers:${trainer.id}`] },
            resourceType: 'TRAINER', resourceId: trainer.id,
            audits: [{ actorIdentityId: access.identityId, operationId, stepCode: 'TENANT_REGISTRATION_COMMITTED',
              eventCode: 'TRAINER_REGISTERED', resourceType: 'TRAINER', resourceId: trainer.id, eventOrdinal: 0,
              transition: { to: 'COMPLETE' } }] };
        }));
        trainerId = committed.result.resourceIds?.[0];
        receiptId = committed.receiptId;
        operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
        await checkpoint('TENANT_REGISTRATION_COMMITTED', { gymId: access.gymId, subjectIdentityId: identityId,
          tenantActorId: trainerId, tenantCommandReceiptId: receiptId });
        operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
      }
      trainerId = operation.tenantActorId ?? trainerId;
      if (!trainerId) throw new OperationIntegrityError('Committed trainer actor is missing');
      if (!(operation.completedSteps as CompletedSteps).MASTER_ACTIVATED) {
        await checkpoint('MASTER_ACTIVATED', { gymId: access.gymId, subjectIdentityId: identityId, tenantActorId: trainerId,
          tenantCommandReceiptId: receiptId ?? operation.tenantCommandReceiptId ?? undefined }, true, async tx => {
          const current = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: identityId, gymId: access.gymId } } });
          if (!current || current.role !== 'TRAINER' || current.enrollmentOperationId !== operationId) throw new OperationIntegrityError('Trainer access binding changed');
          if (current.linkStatus === 'PENDING') {
            const updated = await tx.gymAccess.updateMany({ where: { userId: identityId, gymId: access.gymId,
              enrollmentOperationId: operationId, role: 'TRAINER', linkStatus: 'PENDING', version: current.version },
              data: { linkStatus: 'ACTIVE', actorKind: 'TRAINER', tenantActorId: trainerId, version: { increment: 1 } } });
            if (updated.count !== 1) throw new OperationConflictError('Trainer access changed during enrollment');
          } else if (current.linkStatus !== 'ACTIVE' || current.actorKind !== 'TRAINER' || current.tenantActorId !== trainerId) {
            throw new OperationIntegrityError('Trainer access reciprocity is invalid');
          }
          await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId, gymId: access.gymId,
            stepCode: 'MASTER_ACTIVATED', eventCode: 'TRAINER_ACCESS_ACTIVATED', resourceType: 'IDENTITY', resourceId: identityId,
            transition: { from: 'PENDING', to: 'ACTIVE', version: current.version + 1 } });
        });
      }
    } catch (error) {
      try { lease = await heartbeat.stop(); await service.releaseLease(lease); } catch { /* expiry leaves durable reconciliation evidence */ }
      if (error instanceof OperationConflictError) throw new ConflictException('Trainer enrollment is pending recovery; retry with the same request key');
      throw error;
    }
    await heartbeat.stop();
    const complete = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
    if (complete.state !== 'COMPLETE' || !complete.tenantActorId) throw new OperationIntegrityError('Trainer enrollment did not reach its terminal checkpoint');
    const credential = reusedIdentity ? null : await this.credentials.issueTemporaryCredential({ actorIdentityId: access.identityId, gymId: access.gymId, operationId });
    return trainerRegistrationResultSchema.parse({ operationId, trainerId: complete.tenantActorId, status: 'COMPLETE',
      replayed: claim.replayed || credential?.status === 'ALREADY_ISSUED',
      ...(credential ? { credentialDeliveryVersion: credential.deliveryVersion,
        ...(credential.status === 'ISSUED' ? { temporaryPassword: credential.temporaryPassword, credentialExpiresAt: credential.expiresAt.toISOString() } : {}) } : {}),
    });
  }

  async consent(slug: string, operationId: string, input: { identityId: string; authVersion: number; currentPassword: string; decision: 'ACCEPT' | 'DECLINE' }) {
    const gym = await this.database.master.gym.findUnique({ where: { slug }, select: { id: true, status: true } });
    const operation = await this.database.master.operation.findUnique({ where: { id: operationId }, select: { id: true, kind: true, gymId: true, subjectIdentityId: true } });
    if (!gym || gym.status !== 'ACTIVE' || !operation || operation.kind !== 'REGISTER_TRAINER'
      || operation.gymId !== gym.id || operation.subjectIdentityId !== input.identityId) throw new NotFoundException('Trainer consent is unavailable');
    const result = await new IdentityFoundationService(this.database.master).consentEnrollment({ gymId: gym.id,
      role: 'TRAINER', enrollmentOperationId: operation.id, authenticatedIdentityId: input.identityId,
      authenticatedAuthVersion: input.authVersion, currentPassword: input.currentPassword, decision: input.decision });
    return { operationId, ...result };
  }
}
