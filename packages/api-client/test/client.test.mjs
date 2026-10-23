import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { legacyCreatedMemberSchema, legacyMembersSchema } from '@gymos/contracts/legacy';
import { ApiClientError, createApiClient } from '../dist/index.js';

const member = { id: 'member-1', fullName: 'Synthetic Member', email: null, status: 'ACTIVE' };
const base = 'http://127.0.0.1:3001';
function json(value, status = 200) { return new Response(JSON.stringify(value), { status }); }

test('calls existing path without a new prefix and validates unwrapped legacy response', async () => {
  let seen;
  const client = createApiClient(base, async (url, init) => { seen = { url, init }; return json([member]); });
  assert.deepEqual(await client.request('/gyms/test-a/members?page=2', {
    response: legacyMembersSchema, accessToken: 'fixture-only-token',
  }), [member]);
  assert.equal(seen.url, `${base}/gyms/test-a/members?page=2`);
  assert.equal(seen.init.headers.get('authorization'), 'Bearer fixture-only-token');
  assert.equal(seen.init.cache, 'no-store');
  assert.equal(seen.init.redirect, 'manual');
});
test('POST forwards one idempotency key and returns a validated created member', async () => {
  let count = 0;
  const result = { ...member, createdAt: '2026-10-23T00:00:00Z' };
  const client = createApiClient(base, async (_url, init) => {
    count++;
    assert.equal(init.headers.get('idempotency-key'), 'intent-0123456789/~');
    assert.deepEqual(JSON.parse(init.body), { fullName: member.fullName });
    return json(result, 201);
  });
  assert.deepEqual(await client.request('/gyms/test-a/members', {
    method: 'POST', body: { fullName: member.fullName }, response: legacyCreatedMemberSchema,
    idempotencyKey: 'intent-0123456789/~',
  }), result);
  assert.equal(count, 1);
});
test('forbids external, protocol-relative, control-character and backslash paths before fetching', async () => {
  let count = 0;
  const client = createApiClient(base, async () => { count++; return json({}); });
  for (const path of ['https://example.test/steal', '//example.test/steal', '/\\example.test', '/path\nvalue', '/path#fragment']) {
    await assert.rejects(client.request(path, { response: z.strictObject({}) }), TypeError);
  }
  assert.equal(count, 0);
  for (const origin of ['file:///tmp/data', 'https://user:pass@example.test', 'https://example.test/prefix', 'https://example.test/?token=private']) {
    assert.throws(() => createApiClient(origin), TypeError);
  }
});
test('invalid idempotency keys and GET bodies never send a request', async () => {
  let count = 0;
  const client = createApiClient(base, async () => { count++; return json({}); });
  await assert.rejects(client.request('/resource', { response: z.strictObject({}), body: {} }), TypeError);
  await assert.rejects(client.request('/resource', { method: 'POST', response: z.strictObject({}), idempotencyKey: 'bad\nkey' }), TypeError);
  assert.equal(count, 0);
});
test('read network error is retryable but performs no automatic retry', async () => {
  let count = 0;
  const client = createApiClient(base, async () => { count++; throw new Error('private transport details'); });
  await assert.rejects(client.request('/resource', { response: z.strictObject({}) }), (error) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.kind, 'network'); assert.equal(error.retryable, true);
    assert.doesNotMatch(String(error), /private/); return true;
  });
  assert.equal(count, 1);
});
test('lost mutation response is unknown outcome, nonretryable and contains no token or payload', async () => {
  let count = 0;
  const client = createApiClient(base, async () => { count++; throw new Error('fixture-only-token private'); });
  await assert.rejects(client.request('/resource', {
    method: 'POST', response: z.strictObject({}), accessToken: 'fixture-only-token', body: { secret: 'private' },
  }), (error) => {
    assert.equal(error.kind, 'unknown-outcome'); assert.equal(error.retryable, false);
    assert.doesNotMatch(JSON.stringify(error), /fixture-only-token|private/); return true;
  });
  assert.equal(count, 1);
});
test('validated conflict preserves safe operation reference without retry', async () => {
  const failure = { ok: false, code: 'CONFLICT', message: 'State changed', requestId: 'r-1', retryable: false, operationId: 'op-1' };
  const client = createApiClient(base, async () => json(failure, 409));
  await assert.rejects(client.request('/resource', { method: 'POST', response: z.strictObject({}) }), (error) => {
    assert.equal(error.kind, 'http'); assert.equal(error.status, 409);
    assert.equal(error.failure.operationId, 'op-1'); assert.equal(error.retryable, false); return true;
  });
});
test('5xx mutation response remains unknown even with a failure envelope', async () => {
  const client = createApiClient(base, async () => json({ ok: false, code: 'UNAVAILABLE', message: 'Unavailable', requestId: 'r-1', retryable: true }, 503));
  await assert.rejects(client.request('/resource', { method: 'POST', response: z.strictObject({}) }), (error) => {
    assert.equal(error.kind, 'unknown-outcome'); assert.equal(error.retryable, false); return true;
  });
});
test('explicit OUTCOME_UNKNOWN cannot become retryable even on409 or reads', async () => {
  for (const method of ['GET', 'POST']) {
    const client = createApiClient(base, async () => json({ ok: false, code: 'OUTCOME_UNKNOWN', message: 'Reconcile', requestId: 'r-1', retryable: true }, 409));
    await assert.rejects(client.request('/resource', { method, response: z.strictObject({}) }), (error) => {
      assert.equal(error.kind, 'unknown-outcome'); assert.equal(error.retryable, false); return true;
    });
  }
});
test('invalid bearer tokens and malformed base URLs have sanitized errors before headers/fetch', async () => {
  let count = 0;
  const client = createApiClient(base, async () => { count++; return json({}); });
  for (const token of ['private-secret\r\nx:1', 'private-secret\n', 'private-secret space', 'é-private-secret', '']) {
    await assert.rejects(client.request('/resource', { response: z.strictObject({}), accessToken: token }), (error) => {
      assert.doesNotMatch(String(error), /private-secret/); return true;
    });
  }
  assert.equal(count, 0);
  assert.throws(() => createApiClient('http://private-secret@@@'), (error) => !String(error).includes('private-secret'));
});
test('malformed or secret-bearing success is rejected without retaining raw response', async () => {
  const client = createApiClient(base, async () => json([{ ...member, passwordHash: 'private-hash' }]));
  await assert.rejects(client.request('/gyms/test-a/members', { response: legacyMembersSchema }), (error) => {
    assert.equal(error.kind, 'contract'); assert.doesNotMatch(JSON.stringify(error), /private-hash/); return true;
  });
});
test('HTML, redirect and untrusted legacy errors are never parsed as domain success', async () => {
  for (const response of [new Response('<html>private</html>', { status: 200 }), json({ message: 'private SQL', statusCode: 400 }, 400), json({}, 302)]) {
    const client = createApiClient(base, async () => response);
    await assert.rejects(client.request('/resource', { method: 'POST', response: z.strictObject({}) }), (error) => {
      assert.equal(error.kind, 'unknown-outcome'); assert.doesNotMatch(JSON.stringify(error), /private SQL|<html>/); return true;
    });
  }
});
