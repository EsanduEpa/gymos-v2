import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { identityFromAuthorization } from '../auth-token.js';
import { AuthSessionService } from './auth-session.service.js';

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(private readonly sessions: AuthSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization) return true;
    const identity = await identityFromAuthorization(authorization);
    await this.sessions.assertActive(identity.userId, identity.authVersion, identity.sessionId!);
    return true;
  }
}
