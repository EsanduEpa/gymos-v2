import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SessionReadsService, sessionAttentionReason, sessionCommandAffordances } from './session-reads.service.js';

const now = new Date('2026-11-06T10:00:00Z');
const scheduled = { state: 'SCHEDULED', scheduledStartAt: now, scheduledEndAt: new Date(now.getTime() + 3600000), startedAt: null, requestExpiresAt: null };

describe('booking detail timing and owner attention', () => {
  it('uses the inclusive start window and no-show grace without granting member delivery access', () => {
    expect(sessionCommandAffordances(scheduled, 'TRAINER', new Date(now.getTime() - 900001))).not.toContain('START');
    expect(sessionCommandAffordances(scheduled, 'TRAINER', new Date(now.getTime() - 900000))).toContain('START');
    expect(sessionCommandAffordances(scheduled, 'TRAINER', scheduled.scheduledEndAt)).toContain('START');
    expect(sessionCommandAffordances(scheduled, 'TRAINER', new Date(scheduled.scheduledEndAt.getTime() + 1))).not.toContain('START');
    expect(sessionCommandAffordances(scheduled, 'MEMBER', now)).toEqual(['CANCEL']);
    expect(sessionCommandAffordances(scheduled, 'OWNER', new Date(now.getTime() + 899999))).not.toContain('NO_SHOW');
    expect(sessionCommandAffordances(scheduled, 'OWNER', new Date(now.getTime() + 900000))).toContain('NO_SHOW');
  });
  it('requires start, the stored completion minimum, and trainer permission', () => {
    const active = { ...scheduled, state: 'ACTIVE', startedAt: now };
    expect(sessionCommandAffordances(active, 'TRAINER', new Date(now.getTime() + 1199999), 20)).not.toContain('COMPLETE');
    expect(sessionCommandAffordances(active, 'TRAINER', new Date(now.getTime() + 1200000), 20)).toContain('COMPLETE');
    expect(sessionCommandAffordances(active, 'TRAINER', new Date(now.getTime() + 1200000), null)).not.toContain('COMPLETE');
    expect(sessionCommandAffordances({ ...active, startedAt: null }, 'TRAINER', now, 0)).not.toContain('COMPLETE');
    expect(sessionCommandAffordances(active, 'MEMBER', now, 0)).not.toContain('COMPLETE');
    expect(sessionCommandAffordances(scheduled, 'TRAINER', now, 0)).not.toContain('COMPLETE');
  });
  it('suppresses expired decisions/withdrawal at the exact deadline and classifies only unresolved sessions', () => {
    const pending = { ...scheduled, state: 'PENDING_CONFIRMATION', requestExpiresAt: now };
    expect(sessionCommandAffordances(pending, 'TRAINER', now)).toEqual([]);
    expect(sessionCommandAffordances(pending, 'MEMBER', now)).toEqual([]);
    expect(sessionCommandAffordances(pending, 'TRAINER', new Date(now.getTime() - 1))).toEqual(['ACCEPT', 'DECLINE']);
    expect(sessionAttentionReason(pending, now)).toBe('REQUEST_EXPIRED');
    expect(sessionAttentionReason(scheduled, scheduled.scheduledEndAt)).toBeNull();
    expect(sessionAttentionReason(scheduled, new Date(scheduled.scheduledEndAt.getTime() + 1))).toBe('SCHEDULED_PAST_END');
    expect(sessionAttentionReason({ ...scheduled, state: 'ACTIVE' }, new Date(scheduled.scheduledEndAt.getTime() + 1))).toBe('ACTIVE_PAST_END');
    expect(sessionAttentionReason({ ...pending, state: 'COMPLETED' }, now)).toBeNull();
  });
});

