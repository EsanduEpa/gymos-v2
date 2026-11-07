import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';

describe('owner dashboard active sessions', () => {
  const access = { role: 'OWNER', slug: 'gym-alpha', gymId: 'gym-a' };

  it('shows an active session scheduled before today and reads only the selected tenant', async () => {
    const previousDay = new Date('2026-11-04T08:00:00Z');
    const row = { id: 'session-1', state: 'ACTIVE', type: 'IN_PERSON', trainerId: 'trainer-1',
      scheduledStartAt: previousDay, scheduledEndAt: new Date('2026-11-04T09:00:00Z'), startedAt: previousDay,
      member: { fullName: 'Member One' }, trainer: { fullName: 'Trainer One' }, currency: 'LKR', fee: { toString: () => '100.0000' } };
    const findMany = vi.fn(async (query: { where: { state?: string } }) => query.where.state === 'ACTIVE' ? [row] : []);
    const tx = {
      $executeRaw: vi.fn(async () => 0),
      $queryRaw: vi.fn().mockResolvedValueOnce([{ now: new Date('2026-11-06T08:00:00Z') }]).mockResolvedValueOnce([]),
      pTSession: { count: vi.fn(async () => 0), findMany, groupBy: vi.fn(async () => []) },
      trainer: { findMany: vi.fn(async () => [{ id: 'trainer-1', fullName: 'Trainer One' }]) },
    };
    const tenant = { gymConfiguration: { findUnique: vi.fn(async () => ({ currency: 'LKR', timezone: 'Asia/Colombo', masterGymId: 'gym-a' })) },
      $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx) };
    const gate = { withVerifiedTenant: vi.fn(async (context: typeof access, work: (client: typeof tenant) => Promise<unknown>) => {
      expect(context.gymId).toBe('gym-a');
      return work(tenant);
    }) };
    const service = new DashboardService({} as never, gate as never);
    const result = await service.owner(access as never);
    expect(result.metrics.activeSessions.value).toBe(1);
    expect(result.metrics.activeSessionsToday.value).toBe(0);
    expect(result.activeSessionItems).toEqual([{ id: 'session-1', startedAt: previousDay.toISOString(),
      scheduledStartAt: previousDay.toISOString(), memberName: 'Member One', trainerName: 'Trainer One' }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { state: 'ACTIVE' } }));
    expect(result.metrics.trainersWithSessionsToday.value).toBe(0);
    expect(result.trainerCards).toEqual([{ id: 'trainer-1', name: 'Trainer One', scheduledToday: 0, activeNow: 1 }]);
  });

  it('denies a trainer before opening a tenant', async () => {
    const gate = { withVerifiedTenant: vi.fn() };
    const service = new DashboardService({} as never, gate as never);
    await expect(service.owner({ ...access, role: 'TRAINER' } as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(gate.withVerifiedTenant).not.toHaveBeenCalled();
  });
});
