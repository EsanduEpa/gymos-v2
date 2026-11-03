'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { sessionBookingInputSchema, sessionBookingResultSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type SessionBookingActionState = {
  error?: string; success?: string; outcomeUnknown?: boolean; currentKey?: string; nextKey?: string;
  booking?: { sessionId: string; scheduledStartAt: string; scheduledEndAt: string; timeZone: string; creditValue: string; currency: string; fee: string; creditOrdinal: number };
};

function validRoute(slug: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }

export async function createOwnerSessionBooking(slug: string, initialKey: string, _state: SessionBookingActionState, formData: FormData): Promise<SessionBookingActionState> {
  if (!validRoute(slug)) return { error: 'The gym link is invalid.' };
  const key = String(formData.get('idempotencyKey') ?? initialKey);
  const parsed = sessionBookingInputSchema.safeParse({
    memberId: formData.get('memberId'), trainerId: formData.get('trainerId'), localDate: formData.get('localDate'), localTime: formData.get('localTime'),
    timeZone: formData.get('timeZone'), offset: formData.get('offset') || undefined, type: formData.get('type'), durationMinutes: Number(formData.get('durationMinutes')),
    notes: formData.get('notes') || undefined, idempotencyKey: key,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the booking details.', nextKey: randomUUID() };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/bookings`), { method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': key },
      body: JSON.stringify(parsed.data), cache: 'no-store' });
  } catch {
    return { error: 'The booking outcome is unknown. Retry with the same key to resolve the original booking.', currentKey: key, outcomeUnknown: true };
  }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) return { error: 'Your owner access changed. Reload before booking.', nextKey: randomUUID() };
  if (response.status === 404) return { error: 'The selected member or trainer is no longer available in this gym.', nextKey: randomUUID() };
  const json: unknown = await response.json().catch(() => null);
  if (response.status === 409) return { error: 'The slot or booking options changed. Review the current options and choose again.', nextKey: randomUUID() };
  if (response.status === 422) return { error: 'The member, credit, or time is no longer eligible. Review the booking details.', nextKey: randomUUID() };
  const result = sessionBookingResultSchema.safeParse(json);
  if (!response.ok || !result.success) return { error: 'The booking result could not be verified. Retry with the same key to resolve it.', currentKey: key, outcomeUnknown: response.status >= 500 || response.ok };
  const data = result.data;
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/sessions`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/sessions/book`);
  return { success: 'Session booked and one credit is held.', booking: { sessionId: data.session.id, scheduledStartAt: data.session.scheduledStartAt,
    scheduledEndAt: data.session.scheduledEndAt, timeZone: data.session.timeZone, creditValue: data.creditReservation.creditValue,
    currency: data.feeQuote.currency, fee: data.feeQuote.amount, creditOrdinal: data.creditReservation.creditOrdinal }, nextKey: randomUUID() };
}
