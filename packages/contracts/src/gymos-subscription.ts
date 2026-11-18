import { z } from 'zod';
import { membershipCheckoutInputSchema, membershipCheckoutSchema } from './membership-checkouts.js';

const tierSchema = z.enum(['STARTER', 'GROWTH', 'PRO']);
export const gymosSubscriptionTiers = [
  { id: 'STARTER', name: 'Starter', amount: '3500.00' },
  { id: 'GROWTH', name: 'Growth', amount: '7500.00' },
  { id: 'PRO', name: 'Pro', amount: '12500.00' },
] as const;

export const gymosSubscriptionCheckoutInputSchema = membershipCheckoutInputSchema.omit({ planId: true }).extend({ tier: tierSchema });
export const gymosSubscriptionCheckoutSchema = membershipCheckoutSchema.extend({
  fields: membershipCheckoutSchema.shape.fields.extend({ recurrence: z.literal('1 Month'), duration: z.literal('Forever') }),
});
export const gymosSubscriptionStatusSchema = z.strictObject({
  tier: tierSchema.nullable(),
  status: z.enum(['NOT_STARTED', 'PENDING', 'ACTIVE', 'GRACE', 'PAST_DUE']),
  paidThrough: z.iso.datetime().nullable(),
  graceEndsAt: z.iso.datetime().nullable(),
  pendingTier: tierSchema.nullable(),
  canStart: z.boolean(),
  canStop: z.boolean(),
});
