import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';
import type { PrismaClient } from '../../../api/src/generated/master/client.js';

export async function installBrowserSession(input: {
  page: Page;
  master: PrismaClient;
  identityId: string;
  gymId?: string;
  jwtSecret: string;
  origin: string;
  accessLifetimeSeconds?: number;
  idleLifetimeMs?: number;
  expired?: boolean;
}) {
  const user = await input.master.user.findUniqueOrThrow({ where: { id: input.identityId }, select: { authVersion: true, passwordHash: true } });
  const gymAccount = input.gymId ? await input.master.gymAccount.upsert({ where: { userId_gymId: { userId: input.identityId, gymId: input.gymId } },
    create: { userId: input.identityId, gymId: input.gymId, username: `browser-${input.identityId}-${input.gymId}`, passwordHash: user.passwordHash, status: 'ACTIVE' },
    update: { status: 'ACTIVE', mustChangePassword: false, credentialExpiresAt: null } }) : null;
  const authVersion = gymAccount?.authVersion ?? user.authVersion;
  const now = new Date();
  const idleLifetimeMs = input.idleLifetimeMs ?? 30 * 60_000;
  const refreshToken = randomBytes(32).toString('base64url');
  const session = await input.master.identitySession.create({ data: {
    identityId: input.identityId, ...(gymAccount ? { gymAccountId: gymAccount.id } : {}), authVersion, deviceClass: 'SHARED', deviceLabel: 'Synthetic browser test',
    refreshTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
    idleExpiresAt: new Date(now.getTime() + idleLifetimeMs),
    absoluteExpiresAt: new Date(now.getTime() + 8 * 60 * 60_000),
    ...(input.expired ? { revokedAt: now, revocationReason: 'EXPIRED' } : {}),
  }, select: { id: true } });
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: input.identityId, authVersion, ...(gymAccount ? { gaid: gymAccount.id } : {}), sid: session.id,
    iss: 'gymos-v2', aud: 'gymos-api', iat: issuedAt, exp: issuedAt + (input.accessLifetimeSeconds ?? 900) })).toString('base64url');
  const signature = createHmac('sha256', input.jwtSecret).update(`${header}.${payload}`).digest('base64url');
  await input.page.goto('about:blank');
  await input.page.context().clearCookies();
  await input.page.context().addCookies([
    { name: 'gymos_access_token', value: `${header}.${payload}.${signature}`, url: input.origin, httpOnly: true, sameSite: 'Lax' },
    { name: 'gymos_refresh_token', value: refreshToken, url: input.origin, httpOnly: true, sameSite: 'Lax' },
  ]);
  return { sessionId: session.id, accessToken: `${header}.${payload}.${signature}`, refreshToken };
}
