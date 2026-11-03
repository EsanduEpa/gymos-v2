import { sessionDecisionInputSchema, sessionDecisionResultSchema, sessionRequestInputSchema, sessionRequestOptionsSchema, sessionRequestResultSchema, trainerSessionRequestsSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
export const sessionRequestApi = (client: Requester) => ({
  pendingForTrainer: (slug: string, accessToken: string) => client.request(
    `/gyms/${encodeURIComponent(slug)}/me/session-requests`, { method: 'GET', response: trainerSessionRequestsSchema, accessToken },
  ),
  options: (slug: string, trainerId: string, accessToken: string) => client.request(
    `/gyms/${encodeURIComponent(slug)}/me/session-request-options?trainerId=${encodeURIComponent(trainerId)}`,
    { method: 'GET', response: sessionRequestOptionsSchema, accessToken },
  ),
  request: (slug: string, accessToken: string, body: unknown) => {
    const input = sessionRequestInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/session-requests`, {
      method: 'POST', response: sessionRequestResultSchema, accessToken, idempotencyKey: input.idempotencyKey, body: input,
    });
  },
  decide: (slug: string, sessionId: string, accessToken: string, body: unknown) => {
    const input = sessionDecisionInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/respond`, {
      method: 'POST', response: sessionDecisionResultSchema, accessToken, idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
