import { availabilityQuerySchema, availabilitySchema, availabilitySlotsQuerySchema, availabilitySlotsSchema, availabilityUpdateSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
export const sessionAvailabilityApi = (client: Requester) => ({
  read: (slug: string, trainerId: string, accessToken: string, query: unknown) => {
    const input = availabilityQuerySchema.parse(query); const params = new URLSearchParams(input);
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/availability?${params}`, { response: availabilitySchema, accessToken });
  },
  update: (slug: string, trainerId: string, accessToken: string, body: unknown) => {
    const input = availabilityUpdateSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/availability`, { method: 'PUT', response: availabilitySchema, accessToken, idempotencyKey: input.idempotencyKey, body: input });
  },
  slots: (slug: string, accessToken: string, query: unknown) => {
    const input = availabilitySlotsQuerySchema.parse(query); const params = new URLSearchParams({ trainerId: input.trainerId, localDate: input.localDate, ...(input.memberId ? { memberId: input.memberId } : {}) });
    return client.request(`/gyms/${encodeURIComponent(slug)}/session-slots?${params}`, { response: availabilitySlotsSchema, accessToken });
  },
});
