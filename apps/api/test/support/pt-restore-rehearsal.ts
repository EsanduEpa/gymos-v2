import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/tenant/client.js';
import { verifyInstalledTenant } from '../../src/tenancy/tenant-schema-verifier.js';
import type { createDisposableEnvironment } from './disposable-environment.js';

type Environment = Awaited<ReturnType<typeof createDisposableEnvironment>>;
async function fingerprints(client: pg.Client) {
  const names = (await client.query<{ name: string }>(`SELECT tablename AS name FROM pg_tables WHERE schemaname='public' UNION SELECT viewname AS name FROM pg_views WHERE schemaname='public' ORDER BY name`)).rows;
  const result: Record<string, { count: number; sha256: string }> = {};
  for (const { name } of names) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Unexpected table identifier');
    const [row] = (await client.query<{ count: string; value: string }>(`SELECT count(*)::text AS count,coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text AS value FROM "${name}" t`)).rows;
    result[name] = { count: Number(row!.count), sha256: createHash('sha256').update(row!.value).digest('hex') };
  }
  return result;
}
/** Synthetic owned resources only: never activates the restored database in the registry. */
export async function rehearsePtRestore(run: Environment, source: { name: string; url: string }) {
  await run.verifyOwnership(source.name);
  const directory = await mkdtemp(join(tmpdir(), 'gymos-pt-restore-'));
  const archive = join(directory, 'synthetic.dump');
  const connection = new pg.Client({ connectionString: source.url });
  let restored: PrismaClient | undefined;
  let targetConnection: pg.Client | undefined;
  await connection.connect();
  try {
    await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const before = await fingerprints(connection);
    const snapshot = (await connection.query<{ id: string }>('SELECT pg_export_snapshot() AS id')).rows[0]!.id;
    const dump = await run.pgDump(source.name, snapshot);
    try { await pipeline(dump.readable, createWriteStream(archive, { mode: 0o600 })); await dump.completion; }
    catch (error) { await dump.cancel(); await dump.completion.catch(() => undefined); throw error; }
    await connection.query('COMMIT');
    const target = await run.createOwnedDatabase();
    await run.pgRestore(target.name, archive);
    restored = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.url, max: 1 }) });
    const installed = await verifyInstalledTenant(restored);
    targetConnection = new pg.Client({ connectionString: target.url }); await targetConnection.connect();
    const after = await fingerprints(targetConnection);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('PT restore reconciliation mismatch');
    if (JSON.stringify(before) !== JSON.stringify(await fingerprints(connection))) throw new Error('Restore rehearsal modified source records');
    return { verifiedTemplate: installed.templateVersion, tablesAndViews: Object.keys(before).length,
      counts: Object.fromEntries(Object.entries(before).map(([name, value]) => [name, value.count])) };
  } finally {
    await connection.query('ROLLBACK').catch(() => undefined);
    await connection.end(); await targetConnection?.end(); await restored?.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}
