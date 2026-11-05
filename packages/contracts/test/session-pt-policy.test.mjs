import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionBookingInputSchema } from '../dist/session-booking.js';
import { sessionRequestInputSchema } from '../dist/session-requests.js';

const booking = { memberId: 'member_1', trainerId: 'trainer_1', localDate: '2026-11-10', localTime: '10:00', timeZone: 'Asia/Colombo', type: 'IN_PERSON', durationMinutes: 60, idempotencyKey: 'booking-key-0123456789' };
const request = { trainerId: 'trainer_1', localDate: '2026-11-10', localTime: '10:00', timeZone: 'Asia/Colombo', type: 'IN_PERSON', durationMinutes: 60, idempotencyKey: 'request-key-0123456789' };

test('new PT booking and request contracts allow only in-person 60-minute service', () => {
  assert.equal(sessionBookingInputSchema.safeParse(booking).success, true);
  assert.equal(sessionRequestInputSchema.safeParse(request).success, true);
  assert.equal(sessionBookingInputSchema.safeParse({ ...booking, type: 'VIRTUAL' }).success, false);
  assert.equal(sessionBookingInputSchema.safeParse({ ...booking, type: 'INTRODUCTORY' }).success, false);
  assert.equal(sessionBookingInputSchema.safeParse({ ...booking, durationMinutes: 45 }).success, false);
  assert.equal(sessionRequestInputSchema.safeParse({ ...request, type: 'VIRTUAL' }).success, false);
  assert.equal(sessionRequestInputSchema.safeParse({ ...request, type: 'INTRODUCTORY' }).success, false);
  assert.equal(sessionRequestInputSchema.safeParse({ ...request, durationMinutes: 90 }).success, false);
});
