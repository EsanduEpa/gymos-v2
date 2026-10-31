import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { OperationIntegrityError } from '../operations/primitives.js';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const require = createRequire(import.meta.url);
const execute = promisify(execFile);
export type PinnedMigration = {
  readonly name: string;
  readonly checksum: string;
};
export async function verifyPinnedSources(
  kind: 'master' | 'tenant',
  migrations: readonly PinnedMigration[],
) {
  const sources: Array<{ name: string; sql: Buffer }> = [];
  for (const entry of migrations) {
    if (
      !/^\d{14}_[a-z0-9_]+$/.test(entry.name) ||
      !/^[a-f0-9]{64}$/.test(entry.checksum)
    )
      throw new OperationIntegrityError('Invalid pinned migration reference');
    const sql = await readFile(
      join(
        root,
        `packages/database-${kind}/prisma/migrations`,
        entry.name,
        'migration.sql',
      ),
    );
    if (createHash('sha256').update(sql).digest('hex') !== entry.checksum)
      throw new OperationIntegrityError('Pinned migration checksum mismatch');
    sources.push({ name: entry.name, sql });
  }
  return sources;
}
// One explicitly invoked migrator process (separately counted from API pools).
// Secrets exist only in its inherited environment, never argv/config/log output.
export async function deployPinnedArtifact(
  kind: 'master' | 'tenant',
  migrations: readonly PinnedMigration[],
  targetUrl: string,
) {
  const sources = await verifyPinnedSources(kind, migrations);
  const directory = await mkdtemp(join(tmpdir(), 'gymos-pinned-'));
  await chmod(directory, 0o700);
  try {
    const migrationDirectory = join(directory, 'migrations');
    await mkdir(migrationDirectory);
    await writeFile(
      join(migrationDirectory, 'migration_lock.toml'),
      'provider = "postgresql"\n',
    );
    for (const entry of sources) {
      await mkdir(join(migrationDirectory, entry.name));
      await writeFile(
        join(migrationDirectory, entry.name, 'migration.sql'),
        entry.sql,
      );
    }
    await writeFile(
      join(directory, 'schema.prisma'),
      'datasource db {\n provider = "postgresql"\n}\n',
    );
    const config = join(directory, 'prisma.config.mjs');
    await writeFile(
      config,
      `import {defineConfig} from ${JSON.stringify(require.resolve('prisma/config'))};\nexport default defineConfig({schema:${JSON.stringify(join(directory, 'schema.prisma'))},migrations:{path:${JSON.stringify(migrationDirectory)}},datasource:{url:process.env.GYMOS_CONTROLLED_DATABASE_URL}});\n`,
    );
    try {
      await execute(
        process.execPath,
        [
          join(root, 'node_modules/prisma/build/index.js'),
          'migrate',
          'deploy',
          '--config',
          config,
        ],
        {
          cwd: directory,
          env: {
            ...process.env,
            DOTENV_CONFIG_PATH: '/dev/null',
            GYMOS_CONTROLLED_DATABASE_URL: targetUrl,
          },
          timeout: 120_000,
          maxBuffer: 1024 * 1024,
        },
      );
    } catch {
      throw new OperationIntegrityError(
        'Migration needs explicit evidence review',
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
