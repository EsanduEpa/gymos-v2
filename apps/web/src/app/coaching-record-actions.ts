'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { bodyMeasurementInputSchema, dietaryProfileSchema, dietaryProfileUpdateSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

type ActionResult = { error?: string; success?: string; version?: number };
const validSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const validMemberId = (value: string) => /^[A-Za-z0-9_:-]{1,128}$/.test(value);

async function save(path: string, method: 'POST' | 'PATCH', body: unknown) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login?error=expired');
  const response = await fetch(apiUrl(path), {
    method, body: JSON.stringify(body), cache: 'no-store',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(12_000),
  }).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  return response;
}

export async function saveBodyReading(slug: string, _previous: ActionResult, form: FormData): Promise<ActionResult> {
  const field = (name: string) => String(form.get(name) ?? '').trim() || null;
  const input = bodyMeasurementInputSchema.safeParse({
    measuredOn: field('measuredOn'), weightKg: field('weightKg'), heightCm: field('heightCm'), bodyFatPct: field('bodyFatPct'),
  });
  if (!validSlug(slug) || !input.success) return { error: 'Enter a date and at least one measurement within the shown range.' };
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const response = await save(`${base}/me/progress/measurements`, 'POST', input.data);
  if (response.status === 422) return { error: 'Use today’s date or an earlier date for the measurement.' };
  if (response.status === 403 || response.status === 404) return { error: 'This account cannot save progress measurements.' };
  if (!response.ok) return { error: 'The measurement could not be saved. Try again.' };
  revalidatePath(`${base}/member/progress`);
  return { success: 'Measurement saved.' };
}

export async function updateDietaryProfile(slug: string, memberId: string, initialVersion: number | null, previous: ActionResult, form: FormData): Promise<ActionResult> {
  const items = (field: string) => String(form.get(field) ?? '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  const version = previous.version;
  const input = dietaryProfileUpdateSchema.safeParse({ allergies: items('allergies'), restrictions: items('restrictions'), expectedVersion: version ?? initialVersion });
  if (!validSlug(slug) || !validMemberId(memberId) || !input.success) {
    return { version, error: 'Use up to 12 different entries in each list, with at most 100 characters per line.' };
  }
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const client = encodeURIComponent(memberId);
  const response = await save(`${base}/me/clients/${client}/dietary-profile`, 'PATCH', input.data);
  if (response.status === 409) return { version, error: 'The profile changed. Reload before saving your edits.' };
  if (response.status === 403 || response.status === 404) return { version, error: 'This client is unavailable to your trainer account.' };
  const saved = response.ok ? dietaryProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  if (!saved?.success || saved.data.version === null) return { version, error: 'Dietary notes could not be confirmed. Try again.' };
  revalidatePath(`${base}/trainer/clients/${client}`);
  revalidatePath(`${base}/member/meal-plans`);
  return { version: saved.data.version, success: 'Dietary notes saved.' };
}
