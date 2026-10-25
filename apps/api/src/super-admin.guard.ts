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

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const identity = await identityFromAuthorization(request.headers.authorization);
    let user;
    let masterNow: Date;
    try {
      user = await this.database.master.user.findUnique({
        where: { id: identity.userId },
        select: { globalRole: true, authVersion: true, mustChangePassword: true, credentialExpiresAt: true },
      });
      const [clock] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
      masterNow = clock.now;
    } catch {
      throw new ServiceUnavailableException('Identity verification is temporarily unavailable');
    }
    if (!user) throw new UnauthorizedException('User not found');
    if (user.authVersion !== identity.authVersion) throw new UnauthorizedException('Invalid or revoked token');
    if (user.credentialExpiresAt && user.credentialExpiresAt <= masterNow) throw new UnauthorizedException('Credential expired');
    if (user.mustChangePassword) throw new ForbiddenException('Password change required');
    if (user.globalRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admin access required');
    }
    return true;
  }
}
