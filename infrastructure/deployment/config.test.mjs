import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfiguration } from './config.mjs';
const base = { GYMOS_WEB_ORIGIN: 'https://demo.vercel.app', GYMOS_API_URL: 'https://api.onrender.com', JWT_SECRET: 'synthetic-test-secret-with-at-least-32-characters', GYMOS_DEPLOY_DATABASE_HOST: 'db.projectref.supabase.co',
 MASTER_DATABASE_URL: 'postgresql://postgres:synthetic@db.projectref.supabase.co:5432/gymos_master?sslmode=verify-full',
 TENANT_DATABASE_URL: 'postgresql://postgres:synthetic@db.projectref.supabase.co:5432/postgres?sslmode=verify-full',
 PROVISION_DATABASE_URL: 'postgresql://postgres:synthetic@db.projectref.supabase.co:5432/postgres?sslmode=verify-full' };
test('accepts explicit direct deployment targets without mutating configuration', () => {
 assert.equal(deploymentConfiguration(base).MASTER_DATABASE_URL.pathname, '/gymos_master');
 assert.doesNotThrow(() => deploymentConfiguration(base, { database: false, web: true }));
});
test('rejects insecure, pooled, mismatched and default-database targets', () => {
 for (const changes of [
  { MASTER_DATABASE_URL: base.MASTER_DATABASE_URL.replace('/gymos_master?', '/postgres?') },
  { MASTER_DATABASE_URL: base.MASTER_DATABASE_URL.replace('verify-full', 'disable') },
  { TENANT_DATABASE_URL: base.TENANT_DATABASE_URL.replace('db.projectref.supabase.co', 'pooler.supabase.com') },
  { PROVISION_DATABASE_URL: base.PROVISION_DATABASE_URL.replace(':5432', ':6543') },
  { JWT_SECRET: 'replace-with-at-least-32-random-characters' },
  { GYMOS_WEB_ORIGIN: 'https://demo.vercel.app/' },
 ]) assert.throws(() => deploymentConfiguration({ ...base, ...changes }));
});
test('accepts approved direct Neon hosts but rejects pooled and foreign targets', () => {
 const old = 'db.projectref.supabase.co';
 const host = 'ep-demo-example-123.us-east-2.aws.neon.tech';
 const env = { ...base, GYMOS_DEPLOY_DATABASE_HOST: host };
 for (const key of ['MASTER_DATABASE_URL','TENANT_DATABASE_URL','PROVISION_DATABASE_URL']) env[key] = base[key].replace(old,host);
 assert.equal(deploymentConfiguration(env).MASTER_DATABASE_URL.hostname,host);
 for (const invalid of [host.replace('.us-east-2','-pooler.us-east-2'),'db.attacker.example']) {
  const bad = { ...env, GYMOS_DEPLOY_DATABASE_HOST: invalid };
  for (const key of ['MASTER_DATABASE_URL','TENANT_DATABASE_URL','PROVISION_DATABASE_URL']) bad[key]=env[key].replace(host,invalid);
  assert.throws(() => deploymentConfiguration(bad));
 }
});
