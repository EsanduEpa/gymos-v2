import { randomUUID } from 'node:crypto';
import pg from 'pg';
import {
  contentDigest,
  OperationIntegrityError,
} from '../operations/primitives.js';
import {
  MASTER_TEMPLATE_MANIFEST,
  masterManifestDigest,
} from './master-template-manifest.js';
import { deployPinnedArtifact } from './pinned-deploy.js';
export async function verifyInstalledMaster(client: pg.Client) {
  const manifest = MASTER_TEMPLATE_MANIFEST;
  const history = (
    await client.query(
      'SELECT migration_name AS name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at,id',
    )
  ).rows;
  if (
    history.length !== manifest.migrations.length ||
    history.some(
      (row, index) =>
        row.finished_at === null ||
        row.rolled_back_at !== null ||
        row.name !== manifest.migrations[index].name ||
        row.checksum !== manifest.migrations[index].checksum,
    )
  )
    throw new OperationIntegrityError('Master history requires review');
  const tables = (
    await client.query(
      "SELECT tablename AS name FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename",
    )
  ).rows.map((row) => row.name);
  const triggers = (
    await client.query(
      "SELECT t.tgname AS name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY t.tgname",
    )
  ).rows.map((row) => row.name);
  if (
    JSON.stringify(tables) !== JSON.stringify([...manifest.postconditions.tables].sort()) ||
    JSON.stringify(triggers) !==
      JSON.stringify([...manifest.postconditions.triggers].sort())
  )
    throw new OperationIntegrityError(
      'Master catalog postconditions require review',
    );
  const columns = (
    await client.query(
      "SELECT table_name,column_name,data_type,is_nullable,COALESCE(column_default,'') AS column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name",
    )
  ).rows;
  for (const [table, names] of Object.entries(
    manifest.postconditions.requiredColumns,
  ))
    if (
      names.some(
        (name) =>
          !columns.some(
            (row) => row.table_name === table && row.column_name === name,
          ),
      )
    )
      throw new OperationIntegrityError(
        'Master column postconditions require review',
      );
  return {
    templateVersion: manifest.version,
    manifestDigest: masterManifestDigest(),
    schemaEvidenceDigest: contentDigest({
      migrations: manifest.migrations,
      tables,
      triggers,
      columns,
    }),
  };
}
// Caller must prove environment ownership before invoking this privileged tool.
export async function deployMasterSchema(targetUrl: string) {
  const preflight = new pg.Client({
    connectionString: targetUrl,
    connectionTimeoutMillis: 3000,
  });
  await preflight.connect();
  try {
    const present = (
      await preflight.query(
        "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present",
      )
    ).rows[0].present;
    if (present) {
      const rows = (
        await preflight.query(
          'SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at,id',
        )
      ).rows;
      if (
        rows.length > MASTER_TEMPLATE_MANIFEST.migrations.length ||
        rows.some(
          (row, index) =>
            !row.finished_at ||
            row.rolled_back_at ||
            row.migration_name !==
              MASTER_TEMPLATE_MANIFEST.migrations[index].name ||
            row.checksum !==
              MASTER_TEMPLATE_MANIFEST.migrations[index].checksum,
        )
      )
        throw new OperationIntegrityError(
          'Master prefix needs evidence review before deployment',
        );
    } else if (
      (
        await preflight.query(
          "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'",
        )
      ).rows[0].count !== 0
    )
      throw new OperationIntegrityError(
        'Unknown Master schema cannot be adopted',
      );
  } finally {
    await preflight.end();
  }
  await deployPinnedArtifact(
    'master',
    MASTER_TEMPLATE_MANIFEST.migrations,
    targetUrl,
  );
  const client = new pg.Client({
    connectionString: targetUrl,
    connectionTimeoutMillis: 3000,
  });
  await client.connect();
  try {
    const evidence = await verifyInstalledMaster(client);
    await client.query('BEGIN');
    try {
      await client.query(
        'INSERT INTO "MasterSchemaState" ("id","templateVersion","manifestDigest","schemaEvidenceDigest","verifiedAt") VALUES (\'current\',$1,$2,$3,clock_timestamp()) ON CONFLICT ("id") DO UPDATE SET "templateVersion"=EXCLUDED."templateVersion","manifestDigest"=EXCLUDED."manifestDigest","schemaEvidenceDigest"=EXCLUDED."schemaEvidenceDigest","verifiedAt"=EXCLUDED."verifiedAt","version"="MasterSchemaState"."version"+1',
        [
          evidence.templateVersion,
          evidence.manifestDigest,
          evidence.schemaEvidenceDigest,
        ],
      );
      await client.query(
        'INSERT INTO "MasterSchemaDeployment" ("id","manifestDigest","templateVersion","schemaEvidenceDigest") VALUES ($1,$2,$3,$4) ON CONFLICT ("manifestDigest") DO NOTHING',
        [
          randomUUID(),
          evidence.manifestDigest,
          evidence.templateVersion,
          evidence.schemaEvidenceDigest,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    return {
      templateVersion: evidence.templateVersion,
      migrations: MASTER_TEMPLATE_MANIFEST.migrations.length,
      verified: true,
    };
  } finally {
    await client.end();
  }
}
