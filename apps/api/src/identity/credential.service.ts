import { randomBytes } from 'node:crypto';
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

const TEMPORARY_CREDENTIAL_MS = 24 * 60 * 60_000;

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
}
