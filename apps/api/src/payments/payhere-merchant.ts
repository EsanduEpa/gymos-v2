import { z } from 'zod';
import { formatPayHereAmount } from './payhere.js';

// https://support.payhere.lk/api-%26-mobile-sdk/retrieval-api
// https://support.payhere.lk/api-%26-mobile-sdk/subscription-manager-api
const sandboxMerchantUrl = 'https://sandbox.payhere.lk/merchant/v1';
const maxTokenResponseBytes = 16 * 1024;
const maxMerchantResponseBytes = 2 * 1024 * 1024;
const maxCachedTokenMs = 5 * 60_000;
const requestTimeoutMs = 8_000;

const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const providerIdSchema = z.union([idSchema, z.number().int().positive().max(Number.MAX_SAFE_INTEGER)]).transform(String);
const currencySchema = z.enum(['LKR', 'USD']);
// Below 2^46, a JSON double has enough precision to distinguish adjacent cents.
const amountSchema = z.union([z.string(), z.number().nonnegative().lt(2 ** 46)]).transform((amount, context) => {
  try {
    return formatPayHereAmount(String(amount));
  } catch {
    context.addIssue({ code: 'custom', message: 'Invalid payment amount' });
    return z.NEVER;
  }
});
const tokenSchema = z.object({
  access_token: z.string().min(1).max(1024).regex(/^[A-Za-z0-9._~+/-]+=*$/),
  token_type: z.string().regex(/^bearer$/i),
  expires_in: z.number().int().positive().max(86_400),
  scope: z.literal('SANDBOX'),
});
const invalidTokenSchema = z.object({ error: z.literal('invalid_token') });
const statusSchema = z.object({ status: z.number().int(), data: z.unknown() }).required();
const paymentSchema = z.object({
  payment_id: providerIdSchema,
  order_id: idSchema,
  amount: amountSchema,
  currency: currencySchema,
  status: z.enum(['RECEIVED', 'REFUND REQUESTED', 'REFUND PROCESSING', 'REFUNDED', 'CHARGEBACKED']),
}).transform(row => ({
  paymentId: row.payment_id,
  orderId: row.order_id,
  amount: row.amount,
  currency: row.currency,
  status: row.status,
}));
const paymentListSchema = z.array(paymentSchema).max(500);
const subscriptionSchema = z.object({
  subscription_id: providerIdSchema,
  order_id: idSchema,
  amount: amountSchema,
  currency: currencySchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED']),
}).transform(row => ({
  subscriptionId: row.subscription_id,
  orderId: row.order_id,
  amount: row.amount,
  currency: row.currency,
  status: row.status,
}));

export type PayHereMerchantPayment = z.output<typeof paymentSchema>;
export type PayHereMerchantSubscription = z.output<typeof subscriptionSchema>;
type CachedToken = { value: string; validUntil: number };

function lookupError() {
  return new Error('PayHere Sandbox merchant lookup could not be verified');
}

async function readJson(response: Response, maxBytes: number): Promise<unknown> {
  if (!response.body) throw lookupError();
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body.cancel();
    throw lookupError();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) throw lookupError();
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch {
    await reader.cancel().catch(() => undefined);
    throw lookupError();
  } finally {
    reader.releaseLock();
  }
}

export class PayHereSandboxMerchantClient {
  readonly #credentials: string;
  readonly #fetch: typeof fetch;
  #token: CachedToken | undefined;
  #refresh: Promise<CachedToken> | undefined;

  constructor(config: { appId: string; appSecret: string }, fetcher: typeof fetch = fetch) {
    if (!/^[^:\s]{1,512}$/.test(config.appId) || !/^\S{1,512}$/.test(config.appSecret)) {
      throw new Error('Invalid PayHere Sandbox merchant API configuration');
    }
    this.#credentials = Buffer.from(`${config.appId}:${config.appSecret}`, 'utf8').toString('base64');
    this.#fetch = fetcher;
  }

  async getPaymentsForOrder(orderId: string): Promise<PayHereMerchantPayment[]> {
    this.#validateId(orderId);
    return this.#getPayments(`/payment/search?${new URLSearchParams({ order_id: orderId })}`, orderId);
  }

