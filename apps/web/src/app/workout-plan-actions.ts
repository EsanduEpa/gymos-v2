'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { idempotencyKeySchema, workoutCompletionInputSchema, workoutPlanCreateResultSchema, workoutPlanCreateSchema, workoutPlanUpdateSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type WorkoutPlanActionState = { error?: string; success?: string; nextKey?: string; currentKey?: string; outcomeUnknown?: boolean; planId?: string; revision?: string };

function safeRoute(slug: string, memberId: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(memberId);
}

export async function saveWorkoutPlan(slug: string, initialKey: string, state: WorkoutPlanActionState, formData: FormData): Promise<WorkoutPlanActionState> {
  const memberId = String(formData.get('memberId') ?? '');
  if (!safeRoute(slug, memberId)) return { error: 'Choose a valid confirmed client before saving.' };
  const idempotencyKey = String(formData.get('idempotencyKey') ?? initialKey);
  if (!idempotencyKeySchema.safeParse(idempotencyKey).success) return { error: 'Refresh the form before saving.', nextKey: randomUUID() };
  const count = Number(formData.get('exerciseCount'));
  const planId = String(formData.get('planId') ?? '');
  const expectedRevision = String(formData.get('expectedRevision') ?? '');
  if (planId && !/^[A-Za-z0-9_:-]{1,128}$/.test(planId)) return { error: 'Refresh the plan before editing.', nextKey: randomUUID() };
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
      restSeconds: asNumber(field('restSeconds')),
      notes: text(field('notes')) || null,
    };
  });
  const kind = String(formData.get('scheduleKind') ?? 'UNSCHEDULED');
  const schedule = kind === 'DATE' ? { kind, date: formData.get('scheduledDate') } :
    kind === 'WEEKLY' ? { kind, weekdays: formData.getAll('scheduledWeekday').map(Number) } : { kind };
  const raw = { name: formData.get('name'), description: String(formData.get('description') ?? '') || null, schedule, exercises };
  const parsed = planId ? workoutPlanUpdateSchema.safeParse({ ...raw, expectedRevision }) : workoutPlanCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the plan title, exercise values and schedule. Weekly workouts need at least one weekday.', nextKey: randomUUID(), revision: state.revision };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/workout-plans${planId ? `/${encodeURIComponent(planId)}` : ''}`), {
      method: planId ? 'PATCH' : 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The save outcome is unknown. Retry with this same key to resolve it.', currentKey: idempotencyKey, outcomeUnknown: true, revision: state.revision }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This client is no longer available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: planId ? 'This plan changed since you opened it. Reload it before saving.' : 'The client relationship or idempotency key changed. Reload the client profile before saving.', nextKey: randomUUID() };
  const result = workoutPlanCreateResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'The workout plan did not pass server validation.' : 'The save outcome is unknown. Retry with this same key to resolve it.',
    currentKey: idempotencyKey, outcomeUnknown: response.status >= 500 || response.ok, revision: state.revision };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/workout-plans`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member`);
  return { success: result.data.replayed ? 'This workout plan change was already saved.' : planId ? 'Workout plan changes saved.' : 'Workout plan assigned to this client.', planId: result.data.plan.id, revision: result.data.plan.revision, nextKey: randomUUID() };
}

export async function saveWorkoutCompletion(slug: string, planId: string, input: unknown) {
  const parsed = workoutCompletionInputSchema.safeParse(input);
  if (!safeRoute(slug, planId) || !parsed.success) return { error: 'Reload the workout before marking completion.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login?error=expired');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/workout-plans/${encodeURIComponent(planId)}/completion`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'Completion could not be confirmed. Try again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404 || response.status === 409) {
    return { error: 'This workout is no longer available for today. Reload the page to check the current assignment.' };
  }
  if (!response.ok) return { error: 'Completion could not be confirmed. Try again.' };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/workout-plans`);
  return { completed: parsed.data.completed };
}
