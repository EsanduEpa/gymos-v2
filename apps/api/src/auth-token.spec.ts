import { SignJWT } from 'jose';
import { identityFromAuthorization } from './auth-token.js';

describe('versioned access token verification', () => {
  const previousSecret = process.env.JWT_SECRET;
  const secret = 'task016-test-secret-with-at-least-32-bytes';
  const key = new TextEncoder().encode(secret);

  beforeEach(() => { process.env.JWT_SECRET = secret; });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  async function token(payload: Record<string, unknown>, expiration: string | number = '5m') {
    return new SignJWT({ sid: "session-016", ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('identity-016')
      .setIssuer('gymos-v2')
      .setAudience('gymos-api')
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(key);
  }

  it('returns the identity and security version from a valid token', async () => {
    const signed = await token({ authVersion: 7 });
    await expect(identityFromAuthorization(`Bearer ${signed}`)).resolves.toEqual({
      userId: 'identity-016', authVersion: 7, sessionId: 'session-016',
    });
  });

  it('rejects expired, tampered, and unversioned tokens', async () => {
    const expired = await token({ authVersion: 0 }, Math.floor(new Date('2000-01-01T00:00:00Z').getTime() / 1000));
    const valid = await token({ authVersion: 0 });
    const [header, , signature] = valid.split('.');
    const changedPayload = Buffer.from(JSON.stringify({
      sub: 'other-identity', authVersion: 0, iss: 'gymos-v2', aud: 'gymos-api',
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300,
    })).toString('base64url');
    const tampered = `${header}.${changedPayload}.${signature}`;
    const unversioned = await token({});

    await expect(identityFromAuthorization(`Bearer ${expired}`)).rejects.toThrow('Invalid or expired token');
    await expect(identityFromAuthorization(`Bearer ${tampered}`)).rejects.toThrow('Invalid or expired token');
    await expect(identityFromAuthorization(`Bearer ${unversioned}`)).rejects.toThrow('Invalid or expired token');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
const previous = process.env.JWT_SECRET;
afterEach(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
async function token(claims: Record<string, unknown>) {
  process.env.JWT_SECRET = 'synthetic-unit-test-signing-secret-20261107';
  return 'Bearer ' + await new SignJWT({ authVersion: 0, ...claims }).setProtectedHeader({ alg: 'HS256' }).setSubject('synthetic').setIssuer('gymos-v2').setAudience('gymos-api').sign(new TextEncoder().encode(process.env.JWT_SECRET));
}
describe('access token session and lifetime requirements', () => {
  it('rejects legacy tokens without a durable session', async () => {
    const now = Math.floor(Date.now()/1000);
    await expect(identityFromAuthorization(await token({ iat: now, exp: now + 900 }))).rejects.toThrow();
  });
  it('rejects absent or overlong expiry', async () => {
    const now = Math.floor(Date.now()/1000);
    await expect(identityFromAuthorization(await token({ sid: 'session', iat: now }))).rejects.toThrow();
    await expect(identityFromAuthorization(await token({ sid: 'session', iat: now, exp: now + 901 }))).rejects.toThrow();
  });
  it('accepts current session-bound tokens', async () => {
    const now = Math.floor(Date.now()/1000);
    await expect(identityFromAuthorization(await token({ sid: 'session', iat: now, exp: now + 900 }))).resolves.toMatchObject({ sessionId: 'session', userId: 'synthetic' });
  });
});
