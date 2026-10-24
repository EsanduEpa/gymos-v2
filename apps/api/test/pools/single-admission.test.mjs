import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SingleAdmission } from '../../src/single-admission.ts';
const deferred = () => { let resolve; const promise = new Promise((yes) => { resolve = yes; }); return { promise, resolve }; };
const flush = async () => { for (let n = 0; n < 10; n++) await Promise.resolve(); };
function setup() {
  let now = 0, id = 0, timedOut = 0; const timers = new Map();
  const admission = new SingleAdmission({ admissionMs: 3000, drainMs: 10000, maxQueued: 1, now: () => now, setTimer: (fn, delay) => { const key = ++id; timers.set(key, { at: now + delay, fn }); return key; }, clearTimer: (key) => timers.delete(key), onDrainTimeout: () => { timedOut++; } });
  return { admission, timedOut: () => timedOut, advance: async (ms) => { now += ms; for (const [key, timer] of timers) if (timer.at <= now) { timers.delete(key); timer.fn(); } await flush(); } };
}
test('provisioning workflows execute one at a time and release on failure', async () => {
  const s = setup(), first = deferred(), started = [];
  const one = s.admission.run(async () => { started.push(1); await first.promise; throw new Error('domain'); }); const oneCheck = assert.rejects(one, /domain/);
  const two = s.admission.run(async () => { started.push(2); return 2; }); await flush(); assert.deepEqual(started, [1]); first.resolve(); await oneCheck; assert.equal(await two, 2); assert.deepEqual(started, [1, 2]); await s.admission.drain();
});
test('queue bounds and3s deadline reject before provisioning work starts', async () => {
  const s = setup(), hold = deferred(); const one = s.admission.run(() => hold.promise); await flush(); let calls = 0;
  const two = s.admission.run(async () => { calls++; }); const check = assert.rejects(two, (error) => error.reason === 'ADMISSION_TIMEOUT');
  await assert.rejects(s.admission.run(async () => 3), (error) => error.reason === 'QUEUE_FULL'); await s.advance(3000); await check; assert.equal(calls, 0); hold.resolve(); await one; await s.admission.drain();
});
test('shutdown stops admission and reports10s overshoot without killing active workflow', async () => {
  const s = setup(), hold = deferred(); const one = s.admission.run(() => hold.promise); await flush(); const close = s.admission.drain(); let done = false; void close.then(() => { done = true; });
  await assert.rejects(s.admission.run(async () => 2), (error) => error.reason === 'DRAINING'); await s.advance(10000); assert.equal(s.timedOut(), 1); assert.equal(done, false); assert.equal(close, s.admission.drain()); hold.resolve(); await one; await close; assert.equal(done, true);
});
