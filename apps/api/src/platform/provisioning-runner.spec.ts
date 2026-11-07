import { ProvisioningRunner } from './provisioning-runner.js';
import { ProvisioningWorker } from './provisioning-worker.js';
import type { DatabaseService } from '../database.service.js';
import type { GymProvisioningService } from '../gym-provisioning.service.js';
import type { TenantDatabaseService } from '../tenant-database.service.js';

describe('provisioning discovery', () => {
  afterEach(() => vi.restoreAllMocks());
  it('uses bounded eligible discovery and the existing lease-owning worker', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'one' }, { id: 'two' }]);
    const database = { master: { $queryRaw: vi.fn().mockResolvedValue([{ now: new Date() }]), operation: { findMany } } } as unknown as DatabaseService;
    const run = vi.spyOn(ProvisioningWorker.prototype, 'runOnce').mockRejectedValueOnce(new Error('lease busy')).mockResolvedValueOnce({ state: 'COMPLETE' } as never);
    const runner = new ProvisioningRunner(database, {} as GymProvisioningService, {} as TenantDatabaseService);
    await runner.tick();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, where: expect.objectContaining({ state: { in: ['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED'] } }) }));
    expect(run.mock.calls).toEqual([['one'], ['two']]);
    await runner.onModuleDestroy();
    await runner.tick();
    expect(run).toHaveBeenCalledTimes(2);
  });
  it('prevents overlapping sweeps and drains on shutdown', async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const query = vi.fn().mockImplementation(async () => { await pending; return [{ now: new Date() }]; });
    const database = { master: { $queryRaw: query, operation: { findMany: vi.fn().mockResolvedValue([]) } } } as unknown as DatabaseService;
    const runner = new ProvisioningRunner(database, {} as GymProvisioningService, {} as TenantDatabaseService);
    const first = runner.tick();
    await runner.tick();
    expect(query).toHaveBeenCalledTimes(1);
    let drained = false;
    const stop = runner.onModuleDestroy().then(() => { drained = true; });
    expect(drained).toBe(false);
    release(); await first; await stop;
    expect(drained).toBe(true);
  });
});
