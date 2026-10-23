import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { Prisma, type PrismaClient, type GymRole } from '../generated/master/client.js';
import { normalizeIdentityEmail } from './email.js';

type Binding = { gymId: string; role: GymRole; enrollmentOperationId: string };
function checkBinding(binding: Binding) {
  if (!binding.gymId || !binding.enrollmentOperationId
    || !['OWNER', 'MEMBER', 'TRAINER'].includes(binding.role)) {
    throw new ForbiddenException('Invalid enrollment binding');
  }
}
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const isUniqueConflict = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// Internal foundation only: a future guarded controller derives the authenticated
// identity from its session. No owner-email assertion can issue/consume consent.
export class IdentityFoundationService {
  constructor(private readonly master: PrismaClient) {}

  async createIdentity(input: { email: unknown; passwordHash: string }) {
    const email = normalizeIdentityEmail(input.email);
    try {
      return await this.master.user.create({ data: { email, passwordHash: input.passwordHash } });
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('Identity already exists; verified consent is required');
      throw error;
    }
  }

  async issueEnrollmentProof(input: Binding & {
    authenticatedIdentityId: string;
    currentPassword: string;
  }) {
    checkBinding(input);
    const token = randomBytes(32).toString('base64url');
    try {
      await this.master.$transaction(async (tx) => {
        // Hold the identity version stable during reconfirmation and proof issue.
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.authenticatedIdentityId} FOR SHARE`;
        const user = await tx.user.findUnique({ where: { id: input.authenticatedIdentityId } });
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
        if (!user || user.mustChangePassword || (user.credentialExpiresAt !== null && user.credentialExpiresAt <= now)
          || !(await argon2.verify(user.passwordHash, input.currentPassword))) {
          throw new UnauthorizedException('Identity verification failed');
        }
        const gym = await tx.gym.findUnique({ where: { id: input.gymId }, select: { status: true } });
        if (!gym || !['ACTIVE', 'PROVISIONING'].includes(gym.status)) throw new ForbiddenException('Gym unavailable');
        await tx.enrollmentProof.create({ data: {
          identityId: user.id, gymId: input.gymId, role: input.role,
          enrollmentOperationId: input.enrollmentOperationId,
          tokenHash: digest(token), authVersion: user.authVersion,
          issuedAt: now, expiresAt: new Date(now.getTime() + 10 * 60_000),
        } });
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('Enrollment proof already exists for this operation');
      throw error;
    }
    return { token, expiresIn: 600 };
  }

// This verifies a live consent nonce. After expiry, recovery must use the
  // recorded consumption and authorized durable Operation status (004/031/036),
  // not pretend an expired nonce is a new authorization or reset credentials.
  async consumeProofAndPrepareAccess(input: Binding & { token: string }) {
    checkBinding(input);
    if (!/^[A-Za-z0-9_-]{43}$/.test(input.token)) throw new ForbiddenException('Enrollment proof invalid');
    const tokenHash = digest(input.token);
    try {
      return await this.master.$transaction(async (tx) => {
        // Lock the identity before proof: consistent order prevents issue/consume
        // deadlocks and serializes different proofs claiming one same-gym role.
        const found = await tx.enrollmentProof.findUnique({ where: { tokenHash } });
        if (!found) throw new ForbiddenException('Enrollment proof invalid');
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${found.identityId} FOR UPDATE`;
        await tx.$queryRaw`SELECT "id" FROM "EnrollmentProof" WHERE "id" = ${found.id} FOR UPDATE`;
        const proof = await tx.enrollmentProof.findUnique({ where: { id: found.id } });
        const user = await tx.user.findUnique({ where: { id: found.identityId }, select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } });
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
        if (!proof || !user || user.mustChangePassword
          || (user.credentialExpiresAt !== null && user.credentialExpiresAt <= now)
          || proof.authVersion !== user.authVersion
          || proof.gymId !== input.gymId || proof.role !== input.role
          || proof.enrollmentOperationId !== input.enrollmentOperationId
          || proof.expiresAt <= now) throw new ForbiddenException('Enrollment proof invalid');
        const gym = await tx.gym.findUnique({ where: { id: input.gymId }, select: { status: true } });
        if (!gym || !['ACTIVE', 'PROVISIONING'].includes(gym.status)) throw new ForbiddenException('Gym unavailable');
        const key = { userId: proof.identityId, gymId: proof.gymId };
        const access = await tx.gymAccess.findUnique({ where: { userId_gymId: key } });
        if (access) {
          if (access.role !== input.role || access.enrollmentOperationId !== input.enrollmentOperationId) {
            throw new ConflictException('Identity already has a role in this gym');
          }
          if (!proof.consumedAt) throw new ConflictException('Enrollment already prepared by another proof');
          // Same consumed operation may resume; no second consumption or reset.
          return access;
        }
        if (proof.consumedAt) throw new ConflictException('Enrollment requires operation recovery');
        const prepared = await tx.gymAccess.create({ data: {
          ...key, role: proof.role, linkStatus: 'PENDING',
          enrollmentOperationId: input.enrollmentOperationId,
          actorKind: proof.role === 'OWNER' ? null : proof.role,
        } });
        const consumed = await tx.enrollmentProof.updateMany({
          where: { id: proof.id, consumedAt: null, authVersion: user.authVersion },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) throw new ConflictException('Enrollment proof already consumed');
        return prepared;
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('Identity already has a role in this gym');
      throw error;
    }
  }
}
