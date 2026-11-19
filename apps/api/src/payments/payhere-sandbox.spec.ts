import { afterEach, expect, it, vi } from 'vitest';
import { payHereSandboxCheckoutConfig } from './payhere-sandbox.js';

afterEach(() => vi.unstubAllEnvs());

it('limits the hosted Sandbox mode to membership checkout', () => {
  vi.stubEnv('GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED', '1');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_ID', '12345');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET', 'synthetic_test_secret');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_API_ORIGIN', 'https://api.example.test');
  vi.stubEnv('GYMOS_PAYHERE_SANDBOX_WEB_ORIGIN', 'https://web.example.test');

  expect(payHereSandboxCheckoutConfig('MEMBERSHIP')).toMatchObject({
    apiOrigin: 'https://api.example.test',
    webOrigin: 'https://web.example.test',
  });
  expect(() => payHereSandboxCheckoutConfig('PT_PACK')).toThrow();
  expect(() => payHereSandboxCheckoutConfig('SUBSCRIPTION')).toThrow();

  vi.stubEnv('GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED', '0');
  expect(payHereSandboxCheckoutConfig('PT_PACK').merchantId).toBe('12345');
  expect(payHereSandboxCheckoutConfig('SUBSCRIPTION').merchantId).toBe('12345');
});
