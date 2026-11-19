import 'server-only';

export function isPayHereMemberCheckoutEnabled(kind: 'MEMBERSHIP' | 'PT_PACK') {
  if (process.env.GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED === '1') {
    return kind === 'MEMBERSHIP';
  }
  return process.env.GYMOS_PAYHERE_CHECKOUT_ENABLED === '1';
}
