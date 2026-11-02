'use server';

import { memberEnrollmentConsentInputSchema, memberEnrollmentConsentResultSchema, trainerRegistrationInputSchema, trainerRegistrationResultSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type TrainerRegistrationActionState = {
  idempotencyKey: string;
  error?: string;
  profile?: { fullName: string; email: string; phone: string; level: 'LEVEL_1' | 'LEVEL_2'; yearsExperience: number | null;
    specialisations: string[]; shiftStart: string | null; shiftEnd: string | null; bio: string | null };
  result?: ReturnType<typeof trainerRegistrationResultSchema.parse>;
};

export type TrainerEnrollmentConsentActionState = {
  error?: string;
  result?: ReturnType<typeof memberEnrollmentConsentResultSchema.parse>;
};

export async function registerTrainerAction(slug: string, previous: TrainerRegistrationActionState,
  formData: FormData): Promise<TrainerRegistrationActionState> {
  const rawKey = formData.get('idempotencyKey');
  const idempotencyKey = typeof rawKey === 'string' ? rawKey : previous.idempotencyKey;
  const experience = String(formData.get('yearsExperience') ?? '').trim();
  const rawSpecs = String(formData.get('specialisations') ?? '');
  const parsed = trainerRegistrationInputSchema.safeParse({
    fullName: formData.get('fullName'), email: formData.get('email'), phone: formData.get('phone'),
    level: formData.get('level'), yearsExperience: experience === '' ? null : Number(experience),
    specialisations: rawSpecs.split(',').map(value => value.trim()).filter(Boolean),
    shiftStart: String(formData.get('shiftStart') ?? '').trim() || null,
    shiftEnd: String(formData.get('shiftEnd') ?? '').trim() || null,
    bio: String(formData.get('bio') ?? '').trim() || null, idempotencyKey,
  });
  if (!parsed.success) return { idempotencyKey, error: parsed.error.issues[0]?.message ?? 'Check the trainer profile fields.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainer-registrations`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch {
    return { idempotencyKey, error: 'The outcome is unknown. Keep this request key and retry the same trainer details to recover.' };
  }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  if (response.status === 409) return { idempotencyKey, error: 'This identity or request key conflicts with a trainer enrollment. Existing people must consent before joining this gym.' };
  if (!response.ok) return { idempotencyKey, error: response.status === 422
    ? 'Check the trainer profile fields and paired shift times.'
    : 'Trainer enrollment is pending recovery. Retry the same details and request key.' };
  const result = trainerRegistrationResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { idempotencyKey, error: 'Enrollment may have committed, but the result could not be confirmed. Retry with the same request key.' };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers`);
  return { idempotencyKey, profile: parsed.data, result: result.data };
}

export async function trainerEnrollmentConsentAction(slug: string, operationId: string, _previous: TrainerEnrollmentConsentActionState,
  formData: FormData): Promise<TrainerEnrollmentConsentActionState> {
  const parsed = memberEnrollmentConsentInputSchema.safeParse({ decision: formData.get('decision'), currentPassword: formData.get('currentPassword') });
  if (!parsed.success) return { error: 'Enter your current password and choose whether to accept this gym enrollment.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainer-enrollments/${encodeURIComponent(operationId)}/consent`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'Consent could not be confirmed. Sign in again and retry this request.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = memberEnrollmentConsentResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: 'We could not verify your account or save this choice. Check your current password and try again.' };
  return { result: result.data };
}
