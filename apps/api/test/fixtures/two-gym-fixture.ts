import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as MasterClient } from '../../src/generated/master/client.js';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import type { DatabaseService } from '../../src/database.service.js';
import { TenantRegistryService } from '../../src/tenancy/tenant-registry.service.js';
import { TenantSchemaVerifier } from '../../src/tenancy/tenant-schema-verifier.js';
import {
  TENANT_TEMPLATE_MANIFEST,
  tenantManifestDigest,
} from '../../src/tenancy/tenant-template-manifest.js';
import type { createDisposableEnvironment } from '../support/disposable-environment.js';

type Environment = Awaited<ReturnType<typeof createDisposableEnvironment>>;
const fixedNow = new Date('2026-10-24T06:00:00.000Z');

export async function seedTwoGymFixture(environment: Environment) {
  await environment.migrate(environment.masterName, 'master');
  const tenantDatabases = [
    await environment.createOwnedDatabase(),
    await environment.createOwnedDatabase(),
  ];
  for (const database of tenantDatabases)
    await environment.migrate(database.name, 'tenant');

  const master = new MasterClient({
    adapter: new PrismaPg({ connectionString: environment.masterUrl, max: 4 }),
  });
  const tenants = tenantDatabases.map(
    ({ url }) =>
      new TenantClient({
        adapter: new PrismaPg({ connectionString: url, max: 2 }),
      }),
  );
  try {
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const users = await Promise.all([
      master.user.create({
        data: {
          email: `admin-${environment.runId}@example.test`,
          passwordHash,
          globalRole: 'SUPER_ADMIN',
          displayName: 'Test administrator',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `owner-a-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Owner Alpha',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `owner-b-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Owner Beta',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `multi-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Multi Gym Owner',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `trainer-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Trainer Alpha',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `member-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Member Alpha',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `pending-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Pending Owner',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `forced-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Forced Change Owner',
          mustChangePassword: true,
          credentialExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `inactive-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Inactive Member',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
      master.user.create({
        data: {
          email: `mismatch-${environment.runId}@example.test`,
          passwordHash,
          displayName: 'Mismatched Member',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      }),
    ]);
    const [
      admin,
      ownerA,
      ownerB,
      multiOwner,
      trainerUser,
      memberUser,
      pendingUser,
      forcedUser,
      inactiveUser,
      mismatchUser,
    ] = users;
    const digest = tenantManifestDigest();
    const gyms = [];

    for (let index = 0; index < 2; index++) {
      const slug = `test-gym-${index === 0 ? 'alpha' : 'beta'}-${environment.runId}`;
      const gym = await master.gym.create({
        data: {
          name: index === 0 ? 'Test Gym Alpha' : 'Test Gym Beta',
          slug,
          databaseName: tenantDatabases[index].name,
          status: 'ACTIVE',
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      });
      const operationId = `fixture_${index}_${environment.runId}`;
      await master.operation.create({
        data: {
          id: operationId,
          kind: 'PROVISION_GYM',
          actorIdentityId: admin.id,
          scopeKey: `provision-gym:${slug}`,
          idempotencyKey: `fixture-${randomUUID()}`,
          requestDigest: `d1:${index === 0 ? 'a'.repeat(64) : 'b'.repeat(64)}`,
          requestedSlug: slug,
          gymId: gym.id,
          databaseName: tenantDatabases[index].name,
          intendedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version,
          intendedTenantManifestDigest: digest,
          appliedTenantTemplateVersion: TENANT_TEMPLATE_MANIFEST.version,
          appliedTenantManifestDigest: digest,
          tenantSchemaVerifiedAt: fixedNow,
          state: 'COMPLETE',
          step: 'MASTER_ACTIVATED',
          safeResult: { operationId, state: 'COMPLETE' },
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      });
      const evidence = await new TenantSchemaVerifier(
        tenants[index],
      ).verifyAndAttest({ masterGymId: gym.id, operationId });
      await tenants[index].gymConfiguration.update({ where: { id: 'current' }, data: { currency: 'LKR', timezone: 'Asia/Colombo', version: { increment: 1 } } });
      await new TenantRegistryService({
        master,
      } as DatabaseService).observeVerifiedTenant({
        gymId: gym.id,
        operationId,
        expectedGymVersion: 0,
        actorIdentityId: admin.id,
        evidence,
      });
      await master.theme.create({
        data: {
          gymId: gym.id,
          primaryColor: index === 0 ? '#0F766E' : '#7C3AED',
        },
      });
      gyms.push({ ...gym, slug, operationId });
    }

    await master.gymAccess.createMany({
      data: [
        {
          userId: ownerA.id,
          gymId: gyms[0].id,
          role: 'OWNER',
          linkStatus: 'ACTIVE',
          createdAt: fixedNow,
        },
        {
          userId: ownerB.id,
          gymId: gyms[1].id,
          role: 'OWNER',
          linkStatus: 'ACTIVE',
          createdAt: fixedNow,
        },
        {
          userId: multiOwner.id,
          gymId: gyms[0].id,
          role: 'OWNER',
          linkStatus: 'ACTIVE',
          createdAt: fixedNow,
        },
        {
          userId: multiOwner.id,
          gymId: gyms[1].id,
          role: 'OWNER',
          linkStatus: 'ACTIVE',
          createdAt: fixedNow,
        },
        {
          userId: pendingUser.id,
          gymId: gyms[0].id,
          role: 'OWNER',
          linkStatus: 'PENDING',
          createdAt: fixedNow,
        },
        {
          userId: forcedUser.id,
          gymId: gyms[0].id,
          role: 'OWNER',
          linkStatus: 'ACTIVE',
          createdAt: fixedNow,
        },
        {
          userId: inactiveUser.id,
          gymId: gyms[0].id,
          role: 'MEMBER',
          linkStatus: 'REVOKED',
          createdAt: fixedNow,
        },
      ],
    });

    const trainer = await tenants[0].trainer.create({
      data: {
        fullName: 'Trainer Alpha',
        identityId: trainerUser.id,
        registrationState: 'COMPLETE',
        enrollmentOperationId: `trainer_${environment.runId}`,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    });
    const member = await tenants[0].member.create({
      data: {
        fullName: 'Member Alpha',
        email: `member-alpha-${environment.runId}@example.test`,
        identityId: memberUser.id,
        registrationState: 'COMPLETE',
        enrollmentOperationId: `member_${environment.runId}`,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    });
    // Successful role-entry fixtures must satisfy the same durable publication
    // boundary as real registrations. Mismatch fixture below stays incomplete.
    for (const [actor, identity, kind] of [[trainer, trainerUser, 'TRAINER'], [member, memberUser, 'MEMBER']] as const) {
      const receiptId = `receipt_${actor.enrollmentOperationId}`;
      await tenants[0].commandReceipt.create({ data: {
        id: receiptId, actorIdentityId: ownerA.id, commandKind: `REGISTER_${kind}`,
        idempotencyKey: randomUUID(), requestDigest: `d1:${'d'.repeat(64)}`,
        resourceType: kind, resourceId: actor.id, sourceMasterOperationId: actor.enrollmentOperationId,
        state: 'COMMITTED', committedAt: fixedNow, safeResult: { resourceId: actor.id },
      } });
      await master.operation.create({ data: {
        id: actor.enrollmentOperationId!, kind: kind === 'TRAINER' ? 'REGISTER_TRAINER' : 'REGISTER_MEMBER',
        actorIdentityId: ownerA.id, scopeKey: `gym:${gyms[0].id}`, idempotencyKey: randomUUID(),
        requestDigest: `d1:${'d'.repeat(64)}`, gymId: gyms[0].id, subjectIdentityId: identity.id,
        tenantActorId: actor.id, tenantCommandReceiptId: receiptId, state: 'COMPLETE', step: 'MASTER_ACTIVATED', safeResult: { resourceId: actor.id },
      } });
    }
    const mismatchedActor = await tenants[0].member.create({
      data: {
        fullName: 'Different Identity',
        email: `different-${environment.runId}@example.test`,
        identityId: inactiveUser.id,
        registrationState: 'COMPLETE',
        enrollmentOperationId: `mismatch_${environment.runId}`,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    });
    await master.gymAccess.createMany({
      data: [
        {
          userId: trainerUser.id,
          gymId: gyms[0].id,
          role: 'TRAINER',
          linkStatus: 'ACTIVE',
          actorKind: 'TRAINER',
          tenantActorId: trainer.id,
          enrollmentOperationId: trainer.enrollmentOperationId,
          createdAt: fixedNow,
        },
        {
          userId: memberUser.id,
          gymId: gyms[0].id,
          role: 'MEMBER',
          linkStatus: 'ACTIVE',
          actorKind: 'MEMBER',
          tenantActorId: member.id,
          enrollmentOperationId: member.enrollmentOperationId,
          createdAt: fixedNow,
        },
        {
          userId: mismatchUser.id,
          gymId: gyms[0].id,
          role: 'MEMBER',
          linkStatus: 'ACTIVE',
          actorKind: 'MEMBER',
          tenantActorId: mismatchedActor.id,
          enrollmentOperationId: mismatchedActor.enrollmentOperationId,
          createdAt: fixedNow,
        },
      ],
    });

    await tenants[0].member.createMany({
      data: Array.from({ length: 125 }, (_, index) => ({
        fullName: `Alpha Person ${String(index + 1).padStart(3, '0')}`,
        email: `alpha-${index + 1}-${environment.runId}@example.test`,
        status: index === 0 ? 'INACTIVE' : 'ACTIVE',
        createdAt: new Date(fixedNow.getTime() + index * 1000),
        updatedAt: new Date(fixedNow.getTime() + index * 1000),
      })),
    });
    await tenants[1].member.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        fullName: `Beta Person ${String(index + 1).padStart(3, '0')}`,
        email: `beta-${index + 1}-${environment.runId}@example.test`,
        createdAt: new Date(fixedNow.getTime() + index * 1000),
        updatedAt: new Date(fixedNow.getTime() + index * 1000),
      })),
    });

    return {
      master,
      tenants,
      tenantDatabases,
      password,
      fixedNow: fixedNow.toISOString(),
      users: {
        admin,
        ownerA,
        ownerB,
        multiOwner,
        trainerUser,
        memberUser,
        pendingUser,
        forcedUser,
        inactiveUser,
        mismatchUser,
      },
      gyms,
      expected: { alphaMembers: 127, betaMembers: 12 },
      async close() {
        await Promise.all([
          master.$disconnect(),
          ...tenants.map((tenant) => tenant.$disconnect()),
        ]);
      },
    };
  } catch (error) {
    await Promise.all([
      master.$disconnect(),
      ...tenants.map((tenant) => tenant.$disconnect()),
    ]);
    throw error;
  }
}
