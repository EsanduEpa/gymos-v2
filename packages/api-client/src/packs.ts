import { issueSessionPackInputSchema, issueSessionPackResultSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const packApi = (client: Requester) => ({
  issue: (slug: string, memberId: string, accessToken: string, body: unknown) => {
    const input = issueSessionPackInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/session-packs`, {
      method: 'POST', response: issueSessionPackResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
