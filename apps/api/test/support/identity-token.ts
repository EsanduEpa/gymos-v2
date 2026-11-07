import { createHash, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import type { PrismaClient } from '../../src/generated/master/client.js';

export async function identityToken(master: PrismaClient, secret: string, identityId: string, authVersion = 0, sessionId?: string) {
  const now = Date.now();
  const sid = sessionId ?? (await master.identitySession.create({ data: {
    identityId, authVersion, deviceClass: 'PERSONAL', deviceLabel: 'Integration fixture',
    refreshTokenHash: createHash('sha256').update(randomUUID()).digest('hex'),
    idleExpiresAt: new Date(now + 600_000), absoluteExpiresAt: new Date(now + 900_000),
  } })).id;
  return new SignJWT({ authVersion, sid }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(identityId).setIssuer('gymos-v2').setAudience('gymos-api')
    .setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
