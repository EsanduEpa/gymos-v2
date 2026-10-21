import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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

    const access = await this.database.master.gymAccess.findFirst({
      where: {
        userId,
        gym: { is: { slug, status: 'ACTIVE' } },
      },
      include: { gym: true },
    });

    if (!access) {
      throw new ForbiddenException('Gym access denied');
    }

    request.gymAccess = {
      gymId: access.gymId,
      slug: access.gym.slug,
      role: access.role,
      databaseName: access.gym.databaseName,
    };

    return true;
  }
}