  async getSubscription(subscriptionId: string, orderId: string): Promise<PayHereMerchantSubscription | null> {
    this.#validateId(subscriptionId);
    this.#validateId(orderId);
    const result = await this.#get(`/subscription/${encodeURIComponent(subscriptionId)}`);
    if (result.status === -1 && result.data === null) return null;
    const subscription = subscriptionSchema.safeParse(result.data);
    if (result.status !== 1 || !subscription.success || subscription.data.subscriptionId !== subscriptionId ||
      subscription.data.orderId !== orderId) throw lookupError();
    return subscription.data;
  }

  async getSubscriptionPayments(subscriptionId: string, orderId: string): Promise<PayHereMerchantPayment[]> {
    this.#validateId(subscriptionId);
    this.#validateId(orderId);
    return this.#getPayments(`/subscription/${encodeURIComponent(subscriptionId)}/payments`, orderId);
  }

  async stopSubscription(subscriptionId: string, orderId: string) {
    const current = await this.getSubscription(subscriptionId, orderId);
    if (!current) throw lookupError();
    if (current.status !== 'ACTIVE') return;
    const numericId = Number(subscriptionId);
    if (!/^[1-9]\d*$/.test(subscriptionId) || !Number.isSafeInteger(numericId)) throw lookupError();
    const result = await this.#merchantRequest('/subscription/cancel', {
      method: 'POST', body: JSON.stringify({ subscription_id: numericId }),
    });
    if (result.status === 1) return;
    const observed = await this.getSubscription(subscriptionId, orderId);
    if (!observed || observed.status === 'ACTIVE') throw lookupError();
  }

  #validateId(id: string) {
    if (!idSchema.safeParse(id).success) throw lookupError();
  }

  async #getPayments(path: string, orderId: string) {
    const result = await this.#get(path);
    if ((result.status === -1 || result.status === 0) && result.data === null) return [];
    const payments = paymentListSchema.safeParse(result.data);
    if (result.status !== 1 || !payments.success || payments.data.some(row => row.orderId !== orderId)) throw lookupError();
    if (new Set(payments.data.map(row => row.paymentId)).size !== payments.data.length) throw lookupError();
    return payments.data;
  }

  async #get(path: string) {
    return this.#merchantRequest(path);
  }

  async #merchantRequest(path: string, options: RequestInit = {}) {
    let token = await this.#getToken();
    const request = (credential: CachedToken) => this.#request(path, {
      ...options,
      headers: { Authorization: `Bearer ${credential.value}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    }, maxMerchantResponseBytes);

    let response = await request(token);
    if (invalidTokenSchema.safeParse(response.body).success) {
      if (this.#token === token) this.#token = undefined;
      token = await this.#getToken();
      response = await request(token);
      if (invalidTokenSchema.safeParse(response.body).success && this.#token === token) this.#token = undefined;
    }
    const result = statusSchema.safeParse(response.body);
    if (!response.ok || !result.success) throw lookupError();
    return result.data;
  }

  async #getToken(): Promise<CachedToken> {
    if (this.#token && Date.now() < this.#token.validUntil) return this.#token;
    if (this.#refresh) return this.#refresh;
    this.#refresh = this.#fetchToken();
    try {
      this.#token = await this.#refresh;
      return this.#token;
    } finally {
      this.#refresh = undefined;
    }
  }

  async #fetchToken() {
    const requestedAt = Date.now();
    const response = await this.#request('/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${this.#credentials}`, Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    }, maxTokenResponseBytes);
    const parsed = tokenSchema.safeParse(response.body);
    if (!response.ok || !parsed.success) throw lookupError();
    const lifetimeMs = parsed.data.expires_in * 1000;
    return {
      value: parsed.data.access_token,
      validUntil: requestedAt + Math.min(maxCachedTokenMs, Math.floor(lifetimeMs * 0.9)),
    };
  }

  async #request(path: string, options: RequestInit, maxBytes: number) {
    try {
      const response = await this.#fetch(sandboxMerchantUrl + path, {
        ...options, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (!response.ok && response.status !== 401) {
        await response.body?.cancel();
        throw lookupError();
      }
      return { ok: response.ok, body: await readJson(response, maxBytes) };
    } catch {
      throw lookupError();
    }
  }
}
