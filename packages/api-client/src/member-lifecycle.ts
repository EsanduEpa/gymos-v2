import { idempotencyKeySchema, memberLifecycleResultSchema, memberStatusCommandSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
export const memberLifecycleApi = (client: Requester) => ({
  updateStatus: (slug: string, memberId: string, accessToken: string, idempotencyKey: string, body: unknown) => {
    const input = memberStatusCommandSchema.parse(body);
    const key = idempotencyKeySchema.parse(idempotencyKey);
    return client.request(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/status`, {
      method: 'POST', response: memberLifecycleResultSchema, accessToken, idempotencyKey: key, body: input,
    });
  },
  lifecycleStatus: (slug: string, operationId: string, accessToken: string) =>
    client.request(`/gyms/${encodeURIComponent(slug)}/member-lifecycle/${encodeURIComponent(operationId)}`, { response: memberLifecycleResultSchema, accessToken }),
  resumeLifecycle: (slug: string, operationId: string, accessToken: string) =>
    client.request(`/gyms/${encodeURIComponent(slug)}/member-lifecycle/${encodeURIComponent(operationId)}/resume`, {
      method: 'POST', response: memberLifecycleResultSchema, accessToken, body: {},
    }),
});
