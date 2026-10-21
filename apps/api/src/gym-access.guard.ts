import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify } from 'jose';
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
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = header.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET;

    if (!token || !secret || secret.length < 32) {
      throw new UnauthorizedException('Invalid token');
    }

    let userId: string;

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
        {
          issuer: 'gymos-v2',
          audience: 'gymos-api',
          algorithms: ['HS256'],
        },
      );

      if (typeof payload.sub !== 'string') {
        throw new Error('Missing user ID');
      }

      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

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
