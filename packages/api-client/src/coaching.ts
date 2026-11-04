import {
  memberWorkoutPlanPageSchema, memberWorkoutPlansQuerySchema, trainerClientPageSchema, trainerClientProfileSchema,
  trainerClientQuerySchema, workoutPlanCreateResultSchema, workoutPlanCreateSchema,
  mealPlanCreateResultSchema, mealPlanCreateSchema, memberMealPlanPageSchema,
} from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };

export const coachingApi = (client: Requester) => ({
  clients: (slug: string, accessToken: string, query: unknown = {}) => {
    const input = trainerClientQuerySchema.parse(query);
    const params = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/clients?${params}`, {
      method: 'GET', response: trainerClientPageSchema, accessToken,
    });
  },
  clientProfile: (slug: string, accessToken: string, memberId: string) => client.request(
    `/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}`,
    { method: 'GET', response: trainerClientProfileSchema, accessToken },
  ),
  createWorkoutPlan: (slug: string, memberId: string, accessToken: string, idempotencyKey: string, body: unknown) => {
    const input = workoutPlanCreateSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/workout-plans`, {
      method: 'POST', response: workoutPlanCreateResultSchema, accessToken, idempotencyKey, body: input,
    });
  },
  myWorkoutPlans: (slug: string, accessToken: string, query: unknown = {}) => {
    const input = memberWorkoutPlansQuerySchema.parse(query);
    const params = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/workout-plans?${params}`, {
      method: 'GET', response: memberWorkoutPlanPageSchema, accessToken,
    });
  },
  createMealPlan: (slug: string, memberId: string, accessToken: string, idempotencyKey: string, body: unknown) => {
    const input = mealPlanCreateSchema.parse(body);
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/meal-plans`, {
      method: 'POST', response: mealPlanCreateResultSchema, accessToken, idempotencyKey, body: input,
    });
  },
  myMealPlans: (slug: string, accessToken: string, query: unknown = {}) => {
    const input = memberWorkoutPlansQuerySchema.parse(query);
    const params = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
    return client.request(`/gyms/${encodeURIComponent(slug)}/me/meal-plans?${params}`, {
      method: 'GET', response: memberMealPlanPageSchema, accessToken,
    });
  },
});
