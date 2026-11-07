import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { DatabaseService } from '../../src/database.service.js';
import { SessionAvailabilityService } from '../../src/sessions/availability.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
beforeAll(async () => { run = await createDisposableEnvironment(); fixture = await seedTwoGymFixture(run); }, 120_000);
afterAll(async () => { await fixture?.close(); if (run) console.info('[availability-owned-cleanup]', JSON.stringify(await run.cleanup())); }, 120_000);

it('publishes versioned availability, returns bounded local slots, denies another trainer and rejects stale writes', async () => {
  const gym = fixture.gyms[0]!; const tenant = fixture.tenants[0]!; const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const owner = fixture.users.ownerA; const ownerLink = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: owner.id, gymId: gym.id } } });
  const gate = { withVerifiedTenant: async (_access: unknown, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as unknown as TenantSchemaGateService;
  const service = new SessionAvailabilityService({ master: fixture.master } as unknown as DatabaseService, gate);
  const access = { identityId: owner.id, identityVersion: owner.authVersion, accessVersion: ownerLink.version, role: 'OWNER', gymId: gym.id, slug: gym.slug,
    databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion, expectedTenantManifestDigest: gym.expectedTenantManifestDigest,
    expectedTenantOperationId: gym.expectedTenantOperationId, expectedTenantOperationState: 'COMPLETE', observedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    observedTenantManifestDigest: gym.expectedTenantManifestDigest, actor: null };
  const input = { expectedVersion: trainer.version, idempotencyKey: `availability-${run.runId}-0123456789`, closures: [], closureRange: { from: '2026-11-01', through: '2027-01-01' },
    weekly: Array.from({ length: 7 }, (_, weekday) => ({ weekday, effectiveFrom: '2026-01-01', effectiveToExclusive: '2027-01-01', windows: [{ startMinute: 540, endMinute: 720 }] })), dated: [], blocks: [] };
  const published = await service.update(access, trainer.id, input);
  const replay = await service.update(access, trainer.id, input);
  expect(published.version).toBe(trainer.version + 1);
  expect(replay.version).toBe(published.version);
  expect(published.weekly).toHaveLength(7);
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 1); const localDate = date.toISOString().slice(0, 10);
  const slots = await service.slots(access, { trainerId: trainer.id, localDate });
  expect(slots.durationMinutes).toBe(60);
  expect(slots.slots.map(slot => slot.localTime)).toEqual(expect.arrayContaining(['09:00', '10:00']));
  expect(slots.slots.every(slot => slot.localTime >= '09:00' && slot.localTime < '12:00')).toBe(true);
  await expect(service.update(access, trainer.id, { ...input, idempotencyKey: `stale-${run.runId}-0123456789` })).rejects.toBeInstanceOf(ConflictException);
  await expect(service.read({ ...access, role: 'TRAINER', actor: { kind: 'TRAINER', id: 'foreign-trainer' } }, trainer.id, { from: localDate, through: new Date(new Date(`${localDate}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10) })).rejects.toBeInstanceOf(NotFoundException);
}, 30_000);
