import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/master/client.js';

const [name, slug] = process.argv.slice(2);

if (!name || name.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '')) {
  console.error('Usage: node provision-gym.mjs "Gym Name" gym-slug');
  process.exit(1);
}

const masterUrl = process.env.MASTER_DATABASE_URL;
const provisionUrl = process.env.PROVISION_DATABASE_URL;

if (!masterUrl || !provisionUrl) {
  console.error('MASTER_DATABASE_URL and PROVISION_DATABASE_URL are required');
  process.exit(1);
}

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const databaseName = `gymos_${randomUUID().replaceAll('-', '')}`;
const tenantUrl = new URL(provisionUrl);
tenantUrl.pathname = `/${databaseName}`;

const master = new PrismaClient({
  adapter: new PrismaPg({ connectionString: masterUrl }),
});

let gym;

try {
  gym = await master.gym.create({
    data: { name, slug, databaseName, status: 'PROVISIONING' },
  });

  const admin = new pg.Client({ connectionString: provisionUrl });
  await admin.connect();

  try {
    // databaseName is generated above, never taken from command-line input.
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await admin.end();
  }

  const migration = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'deploy', '--config', './prisma.tenant.config.ts'],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        TENANT_DATABASE_URL: tenantUrl.toString(),
      },
      stdio: 'inherit',
    },
  );

  if (migration.error) throw migration.error;
  if (migration.status !== 0) throw new Error('Tenant migration failed');

  await master.gym.update({
    where: { id: gym.id },
    data: { status: 'ACTIVE' },
  });

  console.log(`Created ${name}: ${databaseName}`);
} catch (error) {
  if (gym) {
    await master.gym.update({
      where: { id: gym.id },
      data: { status: 'FAILED' },
    });
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await master.$disconnect();
}
