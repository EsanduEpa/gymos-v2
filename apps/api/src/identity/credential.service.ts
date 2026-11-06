import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import type { Prisma, PrismaClient } from '../generated/master/client.js';
import { DatabaseService } from '../database.service.js';
import { appendMasterAudit, appendMasterVersionAudit } from '../operations/transaction-audit.js';
import { requestDigest } from '../operations/primitives.js';
import { revokeSupportForActor } from '../platform/support-session.service.js';
import type { RecoveryVerificationMethod } from '../generated/master/client.js';

const TEMPORARY_CREDENTIAL_MS = 24 * 60 * 60_000;
const STAFF_RECOVERY_MS = 15 * 60_000;
const RECOVERY_MAX_ATTEMPTS = 5;
const secretHash = (value: string) => createHash('sha256').update(value).digest('hex');

type OwnerOperation = {
  actorIdentityId: string;
  operationId: string;
  identityId: string;
  gymId: string;
};

@Injectable()
export class CredentialService {
  constructor(private readonly database: DatabaseService) {}

  private get master(): PrismaClient {
    return this.database.master;
  }

  private async databaseNow(tx: Prisma.TransactionClient): Promise<Date> {
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
    return clock.now;
  }

  private async lockOperation(tx: Prisma.TransactionClient, operationId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Operation" WHERE "id" = ${operationId} FOR UPDATE`;
    const operation = await tx.operation.findUnique({ where: { id: operationId } });
    if (!operation) throw new ForbiddenException('Credential operation unavailable');
    return operation;
  }

