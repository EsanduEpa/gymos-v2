import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TENANT_TEMPLATE_MANIFEST, tenantManifestDigest } from '../../src/tenancy/tenant-template-manifest.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

describe('tenant template manifest', () => {
  it('matches every committed tenant migration source checksum in order', async () => {
    const actual = [];
    for (const migration of TENANT_TEMPLATE_MANIFEST.migrations) {
      const source = await readFile(join(root, 'packages/database-tenant/prisma/migrations', migration.name, 'migration.sql'));
      actual.push({ name: migration.name, checksum: createHash('sha256').update(source).digest('hex') });
    }
    expect(actual).toEqual(TENANT_TEMPLATE_MANIFEST.migrations);
    expect(tenantManifestDigest()).toMatch(/^[a-f0-9]{64}$/);
  });
});
