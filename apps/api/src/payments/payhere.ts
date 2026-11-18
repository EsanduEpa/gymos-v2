import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

// https://support.payhere.lk/api-%26-mobile-sdk/checkout-api
// https://support.payhere.lk/api-%26-mobile-sdk/recurring-api
export const PAYHERE_SANDBOX_CHECKOUT_URL = 'https://sandbox.payhere.lk/pay/checkout';

const merchantIdSchema = z.string().regex(/^\d{1,20}$/);
const orderIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const currencySchema = z.enum(['LKR', 'USD']);
const amountSchema = z.string().regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,2}0{0,2})?$/);
const recurrenceSchema = z.string().regex(/^[1-9]\d{0,8} (Week|Month|Year)$/);
const paymentIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const httpsUrlSchema = z.url({ protocol: /^https$/ });
const returnUrlSchema = z.union([httpsUrlSchema, z.url().refine(url => url.startsWith('http://localhost:3002/'))]);
const messageTypeSchema = z.enum([
  'AUTHORIZATION_SUCCESS', 'AUTHORIZATION_FAILED', 'RECURRING_INSTALLMENT_SUCCESS',
  'RECURRING_INSTALLMENT_FAILED', 'RECURRING_COMPLETE', 'RECURRING_STOPPED',
]);

export type PayHereConfig = { merchantId: string; merchantSecret: string };
const checkoutSchema = z.strictObject({
  orderId: orderIdSchema,
  amount: amountSchema,
  currency: currencySchema,
  items: z.string().trim().min(1).max(255),
  returnUrl: returnUrlSchema,
  cancelUrl: returnUrlSchema,
  notifyUrl: httpsUrlSchema,
  customer: z.strictObject({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    phone: z.string().trim().regex(/^\+?[0-9][0-9 .()-]{5,30}$/),
    address: z.string().trim().min(1).max(255),
    city: z.string().trim().min(1).max(120),
    country: z.string().trim().min(1).max(120),
  }),
  recurring: z.strictObject({
    recurrence: recurrenceSchema,
    duration: z.union([z.literal('Forever'), recurrenceSchema]),
  }).optional(),
});

const notificationSchema = z.object({
  merchant_id: merchantIdSchema,
  order_id: orderIdSchema,
  payhere_amount: amountSchema,
  payhere_currency: currencySchema,
  status_code: z.enum(['2', '0', '-1', '-2', '-3']),
  md5sig: z.string().regex(/^[a-fA-F0-9]{32}$/),
  payment_id: paymentIdSchema.optional(),
  subscription_id: paymentIdSchema.optional(),
  message_type: messageTypeSchema.optional(),
});

function twoDecimalPlaces(amount: string) {
  const [whole, fraction = ''] = amount.split('.');
  return `${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function formatPayHereAmount(amount: string) {
  if (!amountSchema.safeParse(amount).success) throw new Error('Invalid PayHere amount');
  return twoDecimalPlaces(amount);
}

function checksum(parts: string[], merchantSecret: string) {
  const secretDigest = createHash('md5').update(merchantSecret, 'utf8').digest('hex').toUpperCase();
  return createHash('md5').update(parts.join('') + secretDigest, 'utf8').digest('hex').toUpperCase();
}

export function buildPayHereCheckout(config: PayHereConfig, input: z.input<typeof checkoutSchema>) {
  const parsed = checkoutSchema.safeParse(input);
  if (!merchantIdSchema.safeParse(config.merchantId).success || !config.merchantSecret.trim() || !parsed.success) {
    throw new Error('Invalid PayHere checkout details');
  }
  const checkout = parsed.data;
  const amount = twoDecimalPlaces(checkout.amount);
  if (amount === '0.00') throw new Error('PayHere checkout requires a positive amount');
  const customer = checkout.customer;
  return {
    action: PAYHERE_SANDBOX_CHECKOUT_URL,
    fields: {
      merchant_id: config.merchantId,
      order_id: checkout.orderId,
      amount,
      currency: checkout.currency,
      items: checkout.items,
      return_url: checkout.returnUrl,
      cancel_url: checkout.cancelUrl,
      notify_url: checkout.notifyUrl,
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      ...checkout.recurring,
      hash: checksum([config.merchantId, checkout.orderId, amount, checkout.currency], config.merchantSecret),
    },
  };
}

export function verifyPayHereNotification(config: PayHereConfig, body: unknown) {
  const parsed = notificationSchema.safeParse(body);
  if (!parsed.success || !config.merchantSecret.trim()) return null;
  const notification = parsed.data;
  if (notification.merchant_id !== config.merchantId) return null;
  const expected = checksum([
    notification.merchant_id, notification.order_id, notification.payhere_amount,
    notification.payhere_currency, notification.status_code,
  ], config.merchantSecret);
  if (!timingSafeEqual(Buffer.from(notification.md5sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return {
    merchantId: notification.merchant_id,
    orderId: notification.order_id,
    amount: twoDecimalPlaces(notification.payhere_amount),
    currency: notification.payhere_currency,
    statusCode: notification.status_code,
    // These references are validated for shape. PayHere's checksum binds the fields above.
    references: {
      paymentId: notification.payment_id,
      subscriptionId: notification.subscription_id,
      messageType: notification.message_type,
    },
  };
}
