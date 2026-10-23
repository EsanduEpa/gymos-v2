import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { userIdFromAuthorization } from './auth-token.js';
import { DatabaseService } from './database.service.js';

export type GymRequest = Request & {
  gymAccess?: {
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
  };
};

@Injectable()
export class GymAccessGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GymRequest>();
    const userId = await userIdFromAuthorization(request.headers.authorization);

    const slug = request.params.slug;
    if (typeof slug !== 'string') {
      throw new ForbiddenException('Gym access denied');
    }

    let access;
    try {
      access = await this.database.master.gymAccess.findFirst({
        where: {
          userId,
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
    if (!access || access.role !== 'OWNER') {
      throw new ForbiddenException('Gym access denied');
    }

    request.gymAccess = {
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
    };

    return true;
  }
}
