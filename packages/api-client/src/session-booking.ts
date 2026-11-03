import {
  sessionBookingInputSchema, sessionBookingOptionsQuerySchema, sessionBookingOptionsSchema, sessionBookingResultSchema,
} from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
function queryString(input: unknown) {
  const value = sessionBookingOptionsQuerySchema.parse(input ?? {});
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value)) if (item !== undefined) params.set(key, String(item));
  return params.toString();
}

export const sessionBookingApi = (client: Requester) => ({
  options: (slug: string, accessToken: string, query?: unknown) => client.request(
    `/gyms/${encodeURIComponent(slug)}/session-booking-options?${queryString(query)}`,
    { method: 'GET', response: sessionBookingOptionsSchema, accessToken },
  ),
  book: (slug: string, accessToken: string, body: unknown) => {
    const input = sessionBookingInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/bookings`, {
      method: 'POST', response: sessionBookingResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
