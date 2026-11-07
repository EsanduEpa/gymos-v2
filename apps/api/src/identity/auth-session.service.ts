import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { DatabaseService } from '../database.service.js';
import type { SessionDeviceClass } from '../generated/master/client.js';
import { revokeSupportForActor } from '../platform/support-session.service.js';

const PERSONAL_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const SHARED_IDLE_MS = 30 * 60 * 1000;
const PERSONAL_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
const SHARED_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const ROTATION_REPLAY_GRACE_MS = 10_000;

const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
const refreshKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET is missing or too short');
  return createHmac('sha256', secret).update('gymos-refresh-token-derivation-v1').digest();
};
const nextRefreshToken = (sessionId: string, predecessorHash: string, version: number) => createHmac('sha256', refreshKey())
  .update(`${sessionId}\0${predecessorHash}\0${version}`).digest('base64url');

export type SessionIssue = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: 900;
  refreshExpiresAt: string;
  absoluteExpiresAt: string;
  deviceClass: SessionDeviceClass;
  deviceLabel: string;
};

@Injectable()
export class AuthSessionService {
  constructor(private readonly database: DatabaseService) {}

  async create(identityId: string, authVersion: number, deviceClass: SessionDeviceClass, deviceLabel: string, gymAccountId?: string): Promise<SessionIssue> {
    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const idleMs = deviceClass === 'PERSONAL' ? PERSONAL_IDLE_MS : SHARED_IDLE_MS;
    const absoluteMs = deviceClass === 'PERSONAL' ? PERSONAL_ABSOLUTE_MS : SHARED_ABSOLUTE_MS;
    const absoluteExpiresAt = new Date(now.getTime() + absoluteMs);
    const idleExpiresAt = new Date(Math.min(now.getTime() + idleMs, absoluteExpiresAt.getTime()));
    const refreshToken = randomBytes(32).toString('base64url');
    const session = await this.database.master.identitySession.create({ data: {
      identityId, gymAccountId, authVersion, deviceClass, deviceLabel, refreshTokenHash: tokenHash(refreshToken), idleExpiresAt, absoluteExpiresAt,
    }, select: { id: true } });
    return { ...await this.issueAccessToken(identityId, authVersion, session.id, gymAccountId), refreshToken, sessionId: session.id,
      expiresIn: 900, refreshExpiresAt: idleExpiresAt.toISOString(), absoluteExpiresAt: absoluteExpiresAt.toISOString(), deviceClass, deviceLabel };
  }

