import { trainerRegistrationInputSchema, trainerRegistrationResultSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const trainerApi = (client: Requester) => ({
  register: (slug: string, accessToken: string, body: unknown) => {
    const input = trainerRegistrationInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainer-registrations`, {
      method: 'POST', response: trainerRegistrationResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