function setup(role: 'OWNER' | 'TRAINER' | 'MEMBER' = 'MEMBER') {
  const actor = { id: 'actor', identityId: 'identity', enrollmentOperationId: 'registration', registrationState: 'COMPLETE' };
  const access = { gymId: 'gym', identityId: 'identity', role, actor: role === 'OWNER' ? null : { kind: role, id: actor.id } };
  const row = { ...scheduled, id: 'session', memberId: 'actor', trainerId: 'actor', member: { fullName: 'Member One' }, trainer: { fullName: 'Trainer One' },
    type: 'IN_PERSON', version: 2, gymTimezone: 'Asia/Colombo', createdAt: now, confirmedAt: now, endedAt: null,
    declineReason: null, notes: 'Member-visible notes', fee: { toString: () => '100' }, currency: 'LKR', payRecord: { amount: { toString: () => '40' } },
    creditHold: { state: 'HELD' }, settlement: null, configurationVersion: 0 };
  const tx = {
    $executeRaw: vi.fn(), $queryRaw: vi.fn().mockResolvedValue([{ now }]),
    pTSession: { findFirst: vi.fn().mockImplementation(async ({ where }) => where.id === row.id ? row : null) },
    gymConfiguration: { findUnique: vi.fn().mockResolvedValue({ masterGymId: 'gym', address: 'Synthetic gym location' }) },
    gymConfigurationVersion: { findFirst: vi.fn().mockResolvedValue({ minimumSessionDurationMinutes: 20, cancellationWindowMinutes: 1440 }) },
    pTSessionAdjustment: { findMany: vi.fn().mockResolvedValue([]) },
    sessionStateEvent: { count: vi.fn().mockResolvedValue(51), findMany: vi.fn().mockResolvedValue([{ fromState: null, toState: 'SCHEDULED', createdAt: now }]) },
  };
  const tenant = { ...tx, $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
    member: { findFirst: vi.fn().mockResolvedValue(actor) }, trainer: { findFirst: vi.fn().mockResolvedValue(actor) },
    commandReceipt: { findUnique: vi.fn().mockResolvedValue({ state: 'COMMITTED', sourceMasterOperationId: 'registration', resourceId: 'actor', resourceType: role, commandKind: `REGISTER_${role}` }) } };
  const master = { gymAccess: { findFirst: vi.fn().mockResolvedValue({}) }, operation: { findFirst: vi.fn().mockResolvedValue({ tenantCommandReceiptId: 'receipt' }) } };
  const gate = { withVerifiedTenant: vi.fn().mockImplementation(async (_access, fn) => fn(tenant)) };
  const service = new SessionReadsService({ master } as never, gate as never);
  return { access, row, tx, tenant, master, gate, service };
}

describe('authorized booking detail projection', () => {
  it.each(['MEMBER', 'TRAINER', 'OWNER'] as const)('scopes %s reads and sanitizes the paged timeline', async role => {
    const ctx = setup(role);
    const detail = await ctx.service.detail(ctx.access as never, 'session', 2);
    expect(ctx.gate.withVerifiedTenant).toHaveBeenCalled();
    expect(ctx.tx.pTSession.findFirst.mock.calls[0]![0].where).toEqual({ id: 'session', ...(role === 'OWNER' ? {} : role === 'MEMBER' ? { memberId: 'actor' } : { trainerId: 'actor' }) });
    expect(ctx.tx.sessionStateEvent.findMany.mock.calls[0]![0]).toMatchObject({ take: 50, skip: 50, select: { fromState: true, toState: true, createdAt: true } });
    expect(detail).toMatchObject({ reservation: 'HELD', settlement: null, timelineTotal: 51, timelinePages: 2, location: 'Synthetic gym location' });
    expect(detail.session.fee).toBe(role === 'OWNER' ? '100' : null);
    expect(detail.session.trainerPay).toBe(role === 'TRAINER' ? '40' : null);
    expect(JSON.stringify(detail)).not.toMatch(/identityId|receipt|creditOrdinal|confirmationRate|databaseName/);
  });
  it('returns the same not-found outcome for missing/foreign IDs and stale actor bindings', async () => {
    const ctx = setup();
    await expect(ctx.service.detail(ctx.access as never, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.service.detail(ctx.access as never, '../../foreign')).rejects.toBeInstanceOf(NotFoundException);
    ctx.tenant.member.findFirst.mockResolvedValueOnce(null);
    await expect(ctx.service.detail(ctx.access as never, 'session')).rejects.toBeInstanceOf(NotFoundException);
    ctx.master.gymAccess.findFirst.mockResolvedValueOnce(null);
    await expect(ctx.service.detail(ctx.access as never, 'session')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('projects overdue pending expiry without writes or live actions, and withholds commands without a hold', async () => {
    const ctx = setup('TRAINER');
    Object.assign(ctx.row, { state: 'PENDING_CONFIRMATION', requestExpiresAt: now, creditHold: null });
    const detail = await ctx.service.detail(ctx.access as never, 'session');
    expect(detail).toMatchObject({ expiryAwaitingSweep: true, reservation: 'NONE', session: { state: 'EXPIRED', commandAffordances: [] } });
    Object.assign(ctx.row, scheduled);
    expect((await ctx.service.detail(ctx.access as never, 'session')).session.commandAffordances).not.toContain('START');
  });
});
