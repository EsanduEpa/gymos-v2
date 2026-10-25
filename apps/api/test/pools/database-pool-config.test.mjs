import { test } from 'vitest';
import assert from 'node:assert/strict';
import pg from 'pg';
import { databasePoolConfig } from '../../src/database-pool-config.ts';
const base = 'postgresql://synthetic:unit-test-only@127.0.0.1:5432/gym_template';
test('final explicit options retain selected database and5s statement withtenantmax2', async () => {
  const config = databasePoolConfig(base, 'tenant', 'gym_chosen');
  const client = new pg.Client(config), pool = new pg.Pool(config);
  assert.equal(client.connectionParameters.database, 'gym_chosen');
  assert.equal(client.connectionParameters.statement_timeout, 5000);
  assert.equal(client.connectionParameters.options, '-c statement_timeout=5000');
  assert.equal(pool.options.max, 2); assert.equal(pool.options.connectionTimeoutMillis, 3000); assert.equal(pool.options.idleTimeoutMillis, 60000);
  await pool.end();
});
test('Master4 and provisioning1 independent pool limits have no hidden default10', async () => {
  for (const [kind, expected] of [['master', 4], ['provisioning', 1]]) {
    const pool = new pg.Pool(databasePoolConfig(base, kind)); assert.equal(pool.options.max, expected); await pool.end();
  }
});
test('URL control/credential/routing/timeout override options rejected without leaks', () => {
  for (const field of ['host','port','user','password','database','options','statement_timeout','connectionTimeoutMillis','max']) {
    assert.throws(() => databasePoolConfig(`${base}?${field}=should-never-appear`, 'tenant', 'gym_chosen'), (error) => error.getStatus() === 503 && !error.message.includes('should-never-appear'));
  }
});
test('supported secureTLS configuration preserved; unreviewed TLS modes fail closed', () => {
  const config = databasePoolConfig(`${base}?sslmode=verify-full&sslnegotiation=direct`, 'tenant', 'gym_chosen'); const client = new pg.Client(config);
  assert.equal(client.connectionParameters.database, 'gym_chosen'); assert.equal(client.connectionParameters.sslnegotiation, 'direct'); assert.equal(typeof client.connectionParameters.ssl, 'object');
  assert.throws(() => databasePoolConfig(`${base}?sslmode=no-verify`, 'tenant', 'gym_chosen'));
});
test('invalid schemes, missingbase, fragment and database names rejected before allocation', () => {
  for (const invalid of [undefined, 'not-a-connection-url', 'http://127.0.0.1/db', `${base}#fragment`]) assert.throws(() => databasePoolConfig(invalid, 'tenant', 'gym_chosen'));
  for (const name of ['../other','Uppercase','gym;DROP DATABASE other','']) assert.throws(() => databasePoolConfig(base, 'tenant', name));
});
