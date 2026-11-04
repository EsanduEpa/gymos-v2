import { memberSessionOverviewQuerySchema, memberSessionOverviewSchema, recentSessionListSchema, sessionReadPageSchema, sessionReadQuerySchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const sessionReadsApi = (client: Requester) => ({
  memberOverview: (slug: string, accessToken: string, query: unknown) => {
    const input = memberSessionOverviewQuerySchema.parse(query);
    const params = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
    return client.request(`/gyms/${encodeURIComponent(slug)}/member-session-overview?${params}`, {
      method: 'GET', response: memberSessionOverviewSchema, accessToken,
    });
  },
  owner: (slug: string, accessToken: string, query: unknown = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sessionReadQuerySchema.parse(query))) params.set(key, String(value));
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions?${params}`, { method: 'GET', response: sessionReadPageSchema, accessToken });
  },
  mine: (slug: string, accessToken: string, query: unknown = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sessionReadQuerySchema.parse(query))) params.set(key, String(value));
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/sessions?${params}`, { method: 'GET', response: sessionReadPageSchema, accessToken });
  },
  memberRecent: (slug: string, accessToken: string, memberId: string) => client.request(
    `/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/recent-sessions`,
    { method: 'GET', response: recentSessionListSchema, accessToken },
  ),
});
