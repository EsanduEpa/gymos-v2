import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { platformOperationSchema, type ProvisioningInput } from '@gymos/contracts/platform';
import { DatabaseService } from '../database.service.js';
import { Prisma } from '../generated/master/client.js';
import { OperationFoundationService } from '../operations/operation.service.js';
import { OperationConflictError, OperationIntegrityError } from '../operations/primitives.js';
import { appendMasterAudit } from '../operations/transaction-audit.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest } from '../tenancy/tenant-template-manifest.js';

@Injectable()
export class ProvisioningReservationService {
  constructor(private readonly database: DatabaseService) {}
  async reserve(actorIdentityId: string, authVersion: number, key: string, input: ProvisioningInput) {
    try {
      // Replays retain the originally pinned artifact across application upgrades.
      const previous = await this.database.master.operation.findFirst({ where: { actorIdentityId, kind: 'PROVISION_GYM', idempotencyKey: key }, select: { intendedTenantTemplateVersion: true, intendedTenantManifestDigest: true } });
      const claim = await new OperationFoundationService(this.database.master).claim({
        actorIdentityId, kind: 'PROVISION_GYM', idempotencyKey: key, requestedSlug: input.slug,
        intent: { ...input, ownerMode: 'GENERATE_OR_VERIFIED_REUSE' },
        intendedTenantTemplateVersion: previous?.intendedTenantTemplateVersion ?? TENANT_TEMPLATE_MANIFEST.version,
        intendedTenantManifestDigest: previous?.intendedTenantManifestDigest ?? tenantManifestDigest(),
        prepare: async (tx, operation) => {
          const actor = await tx.user.findUnique({ where: { id: actorIdentityId } });
          if (actor?.globalRole !== 'SUPER_ADMIN' || actor.authVersion !== authVersion || actor.mustChangePassword) throw new OperationConflictError('Platform authorization changed');
          const existing = await tx.user.findUnique({ where: { email: input.ownerEmail }, select: { id: true } });
          const gym = await tx.gym.create({ data: { name: input.name, slug: input.slug, databaseName: operation.databaseName!, status: 'PROVISIONING' } });
          await tx.provisioningIntent.create({ data: {
            operationId: operation.id, name: input.name, ownerEmail: input.ownerEmail,
            plannedOwnerIdentityId: existing?.id ?? randomUUID(), reuseIdentity: Boolean(existing),
            actorAuthVersion: authVersion, currency: input.currency, timezone: input.timezone,
          } });
          await tx.operation.update({ where: { id: operation.id }, data: { gymId: gym.id, version: { increment: 1 } } });
          await appendMasterAudit(tx, { actorIdentityId, operationId: operation.id, gymId: gym.id,
            stepCode: 'RESERVATION', eventCode: 'GYM_RESERVED', resourceType: 'GYM', resourceId: gym.id, transition: { to: 'PROVISIONING' } });
        },
      });
      return this.status(actorIdentityId, claim.operation.id);
    } catch (error) {
      if (error instanceof OperationConflictError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw new ConflictException('Provisioning intent or gym slug conflicts');
      if (error instanceof OperationIntegrityError) throw new ServiceUnavailableException('Provisioning requires review');
      throw error;
    }
  }
  async status(actorIdentityId: string, operationId: string) {
    const operation = await this.database.master.operation.findFirst({ where: { id: operationId, actorIdentityId, kind: 'PROVISION_GYM' }, include: { gym: true, provisioningIntent: true } });
    if (!operation?.gym || !operation.provisioningIntent) throw new NotFoundException('Operation unavailable');
    const intent = operation.provisioningIntent;
    const proof = intent.reuseIdentity ? await this.database.master.enrollmentProof.findFirst({ where: { enrollmentOperationId: operation.id, identityId: intent.plannedOwnerIdentityId, gymId: operation.gym.id, role: 'OWNER', consumedAt: { not: null } }, select: { id: true } }) : null;
    return platformOperationSchema.parse({
      operationId: operation.id, state: operation.state, step: operation.step, version: operation.version,
      retryable: operation.state === 'FAILED_RETRYABLE', ownerVerificationRequired: intent.reuseIdentity && !proof,
      gym: { id: operation.gym.id, name: operation.gym.name, slug: operation.gym.slug, status: operation.gym.status },
    });
  }
  async retry(actorIdentityId: string, operationId: string, expectedVersion: number) {
    const current = await this.status(actorIdentityId, operationId);
    if (current.version !== expectedVersion || current.state !== 'FAILED_RETRYABLE') throw new ConflictException('Operation is not retryable at this version');
    await this.database.master.$transaction(async tx => {
      const changed = await tx.operation.updateMany({ where: { id: operationId, actorIdentityId, state: 'FAILED_RETRYABLE', version: expectedVersion, leaseToken: null }, data: { state: 'PENDING', errorCode: null, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Operation changed');
      await appendMasterAudit(tx, { actorIdentityId, operationId, gymId: current.gym.id, stepCode: 'RETRY', eventCode: 'PROVISIONING_RETRY_REQUESTED', resourceType: 'OPERATION', resourceId: operationId, eventOrdinal: expectedVersion, transition: { to: 'PENDING' } });
    });
    return this.status(actorIdentityId, operationId);
  }
}
