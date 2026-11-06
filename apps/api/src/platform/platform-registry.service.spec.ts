import { describe, expect, it, vi } from 'vitest';
import { PlatformRegistryService } from './platform-registry.service.js';

describe('PlatformRegistryService.operationalVisibility', () => {
  it('returns bounded Master counts and does not invent unsupported signal counts', async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ now: new Date('2026-11-06T00:00:00.000Z') }])
        .mockResolvedValueOnce([{ now: new Date('2026-11-06T00:00:00.000Z') }])
        .mockResolvedValueOnce([{ count: 3n }]),
      memberApplication: { count: vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(1) },
      operation: { count: vi.fn().mockResolvedValue(2) },
    };
    const master = { $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    const service = new PlatformRegistryService({ master } as never, {} as never);
    const result = await service.operationalVisibility();
    expect(result).toMatchObject({ pendingApplications: 4, recoveryRequiredApplications: 1,
      stuckEnrollmentOperations: 2, exhaustedRecoveryCredentials: 3,
      profileOperations: 'NOT_CENTRALLY_RECORDED', renewalRevocationErrors: 'NOT_RECORDED',
      inboxProjectionBacklog: 'NOT_APPLICABLE_TRANSACTIONAL' });
    expect(result.asOf).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.memberApplication.count).toHaveBeenCalledTimes(2);
    expect(tx.operation.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ kind: 'REGISTER_MEMBER' }) }));
  });
});
