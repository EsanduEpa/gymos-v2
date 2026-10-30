import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { identityEmailSchema } from './identity/email.js';
import { DatabaseService } from './database.service.js';
import { identityFromAuthorization } from './auth-token.js';

const loginInput = z.strictObject({
  email: identityEmailSchema,
  password: z.string().min(1).max(1024),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly database: DatabaseService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: unknown) {
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

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET is missing or too short');
    }

    const accessToken = await new SignJWT({ authVersion: user.authVersion })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('gymos-v2')
      .setAudience('gymos-api')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(secret));

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
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

  @Post('logout')
  async logout(@Req() request: { headers: { authorization?: string } }) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    try {
      // Version CAS makes concurrent logout requests rotate exactly once and
      // prevents a stale request from revoking a later replacement session.
      const revoked = await this.database.master.$transaction(async (tx) => tx.user.updateMany({
        where: { id: identity.userId, authVersion: identity.authVersion },
        data: { authVersion: { increment: 1 } },
      }));
      if (revoked.count !== 1) throw new UnauthorizedException('Invalid or expired session');
      return { revoked: true };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException('Session revocation could not be confirmed');
    }
  }

  @Get('session')
  async session(@Req() request: { headers: { authorization?: string } }) {
    const identity = await identityFromAuthorization(request.headers.authorization);
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

    return {
      globalRole: user.globalRole,
      mustChangePassword: false,
      identityId: user.id,
      displayName: user.displayName?.slice(0, 200) ?? null,
      gyms: user.gymAccesses
        .filter((access) => access.gym.status === 'ACTIVE' && access.linkStatus === 'ACTIVE')
        .map((access) => ({ id: access.gym.id, slug: access.gym.slug, name: access.gym.name, role: access.role })),
    };
  }
}
