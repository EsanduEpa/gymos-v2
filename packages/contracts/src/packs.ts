import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const date = z.iso.date();
const amount = z.string().regex(/^(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?$/);
const currency = z.enum(['LKR', 'USD']);
const idempotencyKey = z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/);

export const issueSessionPackInputSchema = z.strictObject({
  credits: z.number().int().min(1).max(1000),
  validityDays: z.number().int().min(1).max(3650),
  price: amount,
  currency,
  idempotencyKey,
});

export const sessionPackBalanceSchema = z.strictObject({ available: z.number().int().min(0).max(1000),
  held: z.number().int().min(0).max(1000), consumed: z.number().int().min(0).max(1000), expired: z.number().int().min(0).max(1000) });
export const sessionPackSchema = z.strictObject({
  id, issuedCredits: z.number().int().min(1).max(1000), validityDays: z.number().int().min(1).max(3650),
  price: amount, currency, startDate: date, endDateExclusive: date,
  status: z.enum(['ACTIVE', 'EXPIRED', 'DEPLETED']), balance: sessionPackBalanceSchema,
});
export const issueSessionPackResultSchema = z.strictObject({ pack: sessionPackSchema, receiptId: id, replayed: z.boolean() });
export type IssueSessionPackInput = z.infer<typeof issueSessionPackInputSchema>;
