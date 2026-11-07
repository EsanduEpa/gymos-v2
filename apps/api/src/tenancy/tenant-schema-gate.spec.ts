import { expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { TenantSchemaGateService } from './tenant-schema-gate.service.js';
import { TENANT_TEMPLATE_V7, tenantManifestDigest } from './tenant-template-manifest.js';
it('blocks older operational schemas before tenant acquisition while retaining their reviewed rollout history', async () => {
  const acquire = vi.fn(); const work = vi.fn();
  const gate = new TenantSchemaGateService({ withDatabase: acquire } as never);
  await expect(gate.withVerifiedTenant({ gymId: 'gym', databaseName: 'unused-test-target', expectedTenantSchemaVersion: TENANT_TEMPLATE_V7.version,
    expectedTenantManifestDigest: tenantManifestDigest(TENANT_TEMPLATE_V7), expectedTenantOperationId: 'operation', expectedTenantOperationState: 'COMPLETE',
    observedTenantSchemaVersion: TENANT_TEMPLATE_V7.version, observedTenantManifestDigest: tenantManifestDigest(TENANT_TEMPLATE_V7) }, work)).rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(acquire).not.toHaveBeenCalled(); expect(work).not.toHaveBeenCalled();
});
