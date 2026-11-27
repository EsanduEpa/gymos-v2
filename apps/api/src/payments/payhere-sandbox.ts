import { ServiceUnavailableException } from '@nestjs/common';
import type { PayHereConfig } from './payhere.js';

function unavailable(): never {
  throw new ServiceUnavailableException('PayHere Sandbox checkout is not configured');
}

function httpsOrigin(value: string | undefined): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) {
      return url.origin;
    }
  } catch { /* report a sanitized configuration error below */ }
  return unavailable();
}

function webReturnOrigin() {
  const configured = process.env.GYMOS_PAYHERE_SANDBOX_WEB_ORIGIN;
  if (configured === 'http://localhost:3002' || configured === 'http://localhost:3002/') return 'http://localhost:3002';
  return httpsOrigin(configured);
}

export function payHereSandboxMerchantConfig(): PayHereConfig {
  const merchantId = process.env.GYMOS_PAYHERE_SANDBOX_MERCHANT_ID;
  const merchantSecret = process.env.GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET;
  if (!merchantId || !/^[0-9]{1,20}$/.test(merchantId) || !merchantSecret || !/^[!-~]{16,256}$/.test(merchantSecret)) unavailable();
  return { merchantId, merchantSecret };
}

export function payHereSandboxCheckoutConfig(kind: 'MEMBERSHIP' | 'PT_PACK' | 'SUBSCRIPTION') {
  const enabled = process.env.GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED === '1'
    ? kind === 'MEMBERSHIP'
    : process.env.GYMOS_PAYHERE_CHECKOUT_ENABLED === '1';
  if (!enabled) unavailable();
  return {
    ...payHereSandboxMerchantConfig(),
    apiOrigin: httpsOrigin(process.env.GYMOS_PAYHERE_SANDBOX_API_ORIGIN),
    webOrigin: webReturnOrigin(),
  };
}
