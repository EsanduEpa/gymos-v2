import { memberTrainerDirectoryQuerySchema, memberTrainerDirectorySchema, trainerListQuerySchema, trainerListSchema, trainerProfileSchema,
  trainerRegistrationInputSchema, trainerRegistrationResultSchema, trainerShiftInputSchema, trainerShiftResultSchema,
  trainerLifecycleResultSchema, trainerStatusInputSchema, idempotencyKeySchema } from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const trainerApi = (client: Requester) => ({
  list: (slug: string, accessToken: string, query: unknown = {}) => {
    const input = trainerListQuerySchema.parse(query);
    const params = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize), ...(input.q ? { q: input.q } : {}), ...(input.status ? { status: input.status } : {}), ...(input.level ? { level: input.level } : {}) });
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainers?${params}`, { response: trainerListSchema, accessToken });
  },
  profile: (slug: string, trainerId: string, accessToken: string) => client.request(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}`, { response: trainerProfileSchema, accessToken }),
  directory: (slug: string, accessToken: string, query: unknown = {}) => {
    const input = memberTrainerDirectoryQuerySchema.parse(query);
    const params = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize), ...(input.q ? { q: input.q } : {}) });
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/trainer-directory?${params}`, { response: memberTrainerDirectorySchema, accessToken });
  },
  approveShift: (slug: string, trainerId: string, accessToken: string, body: unknown) => {
    const input = trainerShiftInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/shift`, {
      method: 'PUT', response: trainerShiftResultSchema, accessToken, body: input,
    });
  },
  updateStatus: (slug: string, trainerId: string, accessToken: string, idempotencyKey: string, body: unknown) => {
    const input = trainerStatusInputSchema.parse(body);
    const key = idempotencyKeySchema.parse(idempotencyKey);
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/status`, {
      method: 'POST', response: trainerLifecycleResultSchema, accessToken, idempotencyKey: key, body: input,
    });
  },
  lifecycleStatus: (slug: string, operationId: string, accessToken: string) =>
    client.request(`/gyms/${encodeURIComponent(slug)}/trainer-lifecycle/${encodeURIComponent(operationId)}`, { response: trainerLifecycleResultSchema, accessToken }),
  resumeLifecycle: (slug: string, operationId: string, accessToken: string) =>
    client.request(`/gyms/${encodeURIComponent(slug)}/trainer-lifecycle/${encodeURIComponent(operationId)}/resume`, {
      method: 'POST', response: trainerLifecycleResultSchema, accessToken, body: {},
    }),
  register: (slug: string, accessToken: string, body: unknown) => {
    const input = trainerRegistrationInputSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/trainer-registrations`, {
      method: 'POST', response: trainerRegistrationResultSchema, accessToken,
      idempotencyKey: input.idempotencyKey, body: input,
    });
  },
});
