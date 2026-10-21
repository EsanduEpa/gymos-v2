import { UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

export async function userIdFromAuthorization(
  authorization: string | undefined,
): Promise<string> {
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
    if (typeof payload.sub !== 'string') {
      throw new Error('Missing user ID');
    }
    return payload.sub;
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
}
