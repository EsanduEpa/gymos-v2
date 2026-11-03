import { auditPageSchema, auditQuerySchema, notificationListQuerySchema, notificationListSchema,
  notificationReadAllInputSchema, notificationReadAllSchema, notificationReadSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const notificationApi = (client: Requester) => ({
  list: (slug: string, accessToken: string, query: unknown = {}, signal?: AbortSignal) => {
    const input = notificationListQuerySchema.parse(query);
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/notifications?limit=${input.limit}`, {
      response: notificationListSchema, accessToken, ...(signal ? { signal } : {}),
    });
  },
  markOne: (slug: string, notificationId: string, accessToken: string) => client.request(
    `/gyms/${encodeURIComponent(slug)}/me/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'POST', response: notificationReadSchema, accessToken, body: {} },
  ),
  markAll: (slug: string, accessToken: string, body: unknown = {}) => {
    const input = notificationReadAllInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/notifications/read-all`, {
      method: 'POST', response: notificationReadAllSchema, accessToken, body: input,
    });
  },
  audit: (slug: string, accessToken: string, query: unknown = {}) => {
    const input = auditQuerySchema.parse(query);
    const params = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize),
      ...(input.actionType ? { actionType: input.actionType } : {}) });
    return client.request(`/gyms/${encodeURIComponent(slug)}/audit?${params}`, { response: auditPageSchema, accessToken });
  },
});
