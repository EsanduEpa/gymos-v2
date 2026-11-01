import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDisposablePostgresRun } from './disposable-postgres.js';

type Manifest = {
  version: 1;
  runId: string;
  container: {
    id: string;
    name: string;
    imageId: string;
    image: 'postgres:17';
  };
  database: { host: '127.0.0.1'; port: string; names: string[] };
  startedAt: string;
};

export async function createDisposableEnvironment() {
  const run = await createDisposablePostgresRun();
  const directory = await mkdtemp(join(tmpdir(), `gymos-test-${run.runId}-`));
  await chmod(directory, 0o700);
  const manifestPath = join(directory, 'ownership.json');
  const manifest: Manifest = {
    version: 1,
    runId: run.runId,
    container: {
      id: run.containerId,
      name: run.container,
      imageId: run.imageId,
      image: 'postgres:17',
    },
    database: {
      host: '127.0.0.1',
      port: run.port,
      names: run.ownedDatabaseNames(),
    },
    startedAt: new Date().toISOString(),
  };
  const save = async () => {
    manifest.database.names = run.ownedDatabaseNames();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });
  };
  await save();

  return {
    ...run,
    manifestPath,
    ownershipManifest: () => structuredClone(manifest),
    async createOwnedDatabase() {
      const database = await run.createOwnedDatabase();
      await save();
      return database;
    },
    async registerProvisionedDatabase(operation: Parameters<typeof run.registerProvisionedDatabase>[0]) {
      const registered = await run.registerProvisionedDatabase(operation);
      await save();
      return registered;
    },
    async cleanup() {
      const result = await run.cleanup();
      await rm(directory, { recursive: true });
      return { ...result, manifestRemoved: true };
    },
  };
}
