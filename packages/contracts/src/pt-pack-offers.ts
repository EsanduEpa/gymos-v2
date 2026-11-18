import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const version = z.number().int().min(0).max(2_147_483_647);
const offerDetails = z.strictObject({
  name: z.string().trim().min(1).max(80),
  credits: z.number().int().min(1).max(1000),
  price: z.string().regex(/^(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?$/).refine(value => !/^0(?:\.0{1,2})?$/.test(value)),
  validityDays: z.number().int().min(1).max(3650),
});
export const createPtPackOfferSchema = offerDetails.extend({ idempotencyKey: z.string().min(16).max(128).regex(/^[\x21-\x7e]+$/) });
export const managePtPackOfferSchema = z.discriminatedUnion('action', [
  offerDetails.extend({ action: z.literal('EDIT'), expectedVersion: version }),
  z.strictObject({ action: z.literal('ARCHIVE'), expectedVersion: version }),
]);
export const ptPackOfferSchema = offerDetails.extend({ id, currency: z.enum(['LKR', 'USD']), version, status: z.enum(['ACTIVE', 'ARCHIVED']) });
export const ptPackOffersSchema = z.strictObject({ offers: z.array(ptPackOfferSchema).max(500) });
export type PtPackOffer = z.output<typeof ptPackOfferSchema>;
