import { ForbiddenException, ServiceUnavailableException, type ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import type { DatabaseService } from './database.service.js';
import { GymAccessGuard } from './gym-access.guard.js';
import type { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';

describe('GymAccessGuard availability boundary', () => {
  it('denies platform administrators before resolving any gym access link', async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'task005-test-secret-at-least-32-bytes-long';
    try {
      const token = await new SignJWT({ authVersion: 0 })
        .setProtectedHeader({ alg: 'HS256' }).setSubject('platform-admin')
        .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('5m')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
      const findFirst = vi.fn();
      const guard = new GymAccessGuard({ master: {
        user: { findUnique: async () => ({ authVersion: 0, globalRole: 'SUPER_ADMIN', mustChangePassword: false, credentialExpiresAt: null }) },
        $queryRaw: async () => [{ now: new Date() }], gymAccess: { findFirst },
      } } as unknown as DatabaseService, {} as TenantSchemaGateService);
      const execution = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${token}` }, params: { slug: 'any-gym' } }) }) } as ExecutionContext;
      await expect(guard.canActivate(execution)).rejects.toBeInstanceOf(ForbiddenException);
      expect(findFirst).not.toHaveBeenCalled();
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });

  it('returns a sanitized 503 when Master access resolution is unavailable', async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'task005-test-secret-at-least-32-bytes-long';
    try {
      const token = await new SignJWT({ authVersion: 0 })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('task005-user')
        .setIssuer('gymos-v2')
        .setAudience('gymos-api')
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
      const request = { headers: { authorization: `Bearer ${token}` }, params: { slug: 'task005-gym' } };
      const guard = new GymAccessGuard({ master: {
        user: { findUnique: async () => ({ authVersion: 0, mustChangePassword: false, credentialExpiresAt: null }) },
        $queryRaw: async () => [{ now: new Date() }],
        gymAccess: { findFirst: async () => {
          throw new Error('postgresql://sensitive:details@remote.example.invalid/gym');
        } },
      } } as unknown as DatabaseService, {} as TenantSchemaGateService);
      const execution = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext;
      const error = await guard.canActivate(execution).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as Error).message).toBe('Gym access is temporarily unavailable');
      expect(JSON.stringify(error)).not.toContain('remote.example.invalid');
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
