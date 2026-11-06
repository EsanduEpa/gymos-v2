import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import argon2 from 'argon2';
import { z } from 'zod';
import { identityEmailSchema } from './identity/email.js';
import { DatabaseService } from './database.service.js';
import { identityFromAuthorization } from './auth-token.js';
import { AuthSessionService, classifyDevice } from './identity/auth-session.service.js';
import { sessionDeviceClassSchema, sessionLogoutInputSchema, sessionRevocationResultSchema, sessionListSchema } from '@gymos/contracts';

const loginInput = z.strictObject({
  email: identityEmailSchema,
  password: z.string().min(1).max(1024),
  deviceClass: sessionDeviceClassSchema.optional().default('SHARED'),
});
const refreshInput = z.strictObject({ refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/), activity: z.boolean().optional().default(false) });

@Controller('auth')
export class AuthController {
  constructor(private readonly database: DatabaseService, private readonly sessions: AuthSessionService = new AuthSessionService(database)) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: unknown, @Req() request?: { headers?: { 'user-agent'?: string } }) {
    const parsed = loginInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter a valid email and password');
    }

    const email = parsed.data.email;
    const user = await this.database.master.user.findUnique({
      where: { email },
      include: { gymAccesses: { include: { gym: true } } },
    });

    // Spend password-hash work for unknown email addresses too, so a fast
    // missing-user path does not become an account-discovery oracle.
    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, parsed.data.password)
      : (await argon2.hash(parsed.data.password, { type: argon2.argon2id }), false);

    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
    const credentialExpired = Boolean(user && (user.mustChangePassword
      ? !user.credentialExpiresAt || user.credentialExpiresAt <= now
      : user.credentialExpiresAt && user.credentialExpiresAt <= now));

    if (!user || !passwordMatches || credentialExpired) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const issued = await this.sessions.create(user.id, user.authVersion, parsed.data.deviceClass,
      classifyDevice(request?.headers?.['user-agent']));

    return {
      ...issued,
      tokenType: 'Bearer',
      globalRole: user.globalRole,
      mustChangePassword: user.mustChangePassword,
      gyms: user.gymAccesses
        .filter((access) => access.gym.status === 'ACTIVE' && access.linkStatus === 'ACTIVE')
        .map((access) => ({
          id: access.gym.id,
          slug: access.gym.slug,
          name: access.gym.name,
          role: access.role,
        })),
    };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(@Body() body: unknown) {
    const parsed = refreshInput.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException('Session renewal is invalid');
    try { return await this.sessions.refresh(parsed.data.refreshToken, parsed.data.activity); }
    catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException('Session renewal is temporarily unavailable');
    }
  }

  @Post('logout')
  async logout(@Req() request: { headers: { authorization?: string } }, @Body() body?: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const parsed = body === undefined ? { success: true as const, data: { scope: 'ALL' as const } }
      : sessionLogoutInputSchema.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException('Invalid logout request');
    try {
      return await this.sessions.logout(identity.userId, identity.authVersion, identity.sessionId, parsed.data.scope);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException('Session revocation could not be confirmed');
    }
  }

  @Get('session')
  async session(@Req() request: { headers: { authorization?: string } }) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new UnauthorizedException('Sign in again to continue');
    await this.sessions.assertActive(identity.userId, identity.authVersion, identity.sessionId);
    const user = await this.database.master.user.findUnique({
      where: { id: identity.userId },
      include: { gymAccesses: { include: { gym: true } } },
    });
    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
    if (!user || user.authVersion !== identity.authVersion
      || (user.credentialExpiresAt !== null && user.credentialExpiresAt <= now)) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (user.mustChangePassword) {
      throw new ForbiddenException('Password change required');
    }
    const activeSession = await this.database.master.identitySession.findUnique({ where: { id: identity.sessionId },
      select: { id: true, deviceClass: true, deviceLabel: true, createdAt: true, lastActivityAt: true, idleExpiresAt: true, absoluteExpiresAt: true } });
    if (!activeSession) throw new UnauthorizedException('Invalid or expired session');

    return {
      globalRole: user.globalRole,
      mustChangePassword: false,
      identityId: user.id,
      displayName: user.displayName?.slice(0, 200) ?? null,
      sessionId: activeSession.id,
      deviceClass: activeSession.deviceClass,
      deviceLabel: activeSession.deviceLabel,
      refreshExpiresAt: activeSession.idleExpiresAt.toISOString(),
      absoluteExpiresAt: activeSession.absoluteExpiresAt.toISOString(),
      lastActivityAt: activeSession.lastActivityAt.toISOString(),
      gyms: user.gymAccesses
        .filter((access) => access.gym.status === 'ACTIVE' && access.linkStatus === 'ACTIVE')
        .map((access) => ({ id: access.gym.id, slug: access.gym.slug, name: access.gym.name, role: access.role })),
    };
  }

  @Get('sessions')
  async sessionsList(@Req() request: { headers: { authorization?: string } }) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new UnauthorizedException('Sign in again to continue');
    await this.sessions.assertActive(identity.userId, identity.authVersion, identity.sessionId);
    return sessionListSchema.parse(await this.sessions.list(identity.userId, identity.sessionId));
  }

  @Post('sessions/:sessionId/revoke')
  async revokeSession(@Req() request: { headers: { authorization?: string } }, @Param('sessionId') sessionId: string) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new UnauthorizedException('Sign in again to continue');
    await this.sessions.assertActive(identity.userId, identity.authVersion, identity.sessionId);
    const result = await this.sessions.revokeOther(identity.userId, identity.sessionId, sessionId);
    return sessionRevocationResultSchema.parse({ sessionId, revoked: result.revoked });
  }
}
