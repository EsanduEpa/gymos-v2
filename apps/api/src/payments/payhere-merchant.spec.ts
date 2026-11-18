import { describe, expect, it, vi } from 'vitest';
import { PayHereSandboxMerchantClient } from './payhere-merchant.js';

const base = 'https://sandbox.payhere.lk/merchant/v1';
const credentials = { appId: 'sample-app-id', appSecret: 'sample-app-secret' };
const orderId = 'sample-order';
const subscriptionId = '420000032251';
const failureMessage = 'PayHere Sandbox merchant lookup could not be verified';
const token = (value = 'sample-token', duration = 599) => Response.json({
  access_token: value, token_type: 'bearer', expires_in: duration, scope: 'SANDBOX',
});
const paid = {
  payment_id: 320025023469, order_id: orderId, amount: 10.5, currency: 'LKR', status: 'RECEIVED',
  customer: { email: 'buyer@example.test' }, payment_method: { card_no: '************1234' },
};
const subscription = {
  subscription_id: 420000032251, order_id: orderId, amount: 10.5, currency: 'LKR', status: 'ACTIVE',
  customer: { email: 'buyer@example.test' }, payment_method: { card_no: '************1234' },
};
const found = (data: unknown) => Response.json({ status: 1, msg: 'Found', data });

describe('PayHere Sandbox merchant reads', () => {
  it('shares the OAuth exchange across concurrent requests and projects verified order payments', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(found([paid]))
      .mockResolvedValueOnce(found([paid]));
    const client = new PayHereSandboxMerchantClient(credentials, fetcher);
    const [first, second] = await Promise.all([client.getPaymentsForOrder(orderId), client.getPaymentsForOrder(orderId)]);
    expect(first).toEqual([{ paymentId: '320025023469', orderId, amount: '10.50', currency: 'LKR', status: 'RECEIVED' }]);
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenNthCalledWith(1, `${base}/oauth/token`, expect.objectContaining({
      method: 'POST', cache: 'no-store', redirect: 'error',
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      headers: expect.objectContaining({
        Authorization: `Basic ${Buffer.from('sample-app-id:sample-app-secret').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      signal: expect.any(AbortSignal),
    }));
    expect(fetcher).toHaveBeenNthCalledWith(2, `${base}/payment/search?order_id=${orderId}`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer sample-token' }),
      cache: 'no-store', redirect: 'error',
    }));
  });

  it('queries the exact subscription and associates payments with both its path and order', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(found(subscription))
      .mockResolvedValueOnce(found([paid, {
        ...paid, payment_id: '320025023470', amount: '10.50', status: 'REFUNDED',
      }]));
    const client = new PayHereSandboxMerchantClient(credentials, fetcher);
    expect(await client.getSubscription(subscriptionId, orderId)).toEqual({
      subscriptionId, orderId, amount: '10.50', currency: 'LKR', status: 'ACTIVE',
    });
    expect(await client.getSubscriptionPayments(subscriptionId, orderId)).toEqual([
      { paymentId: '320025023469', orderId, amount: '10.50', currency: 'LKR', status: 'RECEIVED' },
      { paymentId: '320025023470', orderId, amount: '10.50', currency: 'LKR', status: 'REFUNDED' },
    ]);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      `${base}/oauth/token`, `${base}/subscription/${subscriptionId}`, `${base}/subscription/${subscriptionId}/payments`,
    ]);
  });

  it('rejects a substituted subscription, another order, a duplicate payment ID or a fractional cent', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(found({ ...subscription, subscription_id: 'another-subscription' }))
      .mockResolvedValueOnce(found({ ...subscription, order_id: 'another-order' }))
      .mockResolvedValueOnce(found([paid, { ...paid, order_id: 'another-order' }]))
      .mockResolvedValueOnce(found([paid, paid]))
      .mockResolvedValueOnce(found([{ ...paid, amount: 10.515 }]))
      .mockResolvedValueOnce(found([{ ...paid, payment_id: Number.MAX_SAFE_INTEGER + 1 }]));
    const client = new PayHereSandboxMerchantClient(credentials, fetcher);
    await expect(client.getSubscription(subscriptionId, orderId)).rejects.toThrow(failureMessage);
    await expect(client.getSubscription(subscriptionId, orderId)).rejects.toThrow(failureMessage);
    await expect(client.getSubscriptionPayments(subscriptionId, orderId)).rejects.toThrow(failureMessage);
    await expect(client.getSubscriptionPayments(subscriptionId, orderId)).rejects.toThrow(failureMessage);
    await expect(client.getPaymentsForOrder(orderId)).rejects.toThrow(failureMessage);
    await expect(client.getPaymentsForOrder(orderId)).rejects.toThrow(failureMessage);
    await expect(client.getSubscriptionPayments('../oauth/token', orderId)).rejects.toThrow(failureMessage);
    expect(fetcher).toHaveBeenCalledTimes(7);
  });

  it('stops a verified subscription and accepts a repeat only after PayHere confirms it is inactive', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(found(subscription))
      .mockResolvedValueOnce(found(null))
      .mockResolvedValueOnce(found({ ...subscription, status: 'COMPLETED' }));
    const client = new PayHereSandboxMerchantClient(credentials, fetcher);
    await client.stopSubscription(subscriptionId, orderId);
    await client.stopSubscription(subscriptionId, orderId);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher).toHaveBeenNthCalledWith(3, `${base}/subscription/cancel`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ subscription_id: Number(subscriptionId) }),
    }));
  });

  it('refreshes an invalid token once and leaves absence distinct from an API error', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(token('expired-token'))
      .mockResolvedValueOnce(Response.json({ error: 'invalid_token', error_description: 'expired-token' }, { status: 401 }))
      .mockResolvedValueOnce(token('new-token'))
      .mockResolvedValueOnce(Response.json({ status: -1, data: null }))
      .mockResolvedValueOnce(Response.json({ status: -1, data: null }))
      .mockResolvedValueOnce(Response.json({ status: -2, data: null, msg: 'Authentication error' }));
    const client = new PayHereSandboxMerchantClient(credentials, fetcher);
    await expect(client.getPaymentsForOrder(orderId)).resolves.toEqual([]);
    await expect(client.getSubscription(subscriptionId, orderId)).resolves.toBeNull();
    await expect(client.getPaymentsForOrder(orderId)).rejects.toThrow(failureMessage);
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher).toHaveBeenNthCalledWith(4, expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer new-token' }),
    }));
  });

  it('clears expired cached credentials preemptively', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(token('old-token', 2))
        .mockResolvedValueOnce(found([paid]))
        .mockResolvedValueOnce(token('fresh-token'))
        .mockResolvedValueOnce(found([paid]));
      const client = new PayHereSandboxMerchantClient(credentials, fetcher);
      await client.getPaymentsForOrder(orderId);
      vi.advanceTimersByTime(2_000);
      await client.getPaymentsForOrder(orderId);
      expect(fetcher).toHaveBeenNthCalledWith(4, expect.any(String), expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fresh-token' }),
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('bounds streamed responses and suppresses provider bodies on error', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(new Response(new Uint8Array(2 * 1024 * 1024 + 1)))
      .mockResolvedValueOnce(new Response('{invalid json, including customer data'))
      .mockResolvedValueOnce(Response.json({ status: '-1', msg: 'Access denied for the domain', data: null }, { status: 401 }));
    const client = new PayHereSandboxMerchantClient(credentials, fetcher);
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(client.getPaymentsForOrder(orderId)).rejects.toThrow(new RegExp(`^${failureMessage}$`));
    }
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
