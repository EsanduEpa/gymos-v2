import { createHash, randomBytes } from 'node:crypto';
import { appendStep, canonicalJson, idempotencyKey, masterOperationAuditKey, masterVersionAuditKey,
  OperationIntegrityError, protectedIntentFingerprint, requestDigest, safeResult, stateForSteps, tenantAuditKey } from './primitives.js';
import { createLeaseHeartbeat, type Lease, type OperationFoundationService } from './operation.service.js';

afterEach(() => vi.useRealTimers());
it('canonicalizes object order/undefined fields but preserves arrays, null and precise strings', () => {
  expect(canonicalJson({ b: 2, a: { d: undefined, c: '0.10' } })).toBe('{"a":{"c":"0.10"},"b":2}');
  expect(requestDigest({ b: 2, a: 1 })).toBe(requestDigest({ a: 1, b: 2 }));
  expect(requestDigest({ values: [1, 2] })).not.toBe(requestDigest({ values: [2, 1] }));
  expect(requestDigest({ a: null })).not.toBe(requestDigest({}));
});
it('rejects non-JSON values, unsafe integers, accessors, cycles and sparse arrays', () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle;
  const sparse: unknown[] = []; sparse.length = 2;
  for (const value of [NaN, Infinity, 9007199254740992, BigInt(1), new Date(), cycle, [undefined], sparse, { get value() { throw new Error('must not execute'); } }]) {
    expect(() => canonicalJson(value)).toThrow();
  }
});
it('rejects nested credential/private keys without reflecting their contents and fingerprints secrets separately', () => {
  for (const key of ['password', 'access_token', 'credential', 'healthNotes', 'databaseUrl', 'proof']) {
    expect(() => requestDigest({ nested: { [key]: 'fixture-only-sensitive-value' } })).toThrow('Sensitive request fields');
  }
  const key = randomBytes(32);
  const first = protectedIntentFingerprint('fixture-secret-a', 'provision-gym:a', key);
  expect(first).toMatch(/^h1:[a-f0-9]{64}$/);
  expect(requestDigest({ name: 'a' }, first)).not.toBe(requestDigest({ name: 'a' }, protectedIntentFingerprint('fixture-secret-b', 'provision-gym:a', key)));
  expect(() => protectedIntentFingerprint('x', 'scope', randomBytes(16))).toThrow();
});
it('uses exact canonical tuple event keys and rejects ambiguous ordinal input', () => {
  const tuple = ['gym', 'receipt', 'CHANGED', 'MEMBER', 'member', 0];
  expect(tenantAuditKey({ masterGymId: 'gym', receiptId: 'receipt', eventCode: 'CHANGED', resourceType: 'MEMBER', resourceId: 'member' }))
    .toBe(`ta1:${createHash('sha256').update(JSON.stringify(tuple)).digest('hex')}`);
  expect(masterOperationAuditKey({ operationId: 'op', stepCode: 'GYM_RESERVED', eventCode: 'CHANGED', resourceType: 'GYM', resourceId: 'gym' })).toMatch(/^ma1:[a-f0-9]{64}$/);
  expect(masterVersionAuditKey({ resourceType: 'GYM', resourceId: 'gym', committedVersion: 3, eventCode: 'CHANGED' })).toMatch(/^mv1:[a-f0-9]{64}$/);
  expect(() => tenantAuditKey({ masterGymId: 'g', receiptId: 'r', eventCode: 'E', resourceType: 'R', resourceId: 'i', eventOrdinal: -1 })).toThrow();
});
it('validates printable16–128 idempotency keys and safe allowlisted replay results', () => {
  expect(idempotencyKey('repeatable/intent~001')).toBe('repeatable/intent~001');
  for (const key of ['short', 'contains whitespace1', 'a'.repeat(129)]) expect(() => idempotencyKey(key)).toThrow();
  expect(safeResult({ operationId: 'op', resourceIds: ['member-1'], refreshScopes: ['people/member-1'], retryable: false })).toEqual({ operationId: 'op', resourceIds: ['member-1'], refreshScopes: ['people/member-1'], retryable: false });
  for (const value of [{ password: 'private' }, { databaseName: 'private' }, { unexpected: {} }, { version: -1 }, { state: 'RUNNING' }]) expect(() => safeResult(value)).toThrow();
});
it('enforces typed ordered monotonic checkpoints and required member receipt/term evidence', () => {
  const now = new Date('2026-10-24T00:00:00Z');
  const reserved = { gymId: 'gym', databaseName: `gymos_${'a'.repeat(32)}` };
  const first = appendStep('PROVISION_GYM', {}, 'GYM_RESERVED', reserved, now);
  expect(stateForSteps('PROVISION_GYM', first)).toBe('MASTER_PREPARED');
  expect(appendStep('PROVISION_GYM', first, 'GYM_RESERVED', reserved, new Date())).toBe(first);
  expect(() => appendStep('PROVISION_GYM', first, 'GYM_RESERVED', { ...reserved, gymId: 'other' }, now)).toThrow(OperationIntegrityError);
  expect(() => appendStep('PROVISION_GYM', {}, 'DATABASE_CREATED', { databaseName: reserved.databaseName }, now)).toThrow('prerequisite');
  expect(() => appendStep('REGISTER_MEMBER', {}, 'TENANT_REGISTRATION_COMMITTED', { tenantActorId: 'a', tenantCommandReceiptId: 'r' }, now)).toThrow();
});
it('heartbeats every10seconds with serialized lease versions and stops on failure', async () => {
  vi.useFakeTimers();
  const lease: Lease = { operationId: 'op', token: 'lease', version: 1, requiresReconciliation: false };
  const heartbeat = vi.fn(async (current: Lease) => ({ ...current, version: current.version + 1 }));
  const holder = createLeaseHeartbeat({ heartbeat } as unknown as OperationFoundationService, lease);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(heartbeat).toHaveBeenCalledTimes(1);
  expect(await holder.run(async current => ({ lease: { ...current, version: current.version + 1 }, value: current.version }))).toBe(2);
  expect((await holder.stop()).version).toBe(3);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(heartbeat).toHaveBeenCalledTimes(1);
  const failure = new Error('lease lost');
  const failing = createLeaseHeartbeat({ heartbeat: vi.fn(async () => { throw failure; }) } as unknown as OperationFoundationService, lease);
  await vi.advanceTimersByTimeAsync(10_000);
  await expect(failing.run(async current => ({ lease: current, value: true }))).rejects.toBe(failure);
  await expect(failing.stop()).rejects.toBe(failure);
});
