import { memberDetailSchema, memberListQuerySchema, memberListSchema, memberRegistrationInputSchema, memberRegistrationResultSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
export const memberApi = (client: Requester) => ({
  list: (slug: string, accessToken: string, query: unknown = {}) => {
    const parsed = memberListQuerySchema.parse(query);
    const search = new URLSearchParams(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
    return client.request(`/gyms/${encodeURIComponent(slug)}/members?${search}`, { response: memberListSchema, accessToken });
  },
  detail: (slug: string, memberId: string, accessToken: string) => client.request(
    `/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`, { response: memberDetailSchema, accessToken }),
  register: (slug: string, accessToken: string, body: unknown) => {
    const input = memberRegistrationInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/member-registrations`, {
      method: 'POST', response: memberRegistrationResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
