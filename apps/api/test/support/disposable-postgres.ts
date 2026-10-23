import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import pg from 'pg';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const safeError = (value: string) => value.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED_DATABASE_URL]');
export function assertOwnedTarget(urlText: string, runId: string, names: readonly string[], port: string) {
  const url = new URL(urlText);
  if (!/^[a-f0-9]{16}$/.test(runId) || !/^\d+$/.test(port)
    || url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.port !== port
    || url.search || url.hash || !names.includes(url.pathname.slice(1))
    || (!url.pathname.slice(1).startsWith(`gymos_test_${runId}_`)
      && !/^gymos_[a-f0-9]{32}$/.test(url.pathname.slice(1)))) {
    throw new Error('Refusing unowned or nonlocal database target');
  }
}

export async function createDisposablePostgresRun() {
  if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
  if (process.env.DOCKER_HOST && !process.env.DOCKER_HOST.startsWith('unix://')) {
    throw new Error('Remote Docker hosts are prohibited');
  }
  const docker = async (args: string[], env = process.env) =>
    (await execute('docker', args, { env, timeout: 30_000, maxBuffer: 1024 * 1024 })).stdout.trim();
  const contextHost = await docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']);
  if (!contextHost.startsWith('unix://')) throw new Error('A local Unix-socket Docker context is required');
  const runId = randomBytes(8).toString('hex');
  const marker = randomBytes(32).toString('hex');
  const password = randomBytes(32).toString('hex');
  const container = `gymos-mig-test-${runId}`;
  const names = ['master', 'tenant_a', 'tenant_b', 'preflight'].map((suffix) => `gymos_test_${runId}_${suffix}`);
  let port = '';
  const created = new Set<string>();
  const urlFor = (name: string) => `postgresql://postgres:${password}@127.0.0.1:${port}/${name}`;
  const verifyContainer = async () => {
    const actual = await docker(['inspect', '--format', '{{index .Config.Labels "gymos.test.run"}}', container]);
    if (actual !== runId) throw new Error('Refusing cleanup: container ownership mismatch');
  };
  const connect = async (name: string) => {
    assertOwnedTarget(urlFor(name), runId, names, port);
    if (!created.has(name)) throw new Error('Database was not created by this run');
    const client = new pg.Client({ connectionString: urlFor(name), connectionTimeoutMillis: 3000 });
    await client.connect();
    return client;
  };
  const verifyOwnership = async (name: string) => {
    const client = await connect(name);
    try {
      const result = await client.query<{ run_id: string; marker: string }>('SELECT run_id, marker FROM "__gymos_test"."Ownership"');
      if (result.rows.length !== 1 || result.rows[0].run_id !== runId || result.rows[0].marker !== marker) {
        throw new Error('Refusing database mutation: ownership marker mismatch');
      }
    } catch {
      throw new Error('Refusing database mutation: missing or mismatched ownership marker');
    } finally { await client.end(); }
  };
  const removeContainer = async () => {
    await verifyContainer();
    await docker(['rm', '--force', container]);
  };
  try {
    await docker(['run', '--pull=never', '--detach', '--rm', '--name', container,
      '--label', `gymos.test.run=${runId}`, '--publish', '127.0.0.1::5432',
      '--tmpfs', '/var/lib/postgresql/data', '--env', 'POSTGRES_PASSWORD', 'postgres:17'],
    { ...process.env, POSTGRES_PASSWORD: password });
    const published = await docker(['port', container, '5432/tcp']);
    const matched = published.match(/^127\.0\.0\.1:(\d+)$/);
    if (!matched) throw new Error('Disposable port was not bound exclusively to loopback');
    port = matched[1];
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const admin = new pg.Client({ connectionString: urlFor('postgres'), connectionTimeoutMillis: 500 });
      try { await admin.connect(); await admin.query('SELECT 1'); ready = true; break; }
      catch { await new Promise((resolve) => setTimeout(resolve, 150)); }
      finally { await admin.end().catch(() => undefined); }
    }
    if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
    const admin = new pg.Client({ connectionString: urlFor('postgres') });
    await admin.connect();
    try {
      for (const name of names) {
        assertOwnedTarget(urlFor(name), runId, names, port);
        // No IF NOT EXISTS: an existing target is never adopted.
        await admin.query(`CREATE DATABASE "${name}"`);
        created.add(name);
        const client = await connect(name);
        try {
          await client.query('CREATE SCHEMA "__gymos_test"');
          await client.query('CREATE TABLE "__gymos_test"."Ownership" (run_id TEXT NOT NULL, marker TEXT NOT NULL)');
          await client.query('INSERT INTO "__gymos_test"."Ownership" VALUES ($1, $2)', [runId, marker]);
        } finally { await client.end(); }
      }
    } finally { await admin.end(); }
  } catch (error) {
    // This container itself is an independently labelled run-owned boundary;
    // never attempt to delete a database on any external/default connection.
    await removeContainer().catch(() => undefined);
    throw new Error(`Disposable setup failed: ${safeError(error instanceof Error ? error.message : 'unknown failure')}`);
  }
  const dropOwnedDatabase = async (name: string) => {
    await verifyContainer();
    await verifyOwnership(name);
    const admin = new pg.Client({ connectionString: urlFor('postgres') });
    await admin.connect();
    try { await admin.query(`DROP DATABASE "${name}"`); created.delete(name); }
    finally { await admin.end(); }
  };
  const createOwnedDatabase = async () => {
    await verifyContainer();
    let name = '';
    do name = `gymos_${randomBytes(16).toString('hex')}`; while (names.includes(name));
    names.push(name);
    const admin = new pg.Client({ connectionString: urlFor('postgres') });
    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE "${name}"`);
      created.add(name);
      const client = await connect(name);
      try {
        await client.query('CREATE SCHEMA "__gymos_test"');
        await client.query('CREATE TABLE "__gymos_test"."Ownership" (run_id TEXT NOT NULL, marker TEXT NOT NULL)');
        await client.query('INSERT INTO "__gymos_test"."Ownership" VALUES ($1, $2)', [runId, marker]);
      } finally { await client.end(); }
    } finally { await admin.end(); }
    return { name, url: urlFor(name) };
  };
  return {
    runId, container, port,
    masterName: names[0], tenantNames: [names[1], names[2]], preflightName: names[3],
    masterUrl: urlFor(names[0]), tenantUrls: [urlFor(names[1]), urlFor(names[2])],
    connect, verifyOwnership, dropOwnedDatabase, createOwnedDatabase,
    async migrate(name: string, kind: 'master' | 'tenant') {
      await verifyContainer();
      await verifyOwnership(name);
      const key = kind === 'master' ? 'MASTER_DATABASE_URL' : 'TENANT_DATABASE_URL';
      try {
        await execute(process.execPath, [join(root, 'node_modules/prisma/build/index.js'),
          'migrate', 'deploy', '--config', join(root, `prisma.${kind}.config.ts`)], {
          cwd: root, timeout: 60_000,
          env: { ...process.env, DOTENV_CONFIG_PATH: '/dev/null', [key]: urlFor(name) },
          maxBuffer: 1024 * 1024,
        });
      } catch (error) {
        const diagnostic = error as { stdout?: string; stderr?: string };
        throw new Error(`Migration failed in run-owned ${kind} database: ${safeError(`${diagnostic.stdout ?? ''} ${diagnostic.stderr ?? ''}`).slice(-5000)}`);
      }
    },
    async cleanup() {
      const droppedDatabases = created.size;
      for (const name of created) await dropOwnedDatabase(name);
      await removeContainer();
      return { droppedDatabases, containerRemoved: true };
    },
  };
}
