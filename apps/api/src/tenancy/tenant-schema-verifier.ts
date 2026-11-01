import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/tenant/client.js';
import { canonicalJson, reference } from '../operations/primitives.js';
import {
  assertRunningApiCompatibility,
  TENANT_TEMPLATE_MANIFEST,
  tenantManifestDigest,
  type TenantTemplateManifest,
} from './tenant-template-manifest.js';

type QueryClient = PrismaClient | Prisma.TransactionClient;
type MigrationRow = {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  started_at: Date;
};

export class TenantSchemaIntegrityError extends Error {
  readonly code = 'TENANT_SCHEMA_INTEGRITY';
  constructor(message = 'Tenant schema verification failed') {
    super(message);
    this.name = 'TenantSchemaIntegrityError';
  }
}

function equal(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'en'));
}

function requireExact(label: string, actual: readonly string[], expected: readonly string[]): void {
  if (!equal(sorted(actual), sorted(expected))) throw new TenantSchemaIntegrityError(`${label} postcondition mismatch: actual=${sorted(actual).join(',')} expected=${sorted(expected).join(',')}`);
}

export type InstalledTenantEvidence = {
  templateVersion: string;
  manifestDigest: string;
  schemaEvidenceDigest: string;
  verifiedMigrations: Array<{ name: string; checksum: string }>;
};

