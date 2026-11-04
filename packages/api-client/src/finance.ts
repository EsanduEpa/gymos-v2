import { budgetListSchema, budgetWriteResultSchema, expenseCreateResultSchema, expenseCreateSchema, expenseListQuerySchema, expenseListSchema,
  financeReadQuerySchema, financeRevenueSchema, trainerEarningsSchema, type FinanceWindowQuery } from '@gymos/contracts';
import { z } from 'zod';
import type { createApiClient } from './index.js';

type Client = ReturnType<typeof createApiClient>;
type FinanceReadQuery = FinanceWindowQuery & { page: number; pageSize: number };
export function getGymRevenue(client: Client, slug: string, query: FinanceReadQuery, accessToken: string) {
  const parsed = financeReadQuerySchema.parse(query);
  const params = new URLSearchParams(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  return client.request(`/gyms/${encodeURIComponent(slug)}/financials/revenue?${params}`, { response: financeRevenueSchema, accessToken });
}
export function getMyEarnings(client: Client, slug: string, query: FinanceReadQuery, accessToken: string) {
  const parsed = financeReadQuerySchema.parse(query);
  const params = new URLSearchParams(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  return client.request(`/gyms/${encodeURIComponent(slug)}/me/earnings?${params}`, { response: trainerEarningsSchema, accessToken });
}
export function listExpenses(client: Client, slug: string, query: FinanceReadQuery & { category?: string }, accessToken: string) {
  const parsed = expenseListQuerySchema.parse(query);
  const params = new URLSearchParams(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  return client.request(`/gyms/${encodeURIComponent(slug)}/financials/expenses?${params}`, { response: expenseListSchema, accessToken });
}
export function createExpense(client: Client, slug: string, body: unknown, accessToken: string, idempotencyKey: string) {
  const parsed = expenseCreateSchema.parse(body);
  return client.request(`/gyms/${encodeURIComponent(slug)}/financials/expenses`, { method: 'POST', response: expenseCreateResultSchema,
    body: parsed, accessToken, idempotencyKey });
}
export function listBudgets(client: Client, slug: string, month: string, accessToken: string) {
  return client.request(`/gyms/${encodeURIComponent(slug)}/financials/budgets?month=${encodeURIComponent(month)}`, { response: budgetListSchema, accessToken });
}
export function setBudget(client: Client, slug: string, body: unknown, accessToken: string, idempotencyKey: string) {
  return client.request(`/gyms/${encodeURIComponent(slug)}/financials/budgets`, { method: 'POST', response: budgetWriteResultSchema,
    body, accessToken, idempotencyKey });
}
export type FinanceRevenue = z.infer<typeof financeRevenueSchema>;
export type TrainerEarnings = z.infer<typeof trainerEarningsSchema>;
