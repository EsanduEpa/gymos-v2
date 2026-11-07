import {
  BadRequestException,
  Body,
  ConflictException,
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
import { gymAccountSetupSchema, gymAccountSetupResultSchema } from '@gymos/contracts/credentials';
import { appendMasterVersionAudit } from './operations/transaction-audit.js';

const loginInput = z.strictObject({
  email: z.string().trim().toLowerCase().min(3).max(254).regex(/^[a-z0-9_.@+-]+$/),
  password: z.string().min(1).max(1024),
  deviceClass: sessionDeviceClassSchema.optional().default('SHARED'),
});
const refreshInput = z.strictObject({ refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/), activity: z.boolean().optional().default(false) });

@Controller('auth')
export class AuthController {
  constructor(private readonly database: DatabaseService, private readonly sessions: AuthSessionService = new AuthSessionService(database)) {}

  @Post('gym-account/setup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async setupGymAccount(@Body() body: unknown) {
    const parsed = gymAccountSetupSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Check the gym, username and password details');
    const input = parsed.data;
    return this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "email" = ${input.legacyEmail} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { email: input.legacyEmail } });
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      if (!user || user.globalRole !== 'USER' || user.mustChangePassword || (user.credentialExpiresAt && user.credentialExpiresAt <= now)
        || !(await argon2.verify(user.passwordHash, input.legacyPassword))) {
        throw new UnauthorizedException('Account setup details are invalid');
      }
      const gym = await tx.gym.findUnique({ where: { slug: input.gymSlug }, select: { id: true, status: true } });
      if (!gym || gym.status !== 'ACTIVE') throw new UnauthorizedException('Account setup details are invalid');
      const access = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: user.id, gymId: gym.id } }, select: { linkStatus: true } });
      if (!access || access.linkStatus !== 'ACTIVE') throw new UnauthorizedException('Account setup details are invalid');
      const existing = await tx.gymAccount.findUnique({ where: { userId_gymId: { userId: user.id, gymId: gym.id } } });
      if (existing?.status === 'ACTIVE' || existing?.status === 'DISABLED') throw new ConflictException('This gym account is already set up or unavailable');
      const occupied = await tx.gymAccount.findUnique({ where: { username: input.username }, select: { id: true } });
      if (occupied) throw new ConflictException('Choose another username');
      const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
      const account = existing
        ? await tx.gymAccount.update({ where: { id: existing.id }, data: { username: input.username, passwordHash, status: 'ACTIVE', passwordChangedAt: now, version: { increment: 1 } } })
        : await tx.gymAccount.create({ data: { userId: user.id, gymId: gym.id, username: input.username, displayName: user.displayName,
          passwordHash, status: 'ACTIVE', passwordChangedAt: now } });
      await tx.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
      await tx.identitySession.updateMany({ where: { identityId: user.id, revokedAt: null }, data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' } });
      await appendMasterVersionAudit(tx, { actorIdentityId: user.id, eventCode: 'GYM_ACCOUNT_SETUP', resourceType: 'GYM_ACCOUNT',
        resourceId: account.id, committedVersion: account.version, transition: { from: 'SETUP_REQUIRED', to: 'ACTIVE' } });
      return gymAccountSetupResultSchema.parse({ success: true });
    });
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: unknown, @Req() request?: { headers?: { 'user-agent'?: string } }) {
    const parsed = loginInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter a valid email and password');
    }

    const email = parsed.data.email;
    let account = await this.database.master.gymAccount.findUnique({ where: { username: email },
      include: { user: true, access: { include: { gym: true } } } });
    const legacyUser = !account && identityEmailSchema.safeParse(email).success
      ? await this.database.master.user.findUnique({ where: { email }, include: { gymAccesses: { include: { gym: true } } } }) : null;
    if (!account && legacyUser?.globalRole === 'USER' && legacyUser.gymAccesses.length === 1) {
      const link = legacyUser.gymAccesses[0]!;
      account = await this.database.master.gymAccount.upsert({ where: { userId_gymId: { userId: legacyUser.id, gymId: link.gymId } },
        create: { userId: legacyUser.id, gymId: link.gymId, username: legacyUser.email, passwordHash: legacyUser.passwordHash,
          displayName: legacyUser.displayName,
          status: 'ACTIVE', mustChangePassword: legacyUser.mustChangePassword, credentialExpiresAt: legacyUser.credentialExpiresAt,
          passwordChangedAt: legacyUser.passwordChangedAt, authVersion: legacyUser.authVersion }, update: {},
        include: { user: true, access: { include: { gym: true } } } });
    }
    const user = account?.user ?? (legacyUser?.globalRole === 'SUPER_ADMIN' || legacyUser?.gymAccesses.length === 0 ? legacyUser : null);

    // Spend password-hash work for unknown email addresses too, so a fast
    // missing-user path does not become an account-discovery oracle.
    const passwordMatches = user
      ? await argon2.verify(account?.passwordHash ?? user.passwordHash, parsed.data.password)
      : (await argon2.hash(parsed.data.password, { type: argon2.argon2id }), false);

    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
    const credential = account ?? user;
    const credentialExpired = Boolean(credential && (credential.mustChangePassword
      ? !credential.credentialExpiresAt || credential.credentialExpiresAt <= now
      : credential.credentialExpiresAt && credential.credentialExpiresAt <= now));

    if (!user || (account && account.status !== 'ACTIVE') || !passwordMatches || credentialExpired) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const issued = await this.sessions.create(user.id, account?.authVersion ?? user.authVersion, parsed.data.deviceClass,
      classifyDevice(request?.headers?.['user-agent']), account?.id);

    return {
      ...issued,
      tokenType: 'Bearer',
      globalRole: user.globalRole,
      mustChangePassword: credential!.mustChangePassword,
      gyms: (account ? [account.access] : [])
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
      return await this.sessions.logout(identity.userId, identity.authVersion, identity.sessionId, parsed.data.scope, identity.gymAccountId);
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
    const account = identity.gymAccountId ? await this.database.master.gymAccount.findUnique({ where: { id: identity.gymAccountId },
      include: { access: { include: { gym: true } } } }) : null;
    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
    if (!user || (!account && user.authVersion !== identity.authVersion)
      || (account ? account.userId !== user.id || account.status !== 'ACTIVE' || account.authVersion !== identity.authVersion || (account.credentialExpiresAt !== null && account.credentialExpiresAt <= now)
        : user.credentialExpiresAt !== null && user.credentialExpiresAt <= now)) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (account?.mustChangePassword ?? user.mustChangePassword) {
      throw new ForbiddenException('Password change required');
    }
    const activeSession = await this.database.master.identitySession.findUnique({ where: { id: identity.sessionId },
      select: { id: true, gymAccountId: true, deviceClass: true, deviceLabel: true, createdAt: true, lastActivityAt: true, idleExpiresAt: true, absoluteExpiresAt: true } });
    if (!activeSession || activeSession.gymAccountId !== (identity.gymAccountId ?? null)) throw new UnauthorizedException('Invalid or expired session');

    return {
      globalRole: user.globalRole,
      mustChangePassword: false,
      identityId: user.id,
      displayName: (account?.displayName ?? user.displayName)?.slice(0, 200) ?? null,
      sessionId: activeSession.id,
      deviceClass: activeSession.deviceClass,
      deviceLabel: activeSession.deviceLabel,
      refreshExpiresAt: activeSession.idleExpiresAt.toISOString(),
      absoluteExpiresAt: activeSession.absoluteExpiresAt.toISOString(),
      lastActivityAt: activeSession.lastActivityAt.toISOString(),
      gyms: (account ? [account.access] : [])
        .filter((access) => access.gym.status === 'ACTIVE' && access.linkStatus === 'ACTIVE')
        .map((access) => ({ id: access.gym.id, slug: access.gym.slug, name: access.gym.name, role: access.role })),
    };
  }

  @Get('sessions')
  async sessionsList(@Req() request: { headers: { authorization?: string } }) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new UnauthorizedException('Sign in again to continue');
    await this.sessions.assertActive(identity.userId, identity.authVersion, identity.sessionId);
    return sessionListSchema.parse(await this.sessions.list(identity.userId, identity.sessionId, identity.gymAccountId));
  }

  @Post('sessions/:sessionId/revoke')
  async revokeSession(@Req() request: { headers: { authorization?: string } }, @Param('sessionId') sessionId: string) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new UnauthorizedException('Sign in again to continue');
    await this.sessions.assertActive(identity.userId, identity.authVersion, identity.sessionId);
    const result = await this.sessions.revokeOther(identity.userId, identity.sessionId, sessionId, identity.gymAccountId);
    return sessionRevocationResultSchema.parse({ sessionId, revoked: result.revoked });
  }
}
