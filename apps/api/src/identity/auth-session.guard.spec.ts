import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AuthSessionGuard } from './auth-session.guard.js';
import type { AuthSessionService } from './auth-session.service.js';

describe('AuthSessionGuard', () => {
  const previousSecret = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = 'cf02-guard-test-secret-at-least-32-bytes-long'; });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  async function token(sessionId?: string) {
    const claims: Record<string, unknown> = { authVersion: 3 };
    if (sessionId) claims.sid = sessionId;
    return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setSubject('identity-1')
      .setIssuer('gymos-v2').setAudience('gymos-api').setIssuedAt().setExpirationTime('5m')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  }

  function execution(authorization?: string) {
    return { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) } as ExecutionContext;
  }

  it('checks session-bound bearer tokens globally and rejects legacy tokens', async () => {
    const assertActive = vi.fn().mockResolvedValue(undefined);
    const guard = new AuthSessionGuard({ assertActive } as unknown as AuthSessionService);
    await expect(guard.canActivate(execution(`Bearer ${await token('session-1')}`))).resolves.toBe(true);
    expect(assertActive).toHaveBeenCalledWith('identity-1', 3, 'session-1');
    await expect(guard.canActivate(execution(`Bearer ${await token()}`))).rejects.toThrow('Invalid or expired token');
    expect(assertActive).toHaveBeenCalledTimes(1);
  });

  it('denies protected requests immediately when their durable session is revoked', async () => {
    const assertActive = vi.fn().mockRejectedValue(new UnauthorizedException('Session revoked or expired'));
    const guard = new AuthSessionGuard({ assertActive } as unknown as AuthSessionService);
    await expect(guard.canActivate(execution(`Bearer ${await token('revoked-session')}`)))
      .rejects.toThrow('Session revoked or expired');
  });
});
