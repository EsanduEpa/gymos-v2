import test from 'node:test';
import assert from 'node:assert/strict';
import { issueSessionPackInputSchema } from '../dist/packs.js';

test('pack issue contract accepts zero price and exact supported inputs', () => {
  assert.equal(issueSessionPackInputSchema.parse({ credits: 3, validityDays: 90, price: '0.00', currency: 'LKR',
    idempotencyKey: 'pack-contract-key-0001' }).price, '0.00');
});

test('pack issue contract rejects fractional/negative counts, excess price precision and unknown fields', () => {
  const base = { credits: 3, validityDays: 90, price: '0.00', currency: 'LKR', idempotencyKey: 'pack-contract-key-0001' };
  for (const value of [{ ...base, credits: 1.5 }, { ...base, credits: -1 }, { ...base, validityDays: 0 },
    { ...base, price: '0.001' }, { ...base, price: '-1.00' }, { ...base, currency: 'EUR' }, { ...base, raw: 'extra' }]) {
    assert.equal(issueSessionPackInputSchema.safeParse(value).success, false);
  }
});
