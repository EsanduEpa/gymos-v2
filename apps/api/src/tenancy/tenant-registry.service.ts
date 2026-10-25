import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { appendMasterVersionAudit } from '../operations/transaction-audit.js';
import { OperationConflictError, OperationIntegrityError, reference } from '../operations/primitives.js';
import type { InstalledTenantEvidence } from './tenant-schema-verifier.js';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest } from './tenant-template-manifest.js';

@Injectable()
export class TenantRegistryService {
  constructor(private readonly database: DatabaseService) {}

  async observeVerifiedTenant(input: {
    gymId: string;
    operationId: string;
    expectedGymVersion: number;
    actorIdentityId: string;
    evidence: InstalledTenantEvidence;
  }): Promise<number> {
    const gymId = reference(input.gymId);
    const operationId = reference(input.operationId);
    const actorIdentityId = reference(input.actorIdentityId);
    if (!Number.isSafeInteger(input.expectedGymVersion) || input.expectedGymVersion < 0) throw new TypeError('Invalid Gym version');
    const digest = tenantManifestDigest();
    if (input.evidence.templateVersion !== TENANT_TEMPLATE_MANIFEST.version
      || input.evidence.manifestDigest !== digest) throw new OperationIntegrityError('Tenant evidence does not match reviewed manifest');
    return this.database.master.$transaction(async (tx) => {
      const [gym, operation] = await Promise.all([
        tx.gym.findUnique({ where: { id: gymId } }),
        tx.operation.findUnique({ where: { id: operationId } }),
      ]);
      if (!gym || !operation || operation.gymId !== gym.id
        || operation.databaseName !== gym.databaseName
        || operation.actorIdentityId !== actorIdentityId
        || operation.intendedTenantTemplateVersion !== TENANT_TEMPLATE_MANIFEST.version
        || operation.intendedTenantManifestDigest !== digest
        || operation.appliedTenantTemplateVersion !== TENANT_TEMPLATE_MANIFEST.version
        || operation.appliedTenantManifestDigest !== digest
        || !operation.tenantSchemaVerifiedAt) {
        throw new OperationIntegrityError('Master operation does not own verified tenant evidence');
      }
      const nextVersion = input.expectedGymVersion + 1;
      const changed = await tx.gym.updateMany({
        where: { id: gymId, version: input.expectedGymVersion },
        data: {
          expectedTenantSchemaVersion: TENANT_TEMPLATE_MANIFEST.version,
          expectedTenantManifestDigest: digest,
          expectedTenantOperationId: operationId,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new OperationConflictError('Gym registry version changed');
      await appendMasterVersionAudit(tx, {
        actorIdentityId,
        gymId,
        eventCode: 'TENANT_SCHEMA_OBSERVED',
        resourceType: 'GYM',
        resourceId: gymId,
        committedVersion: nextVersion,
        transition: { version: nextVersion },
      });
      return nextVersion;
    });
  }
}
