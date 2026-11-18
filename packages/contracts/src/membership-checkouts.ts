import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const name = z.string().trim().min(1).max(80);
const email = z.string().trim().pipe(z.email().max(254));
const phone = z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,24}$/);
const address = z.string().trim().min(1).max(160);
const amount = z.string().regex(/^(?:0|[1-9][0-9]{0,14})\.[0-9]{2}$/);
const currency = z.enum(['LKR', 'USD']);
export const membershipCheckoutOrderIdSchema = z.uuidv4();
export const membershipCheckoutInputSchema = z.strictObject({
  planId: id,
  idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/),
  firstName: name,
  lastName: name,
  email,
  phone,
  address,
  city: name,
  country: name,
});
export const ptPackCheckoutInputSchema = membershipCheckoutInputSchema.omit({ planId: true }).extend({ offerId: id });
export const membershipCheckoutSchema = z.strictObject({
  action: z.literal('https://sandbox.payhere.lk/pay/checkout'),
  fields: z.strictObject({
    merchant_id: z.string().regex(/^[0-9]{1,32}$/),
    return_url: z.url(),
    cancel_url: z.url(),
    notify_url: z.url(),
    first_name: name,
    last_name: name,
    email,
    phone,
    address,
    city: name,
    country: name,
    order_id: membershipCheckoutOrderIdSchema,
    items: name,
    currency,
    amount,
    hash: z.string().regex(/^[0-9A-F]{32}$/),
  }),
});
export const membershipCheckoutStatusSchema = z.strictObject({
  orderId: membershipCheckoutOrderIdSchema,
  status: z.enum(['PENDING', 'FAILED', 'CANCELLED', 'CONFIRMED', 'REVIEW_REQUIRED', 'CHARGEBACK']),
  planName: name,
  amount,
  currency,
});
export type MembershipCheckoutInput = z.infer<typeof membershipCheckoutInputSchema>;
export type PtPackCheckoutInput = z.infer<typeof ptPackCheckoutInputSchema>;

export const memberPaymentSummarySchema = membershipCheckoutStatusSchema.omit({ planName: true }).extend({
  kind: z.enum(['MEMBERSHIP', 'PT_PACK']),
  itemName: name,
  createdAt: z.iso.datetime({ offset: true }),
  confirmedAt: z.iso.datetime({ offset: true }).nullable(),
});
export const memberPaymentHistorySchema = z.strictObject({
  items: z.array(memberPaymentSummarySchema).max(100),
});
export const ownerPaymentHistorySchema = z.strictObject({
  items: z.array(memberPaymentSummarySchema.extend({ memberId: id, memberName: z.string().trim().min(1).max(120) })).max(100),
});
export const memberPaymentReceiptSchema = memberPaymentSummarySchema.extend({
  confirmedAt: z.iso.datetime({ offset: true }),
  gymName: z.string().trim().min(1).max(120),
  memberName: z.string().trim().min(1).max(120),
  provider: z.literal('PAYHERE_SANDBOX'),
});