  async refresh(presentedToken: string, activity = false): Promise<SessionIssue> {
    const presentedHash = tokenHash(presentedToken);
    const result = await this.database.master.$transaction(async tx => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "IdentitySession"
        WHERE "refreshTokenHash" = ${presentedHash} OR "previousRefreshTokenHash" = ${presentedHash}
        FOR UPDATE`;
      const id = locked[0]?.id;
      if (!id) return { kind: 'invalid' as const };
      const session = await tx.identitySession.findUnique({ where: { id } });
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      if (!session || session.revokedAt || session.idleExpiresAt <= now || session.absoluteExpiresAt <= now) {
        if (session && !session.revokedAt) await tx.identitySession.update({ where: { id }, data: { revokedAt: now, revocationReason: 'EXPIRED' } });
        return { kind: 'invalid' as const };
      }
      const user = await tx.user.findUnique({ where: { id: session.identityId }, select: { authVersion: true, credentialExpiresAt: true } });
      if (!user || (!session.gymAccountId && user.authVersion !== session.authVersion) || (!session.gymAccountId && user.credentialExpiresAt !== null && user.credentialExpiresAt <= now)) {
        await tx.identitySession.update({ where: { id }, data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' } });
        return { kind: 'invalid' as const };
      }
      if (session.gymAccountId) {
        const account = await tx.gymAccount.findUnique({ where: { id: session.gymAccountId }, select: { userId: true, authVersion: true, status: true, credentialExpiresAt: true } });
        if (!account || account.userId !== session.identityId || account.authVersion !== session.authVersion || account.status !== 'ACTIVE' || (account.credentialExpiresAt && account.credentialExpiresAt <= now)) {
          await tx.identitySession.update({ where: { id }, data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' } });
          return { kind: 'invalid' as const };
        }
      }
      let nextToken: string;
      let nextIdleExpiresAt = session.idleExpiresAt;
      if (session.refreshTokenHash === presentedHash) {
        nextToken = nextRefreshToken(session.id, presentedHash, session.version + 1);
        const idleMs = session.deviceClass === 'PERSONAL' ? PERSONAL_IDLE_MS : SHARED_IDLE_MS;
        if (activity) nextIdleExpiresAt = new Date(Math.min(now.getTime() + idleMs, session.absoluteExpiresAt.getTime()));
        await tx.identitySession.update({ where: { id }, data: { previousRefreshTokenHash: presentedHash,
          previousRefreshValidUntil: new Date(now.getTime() + ROTATION_REPLAY_GRACE_MS), refreshTokenHash: tokenHash(nextToken),
          ...(activity ? { lastActivityAt: now, idleExpiresAt: nextIdleExpiresAt } : {}), version: { increment: 1 } } });
      } else if (session.previousRefreshTokenHash === presentedHash && session.previousRefreshValidUntil && session.previousRefreshValidUntil > now) {
        // Concurrent tabs holding the same cookie for a short window receive the same deterministic successor.
        nextToken = nextRefreshToken(session.id, presentedHash, session.version);
      } else {
        await tx.identitySession.update({ where: { id }, data: { revokedAt: now, revocationReason: 'REFRESH_REPLAY' } });
        return { kind: 'replay' as const };
      }
      return { kind: 'ok' as const, session, user, nextToken, idleExpiresAt: nextIdleExpiresAt };
    });
    if (result.kind !== 'ok') throw new UnauthorizedException(result.kind === 'replay' ? 'Session renewal replay detected' : 'Session renewal is invalid');
    return { ...await this.issueAccessToken(result.session.identityId, result.session.authVersion, result.session.id, result.session.gymAccountId ?? undefined),
      refreshToken: result.nextToken, sessionId: result.session.id, expiresIn: 900,
      refreshExpiresAt: result.idleExpiresAt.toISOString(), absoluteExpiresAt: result.session.absoluteExpiresAt.toISOString(),
      deviceClass: result.session.deviceClass, deviceLabel: result.session.deviceLabel };
  }

  async assertActive(identityId: string, authVersion: number, sessionId: string): Promise<void> {
    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const session = await this.database.master.identitySession.findUnique({ where: { id: sessionId },
      select: { identityId: true, gymAccountId: true, authVersion: true, idleExpiresAt: true, absoluteExpiresAt: true, revokedAt: true } });
    if (!session || session.identityId !== identityId || session.authVersion !== authVersion || session.revokedAt
      || session.idleExpiresAt <= now || session.absoluteExpiresAt <= now) throw new UnauthorizedException('Session revoked or expired');
    const current = await this.database.master.user.findUnique({ where: { id: identityId }, select: { authVersion: true, credentialExpiresAt: true } });
    if (!current || (!session.gymAccountId && current.authVersion !== authVersion) || (!session.gymAccountId && current.credentialExpiresAt !== null && current.credentialExpiresAt <= now)) {
      throw new UnauthorizedException('Session revoked or expired');
    }
    if (session.gymAccountId) {
      const account = await this.database.master.gymAccount.findUnique({ where: { id: session.gymAccountId }, select: { userId: true, authVersion: true, status: true, credentialExpiresAt: true } });
      if (!account || account.userId !== identityId || account.authVersion !== session.authVersion || account.status !== 'ACTIVE' || (account.credentialExpiresAt && account.credentialExpiresAt <= now)) {
        throw new UnauthorizedException('Session revoked or expired');
      }
    }
  }

  async list(identityId: string, currentSessionId: string, gymAccountId?: string) {
    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const user = await this.database.master.user.findUniqueOrThrow({ where: { id: identityId }, select: { authVersion: true } });
    const account = gymAccountId ? await this.database.master.gymAccount.findUnique({ where: { id: gymAccountId }, select: { authVersion: true } }) : null;
    const rows = await this.database.master.identitySession.findMany({ where: { identityId, gymAccountId: gymAccountId ?? null, revokedAt: null,
      authVersion: gymAccountId ? account?.authVersion ?? -1 : user.authVersion, idleExpiresAt: { gt: now }, absoluteExpiresAt: { gt: now } },
      orderBy: [{ lastActivityAt: 'desc' }, { id: 'asc' }], take: 50,
      select: { id: true, deviceClass: true, deviceLabel: true, createdAt: true, lastActivityAt: true, idleExpiresAt: true, absoluteExpiresAt: true } });
    return { items: rows.map(row => ({ ...row, current: row.id === currentSessionId, createdAt: row.createdAt.toISOString(),
      lastActivityAt: row.lastActivityAt.toISOString(), idleExpiresAt: row.idleExpiresAt.toISOString(), absoluteExpiresAt: row.absoluteExpiresAt.toISOString() })) };
  }

  async revokeCurrent(identityId: string, sessionId: string) {
    await this.database.master.$transaction(async tx => {
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const session = await tx.identitySession.findUnique({ where: { id: sessionId }, select: { identityId: true, gymAccountId: true } });
      const changed = await tx.identitySession.updateMany({ where: { id: sessionId, identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'CURRENT_DEVICE_LOGOUT' } });
      if (!changed.count) throw new UnauthorizedException('Session is already revoked or unavailable');
      await tx.identitySecurityEvent.create({ data: { identityId, gymAccountId: session?.identityId === identityId ? session.gymAccountId : null,
        event: 'SESSIONS_REVOKED', createdAt: now } });
      await revokeSupportForActor(tx, identityId, 'LOGOUT_REVOKED');
    });
  }

  async revokeOther(identityId: string, sessionId: string, targetSessionId: string, gymAccountId?: string) {
    if (targetSessionId === sessionId) return { revoked: false as const };
    return this.database.master.$transaction(async tx => {
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const changed = await tx.identitySession.updateMany({ where: { id: targetSessionId, identityId, gymAccountId: gymAccountId ?? null, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'ADMIN_REVOKED' } });
      if (!changed.count) return { revoked: false as const };
      await tx.identitySecurityEvent.create({ data: { identityId, gymAccountId: gymAccountId ?? null, event: 'SESSIONS_REVOKED', createdAt: now } });
      return { revoked: true as const };
    });
  }

  async revokeAll(identityId: string) {
    const [{ now }] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    await this.database.master.$transaction(async tx => {
      await tx.identitySession.updateMany({ where: { identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'ALL_DEVICE_LOGOUT' } });
      await tx.user.updateMany({ where: { id: identityId }, data: { authVersion: { increment: 1 } } });
      await tx.identitySecurityEvent.create({ data: { identityId, event: 'SESSIONS_REVOKED', createdAt: now } });
      await revokeSupportForActor(tx, identityId, 'LOGOUT_REVOKED');
    });
  }

  async logout(identityId: string, authVersion: number, sessionId: string | undefined, scope: 'CURRENT' | 'ALL', gymAccountId?: string) {
    if (scope === 'CURRENT' && sessionId) {
      await this.revokeCurrent(identityId, sessionId);
      return { revoked: true as const };
    }
    if (gymAccountId) {
      await this.database.master.$transaction(async tx => {
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const changed = await tx.identitySession.updateMany({ where: { identityId, gymAccountId, revokedAt: null },
          data: { revokedAt: now, revocationReason: 'ALL_DEVICE_LOGOUT' } });
        if (!changed.count) throw new UnauthorizedException('Invalid or expired session');
        await tx.gymAccount.update({ where: { id: gymAccountId }, data: { authVersion: { increment: 1 } } });
        await tx.identitySecurityEvent.create({ data: { identityId, gymAccountId, event: 'SESSIONS_REVOKED', createdAt: now } });
      });
      return { revoked: true as const };
    }
    const changed = await this.database.master.$transaction(async tx => {
      const updated = await tx.user.updateMany({ where: { id: identityId, authVersion }, data: { authVersion: { increment: 1 } } });
      if (updated.count !== 1) return false;
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      await tx.identitySession.updateMany({ where: { identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'ALL_DEVICE_LOGOUT' } });
      await tx.identitySecurityEvent.create({ data: { identityId, event: 'SESSIONS_REVOKED', createdAt: now } });
      await revokeSupportForActor(tx, identityId, 'LOGOUT_REVOKED');
      return true;
    });
    if (!changed) throw new UnauthorizedException('Invalid or expired session');
    return { revoked: true as const };
  }

  private async issueAccessToken(identityId: string, authVersion: number, sessionId: string, gymAccountId?: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET is missing or too short');
    const accessToken = await new SignJWT({ authVersion, sid: sessionId, ...(gymAccountId ? { gaid: gymAccountId } : {}) }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(identityId).setIssuer('gymos-v2').setAudience('gymos-api').setIssuedAt().setExpirationTime('15m')
      .sign(new TextEncoder().encode(secret));
    return { accessToken, tokenType: 'Bearer' as const };
  }
}

export function classifyDevice(userAgent: string | undefined): string {
  const agent = userAgent ?? '';
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome'
    : /Safari\//.test(agent) ? 'Safari' : 'Web browser';
  const os = /iPhone|iPad/.test(agent) ? 'iOS' : /Android/.test(agent) ? 'Android' : /Mac OS X/.test(agent) ? 'macOS'
    : /Windows/.test(agent) ? 'Windows' : /Linux/.test(agent) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`.slice(0, 80);
}
