import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PrismaClient } from '../generated/tenant/client.js';
import { canonicalJson } from '../operations/primitives.js';
import { TenantDatabaseService } from '../tenant-database.service.js';
import {
  assertRunningApiCompatibility,
  TENANT_TEMPLATE_MANIFEST,
  tenantManifestDigest,
} from './tenant-template-manifest.js';

export type TenantGateContext = {
  gymId: string;
  databaseName: string;
  expectedTenantSchemaVersion: string | null;
  expectedTenantManifestDigest: string | null;
  expectedTenantOperationId: string | null;
  expectedTenantOperationState: string | null;
  observedTenantSchemaVersion: string | null;
  observedTenantManifestDigest: string | null;
};

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('Gym database is temporarily unavailable');
}

@Injectable()
export class TenantSchemaGateService {
  constructor(private readonly tenants: TenantDatabaseService) {}

  async withVerifiedTenant<Result>(
    context: TenantGateContext,
    work: (tenant: PrismaClient) => Promise<Result>,
  ): Promise<Result> {
    let metadataVerified = false;
    try {
      assertRunningApiCompatibility();
      const digest = tenantManifestDigest();
      if (context.expectedTenantSchemaVersion !== TENANT_TEMPLATE_MANIFEST.version
        || context.expectedTenantManifestDigest !== digest
        || !context.expectedTenantOperationId
        || context.expectedTenantOperationState !== 'COMPLETE'
        || context.observedTenantSchemaVersion !== TENANT_TEMPLATE_MANIFEST.version
        || context.observedTenantManifestDigest !== digest) throw unavailable();
      return await this.tenants.withDatabase(context.databaseName, async (tenant) => {
        let configuration;
        let schemaState;
        try {
          [configuration, schemaState] = await Promise.all([
            tenant.gymConfiguration.findUnique({ where: { id: 'current' } }),
            tenant.schemaState.findUnique({ where: { id: 'current' } }),
          ]);
        } catch {
          throw unavailable();
        }
        if (!configuration || configuration.masterGymId !== context.gymId
          || !schemaState || schemaState.state !== 'VERIFIED'
          || schemaState.appliedTemplateVersion !== context.expectedTenantSchemaVersion
          || schemaState.appliedManifestDigest !== context.expectedTenantManifestDigest
          || schemaState.lastOperationId !== context.expectedTenantOperationId
          || canonicalJson(schemaState.verifiedMigrations) !== canonicalJson(TENANT_TEMPLATE_MANIFEST.migrations)) {
          throw unavailable();
        }
        metadataVerified = true;
        return work(tenant);
      });
    } catch (error) {
      if (!metadataVerified) throw unavailable();
      throw error;
    }
  }
}
