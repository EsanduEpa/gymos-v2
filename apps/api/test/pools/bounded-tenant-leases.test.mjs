import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BoundedTenantLeases, AdmissionUnavailable } from '../../src/bounded-tenant-leases.ts';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
class Clock {
  now = 0; id = 0; jobs = new Map();
  setTimer = (fn, delay) => { const id = ++this.id; this.jobs.set(id, { at: this.now + delay, fn }); return id; };
  clearTimer = (id) => { this.jobs.delete(id); };
  async advance(ms) { const end = this.now + ms; while (true) { const next = [...this.jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; this.now = next[1].at; this.jobs.delete(next[0]); next[1].fn(); await flush(); } this.now = end; await flush(); }
}
function setup(options = {}) {
  const clock = new Clock(), created = [], closed = [], timeout = [], closeErrors = [];
  const factory = options.factory ?? ((name) => { created.push(name); return { client: { name }, close: async () => { closed.push(name); } }; });
  const manager = new BoundedTenantLeases(factory, { now: () => clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer, onDrainTimeout: (state) => timeout.push(state), onCloseError: (state) => closeErrors.push(state), ...options });
  return { manager, clock, created, closed, timeout, closeErrors };
}
test('same-key concurrent work reserves one client and distinct active references', async () => {
  const s = setup(), hold = deferred();
  const one = s.manager.withDatabase('gym_a', async (client) => { await hold.promise; return client; });
  const two = s.manager.withDatabase('gym_a', async (client) => { await hold.promise; return client; });
  await flush(); assert.equal(s.created.length, 1); assert.equal(s.manager.snapshot().activeLeases, 2);
  hold.resolve(); assert.equal(await one, await two); assert.equal(s.manager.snapshot().activeLeases, 0); await s.manager.drain(); assert.deepEqual(s.closed, ['gym_a']);
});
test('release waits for callback rejection; original domain error survives', async () => {
  const s = setup(), hold = deferred(), problem = new Error('domain validation');
  const work = s.manager.withDatabase('gym_a', async () => { await hold.promise; throw problem; });
  const check = assert.rejects(work, (error) => error === problem);
  await flush(); assert.equal(s.manager.snapshot().activeLeases, 1); hold.resolve(); await check; assert.equal(s.manager.snapshot().activeLeases, 0); await s.manager.drain();
});
test('ninth busy tenant waits then receives sanitized retryable503 at3s', async () => {
  const s = setup(), hold = deferred();
  const work = Array.from({ length: 8 }, (_, i) => s.manager.withDatabase(`gym_${i}`, () => hold.promise));
  await flush(); const ninth = s.manager.withDatabase('gym_ninth', async () => 9);
  const check = assert.rejects(ninth, (error) => error instanceof AdmissionUnavailable && error.status === 503 && error.retryable && error.reason === 'ADMISSION_TIMEOUT' && !error.message.includes('gym_ninth'));
  assert.equal(s.manager.snapshot().resident, 8); await s.clock.advance(2999); assert.equal(s.manager.snapshot().queued, 1);
  await s.clock.advance(1); await check; assert.equal(s.manager.snapshot().queued, 0); assert.equal(s.created.length, 8);
  hold.resolve(); await Promise.all(work); await s.manager.drain();
});
test('active leases survive60s idle threshold and cannot be evicted', async () => {
  const s = setup(), hold = deferred(); const work = s.manager.withDatabase('gym_a', () => hold.promise); await flush();
  await s.clock.advance(60000); assert.equal(s.closed.length, 0); assert.equal(s.manager.snapshot().activeLeases, 1);
  hold.resolve(); await work; await s.clock.advance(59999); assert.equal(s.closed.length, 0);
  await s.clock.advance(1); assert.deepEqual(s.closed, ['gym_a']); assert.equal(s.manager.snapshot().resident, 0); await s.manager.drain();
});
test('LRU idle victim slot remains resident until actual close resolves', async () => {
  const close = deferred(), created = [], closed = [];
  const s = setup({ maxResident: 2, factory: (name) => { created.push(name); return { client: { name }, close: async () => { closed.push(name); if (name === 'gym_a') await close.promise; } }; } });
  await s.manager.withDatabase('gym_a', async () => 'a'); await s.clock.advance(1); await s.manager.withDatabase('gym_b', async () => 'b');
  const three = s.manager.withDatabase('gym_c', async (client) => client.name); await flush();
  assert.deepEqual(closed, ['gym_a']); assert.equal(s.manager.snapshot().resident, 2); assert.equal(s.manager.snapshot().closing, 1); assert.equal(created.length, 2);
  close.resolve(); assert.equal(await three, 'gym_c'); assert.equal(created.length, 3); assert.equal(s.manager.snapshot().resident, 2); await s.manager.drain();
});
test('acquisition of closing same-key waits for replacement and never uses old pool', async () => {
  const close = deferred(); let count = 0;
  const s = setup({ factory: () => { const id = ++count; return { client: { id }, close: () => id === 1 ? close.promise : Promise.resolve() }; } });
  await s.manager.withDatabase('gym_a', async () => 1); await s.clock.advance(60000);
  const work = s.manager.withDatabase('gym_a', async (client) => client.id); await flush(); assert.equal(count, 1);
  close.resolve(); assert.equal(await work, 2); await s.manager.drain();
});
test('timed-out waiter does not allocate when a slow close later finishes', async () => {
  const close = deferred(); let count = 0;
  const s = setup({ maxResident: 1, factory: () => { count++; return { client: {}, close: () => close.promise }; } });
  await s.manager.withDatabase('gym_a', async () => 1);
  const next = s.manager.withDatabase('gym_b', async () => 2), check = assert.rejects(next, /temporarily unavailable/); await flush();
  await s.clock.advance(3000); await check; close.resolve(); await flush(); assert.equal(count, 1); assert.equal(s.manager.snapshot().resident, 0); await s.manager.drain();
});
test('failed client allocation does not leak resident slot or expose cause', async () => {
  let tries = 0;
  const s = setup({ factory: () => { if (++tries === 1) throw new Error('sensitive internal connection failure'); return { client: {}, close: async () => {} }; } });
  await assert.rejects(s.manager.withDatabase('gym_a', async () => 1), (error) => error.reason === 'CLIENT_ALLOCATION_FAILED' && !error.message.includes('sensitive'));
  assert.equal(s.manager.snapshot().resident, 0); assert.equal(await s.manager.withDatabase('gym_a', async () => 2), 2); await s.manager.drain();
});
test('bounded pending queue rejects overflow instead of allocating overflow tenant', async () => {
  const s = setup({ maxResident: 1, maxQueued: 1 }), hold = deferred();
  const first = s.manager.withDatabase('gym_a', () => hold.promise); await flush();
  const second = s.manager.withDatabase('gym_b', async () => 2); const secondCheck = assert.rejects(second, (error) => error.reason === 'DRAINING');
  await assert.rejects(s.manager.withDatabase('gym_c', async () => 3), (error) => error.reason === 'QUEUE_FULL');
  const drain = s.manager.drain(); hold.resolve(); await first; await secondCheck; await drain; assert.equal(s.created.length, 1);
});
test('shutdown rejects new/queued admission, drains active work, closes exactly once', async () => {
  const s = setup({ maxResident: 1 }), hold = deferred(); const work = s.manager.withDatabase('gym_a', () => hold.promise); await flush();
  const queued = s.manager.withDatabase('gym_b', async () => 1), queuedCheck = assert.rejects(queued, (error) => error.reason === 'DRAINING');
  const drain = s.manager.drain(); assert.equal(drain, s.manager.drain());
  await assert.rejects(s.manager.withDatabase('gym_c', async () => 1), (error) => error.reason === 'DRAINING'); await queuedCheck;
  assert.equal(s.closed.length, 0); hold.resolve(); await work; await drain; assert.deepEqual(s.closed, ['gym_a']); assert.equal(s.clock.jobs.size, 0);
});
test('10s drain budget reports but never disconnects still-active callback', async () => {
  const s = setup(), hold = deferred(); const work = s.manager.withDatabase('gym_a', () => hold.promise); await flush(); const drain = s.manager.drain(); let settled = false; void drain.then(() => { settled = true; });
  await s.clock.advance(10000); assert.equal(s.timeout.length, 1); assert.equal(s.timeout[0].activeLeases, 1); assert.equal(s.closed.length, 0); assert.equal(settled, false);
  hold.resolve(); await work; await drain; assert.deepEqual(s.closed, ['gym_a']); assert.equal(s.manager.snapshot().drainTimedOut, true);
});
test('same lease covers005 verifier then domain call; verifier failure skips domain', async () => {
  const s = setup(), hold = deferred(), clients = [], work = s.manager.withDatabase('gym_a', async (client) => { clients.push(client); await hold.promise; clients.push(client); return 'domain'; });
  await flush(); assert.equal(s.manager.snapshot().activeLeases, 1); await s.clock.advance(60000); assert.equal(s.closed.length, 0); hold.resolve(); assert.equal(await work, 'domain'); assert.equal(clients[0], clients[1]);
  let domainCalls = 0; await assert.rejects(s.manager.withDatabase('gym_a', async () => Promise.reject(new Error('schema gate denied')))); assert.equal(domainCalls, 0); assert.equal(s.manager.snapshot().activeLeases, 0); await s.manager.drain();
});
test('close failure quarantines counted slot instead of making replacement overflow', async () => {
  let calls = 0; const s = setup({ maxResident: 1, factory: () => { calls++; return { client: {}, close: async () => { throw new Error('not printed'); } }; } });
  await s.manager.withDatabase('gym_a', async () => 1); const work = s.manager.withDatabase('gym_b', async () => 2), check = assert.rejects(work, (error) => error.reason === 'ADMISSION_TIMEOUT'); await flush();
  assert.equal(s.closeErrors.length, 1); assert.equal(s.manager.snapshot().closing, 1); await s.clock.advance(3000); await check; assert.equal(calls, 1); assert.equal(s.manager.snapshot().resident, 1);
});
test('invalid identifier fails closed with no resource allocation', async () => { const s = setup(); await assert.rejects(s.manager.withDatabase('../other', async () => 1), (error) => error.reason === 'INVALID_TARGET'); assert.equal(s.created.length, 0); await s.manager.drain(); });
test('per-tenant suspension blocks new leases, drains active work and requires explicit resume', async () => {
  const s = setup(), hold = deferred();
  const active = s.manager.withDatabase('gym_a', async (client) => { await hold.promise; return client.name; });
  await flush();
  const suspension = s.manager.suspendDatabase('gym_a');
  await assert.rejects(s.manager.withDatabase('gym_a', async () => 'unsafe'), (error) => error.reason === 'DRAINING');
  assert.equal(s.manager.snapshot().activeLeases, 1);
  assert.deepEqual(s.closed, []);
  hold.resolve(); assert.equal(await active, 'gym_a'); await suspension;
  assert.deepEqual(s.closed, ['gym_a']); assert.equal(s.manager.snapshot().resident, 0);
  await assert.rejects(s.manager.withDatabase('gym_a', async () => 'still-suspended'), (error) => error.reason === 'DRAINING');
  s.manager.resumeDatabase('gym_a'); assert.equal(await s.manager.withDatabase('gym_a', async (client) => client.name), 'gym_a');
  await s.manager.drain(); assert.deepEqual(s.closed, ['gym_a', 'gym_a']);
});
