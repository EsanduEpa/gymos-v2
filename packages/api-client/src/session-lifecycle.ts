import {
  sessionCancelInputSchema, sessionCancelResultSchema, sessionCompleteResultSchema, sessionLifecycleCommandInputSchema,
  sessionLifecycleQuoteSchema, sessionNoShowInputSchema, sessionNoShowResultSchema, sessionNotesInputSchema,
  sessionNotesResultSchema, sessionStartResultSchema,
} from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const sessionLifecycleApi = (client: Requester) => ({
  start: (slug: string, sessionId: string, accessToken: string, body: unknown) => {
    const input = sessionLifecycleCommandInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST', response: sessionStartResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
  updateNotes: (slug: string, sessionId: string, accessToken: string, body: unknown) => {
    const input = sessionNotesInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/notes`, {
      method: 'PATCH', response: sessionNotesResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
  complete: (slug: string, sessionId: string, accessToken: string, body: unknown) => {
    const input = sessionLifecycleCommandInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/complete`, {
      method: 'POST', response: sessionCompleteResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
  quote: (slug: string, sessionId: string, accessToken: string, action: 'CANCEL' | 'NO_SHOW') =>
    client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/quote?action=${action}`, {
      method: 'GET', response: sessionLifecycleQuoteSchema, accessToken,
    }),
  cancel: (slug: string, sessionId: string, accessToken: string, body: unknown) => {
    const input = sessionCancelInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/cancel`, {
      method: 'POST', response: sessionCancelResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
  noShow: (slug: string, sessionId: string, accessToken: string, body: unknown) => {
    const input = sessionNoShowInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/no-show`, {
      method: 'POST', response: sessionNoShowResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
