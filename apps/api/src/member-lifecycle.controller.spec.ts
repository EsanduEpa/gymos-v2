import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseService } from './database.service.js';
import { GymAccessGuard } from './gym-access.guard.js';
import { MemberLifecycleController } from './member-lifecycle.controller.js';
import { MemberLifecycleService } from './member-lifecycle.service.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';

describe('MemberLifecycleController gym scoping', () => {
  let app: INestApplication | undefined;
  afterEach(async () => { await app?.close(); app = undefined; });

  it('returns 404 for another gym operation and denies a member over the status route', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const database = { master: {
      user: { findUnique: vi.fn().mockResolvedValue({ authVersion: 0, globalRole: 'USER', mustChangePassword: false, credentialExpiresAt: null }) },
      $queryRaw: vi.fn().mockResolvedValue([{ now: new Date() }]),
      identitySession: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ identityId: where.id.replace(/-session$/, ''), gymAccountId: where.id.replace(/-session$/, '-account'), authVersion: 0, revokedAt: null })) },
      gymAccount: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ userId: where.id.replace(/-account$/, ''), gymId: 'gym-b', status: 'ACTIVE', authVersion: 0, mustChangePassword: false, credentialExpiresAt: null })) },
      gymAccess: { findFirst: vi.fn(async ({ where }: { where: { userId: string; gym: { is: { slug: string } } } }) => {
        if (where.gym.is.slug !== 'gym-b') return null;
        if (where.userId === 'owner-b') return { userId: 'owner-b', gymId: 'gym-b', role: 'OWNER', linkStatus: 'ACTIVE', version: 0,
          actorKind: null, tenantActorId: null, enrollmentOperationId: null, gym: { slug: 'gym-b', status: 'ACTIVE', databaseName: 'gymos_b',
            expectedTenantSchemaVersion: null, expectedTenantManifestDigest: null, expectedTenantOperationId: null, expectedTenantOperation: null } };
        if (where.userId === 'member-b') return { userId: 'member-b', gymId: 'gym-b', role: 'MEMBER', linkStatus: 'ACTIVE', version: 0,
          actorKind: 'MEMBER', tenantActorId: 'member-actor-b', enrollmentOperationId: 'member-enrollment-b', gym: { slug: 'gym-b', status: 'ACTIVE', databaseName: 'gymos_b',
            expectedTenantSchemaVersion: null, expectedTenantManifestDigest: null, expectedTenantOperationId: null, expectedTenantOperation: null } };
        return null;
      }) },
      operation: { findFirst, findUnique: vi.fn().mockResolvedValue({ kind: 'REGISTER_MEMBER', actorIdentityId: 'owner-b', state: 'COMPLETE', gymId: 'gym-b',
        subjectIdentityId: 'member-b', tenantActorId: 'member-actor-b', tenantCommandReceiptId: 'member-registration-receipt-b' }) },
    } };
    const tenant = { commandReceipt: { findUnique: vi.fn().mockResolvedValue({ state: 'COMMITTED', sourceMasterOperationId: 'member-enrollment-b',
      actorIdentityId: 'owner-b', commandKind: 'REGISTER_MEMBER', resourceId: 'member-actor-b', resourceType: 'MEMBER' }) },
      member: { findUnique: vi.fn().mockResolvedValue({ id: 'member-actor-b', identityId: 'member-b', registrationState: 'COMPLETE',
        enrollmentOperationId: 'member-enrollment-b', status: 'ACTIVE' }) } };
    const tenantGate = { withVerifiedTenant: async (_context: unknown, work: (client: typeof tenant) => Promise<unknown>) => work(tenant) };
    const service = new MemberLifecycleService(database as unknown as DatabaseService, {} as TenantSchemaGateService);
    const previousSecret = process.env.JWT_SECRET;
    const secret = 'task033-member-lifecycle-test-secret-at-least-32-bytes';
    process.env.JWT_SECRET = secret;
    const tokenFor = (identityId: string) => new SignJWT({ authVersion: 0, sid: `${identityId}-session`, gaid: `${identityId}-account` }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
      .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m').sign(new TextEncoder().encode(secret));
    const ownerToken = await tokenFor('owner-b');
    const memberToken = await tokenFor('member-b');
    const guard = new GymAccessGuard(database as unknown as DatabaseService, tenantGate as unknown as TenantSchemaGateService);
    const builder = Test.createTestingModule({
      controllers: [MemberLifecycleController],
      providers: [
        { provide: DatabaseService, useValue: database },
        { provide: TenantSchemaGateService, useValue: tenantGate },
        { provide: MemberLifecycleService, useValue: service },
      ],
    });
    builder.overrideGuard(GymAccessGuard).useValue(guard);
    const module = await builder.compile();
    app = module.createNestApplication();
    await app.init();

    try {
      const foreign = await request(app.getHttpServer()).get('/gyms/gym-b/member-lifecycle/operation-created-in-gym-a')
        .set('authorization', `Bearer ${ownerToken}`);
      expect(foreign.status).toBe(404);
      expect(findFirst).toHaveBeenCalledWith({ where: { id: 'operation-created-in-gym-a', actorIdentityId: 'owner-b', gymId: 'gym-b', kind: 'CHANGE_MEMBER_STATUS' },
        include: { memberLifecycleIntent: true } });

      const denied = await request(app.getHttpServer()).get('/gyms/gym-b/member-lifecycle/operation-created-in-gym-a')
        .set('authorization', `Bearer ${memberToken}`);
      expect(denied.status).toBe(403);
      expect(findFirst).toHaveBeenCalledTimes(1);
      expect(Reflect.getMetadata(GUARDS_METADATA, MemberLifecycleController)).toContain(GymAccessGuard);
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
