import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { userIdFromAuthorization } from './auth-token.js';
import { DatabaseService } from './database.service.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = await userIdFromAuthorization(request.headers.authorization);
    const user = await this.database.master.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.globalRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admin access required');
    }
    return true;
  }
}
