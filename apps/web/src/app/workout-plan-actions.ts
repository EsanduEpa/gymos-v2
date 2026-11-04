'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { idempotencyKeySchema, workoutPlanCreateResultSchema, workoutPlanCreateSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type WorkoutPlanActionState = { error?: string; success?: string; nextKey?: string; currentKey?: string; outcomeUnknown?: boolean; planId?: string };

function safeRoute(slug: string, memberId: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(memberId);
}

export async function saveWorkoutPlan(slug: string, initialKey: string, _state: WorkoutPlanActionState, formData: FormData): Promise<WorkoutPlanActionState> {
  const memberId = String(formData.get('memberId') ?? '');
  if (!safeRoute(slug, memberId)) return { error: 'Choose a valid confirmed client before saving.' };
  const idempotencyKey = String(formData.get('idempotencyKey') ?? initialKey);
  if (!idempotencyKeySchema.safeParse(idempotencyKey).success) return { error: 'Refresh the form before saving.', nextKey: randomUUID() };
  const count = Number(formData.get('exerciseCount'));
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) return { error: 'Add between one and 100 exercise rows.' };
  const exercises = Array.from({ length: count }, (_, index) => {
    const field = (name: string) => formData.get(`exercise-${index}-${name}`);
    const asNumber = (value: FormDataEntryValue | null) => value === null || value === '' ? null : Number(value);
    const text = (value: FormDataEntryValue | null) => value === null ? '' : String(value);
    return {
      name: text(field('name')),
      sets: asNumber(field('sets')),
      reps: asNumber(field('reps')),
      weightKg: field('weightKg') === null || field('weightKg') === '' ? null : String(field('weightKg')),
      durationMinutes: asNumber(field('durationMinutes')),
      notes: text(field('notes')) || null,
    };
  });
  const parsed = workoutPlanCreateSchema.safeParse({ name: formData.get('name'), description: String(formData.get('description') ?? '') || null, exercises });
  if (!parsed.success) return { error: 'Check the title and exercise fields. Counts, weight and optional details are outside the allowed ranges.', nextKey: randomUUID() };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/workout-plans`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The save outcome is unknown. Retry with this same key to resolve it.', currentKey: idempotencyKey, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This client is no longer available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'The client relationship or idempotency key changed. Reload the client profile before saving.', nextKey: randomUUID() };
  const result = workoutPlanCreateResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'The workout plan did not pass server validation.' : 'The save outcome is unknown. Retry with this same key to resolve it.',
    currentKey: idempotencyKey, outcomeUnknown: response.status >= 500 || response.ok };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/workout-plans`);
  return { success: result.data.replayed ? 'This workout plan was already saved.' : 'Workout plan assigned to this client.', planId: result.data.plan.id, nextKey: randomUUID() };
}
