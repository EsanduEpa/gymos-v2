import { describe, expect, it } from 'vitest';
import { buildPayHereCheckout, formatPayHereAmount, PAYHERE_SANDBOX_CHECKOUT_URL, verifyPayHereNotification } from './payhere.js';

const config = { merchantId: '1210001', merchantSecret: 'synthetic-testing-secret' };
const orderId = 'bcdbe58e-09a6-4097-b747-91ce2003fd8b';
const checkout = {
  orderId, amount: '1250.0000', currency: 'LKR' as const, items: 'Membership renewal',
  returnUrl: 'https://gym.example.test/payment/return',
  cancelUrl: 'https://gym.example.test/payment/cancel',
  notifyUrl: 'https://api.example.test/payment/notify',
  customer: {
    firstName: 'Sample', lastName: 'Member', email: 'buyer@example.test', phone: '0771234567',
    address: 'Sample address', city: 'Colombo', country: 'Sri Lanka',
  },
};
// Fixed checksums independently calculated with Python hashlib.
const successfulNotification = {
  merchant_id: config.merchantId,
  order_id: orderId,
  payhere_amount: '1250.00',
  payhere_currency: 'LKR',
  status_code: '2',
  payment_id: 'sample-payment',
  md5sig: '4997F4F5E65498E591DF22EF1C2E056D',
};

describe('PayHere Sandbox protocol', () => {
  it('formats decimal strings losslessly to two decimal places', () => {
    expect(formatPayHereAmount('1250')).toBe('1250.00');
    expect(formatPayHereAmount('12.5000')).toBe('12.50');
    expect(formatPayHereAmount('999999999999999.9900')).toBe('999999999999999.99');
    for (const invalid of ['1.001', '-1', '1e3', '1,250.00', ' 12 ', '12.50000']) {
      expect(() => formatPayHereAmount(invalid)).toThrow('Invalid PayHere amount');
    }
  });

  it('builds the one-time checkout fields with a signed amount and no credentials', () => {
    const result = buildPayHereCheckout(config, checkout);
    expect(result.action).toBe(PAYHERE_SANDBOX_CHECKOUT_URL);
    expect(result.fields).toEqual({
      merchant_id: '1210001', order_id: orderId, amount: '1250.00', currency: 'LKR',
      items: 'Membership renewal', return_url: checkout.returnUrl, cancel_url: checkout.cancelUrl, notify_url: checkout.notifyUrl,
      first_name: 'Sample', last_name: 'Member', email: 'buyer@example.test', phone: '0771234567',
      address: 'Sample address', city: 'Colombo', country: 'Sri Lanka', hash: 'FD089BA9EBFFA4284939F6E50E3D2B64',
    });
    expect(() => buildPayHereCheckout(config, { ...checkout, amount: '0' })).toThrow('positive amount');
  });

  it('uses the same checkout endpoint and hash format for a recurring USD order', () => {
    const result = buildPayHereCheckout(config, {
      ...checkout, amount: '12.5', currency: 'USD', recurring: { recurrence: '1 Month', duration: 'Forever' },
    });
    expect(result).toMatchObject({
      action: PAYHERE_SANDBOX_CHECKOUT_URL,
      fields: { currency: 'USD', amount: '12.50', recurrence: '1 Month', duration: 'Forever', hash: 'FA92FFCCF92550D41D90412C2BD041BE' },
    });
  });

  it('allows the local review browser to return while keeping payment callbacks on HTTPS', () => {
    const returnUrl = 'http://localhost:3002/gyms/test-alpha/member/membership';
    expect(buildPayHereCheckout(config, { ...checkout, returnUrl }).fields.return_url).toBe(returnUrl);
    expect(() => buildPayHereCheckout(config, { ...checkout, notifyUrl: returnUrl })).toThrow();
    expect(() => buildPayHereCheckout(config, { ...checkout, returnUrl: 'http://localhost:3000/' })).toThrow();
  });

  it('authenticates signed fields and projects bounded references without card information', () => {
    const verified = verifyPayHereNotification(config, {
      ...successfulNotification, subscription_id: 'sample-subscription', message_type: 'AUTHORIZATION_SUCCESS',
      card_holder_name: 'Synthetic Card Holder', card_no: '************4564', card_expiry: '0128',
      status_message: 'Synthetic message', custom_1: 'Synthetic custom content',
    });
    expect(verified).toEqual({
      merchantId: config.merchantId, orderId, amount: '1250.00', currency: 'LKR', statusCode: '2',
      references: { paymentId: 'sample-payment', subscriptionId: 'sample-subscription', messageType: 'AUTHORIZATION_SUCCESS' },
    });
  });

  it('verifies raw amount spelling before normalization and preserves a signed failure', () => {
    expect(verifyPayHereNotification(config, {
      ...successfulNotification, payhere_amount: '1250', md5sig: 'ED55FA50B2BAB5BEC46D0CCA35814DB9',
    })?.amount).toBe('1250.00');
    expect(verifyPayHereNotification(config, {
      ...successfulNotification, status_code: '-2', md5sig: '173EBB452F40BEF3A16D5253855928DC',
    })?.statusCode).toBe('-2');
  });

  it('rejects a tampered signed field, a wrong merchant secret and duplicate form values', () => {
    for (const update of [
      { merchant_id: '1210002' }, { order_id: 'other-order' }, { payhere_amount: '1251.00' },
      { payhere_currency: 'USD' }, { status_code: '0' }, { md5sig: 'invalid' }, { order_id: [orderId, orderId] },
    ]) {
      expect(verifyPayHereNotification(config, { ...successfulNotification, ...update })).toBeNull();
    }
    expect(verifyPayHereNotification({ ...config, merchantSecret: 'another-synthetic-key' }, successfulNotification)).toBeNull();
  });
});
