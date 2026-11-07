import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { identityFromAuthorization } from './auth-token.js';
import { DatabaseService } from './database.service.js';
import { isOperationalActor, type TenantActor } from './identity/publication-policy.js';
import { TenantSchemaGateService, type TenantGateContext } from './tenancy/tenant-schema-gate.service.js';

export type GymRequest = Request & {
  gymAccess?: {
    identityId: string;
    identityVersion: number;
    gymId: string;
    slug: string;
    role: string;
    databaseName: string;
    expectedTenantSchemaVersion: string | null;
    expectedTenantManifestDigest: string | null;
    expectedTenantOperationId: string | null;
    expectedTenantOperationState: string | null;
    observedTenantSchemaVersion: string | null;
    observedTenantManifestDigest: string | null;
    accessVersion: number;
    actor: { kind: 'MEMBER' | 'TRAINER'; id: string; registrationOperationId: string } | null;
  };
};

@Injectable()
export class GymAccessGuard implements CanActivate {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenantGate: TenantSchemaGateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GymRequest>();
    if (request.headers['x-gymos-support-context']) throw new ForbiddenException('Support is limited to approved read-only summaries');
    const identity = await identityFromAuthorization(request.headers.authorization);

    const slug = request.params.slug;
    if (typeof slug !== 'string') {
      throw new ForbiddenException('Gym access denied');
    }

