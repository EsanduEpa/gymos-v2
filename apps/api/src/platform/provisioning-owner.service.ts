import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import type { Operation, Prisma, ProvisioningIntent } from '../generated/master/client.js';
import { DatabaseService } from '../database.service.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { appendMasterAudit, appendMasterVersionAudit } from '../operations/transaction-audit.js';
import { OperationIntegrityError } from '../operations/primitives.js';

@Injectable()
export class ProvisioningOwnerService {
  constructor(private readonly database: DatabaseService, private readonly tenants: TenantDatabaseService) {}

  // Only the authenticated intended identity can reconfirm its own password.
  // Issuance and consumption are one local transaction; no plaintext proof is retained.
  async consent(identityId: string, authVersion: number, operationId: string, currentPassword: string) {
    return this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Operation" WHERE "id" = ${operationId} FOR UPDATE`;
      const operation = await tx.operation.findUnique({ where: { id: operationId }, include: { provisioningIntent: true } });
      const intent = operation?.provisioningIntent;
      if (!operation?.gymId || operation.kind !== 'PROVISION_GYM' || !intent?.reuseIdentity || intent.plannedOwnerIdentityId !== identityId) throw new NotFoundException('Enrollment unavailable');
      if (['COMPLETE', 'FAILED_FINAL', 'REPAIR_REQUIRED'].includes(operation.state)) throw new ConflictException('Enrollment is not awaiting consent');
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${identityId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: identityId } });
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      if (!user || user.authVersion !== authVersion || user.globalRole !== 'USER' || user.mustChangePassword || (user.credentialExpiresAt && user.credentialExpiresAt <= now) || !(await argon2.verify(user.passwordHash, currentPassword))) throw new UnauthorizedException('Identity verification failed');
      const gym = await tx.gym.findUnique({ where: { id: operation.gymId } });
      if (gym?.status !== 'PROVISIONING') throw new ConflictException('Gym is unavailable for enrollment');
      const access = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: identityId, gymId: gym.id } } });
      const prior = await tx.enrollmentProof.findUnique({ where: { identityId_gymId_role_enrollmentOperationId: { identityId, gymId: gym.id, role: 'OWNER', enrollmentOperationId: operationId } } });
      if (access) {
        if (access.role !== 'OWNER' || access.enrollmentOperationId !== operationId || access.linkStatus !== 'PENDING' || !prior?.consumedAt) throw new ConflictException('Identity already has a role in this gym');
        return { consentRecorded: true };
      }
      if (prior) throw new ConflictException('Enrollment requires explicit recovery');
      await tx.enrollmentProof.create({ data: {
        identityId, gymId: gym.id, role: 'OWNER', enrollmentOperationId: operationId,
        tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'), authVersion,
        issuedAt: now, expiresAt: new Date(now.getTime() + 600_000), consumedAt: now,
      } });
      await tx.gymAccess.create({ data: { userId: identityId, gymId: gym.id, role: 'OWNER', linkStatus: 'PENDING', enrollmentOperationId: operationId } });
      await appendMasterAudit(tx, { actorIdentityId: identityId, operationId, gymId: gym.id,
        stepCode: 'OWNER_CONSENT', eventCode: 'OWNER_CONSENT_RECORDED', resourceType: 'GYM', resourceId: gym.id, transition: { to: 'PENDING' } });
      return { consentRecorded: true };
    });
  }

  async ready(operation: Operation, intent: ProvisioningIntent) {
    if (!intent.reuseIdentity) return true;
    const access = await this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: intent.plannedOwnerIdentityId, gymId: operation.gymId! } } });
    const proof = await this.database.master.enrollmentProof.findUnique({ where: { identityId_gymId_role_enrollmentOperationId: { identityId: intent.plannedOwnerIdentityId, gymId: operation.gymId!, role: 'OWNER', enrollmentOperationId: operation.id } } });
    if (access && (access.role !== 'OWNER' || access.enrollmentOperationId !== operation.id || access.linkStatus !== 'PENDING')) throw new OperationIntegrityError('Owner role conflicts');
    return Boolean(access && proof?.consumedAt);
  }

  async prepareTenant(operation: Operation, intent: ProvisioningIntent) {
    return this.tenants.withDatabase(operation.databaseName!, async tenant => {
      const result = await new CommandReceiptFoundationService(tenant).execute({
        masterGymId: operation.gymId!, actorIdentityId: operation.actorIdentityId,
        commandKind: 'INITIALIZE_GYM_OWNER', idempotencyKey: operation.id,
        sourceMasterOperationId: operation.id,
        normalizedIntent: { ownerIdentityId: intent.plannedOwnerIdentityId, currency: intent.currency, timezone: intent.timezone },
      }, async tx => {
        const configuration = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
        if (configuration?.masterGymId !== operation.gymId || (configuration.currency && configuration.currency !== intent.currency) || (configuration.timezone && configuration.timezone !== intent.timezone)) throw new OperationIntegrityError('Initial configuration conflicts');
        await tx.gymConfiguration.update({ where: { id: 'current', version: configuration.version }, data: { currency: intent.currency, timezone: intent.timezone, version: { increment: 1 } } });
        return { result: { operationId: operation.id, resourceIds: [operation.gymId!, intent.plannedOwnerIdentityId] },
          audits: [{ actorIdentityId: operation.actorIdentityId, eventCode: 'INITIAL_OWNER_BOUND', resourceType: 'GYM', resourceId: operation.gymId!, transition: { to: 'READY' } }] };
      });
      const [configuration, receipt] = await Promise.all([
        tenant.gymConfiguration.findUniqueOrThrow({ where: { id: 'current' } }),
        tenant.commandReceipt.findUniqueOrThrow({ where: { id: result.receiptId } }),
      ]);
      if (configuration.masterGymId !== operation.gymId || configuration.currency !== intent.currency || configuration.timezone !== intent.timezone || receipt.state !== 'COMMITTED' || receipt.sourceMasterOperationId !== operation.id) throw new OperationIntegrityError('Reciprocal owner proof conflicts');
      return result.receiptId;
    });
  }

  async activate(tx: Prisma.TransactionClient, operation: Operation, intent: ProvisioningIntent, themeId: string, initialHash: string, fault?: () => Promise<void>) {
    const gym = await tx.gym.findUniqueOrThrow({ where: { id: operation.gymId! } });
    if (gym.status !== 'PROVISIONING' || gym.expectedTenantOperationId !== operation.id || gym.expectedTenantManifestDigest !== operation.appliedTenantManifestDigest || gym.expectedTenantSchemaVersion !== operation.appliedTenantTemplateVersion) throw new OperationIntegrityError('Activation schema evidence conflicts');
    if (intent.reuseIdentity) {
      const [user, proof, access] = await Promise.all([
        tx.user.findUnique({ where: { id: intent.plannedOwnerIdentityId } }),
        tx.enrollmentProof.findUnique({ where: { identityId_gymId_role_enrollmentOperationId: { identityId: intent.plannedOwnerIdentityId, gymId: gym.id, role: 'OWNER', enrollmentOperationId: operation.id } } }),
        tx.gymAccess.findUnique({ where: { userId_gymId: { userId: intent.plannedOwnerIdentityId, gymId: gym.id } } }),
      ]);
      if (user?.globalRole !== 'USER' || user.email !== intent.ownerEmail || !proof?.consumedAt || access?.role !== 'OWNER' || access.enrollmentOperationId !== operation.id || access.linkStatus !== 'PENDING') throw new OperationIntegrityError('Verified owner consent is missing');
      await tx.gymAccess.update({ where: { userId_gymId: { userId: user.id, gymId: gym.id } }, data: { linkStatus: 'ACTIVE', version: { increment: 1 } } });
    } else {
      if (await tx.user.findUnique({ where: { email: intent.ownerEmail } })) throw new OperationIntegrityError('Owner identity appeared after reservation; verified review required');
      await tx.user.create({ data: { id: intent.plannedOwnerIdentityId, email: intent.ownerEmail, passwordHash: initialHash } });
      await tx.gymAccess.create({ data: { userId: intent.plannedOwnerIdentityId, gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE', enrollmentOperationId: operation.id } });
    }
    await tx.theme.create({ data: { id: themeId, gymId: gym.id } });
    await appendMasterAudit(tx, { actorIdentityId: operation.actorIdentityId, operationId: operation.id, gymId: gym.id,
      stepCode: 'OWNER_ACCESS', eventCode: 'OWNER_ACCESS_ACTIVATED', resourceType: 'IDENTITY', resourceId: intent.plannedOwnerIdentityId, transition: { to: 'ACTIVE' } });
    await fault?.();
    const changed = await tx.gym.updateMany({ where: { id: gym.id, version: gym.version, status: 'PROVISIONING' }, data: { status: 'ACTIVE', version: { increment: 1 } } });
    if (changed.count !== 1) throw new OperationIntegrityError('Gym lifecycle changed');
    await appendMasterVersionAudit(tx, { actorIdentityId: operation.actorIdentityId, gymId: gym.id, eventCode: 'GYM_ACTIVATED', resourceType: 'GYM', resourceId: gym.id, committedVersion: gym.version + 1, transition: { from: 'PROVISIONING', to: 'ACTIVE', version: gym.version + 1 } });
  }
}
