import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { withGymAccessFence } from './gym-access-fence.js';

describe('withGymAccessFence', () => {
  it('locks every role/gym row in stable order and retains the lock through tenant work', async () => {
    const statements: string[] = [];
    const tx = { $queryRaw: vi.fn(async (_strings: TemplateStringsArray, identityId: string, gymId: string) => {
      statements.push(`${gymId}:${identityId}`);
      return [{ userId: identityId, gymId, role: identityId === 'member' ? 'MEMBER' : 'TRAINER', version: 3,
        actorKind: identityId === 'member' ? 'MEMBER' : 'TRAINER', tenantActorId: identityId }];
    }) };
    const master = { $transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) };
    const work = vi.fn(async () => 'tenant-committed');

    await expect(withGymAccessFence(master as never, [
      { identityId: 'trainer', gymId: 'gym-b', role: 'TRAINER', tenantActorId: 'trainer' },
      { identityId: 'member', gymId: 'gym-a', role: 'MEMBER', tenantActorId: 'member' },
      { identityId: 'trainer', gymId: 'gym-b', role: 'TRAINER', tenantActorId: 'trainer' },
    ], work)).resolves.toBe('tenant-committed');

    expect(statements).toEqual(['gym-a:member', 'gym-b:trainer']);
    expect(work).toHaveBeenCalledTimes(1);
    expect(master.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not run tenant work if a requested access link is revoked or missing', async () => {
    const tx = { $queryRaw: vi.fn(async () => []) };
    const master = { $transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) };
    const work = vi.fn();
    await expect(withGymAccessFence(master as never,
      [{ identityId: 'trainer', gymId: 'gym-a', role: 'TRAINER', tenantActorId: 'trainer' }], work)).rejects.toBeInstanceOf(ForbiddenException);
    expect(work).not.toHaveBeenCalled();
  });

  it('rejects duplicate identity/gym targets that ask for conflicting actor bindings', async () => {
    const master = { $transaction: vi.fn() };
    await expect(withGymAccessFence(master as never, [
      { identityId: 'same', gymId: 'gym-a', role: 'TRAINER', tenantActorId: 'trainer-a' },
      { identityId: 'same', gymId: 'gym-a', role: 'MEMBER', tenantActorId: 'member-a' },
    ], async () => undefined)).rejects.toThrow('Conflicting gym access fence targets');
    expect(master.$transaction).not.toHaveBeenCalled();
  });
});
