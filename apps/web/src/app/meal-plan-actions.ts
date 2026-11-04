'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { idempotencyKeySchema, mealPlanCreateResultSchema, mealPlanCreateSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type MealPlanActionState = { error?: string; success?: string; nextKey?: string; currentKey?: string; outcomeUnknown?: boolean; planId?: string };

export async function saveMealPlan(slug: string, initialKey: string, _state: MealPlanActionState, formData: FormData): Promise<MealPlanActionState> {
  const memberId = String(formData.get('memberId') ?? '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(memberId)) return { error: 'Choose a valid confirmed client before saving.' };
  const idempotencyKey = String(formData.get('idempotencyKey') ?? initialKey);
  if (!idempotencyKeySchema.safeParse(idempotencyKey).success) return { error: 'Refresh the form before saving.', nextKey: randomUUID() };
  const count = Number(formData.get('entryCount'));
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) return { error: 'Add between one and 100 meal rows.' };
  const entries = Array.from({ length: count }, (_, index) => {
    const field = (name: string) => formData.get(`entry-${index}-${name}`);
    const text = (value: FormDataEntryValue | null) => value === null ? '' : String(value);
    const integer = (value: FormDataEntryValue | null) => value === null || value === '' ? null : Number(value);
    const decimal = (value: FormDataEntryValue | null) => value === null || value === '' ? null : String(value);
    return { dayOfWeek: Number(field('dayOfWeek')), mealType: text(field('mealType')), foodItem: text(field('foodItem')),
      calories: integer(field('calories')), proteinGrams: decimal(field('proteinGrams')), carbsGrams: decimal(field('carbsGrams')), fatsGrams: decimal(field('fatsGrams')) };
  });
  const parsed = mealPlanCreateSchema.safeParse({ name: formData.get('name'), entries });
  if (!parsed.success) return { error: 'Check the title, day, meal type and nonnegative nutrition fields.', nextKey: randomUUID() };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/meal-plans`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The save outcome is unknown. Retry with this same key to resolve it.', currentKey: idempotencyKey, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This client is no longer available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'The client relationship or idempotency key changed. Reload the client profile before saving.', nextKey: randomUUID() };
  const result = mealPlanCreateResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'The meal plan did not pass server validation.' : 'The save outcome is unknown. Retry with this same key to resolve it.',
    currentKey: idempotencyKey, outcomeUnknown: response.status >= 500 || response.ok };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/meal-plans`);
  return { success: result.data.replayed ? 'This meal plan was already saved.' : 'Meal plan assigned to this client.', planId: result.data.plan.id, nextKey: randomUUID() };
}
