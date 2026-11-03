import { ForbiddenException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../generated/master/client.js';

type MasterTx = Prisma.TransactionClient;
export type FencedGymAccess = { userId: string; gymId: string; role: string; version: number; actorKind: string | null; tenantActorId: string | null };
export type GymAccessFenceTarget =
  | { identityId: string; gymId: string; role: 'OWNER'; tenantActorId?: never }
  | { identityId: string; gymId: string; role: 'MEMBER' | 'TRAINER'; tenantActorId: string };

/**
 * Serialize a tenant command with actor access revocation. Keep the callback
 * inside this Master transaction so the row lock spans the tenant commit.
 * Deactivation takes FOR UPDATE on the same GymAccess row before revoking it.
 * This orders the commits across databases without claiming distributed ACID.
 */
export async function withGymAccessFence<T>(
  master: PrismaClient,
  targets: readonly GymAccessFenceTarget[],
  work: (accesses: readonly FencedGymAccess[]) => Promise<T>,
): Promise<T> {
  if (!targets.length) throw new TypeError('At least one gym access fence is required');
  const distinct = new Map<string, GymAccessFenceTarget>();
  for (const target of targets) {
    if (!target.identityId || !target.gymId) throw new TypeError('Gym access fence identifiers are required');
    const key = `${target.gymId}\0${target.identityId}`;
    const existing = distinct.get(key);
    if (existing && (existing.role !== target.role || existing.tenantActorId !== target.tenantActorId)) {
      throw new TypeError('Conflicting gym access fence targets');
    }
    distinct.set(key, target);
  }
  const ordered = [...distinct.values()].sort((a, b) => a.gymId.localeCompare(b.gymId) || a.identityId.localeCompare(b.identityId));
  return master.$transaction(async (tx: MasterTx) => {
    const locked: FencedGymAccess[] = [];
    for (const target of ordered) {
      const rows = await tx.$queryRaw<FencedGymAccess[]>`
        SELECT ga."userId", ga."gymId", ga."role"::text AS "role", ga."version", ga."actorKind"::text AS "actorKind", ga."tenantActorId"
        FROM "GymAccess" ga JOIN "Gym" g ON g."id" = ga."gymId"
        WHERE ga."userId" = ${target.identityId} AND ga."gymId" = ${target.gymId}
          AND ga."role"::text = ${target.role} AND ga."linkStatus"::text = 'ACTIVE'
          AND g."status"::text = 'ACTIVE'
          AND (${target.tenantActorId ?? null}::text IS NULL OR ga."tenantActorId" = ${target.tenantActorId ?? null})
          AND (ga."role"::text = 'OWNER' OR ga."actorKind"::text = ga."role"::text)
        FOR SHARE OF g, ga`;
      if (!rows[0]) throw new ForbiddenException('Gym access changed; reload and try again');
      locked.push(rows[0]);
    }
    return work(locked);
  });
}