export async function verifyInstalledTenant(
  client: QueryClient,
  manifest: TenantTemplateManifest = TENANT_TEMPLATE_MANIFEST,
): Promise<InstalledTenantEvidence> {
  assertRunningApiCompatibility(manifest);
  const migrationRows = await client.$queryRaw<MigrationRow[]>`
    SELECT migration_name, checksum, finished_at, rolled_back_at, started_at
    FROM "_prisma_migrations"
    ORDER BY started_at, id
  `;
  if (migrationRows.some((row) => row.finished_at === null && row.rolled_back_at === null)) {
    throw new TenantSchemaIntegrityError('Unresolved tenant migration failure');
  }
  const completed = migrationRows.filter((row) => row.finished_at !== null && row.rolled_back_at === null);
  if (completed.length !== manifest.migrations.length) throw new TenantSchemaIntegrityError('Tenant migration history length mismatch');
  for (const [index, expected] of manifest.migrations.entries()) {
    const actual = completed[index];
    if (!actual || actual.migration_name !== expected.name || actual.checksum !== expected.checksum) {
      throw new TenantSchemaIntegrityError('Tenant migration history mismatch');
    }
  }

  const applicationTables = [...manifest.postconditions.tables];
  const tables = await client.$queryRaw<Array<{ name: string }>>`
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
    ORDER BY c.relname
  `;
  const types = await client.$queryRaw<Array<{ name: string }>>`
    SELECT t.typname AS name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname
  `;
  const indexes = await client.$queryRaw<Array<{ name: string }>>`
    SELECT indexname AS name
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ANY(${applicationTables})
    ORDER BY indexname
  `;
  const constraints = await client.$queryRaw<Array<{ name: string }>>`
    SELECT con.conname AS name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public' AND rel.relname = ANY(${applicationTables})
    ORDER BY con.conname
  `;
  const triggers = await client.$queryRaw<Array<{ name: string }>>`
    SELECT trg.tgname AS name
    FROM pg_trigger trg
    JOIN pg_class rel ON rel.oid = trg.tgrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public' AND rel.relname = ANY(${applicationTables})
      AND NOT trg.tgisinternal
    ORDER BY trg.tgname
  `;
  const columns = await client.$queryRaw<Array<{ table_name: string; column_name: string }>>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ANY(${applicationTables})
    ORDER BY table_name, column_name
  `;

  requireExact('Table', tables.map((row) => row.name), manifest.postconditions.tables);
  requireExact('Enum', types.map((row) => row.name), manifest.postconditions.types);
  requireExact('Index', indexes.map((row) => row.name), manifest.postconditions.indexes);
  requireExact('Constraint', constraints.map((row) => row.name), manifest.postconditions.constraints);
  requireExact('Trigger', triggers.map((row) => row.name), manifest.postconditions.triggers);
  for (const [table, expectedColumns] of Object.entries(manifest.postconditions.columns)) {
    requireExact(`${table} column`, columns.filter((row) => row.table_name === table).map((row) => row.column_name), expectedColumns);
  }

  const verifiedMigrations = completed.map((row) => ({ name: row.migration_name, checksum: row.checksum }));
  const postconditionEvidence = {
    tables: sorted(tables.map((row) => row.name)),
    types: sorted(types.map((row) => row.name)),
    indexes: sorted(indexes.map((row) => row.name)),
    constraints: sorted(constraints.map((row) => row.name)),
    triggers: sorted(triggers.map((row) => row.name)),
    columns: Object.fromEntries(Object.keys(manifest.postconditions.columns).sort().map((table) => [
      table,
      sorted(columns.filter((row) => row.table_name === table).map((row) => row.column_name)),
    ])),
  };
  return {
    templateVersion: manifest.version,
    manifestDigest: tenantManifestDigest(manifest),
    schemaEvidenceDigest: createHash('sha256').update(canonicalJson({ verifiedMigrations, postconditionEvidence }), 'utf8').digest('hex'),
    verifiedMigrations,
  };
}

export class TenantSchemaVerifier {
  constructor(private readonly tenant: PrismaClient) {}

  async verifyAndAttest(input: { masterGymId: string; operationId: string }, manifest: TenantTemplateManifest = TENANT_TEMPLATE_MANIFEST): Promise<InstalledTenantEvidence> {
    const masterGymId = reference(input.masterGymId);
    const operationId = reference(input.operationId);
    await this.tenant.schemaState.upsert({
      where: { id: 'current' },
      create: { id: 'current', state: 'APPLYING', lastOperationId: operationId },
      update: { state: 'APPLYING', lastOperationId: operationId, version: { increment: 1 } },
    });
    try {
      return await this.tenant.$transaction(async (tx) => {
        const evidence = await verifyInstalledTenant(tx, manifest);
        const current = await tx.schemaState.findUniqueOrThrow({ where: { id: 'current' } });
        if (current.state !== 'APPLYING' || current.lastOperationId !== operationId) {
          throw new TenantSchemaIntegrityError('Tenant verification ownership changed');
        }
        const configuration = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { masterGymId: true } });
        if (configuration && configuration.masterGymId !== masterGymId) {
          throw new TenantSchemaIntegrityError('Physical tenant binding mismatch');
        }
        if (!configuration) {
          // Keep this initializer compatible with reviewed older tenant schemas
          // whose GymConfiguration table predates fields in the current client.
          await tx.$executeRaw`INSERT INTO "GymConfiguration" ("id", "masterGymId", "updatedAt") VALUES ('current', ${masterGymId}, CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING`;
        }
        const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
        const appliedAt = current.appliedTemplateVersion === evidence.templateVersion
          && current.appliedManifestDigest === evidence.manifestDigest && current.appliedAt
          ? current.appliedAt : now;
        const updated = await tx.schemaState.updateMany({
          where: { id: 'current', state: 'APPLYING', lastOperationId: operationId, version: current.version },
          data: {
            state: 'VERIFIED',
            appliedTemplateVersion: evidence.templateVersion,
            appliedManifestDigest: evidence.manifestDigest,
            schemaEvidenceDigest: evidence.schemaEvidenceDigest,
            verifiedMigrations: evidence.verifiedMigrations as Prisma.InputJsonValue,
            appliedAt,
            verifiedAt: now,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new TenantSchemaIntegrityError('Tenant verification checkpoint changed');
        return evidence;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      await this.tenant.schemaState.updateMany({
        where: { id: 'current', state: 'APPLYING', lastOperationId: operationId },
        data: { state: 'FAILED', version: { increment: 1 } },
      }).catch(() => undefined);
      if (error instanceof TenantSchemaIntegrityError) throw error;
      throw new TenantSchemaIntegrityError();
    }
  }

  async markRepairRequired(operationId: string): Promise<void> {
    const changed = await this.tenant.schemaState.updateMany({
      where: { id: 'current', lastOperationId: reference(operationId) },
      data: { state: 'REPAIR_REQUIRED', version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new TenantSchemaIntegrityError('Tenant recovery ownership mismatch');
  }
}
