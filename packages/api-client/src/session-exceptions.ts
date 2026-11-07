import { sessionExceptionIntentSchema, sessionExceptionCommitSchema, sessionExceptionQuoteSchema, sessionExceptionResultSchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';
type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
export const sessionExceptionsApi = (client: Requester) => ({
  quote: (slug: string, token: string, sessionId: string, intent: unknown) => client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/exception-quote`, { method: 'POST', accessToken: token, body: sessionExceptionIntentSchema.parse(intent), response: sessionExceptionQuoteSchema }),
  commit: (slug: string, token: string, sessionId: string, input: unknown) => { const body = sessionExceptionCommitSchema.parse(input); return client.request(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/exceptions`, { method: 'POST', accessToken: token, body, idempotencyKey: body.idempotencyKey, response: sessionExceptionResultSchema }); },
});