    let user;
    let masterNow: Date;
    try {
      user = await this.database.master.user.findUnique({
        where: { id: identity.userId },
        select: { authVersion: true, globalRole: true, mustChangePassword: true, credentialExpiresAt: true },
      });
      const [clock] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
      masterNow = clock.now;
    } catch {
      throw new ServiceUnavailableException('Gym access is temporarily unavailable');
    }
    if (!user || (!identity.gymAccountId && user.authVersion !== identity.authVersion)) {
      throw new UnauthorizedException('Invalid or revoked token');
    }
    if (user.globalRole === 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform accounts cannot enter gym workspaces');
    }
    if (!identity.sessionId || !identity.gymAccountId) {
      throw new ForbiddenException('A gym-specific sign-in is required');
    }
    let scopedSession;
    let scopedAccount;
    try {
      [scopedSession, scopedAccount] = await Promise.all([
        this.database.master.identitySession.findUnique({ where: { id: identity.sessionId },
          select: { identityId: true, gymAccountId: true, authVersion: true, revokedAt: true } }),
        this.database.master.gymAccount.findUnique({ where: { id: identity.gymAccountId },
          select: { userId: true, gymId: true, status: true, authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
      ]);
    } catch {
      throw new ServiceUnavailableException('Gym account access is temporarily unavailable');
    }
    if (!scopedSession || scopedSession.identityId !== identity.userId || scopedSession.gymAccountId !== identity.gymAccountId
      || scopedSession.authVersion !== identity.authVersion || scopedSession.revokedAt
      || !scopedAccount || scopedAccount.userId !== identity.userId || scopedAccount.authVersion !== identity.authVersion || scopedAccount.status !== 'ACTIVE'
      || (scopedAccount.credentialExpiresAt && scopedAccount.credentialExpiresAt <= masterNow)) {
      throw new ForbiddenException('Gym account access denied');
    }
    if (scopedAccount.mustChangePassword) throw new ForbiddenException('Password change required');

    let access;
    try {
      access = await this.database.master.gymAccess.findFirst({
        where: {
          userId: identity.userId,
          gymId: scopedAccount.gymId,
          linkStatus: 'ACTIVE',
          gym: { is: { slug, status: 'ACTIVE' } },
        },
        include: { gym: { include: { expectedTenantOperation: true } } },
      });
    } catch {
      throw new ServiceUnavailableException('Gym access is temporarily unavailable');
    }

    // Linked roles remain denied until task004/018 can verify durable operation
    // completion plus the reciprocal tenant tuple; never infer it from status.
    if (!access) {
      throw new ForbiddenException('Gym access denied');
    }

    let operationComplete = access.role === 'OWNER';
    let actor: TenantActor | null = null;
    let bindingVerified = access.role === 'OWNER';
    if (access.role === 'MEMBER' || access.role === 'TRAINER') {
      if (!access.enrollmentOperationId || !access.tenantActorId || access.actorKind !== access.role) {
        throw new ForbiddenException('Gym access denied');
      }
      let operation;
      try {
        operation = await this.database.master.operation.findUnique({
          where: { id: access.enrollmentOperationId },
          select: {
            kind: true,
            actorIdentityId: true,
            state: true,
            gymId: true,
            subjectIdentityId: true,
            tenantActorId: true,
            tenantCommandReceiptId: true,
          },
        });
      } catch {
        throw new ServiceUnavailableException('Gym authorization is temporarily unavailable');
      }
      const expectedKind = access.role === 'MEMBER' ? 'REGISTER_MEMBER' : 'REGISTER_TRAINER';
      const completedOperation = operation?.kind === expectedKind
        && operation.state === 'COMPLETE'
        && operation.gymId === access.gymId
        && operation.subjectIdentityId === identity.userId
        && operation.tenantActorId === access.tenantActorId
        && operation.tenantCommandReceiptId !== null
        ? operation : null;
      operationComplete = completedOperation !== null;
      if (completedOperation) {
        const tenantContext: TenantGateContext = {
          gymId: access.gymId,
          databaseName: access.gym.databaseName,
          expectedTenantSchemaVersion: access.gym.expectedTenantSchemaVersion,
          expectedTenantManifestDigest: access.gym.expectedTenantManifestDigest,
          expectedTenantOperationId: access.gym.expectedTenantOperationId,
          expectedTenantOperationState: access.gym.expectedTenantOperation?.state ?? null,
          observedTenantSchemaVersion: access.gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
          observedTenantManifestDigest: access.gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null,
        };
        try {
          actor = await this.tenantGate.withVerifiedTenant(tenantContext, async (tenant) => {
            const receipt = await tenant.commandReceipt.findUnique({ where: { id: completedOperation.tenantCommandReceiptId! } });
            if (access.role === 'MEMBER') {
              const row = await tenant.member.findUnique({ where: { id: access.tenantActorId! }, select: {
                id: true, identityId: true, registrationState: true, enrollmentOperationId: true, status: true,
              } });
              if (!row || receipt?.state !== 'COMMITTED' || receipt.sourceMasterOperationId !== access.enrollmentOperationId
                || receipt.actorIdentityId !== completedOperation.actorIdentityId || receipt.commandKind !== expectedKind || receipt.resourceId !== row.id
                || receipt.resourceType !== 'MEMBER') return null;
              return { ...row, kind: 'MEMBER' as const };
            }
            const row = await tenant.trainer.findUnique({ where: { id: access.tenantActorId! }, select: {
              id: true, identityId: true, registrationState: true, enrollmentOperationId: true, status: true,
            } });
            if (!row || receipt?.state !== 'COMMITTED' || receipt.sourceMasterOperationId !== access.enrollmentOperationId
              || receipt.actorIdentityId !== completedOperation.actorIdentityId || receipt.commandKind !== expectedKind || receipt.resourceId !== row.id
              || receipt.resourceType !== 'TRAINER') return null;
            return { ...row, kind: 'TRAINER' as const };
          });
          bindingVerified = true;
        } catch (error) {
          if (error instanceof ServiceUnavailableException) throw error;
          throw new ServiceUnavailableException('Gym authorization is temporarily unavailable');
        }
      }
    } else if (access.role !== 'OWNER') {
      throw new ForbiddenException('Gym access denied');
    }

    if (!isOperationalActor({
      identityId: identity.userId,
      gymId: access.gymId,
      gymStatus: access.gym.status,
      bindingVerified,
      operationComplete,
      access,
      actor,
    })) {
      throw new ForbiddenException('Gym access denied');
    }

    request.gymAccess = {
      identityId: identity.userId,
      // Downstream identity fences compare User.authVersion. The scoped
      // account version is independently validated against the session above.
      identityVersion: user.authVersion,
      gymId: access.gymId,
      slug: access.gym.slug,
      role: access.role,
      databaseName: access.gym.databaseName,
      expectedTenantSchemaVersion: access.gym.expectedTenantSchemaVersion,
      expectedTenantManifestDigest: access.gym.expectedTenantManifestDigest,
      expectedTenantOperationId: access.gym.expectedTenantOperationId,
      expectedTenantOperationState: access.gym.expectedTenantOperation?.state ?? null,
      observedTenantSchemaVersion: access.gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
      observedTenantManifestDigest: access.gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null,
      accessVersion: access.version,
      actor: actor ? { kind: actor.kind, id: actor.id, registrationOperationId: actor.enrollmentOperationId! } : null,
    };

    return true;
  }
}
