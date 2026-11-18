'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { trainingJournalWriteSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type JournalActionState = { error?: string };
export type JournalFormKind = 'WEIGHT' | 'STRENGTH' | 'SESSIONS' | 'SOLO' | 'FOOD';

export async function saveJournalEntry(slug: string, kind: JournalFormKind, id: string | null, expectedVersion: number | null,
  _state: JournalActionState, form: FormData): Promise<JournalActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: 'Reload the journal and try again.' };
  const text = (field: string) => {
    const value = form.get(field);
    return typeof value === 'string' ? value.trim() : '';
  };
  const number = (field: string) => text(field) === '' ? NaN : Number(text(field));
  const date = text('date');
  let entry: unknown;
  if (kind === 'SOLO') {
    const weights = form.getAll('exerciseWeight');
    const exercises = form.getAll('exerciseName').map((value, i) => ({
      name: value,
      weightKg: typeof weights[i] === 'string' && weights[i] !== '' ? Number(weights[i]) : null,
    }));
    entry = { kind, id, expectedVersion, data: { date, durationMinutes: number('duration'), notes: text('notes'), exercises } };
  } else if (kind === 'FOOD') {
    entry = { kind, expectedVersion, data: { date, calories: number('calories'), protein: number('protein'), carbs: number('carbs'), fat: number('fat') } };
  } else {
    entry = { kind: 'GOAL', expectedVersion, data: { type: kind, target: number('target'),
      ...(kind === 'STRENGTH' ? { exercise: text('exercise') } : {}) } };
  }
  const parsed = trainingJournalWriteSchema.safeParse(entry);
  if (!parsed.success) return { error: 'Check the date and required values before saving.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const response = await fetch(apiUrl(`/gyms/${slug}/me/training-journal`), {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store',
  }).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 409) return { error: 'This entry changed. Reload the journal before saving.' };
  if (response.status === 422) return { error: 'Check the values and use today’s date or an earlier date.' };
  if (!response.ok) return { error: 'The save could not be confirmed. Reload the journal and try again.' };
  const path = `/gyms/${slug}/member/training-journal`;
  revalidatePath(path);
  const section = kind === 'SOLO' ? '#solo-workouts' : kind === 'FOOD' ? `?date=${date}#daily-nutrition` : '#goals';
  redirect(`${path}${section}`);
}
