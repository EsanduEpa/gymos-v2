'use server';

import { randomUUID } from 'node:crypto';
import { budgetWriteSchema, expenseCreateSchema, payrollApproveSchema, payrollCloseSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type FinanceActionState = { error?: string; success?: string; nextIdempotencyKey?: string; draft?: Record<string, string> };
function formString(form: FormData, key: string) { const value = form.get(key); return typeof value === 'string' ? value : ''; }
async function post(slug: string, path: string, token: string, body: unknown) {
  return fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/${path}`), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store' });
}
function draftFrom(form: FormData, names: string[]) { return Object.fromEntries(names.map(name => [name, formString(form, name)])); }
async function token() { const value = (await cookies()).get(SESSION_COOKIE)?.value; if (!value) redirect('/login'); return value; }
async function failed(response: Response) {
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) notFound();
  if (response.status === 404) notFound();
}

export async function createExpenseAction(slug: string, _previous: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  const names = ['category', 'amount', 'accountingDate', 'description', 'recurring'];
  const draft = draftFrom(form, names);
  const nextIdempotencyKey = formString(form, 'idempotencyKey') || randomUUID();
  const parsed = expenseCreateSchema.safeParse({ ...draft, recurring: draft.recurring === 'on', currency: formString(form, 'currency'), idempotencyKey: nextIdempotencyKey });
  if (!parsed.success) return { error: 'Check the category, exact amount, and accounting date.', nextIdempotencyKey, draft };
  let response: Response;
  try { response = await post(slug, 'financials/expenses', await token(), parsed.data); }
  catch { return { error: 'The result is unknown. Retry this same expense request before starting another.', nextIdempotencyKey, draft }; }
  await failed(response);
  if (!response.ok) return { error: response.status === 409 ? 'The expense request conflicts with a saved command. Refresh and review the expense list.' : 'The expense could not be saved. Check the details and try again.', nextIdempotencyKey, draft };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/financials`);
  return { success: 'Expense saved. The recurring flag is descriptive only.', nextIdempotencyKey: randomUUID() };
}

export async function setBudgetAction(slug: string, _previous: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  const names = ['category', 'month', 'amount', 'expectedVersion'];
  const draft = draftFrom(form, names);
  const nextIdempotencyKey = formString(form, 'idempotencyKey') || randomUUID();
  const expectedText = draft.expectedVersion;
  const parsed = budgetWriteSchema.safeParse({ category: draft.category, month: draft.month, amount: draft.amount,
    currency: formString(form, 'currency'), expectedVersion: expectedText === '' ? null : Number(expectedText), idempotencyKey: nextIdempotencyKey });
  if (!parsed.success) return { error: 'Check the category, month, exact amount, and current budget version.', nextIdempotencyKey, draft };
  let response: Response;
  try { response = await post(slug, 'financials/budgets', await token(), parsed.data); }
  catch { return { error: 'The result is unknown. Retry the same budget command before starting another.', nextIdempotencyKey, draft }; }
  await failed(response);
  if (!response.ok) return { error: response.status === 409 ? 'This budget changed in another request. Reload the month and try again.' : 'The budget could not be saved. Check the amount and try again.', nextIdempotencyKey, draft };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/financials`);
  return { success: 'Budget saved.', nextIdempotencyKey: randomUUID() };
}

export async function closePayrollAction(slug: string, _previous: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  return payrollAction(slug, form, 'close');
}
export async function approvePayrollAction(slug: string, _previous: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  return payrollAction(slug, form, 'approve');
}
async function payrollAction(slug: string, form: FormData, action: 'close' | 'approve'): Promise<FinanceActionState> {
  const periodId = formString(form, 'periodId');
  const key = formString(form, 'idempotencyKey') || randomUUID();
  const expectedVersion = Number(formString(form, 'expectedVersion'));
  const parsed = action === 'close' ? payrollCloseSchema.safeParse({ expectedVersion, idempotencyKey: key })
    : payrollApproveSchema.safeParse({ expectedVersion, expectedTotal: formString(form, 'expectedTotal'), idempotencyKey: key });
  if (!periodId || !parsed.success) return { error: 'The payroll period data is invalid.', nextIdempotencyKey: key };
  let response: Response;
  try { response = await post(slug, `payroll/periods/${encodeURIComponent(periodId)}/${action}`, await token(), parsed.data); }
  catch { return { error: 'The result is unknown. Retry this same payroll command before starting another.', nextIdempotencyKey: key }; }
  await failed(response);
  if (!response.ok) return { error: response.status === 409 ? 'Payroll changed in another request. Reload and review the period.' : 'Payroll could not be updated.', nextIdempotencyKey: key };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/financials`);
  return { success: action === 'close' ? 'Payroll period closed for review.' : 'Payroll approved. No payout was made.', nextIdempotencyKey: randomUUID() };
}
