import { UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

export type AccessTokenIdentity = { userId: string; authVersion: number };

export async function identityFromAuthorization(
  authorization: string | undefined,
): Promise<AccessTokenIdentity> {
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Bearer token required');
  }

  const token = authorization.slice('Bearer '.length).trim();
  const secret = process.env.JWT_SECRET;
  if (!token || !secret || secret.length < 32) {
    throw new UnauthorizedException('Invalid token');
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'gymos-v2',
      audience: 'gymos-api',
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string'
      || typeof payload.authVersion !== 'number'
      || !Number.isSafeInteger(payload.authVersion)
      || payload.authVersion < 0) {
      throw new Error('Invalid identity claims');
    }
    return { userId: payload.sub, authVersion: payload.authVersion };
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
}
