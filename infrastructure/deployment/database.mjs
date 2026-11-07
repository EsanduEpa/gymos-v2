import { createRequire } from 'node:module';
import { deploymentConfiguration } from './config.mjs';
const require = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const { Client } = require('pg');
const command = process.argv[2];
let client;
try {
  if (!['check', 'migrate-master'].includes(command)) throw Error('Use check or migrate-master');
  const urls = deploymentConfiguration(process.env);
  // A check is read-only. It does not create databases, roles or extensions.
  client = new Client({ connectionString: urls.PROVISION_DATABASE_URL.href, connectionTimeoutMillis: 10000 });
  await client.connect();
  const { rows: [role] } = await client.query(`SELECT rolcreatedb, rolcreaterole, EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = 'neon_superuser' AND pg_has_role(current_user, r.oid, 'MEMBER')) AS neon_admin FROM pg_roles WHERE rolname = current_user`);
  if (!role || ((!role.rolcreatedb || !role.rolcreaterole) && !(urls.PROVISION_DATABASE_URL.hostname.endsWith('.neon.tech') && role.neon_admin))) throw Error('Provisioning role requires CREATEDB and CREATEROLE; this database target cannot provision gyms with its current grants');
  await client.end(); client = undefined;
  client = new Client({ connectionString: urls.MASTER_DATABASE_URL.href, connectionTimeoutMillis: 10000 });
  await client.connect();
  await client.query('SELECT 1');
  await client.end(); client = undefined;
  if (command === 'migrate-master') {
    if (process.env.GYMOS_DEPLOY_MIGRATIONS !== 'approved') throw Error('Explicitly set GYMOS_DEPLOY_MIGRATIONS=approved after reviewing the dedicated target');
    const { deployMasterSchema } = await import('../../apps/api/dist/tenancy/master-schema-deploy.js');
    const result = await deployMasterSchema(urls.MASTER_DATABASE_URL.href);
    console.log(JSON.stringify(result));
  } else console.log('Direct database connectivity and basic provisioning grants passed. Role ownership, CREATE DATABASE and full provisioning still require a synthetic gym rehearsal.');
} catch (error) {
  // Driver errors can contain URLs, passwords and SQL; never print them.
  console.error(error instanceof Error && !('code' in error) && !('severity' in error) && /^(Use |Set |Configure |MASTER_|TENANT_|PROVISION_|Use a |Provisioning role|Explicitly)/.test(error.message)
    ? error.message : 'Deployment database check failed. Verify the direct connection, TLS certificate, network access and dedicated database; inspect private diagnostics.');
  process.exitCode = 1;
} finally { await client?.end().catch(() => undefined); }