  private async authorizeOwner(tx: Prisma.TransactionClient, input: OwnerOperation) {
    const operation = await this.lockOperation(tx, input.operationId);
    if (operation.kind === 'PROVISION_GYM') {
      const [intent, actor, gym] = await Promise.all([
        tx.provisioningIntent.findUnique({ where: { operationId: operation.id } }),
        tx.user.findUnique({ where: { id: input.actorIdentityId } }),
        tx.gym.findUnique({ where: { id: input.gymId }, select: { status: true } }),
      ]);
      const now = await this.databaseNow(tx);
      if (operation.state !== 'COMPLETE' || operation.actorIdentityId !== input.actorIdentityId
        || operation.subjectIdentityId !== input.identityId || operation.gymId !== input.gymId
        || !intent || intent.reuseIdentity || intent.plannedOwnerIdentityId !== input.identityId
        || actor?.globalRole !== 'SUPER_ADMIN' || actor.mustChangePassword
        || (actor.credentialExpiresAt && actor.credentialExpiresAt <= now) || gym?.status !== 'ACTIVE') {
        throw new ForbiddenException('New owner credential operation unavailable');
      }
      return operation;
    }
    if (operation.subjectIdentityId !== input.identityId
      || operation.gymId !== input.gymId
      || operation.state !== 'COMPLETE'
      || !['REGISTER_MEMBER', 'REGISTER_TRAINER'].includes(operation.kind)) {
      throw new ForbiddenException('Credential operation unavailable');
    }

    // Serialize owner revocation against credential issue/reissue/acknowledge.
    // The operation row is already locked by the caller; these shared locks
    // establish the authorization side of that same bounded transaction.
    await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${input.gymId} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.actorIdentityId} FOR SHARE`;
    await tx.$queryRaw`SELECT "userId" FROM "GymAccess" WHERE "userId" = ${input.actorIdentityId} AND "gymId" = ${input.gymId} FOR SHARE`;

    const [gym, access] = await Promise.all([
      tx.gym.findUnique({ where: { id: input.gymId }, select: { status: true } }),
      tx.gymAccess.findUnique({
        where: { userId_gymId: { userId: input.actorIdentityId, gymId: input.gymId } },
        select: { role: true, linkStatus: true },
      }),
    ]);
    if (gym?.status !== 'ACTIVE' || access?.role !== 'OWNER' || access.linkStatus !== 'ACTIVE') {
      throw new ForbiddenException('Owner access required');
    }
    return operation;
  }

  private async lockSubject(tx: Prisma.TransactionClient, identityId: string) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${identityId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: identityId } });
    if (!user) throw new ForbiddenException('Credential identity unavailable');
    return user;
  }

  private async verifyNewIdentity(tx: Prisma.TransactionClient, input: OwnerOperation) {
    const operation = await this.authorizeOwner(tx, input);
    const user = await this.lockSubject(tx, input.identityId);
    const [otherAccesses, proofs] = await Promise.all([
      tx.gymAccess.count({ where: { userId: input.identityId, gymId: { not: input.gymId } } }),
      tx.enrollmentProof.count({ where: { identityId: input.identityId } }),
    ]);
    const delivery = await tx.credentialDelivery.findUnique({ where: { operationId: operation.id } });
    const access = await tx.gymAccess.findUnique({
      where: { userId_gymId: { userId: input.identityId, gymId: input.gymId } },
      select: { role: true, enrollmentOperationId: true, linkStatus: true },
    });
    const requiredRole = operation.kind === 'PROVISION_GYM' ? 'OWNER' : operation.kind === 'REGISTER_MEMBER' ? 'MEMBER' : 'TRAINER';
    const newIdentity = delivery
      ? user.mustChangePassword && user.passwordChangedAt === null
        && user.authVersion === delivery.authVersion && user.credentialExpiresAt !== null
      : user.authVersion === 0 && user.passwordChangedAt === null
        && !user.mustChangePassword && user.credentialExpiresAt === null;
    if (otherAccesses !== 0 || proofs !== 0 || user.globalRole !== 'USER'
      || !newIdentity
      || access?.role !== requiredRole || access.enrollmentOperationId !== operation.id
      || !['PENDING', 'ACTIVE'].includes(access.linkStatus)) {
      throw new ForbiddenException('Credential issue is limited to a new identity for this operation');
    }
    return { operation, user };
  }

  private generateTemporaryCredential(): string {
    return randomBytes(24).toString('base64url');
  }

  async issueTemporaryCredential(input: Omit<OwnerOperation, 'identityId'>) {
    return this.master.$transaction(async (tx) => {
      const operation = await this.lockOperation(tx, input.operationId);
      if (!operation.subjectIdentityId || operation.gymId !== input.gymId) {
        throw new ForbiddenException('Credential operation unavailable');
      }
      const { user } = await this.verifyNewIdentity(tx, { ...input, identityId: operation.subjectIdentityId });
      const existing = await tx.credentialDelivery.findUnique({ where: { operationId: operation.id } });
      if (existing) return { status: 'ALREADY_ISSUED' as const, deliveryVersion: existing.version };

      const now = await this.databaseNow(tx);
      const temporaryPassword = this.generateTemporaryCredential();
      const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
      const nextAuthVersion = user.authVersion + 1;
      const expiresAt = new Date(now.getTime() + TEMPORARY_CREDENTIAL_MS);
      const changed = await tx.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion, passwordChangedAt: null },
        data: {
          passwordHash,
          mustChangePassword: true,
          credentialExpiresAt: expiresAt,
          authVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new ConflictException('Credential identity changed');
      await tx.credentialDelivery.create({ data: {
        operationId: operation.id,
        identityId: user.id,
        issuedByIdentityId: input.actorIdentityId,
        gymId: input.gymId,
        authVersion: nextAuthVersion,
        issuedAt: now,
        expiresAt,
      } });
      await appendMasterAudit(tx, {
        actorIdentityId: input.actorIdentityId,
        operationId: operation.id,
        stepCode: 'CREDENTIAL_HANDOFF',
        eventCode: 'TEMPORARY_CREDENTIAL_ISSUED',
        resourceType: 'IDENTITY',
        resourceId: user.id,
        eventOrdinal: 0,
        gymId: input.gymId,
        transition: { to: 'ISSUED', version: nextAuthVersion },
      });
      return { status: 'ISSUED' as const, temporaryPassword, deliveryVersion: 0, expiresAt };
    });
  }

  async reissueForOperation(input: {
    actorIdentityId: string;
    gymId: string;
    operationId: string;
    expectedVersion: number;
    idempotencyKey: string;
    reason: 'LOST_HANDOFF' | 'EXPIRED_CREDENTIAL';
  }) {
    return this.master.$transaction(async (tx) => {
      const operation = await this.lockOperation(tx, input.operationId);
      if (operation.subjectIdentityId === null || operation.gymId !== input.gymId) {
        throw new ForbiddenException('Credential operation unavailable');
      }
      const ownerInput = {
        actorIdentityId: input.actorIdentityId,
        operationId: input.operationId,
        identityId: operation.subjectIdentityId,
        gymId: input.gymId,
      };
      const { user } = await this.verifyNewIdentity(tx, ownerInput);
      const delivery = await tx.credentialDelivery.findUnique({ where: { operationId: operation.id } });
      if (!delivery || delivery.identityId !== user.id
        || delivery.gymId !== input.gymId || !user.mustChangePassword
        || user.passwordChangedAt !== null || user.authVersion !== delivery.authVersion) {
        throw new ConflictException('Credential cannot be reissued for this identity');
      }

      const digest = requestDigest({ operationId: operation.id, gymId: input.gymId,
        expectedVersion: input.expectedVersion, reason: input.reason });
      if (delivery.lastReissueKey === input.idempotencyKey) {
        if (delivery.lastReissueDigest !== digest) throw new ConflictException('Credential reissue key was reused with different intent');
        return { status: 'ALREADY_ISSUED' as const, deliveryVersion: delivery.version };
      }
      if (delivery.acknowledgedAt !== null) throw new ConflictException('Credential handoff was already acknowledged');
      if (delivery.version !== input.expectedVersion) throw new ConflictException('Credential delivery version changed');

      const now = await this.databaseNow(tx);
      if ((input.reason === 'EXPIRED_CREDENTIAL') !== (delivery.expiresAt <= now)) {
        throw new ConflictException('Credential state does not match the requested reissue reason');
      }
      const temporaryPassword = this.generateTemporaryCredential();
      const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
      const nextAuthVersion = user.authVersion + 1;
      const expiresAt = new Date(now.getTime() + TEMPORARY_CREDENTIAL_MS);
      const changed = await tx.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion, mustChangePassword: true },
        data: { passwordHash, credentialExpiresAt: expiresAt, authVersion: { increment: 1 } },
      });
      if (changed.count !== 1) throw new ConflictException('Credential identity changed');
      const nextDeliveryVersion = delivery.version + 1;
      await tx.credentialDelivery.update({ where: { operationId: operation.id }, data: {
        authVersion: nextAuthVersion,
        version: nextDeliveryVersion,
        lastReissueKey: input.idempotencyKey,
        lastReissueDigest: digest,
        issuedAt: now,
        expiresAt,
        acknowledgedAt: null,
      } });
      await appendMasterAudit(tx, {
        actorIdentityId: input.actorIdentityId,
        operationId: operation.id,
        stepCode: 'CREDENTIAL_HANDOFF',
        eventCode: 'TEMPORARY_CREDENTIAL_REISSUED',
        resourceType: 'IDENTITY',
        resourceId: user.id,
        eventOrdinal: nextDeliveryVersion,
        gymId: input.gymId,
        transition: { from: 'ISSUED', to: 'REISSUED', version: nextAuthVersion },
      });
      return { status: 'ISSUED' as const, temporaryPassword, deliveryVersion: nextDeliveryVersion, expiresAt };
    });
  }

  async acknowledgeTemporaryCredential(input: {
    actorIdentityId: string;
    gymId: string;
    operationId: string;
    deliveryVersion: number;
  }) {
    return this.master.$transaction(async (tx) => {
      const operation = await this.lockOperation(tx, input.operationId);
      if (!operation.subjectIdentityId || operation.gymId !== input.gymId) {
        throw new ForbiddenException('Credential operation unavailable');
      }
      const { user } = await this.verifyNewIdentity(tx, {
        actorIdentityId: input.actorIdentityId,
        gymId: input.gymId,
        operationId: operation.id,
        identityId: operation.subjectIdentityId,
      });
      const delivery = await tx.credentialDelivery.findUnique({ where: { operationId: operation.id } });
      const now = await this.databaseNow(tx);
      if (!delivery || delivery.version !== input.deliveryVersion || delivery.authVersion !== user.authVersion
        || delivery.acknowledgedAt !== null || delivery.expiresAt <= now || !user.mustChangePassword) {
        throw new ConflictException('Credential handoff is no longer current');
      }
      await tx.credentialDelivery.update({ where: { operationId: operation.id }, data: { acknowledgedAt: now } });
      await appendMasterAudit(tx, {
        actorIdentityId: input.actorIdentityId,
        operationId: operation.id,
        stepCode: 'CREDENTIAL_HANDOFF',
        eventCode: 'TEMPORARY_CREDENTIAL_ACKNOWLEDGED',
        resourceType: 'IDENTITY',
        resourceId: user.id,
        eventOrdinal: input.deliveryVersion,
        gymId: input.gymId,
        transition: { from: 'ISSUED', to: 'ACKNOWLEDGED', version: input.deliveryVersion },
      });
      return { status: 'ACKNOWLEDGED' as const, deliveryVersion: delivery.version };
    });
  }

  async changePassword(input: {
    identityId: string;
    authVersion: number;
    currentPassword: string;
    newPassword: string;
  }) {
    await this.master.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.identityId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: input.identityId } });
      const now = await this.databaseNow(tx);
      if (!user || user.authVersion !== input.authVersion) {
        throw new UnauthorizedException('Invalid or revoked token');
      }
      if (user.credentialExpiresAt && user.credentialExpiresAt <= now) {
        throw new UnauthorizedException('Credential expired');
      }
      if (!(await argon2.verify(user.passwordHash, input.currentPassword))) {
        throw new BadRequestException('Current password is incorrect');
      }
      if (user.passwordHash && await argon2.verify(user.passwordHash, input.newPassword)) {
        throw new BadRequestException('Choose a password different from your current one');
      }

      const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
      const nextAuthVersion = user.authVersion + 1;
      const changed = await tx.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion },
        data: {
          passwordHash,
          mustChangePassword: false,
          credentialExpiresAt: null,
          passwordChangedAt: now,
          authVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new ConflictException('Credential identity changed');
      await tx.identitySession.updateMany({ where: { identityId: user.id, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' } });
      await tx.recoveryCredential.updateMany({ where: { identityId: user.id, redeemedAt: null, revokedAt: null }, data: { revokedAt: now } });
      await revokeSupportForActor(tx, user.id, 'CREDENTIAL_REVOKED');
      await tx.identitySecurityEvent.create({ data: { identityId: user.id, event: 'PASSWORD_CHANGED', createdAt: now } });
      await appendMasterVersionAudit(tx, {
        actorIdentityId: user.id,
        eventCode: 'PASSWORD_CHANGED',
        resourceType: 'IDENTITY',
        resourceId: user.id,
        committedVersion: nextAuthVersion,
        transition: { from: String(user.authVersion), to: String(nextAuthVersion), version: nextAuthVersion },
      });
    });
    return { success: true as const };
  }

  async recoveryCandidates(gymId: string) {
    const accessRows = await this.master.gymAccess.findMany({ where: { gymId, role: { in: ['MEMBER', 'TRAINER'] },
      linkStatus: 'ACTIVE', gym: { status: 'ACTIVE' } }, select: { role: true, user: { select: { id: true, email: true,
        displayName: true, globalRole: true, mustChangePassword: true, gymAccesses: { select: { gymId: true } } } } } });
    const candidates = new Map<string, { identityId: string; label: string; email: string; relationship: 'MEMBER' | 'TRAINER' | 'PENDING_APPLICANT' }>();
    for (const row of accessRows) {
      const user = row.user;
      if (user.globalRole !== 'USER' || user.mustChangePassword || user.gymAccesses.length !== 1
        || (row.role !== 'MEMBER' && row.role !== 'TRAINER')) continue;
      candidates.set(user.id, { identityId: user.id, label: user.displayName?.slice(0, 120) || user.email,
        email: user.email, relationship: row.role });
    }
    const applications = await this.master.memberApplication.findMany({ where: { gymId, state: 'PENDING' },
      select: { identityId: true, identity: { select: { id: true, email: true, displayName: true, globalRole: true, mustChangePassword: true,
        gymAccesses: { select: { gymId: true } }, memberApplications: { select: { id: true } } } } } });
    for (const application of applications) {
      const user = application.identity;
      if (user.globalRole !== 'USER' || user.mustChangePassword || user.gymAccesses.length !== 0 || user.memberApplications.length !== 1 || candidates.has(user.id)) continue;
      candidates.set(user.id, { identityId: user.id, label: user.displayName?.slice(0, 120) || user.email,
        email: user.email, relationship: 'PENDING_APPLICANT' });
    }
    return { items: [...candidates.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(0, 200) };
  }

  async issueRecovery(input: { actorIdentityId: string; gymId: string; identityId: string;
    verificationMethod: RecoveryVerificationMethod; reason: string; currentPassword: string }) {
    const secret = randomBytes(32).toString('base64url');
    return this.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${input.gymId} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.actorIdentityId} FOR SHARE`;
      await tx.$queryRaw`SELECT "userId" FROM "GymAccess" WHERE "userId" = ${input.actorIdentityId} AND "gymId" = ${input.gymId} FOR SHARE`;
      const [gym, owner, ownerAccess] = await Promise.all([
        tx.gym.findUnique({ where: { id: input.gymId }, select: { status: true } }),
        tx.user.findUnique({ where: { id: input.actorIdentityId }, select: { globalRole: true, passwordHash: true, authVersion: true } }),
        tx.gymAccess.findUnique({ where: { userId_gymId: { userId: input.actorIdentityId, gymId: input.gymId } }, select: { role: true, linkStatus: true } }),
      ]);
      if (gym?.status !== 'ACTIVE' || owner?.globalRole !== 'USER' || ownerAccess?.role !== 'OWNER' || ownerAccess.linkStatus !== 'ACTIVE'
        || !owner || !(await argon2.verify(owner.passwordHash, input.currentPassword))) {
        throw new ForbiddenException('Owner access required');
      }
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.identityId} FOR UPDATE`;
      const subject = await tx.user.findUnique({ where: { id: input.identityId }, select: { id: true, email: true, displayName: true,
        globalRole: true, authVersion: true, mustChangePassword: true,
        gymAccesses: { select: { gymId: true, role: true, linkStatus: true } },
        memberApplications: { select: { id: true, gymId: true, state: true } } } });
      if (!subject || subject.globalRole !== 'USER' || subject.mustChangePassword) throw new ForbiddenException('Identity is not eligible for this recovery path');
      const eligibleAccess = subject.gymAccesses.length === 1 && subject.gymAccesses[0]?.gymId === input.gymId
        && ['MEMBER', 'TRAINER'].includes(subject.gymAccesses[0].role) && subject.gymAccesses[0].linkStatus === 'ACTIVE';
      const eligibleApplicant = subject.gymAccesses.length === 0 && subject.memberApplications.length === 1
        && subject.memberApplications[0]?.gymId === input.gymId && subject.memberApplications[0]?.state === 'PENDING';
      if (!eligibleAccess && !eligibleApplicant) throw new ForbiddenException('Identity is not eligible for this recovery path');
      const now = await this.databaseNow(tx);
      await tx.recoveryCredential.updateMany({ where: { identityId: subject.id, redeemedAt: null, revokedAt: null }, data: { revokedAt: now } });
      const expiresAt = new Date(now.getTime() + STAFF_RECOVERY_MS);
      const credential = await tx.recoveryCredential.create({ data: { scope: 'GYM', identityId: subject.id, gymId: input.gymId,
        issuedByIdentityId: input.actorIdentityId, secretHash: secretHash(secret), verificationMethod: input.verificationMethod,
        reason: input.reason, authVersion: subject.authVersion, issuerAuthVersion: owner.authVersion, attempts: 0, maxAttempts: RECOVERY_MAX_ATTEMPTS,
        issuedAt: now, expiresAt } });
      await appendMasterVersionAudit(tx, { actorIdentityId: input.actorIdentityId, eventCode: 'STAFF_RECOVERY_CREDENTIAL_ISSUED',
        resourceType: 'RECOVERY_CREDENTIAL', resourceId: credential.id, committedVersion: 1, gymId: input.gymId,
        transition: { to: 'ISSUED', version: 1 } });
      return { credentialId: credential.id, secret, expiresAt: expiresAt.toISOString(),
        subjectLabel: subject.displayName?.slice(0, 120) || subject.email };
    });
  }

  async issueOperatorRecovery(input: { actorIdentityId: string; email: string; currentPassword: string;
    verificationMethod: RecoveryVerificationMethod; reason: string }) {
    const secret = randomBytes(32).toString('base64url');
    return this.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.actorIdentityId} FOR SHARE`;
      const actor = await tx.user.findUnique({ where: { id: input.actorIdentityId }, select: { globalRole: true, authVersion: true, passwordHash: true } });
      if (!actor || actor.globalRole !== 'SUPER_ADMIN' || !(await argon2.verify(actor.passwordHash, input.currentPassword))) {
        throw new ForbiddenException('Independent operator verification required');
      }
      const target = await tx.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, select: {
        id: true, email: true, displayName: true, globalRole: true, authVersion: true, mustChangePassword: true,
      } });
      if (!target || target.id === input.actorIdentityId || target.mustChangePassword) throw new ForbiddenException('Identity is not eligible for operator recovery');
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${target.id} FOR UPDATE`;
      const now = await this.databaseNow(tx);
      await tx.recoveryCredential.updateMany({ where: { identityId: target.id, redeemedAt: null, revokedAt: null }, data: { revokedAt: now } });
      const expiresAt = new Date(now.getTime() + STAFF_RECOVERY_MS);
      const credential = await tx.recoveryCredential.create({ data: { scope: 'OPERATOR', identityId: target.id, gymId: null,
        issuedByIdentityId: input.actorIdentityId, secretHash: secretHash(secret), verificationMethod: input.verificationMethod,
        reason: input.reason, authVersion: target.authVersion, issuerAuthVersion: actor.authVersion, attempts: 0,
        maxAttempts: RECOVERY_MAX_ATTEMPTS, issuedAt: now, expiresAt } });
      await appendMasterVersionAudit(tx, { actorIdentityId: input.actorIdentityId, eventCode: 'OPERATOR_RECOVERY_CREDENTIAL_ISSUED',
        resourceType: 'RECOVERY_CREDENTIAL', resourceId: credential.id, committedVersion: 1,
        transition: { to: 'ISSUED', version: 1 } });
      return { credentialId: credential.id, secret, expiresAt: expiresAt.toISOString(),
        subjectLabel: target.displayName?.slice(0, 120) || target.email };
    });
  }

  async completeRecovery(input: { credentialId: string; secret: string; newPassword: string }) {
    const located = await this.master.recoveryCredential.findUnique({ where: { id: input.credentialId }, select: {
      identityId: true, gymId: true, issuedByIdentityId: true, scope: true,
    } });
    if (!located) throw new UnauthorizedException('Recovery credential is invalid, expired, or already used');
    const result = await this.master.$transaction(async tx => {
      if (located.scope === 'GYM' && located.gymId) await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${located.gymId} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${located.issuedByIdentityId} FOR SHARE`;
      if (located.scope === 'GYM' && located.gymId) await tx.$queryRaw`SELECT "userId" FROM "GymAccess" WHERE "userId" = ${located.issuedByIdentityId} AND "gymId" = ${located.gymId} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${located.identityId} FOR UPDATE`;
      if (located.scope === 'GYM') {
        await tx.$queryRaw`SELECT "userId" FROM "GymAccess" WHERE "userId" = ${located.identityId} FOR SHARE`;
        await tx.$queryRaw`SELECT "id" FROM "MemberApplication" WHERE "identityId" = ${located.identityId} FOR SHARE`;
      }
      await tx.$queryRaw`SELECT "id" FROM "RecoveryCredential" WHERE "id" = ${input.credentialId} FOR UPDATE`;
      const credential = await tx.recoveryCredential.findUnique({ where: { id: input.credentialId } });
      const now = await this.databaseNow(tx);
      if (credential?.identityId === located.identityId && credential.redeemedAt && !credential.revokedAt
        && timingSafeEqual(Buffer.from(credential.secretHash, 'hex'), Buffer.from(secretHash(input.secret), 'hex'))) {
        // A response-lost retry confirms the completed outcome without changing credentials again.
        return { success: true as const };
      }
      if (!credential || credential.identityId !== located.identityId || credential.redeemedAt || credential.revokedAt
        || credential.expiresAt <= now || credential.attempts >= credential.maxAttempts) {
        return { success: false as const };
      }
      const presentedHash = secretHash(input.secret);
      const valid = timingSafeEqual(Buffer.from(credential.secretHash, 'hex'), Buffer.from(presentedHash, 'hex'));
      if (!valid) {
        const attempts = credential.attempts + 1;
        await tx.recoveryCredential.update({ where: { id: credential.id }, data: { attempts,
          ...(attempts >= credential.maxAttempts ? { revokedAt: now } : {}) } });
        return { success: false as const };
      }
      const user = await tx.user.findUnique({ where: { id: credential.identityId } });
      const [gym, issuer, issuerAccess, subject] = await Promise.all([
        credential.gymId ? tx.gym.findUnique({ where: { id: credential.gymId }, select: { status: true } }) : null,
        tx.user.findUnique({ where: { id: credential.issuedByIdentityId }, select: { id: true, globalRole: true, authVersion: true } }),
        credential.gymId ? tx.gymAccess.findUnique({ where: { userId_gymId: { userId: credential.issuedByIdentityId, gymId: credential.gymId } }, select: { role: true, linkStatus: true } }) : null,
        tx.user.findUnique({ where: { id: credential.identityId }, select: { globalRole: true, mustChangePassword: true,
          gymAccesses: { select: { gymId: true, role: true, linkStatus: true } }, memberApplications: { select: { gymId: true, state: true } } } }),
      ]);
      const activeRelationship = subject?.gymAccesses.length === 1 && subject.gymAccesses[0]?.gymId === credential.gymId
        && ['MEMBER', 'TRAINER'].includes(subject.gymAccesses[0].role) && subject.gymAccesses[0].linkStatus === 'ACTIVE';
      const pendingApplicant = subject?.gymAccesses.length === 0 && subject.memberApplications.length === 1
        && subject.memberApplications[0]?.gymId === credential.gymId && subject.memberApplications[0]?.state === 'PENDING';
      const issuerAuthorized = credential.scope === 'GYM'
        ? gym?.status === 'ACTIVE' && issuer?.globalRole === 'USER' && issuer?.authVersion === credential.issuerAuthVersion
          && issuerAccess?.role === 'OWNER' && issuerAccess.linkStatus === 'ACTIVE'
        : issuer?.globalRole === 'SUPER_ADMIN' && issuer.authVersion === credential.issuerAuthVersion && issuer.id !== credential.identityId;
      const subjectAuthorized = credential.scope === 'OPERATOR'
        ? subject?.globalRole !== undefined
        : subject?.globalRole === 'USER' && (activeRelationship || pendingApplicant);
      if (!user || user.authVersion !== credential.authVersion || user.mustChangePassword || !issuerAuthorized || !subjectAuthorized) {
        await tx.recoveryCredential.update({ where: { id: credential.id }, data: { revokedAt: now } });
        return { success: false as const };
      }
      if (await argon2.verify(user.passwordHash, input.newPassword)) return { success: false as const };
      const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
      const updated = await tx.user.updateMany({ where: { id: user.id, authVersion: user.authVersion }, data: {
        passwordHash, mustChangePassword: false, credentialExpiresAt: null, passwordChangedAt: now, authVersion: { increment: 1 },
      } });
      if (updated.count !== 1) throw new ConflictException('Credential identity changed');
      await tx.recoveryCredential.update({ where: { id: credential.id }, data: { redeemedAt: now } });
      await tx.recoveryCredential.updateMany({ where: { identityId: user.id, id: { not: credential.id }, redeemedAt: null, revokedAt: null }, data: { revokedAt: now } });
      await tx.identitySession.updateMany({ where: { identityId: user.id, revokedAt: null }, data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' } });
      await revokeSupportForActor(tx, user.id, 'CREDENTIAL_REVOKED');
      await tx.identitySecurityEvent.create({ data: { identityId: user.id, event: 'PASSWORD_RECOVERED', createdAt: now } });
      const nextAuthVersion = user.authVersion + 1;
      await appendMasterVersionAudit(tx, { actorIdentityId: credential.issuedByIdentityId, eventCode: 'STAFF_PASSWORD_RECOVERED',
        resourceType: 'IDENTITY', resourceId: user.id, committedVersion: nextAuthVersion, gymId: credential.gymId,
        transition: { from: String(user.authVersion), to: String(nextAuthVersion), version: nextAuthVersion } });
      return { success: true as const };
    });
    if (!result.success) throw new UnauthorizedException('Recovery credential is invalid, expired, already used, or the password could not be accepted');
    return result;
  }

  async securityEvents(identityId: string) {
    const rows = await this.master.identitySecurityEvent.findMany({ where: { identityId }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { event: true, createdAt: true } });
    return { items: rows.map(row => ({ event: row.event, createdAt: row.createdAt.toISOString() })) };
  }
}
