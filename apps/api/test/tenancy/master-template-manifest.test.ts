import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MASTER_TEMPLATE_MANIFEST, masterManifestDigest } from '../../src/tenancy/master-template-manifest.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

describe('Master template manifest', () => {
  it('matches every committed Master migration checksum in order and requires application objects', async () => {
    const actual = [];
    for (const migration of MASTER_TEMPLATE_MANIFEST.migrations) {
      const source = await readFile(join(root, 'packages/database-master/prisma/migrations', migration.name, 'migration.sql'));
      actual.push({ name: migration.name, checksum: createHash('sha256').update(source).digest('hex') });
    }
    expect(actual).toEqual(MASTER_TEMPLATE_MANIFEST.migrations);
    expect(MASTER_TEMPLATE_MANIFEST.version).toBe('master-2026-11-06.5');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.tables).toContain('MemberApplication');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.tables).toContain('MemberApplicationNotice');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.tables).toContain('IdentitySession');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.tables).toContain('RecoveryCredential');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.tables).toContain('IdentitySecurityEvent');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.triggers).toContain('MemberApplication_immutable_subject');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.triggers).toContain('IdentitySession_immutable_history');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.triggers).toContain('RecoveryCredential_immutable_history');
    expect(MASTER_TEMPLATE_MANIFEST.postconditions.triggers).toContain('IdentitySecurityEvent_append_only');
    expect(masterManifestDigest()).toMatch(/^[a-f0-9]{64}$/);
  });
});
