import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
const execute = promisify(execFile);
export async function assertOwnedLocalRun() {
  const runId = process.env.GYMOS_OWNED_RUN_ID;
  if (!/^[a-f0-9]{16}$/.test(runId ?? ''))
    throw new Error('Owned disposable run is required');
  const urls = [
    'MASTER_DATABASE_URL',
    'PROVISION_DATABASE_URL',
    'TENANT_DATABASE_URL',
  ].map((key) => new URL(process.env[key] ?? ''));
  if (
    urls.some(
      (url) =>
        url.protocol !== 'postgresql:' ||
        url.hostname !== '127.0.0.1' ||
        !url.port ||
        url.search ||
        url.hash ||
        url.pathname !== `/gymos_test_${runId}_master` ||
        url.origin !== urls[0].origin,
    )
  )
    throw new Error('Refusing nonlocal or mismatched worker configuration');
  const context = await execute(
    'docker',
    ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
    { timeout: 3000 },
  );
  if (!context.stdout.trim().startsWith('unix://'))
    throw new Error('Local Docker is required');
  const inspected = JSON.parse(
    (
      await execute('docker', ['inspect', `gymos-mig-test-${runId}`], {
        timeout: 3000,
      })
    ).stdout,
  )[0];
  const binding = inspected.NetworkSettings.Ports?.['5432/tcp']?.[0];
  if (
    inspected.Config.Labels?.['gymos.test.run'] !== runId ||
    inspected.Config.Image !== 'postgres:17' ||
    binding?.HostIp !== '127.0.0.1' ||
    binding.HostPort !== urls[0].port
  )
    throw new Error('Disposable container ownership conflicts');
  const client = new pg.Client({
    connectionString: urls[0].toString(),
    connectionTimeoutMillis: 3000,
  });
  await client.connect();
  try {
    const rows = (
      await client.query(
        'SELECT run_id, marker FROM "__gymos_test"."Ownership"',
      )
    ).rows;
    if (
      rows.length !== 1 ||
      rows[0].run_id !== runId ||
      !/^[a-f0-9]{64}$/.test(rows[0].marker)
    )
      throw new Error('Master ownership conflicts');
  } finally {
    await client.end();
  }
}
