'use server';

import { memberEnrollmentConsentInputSchema, memberEnrollmentConsentResultSchema, memberRegistrationInputSchema, memberRegistrationResultSchema } from '@gymos/contracts';
import { credentialAcknowledgementInputSchema, credentialAcknowledgementResultSchema, credentialReissueInputSchema, credentialReissueResultSchema } from '@gymos/contracts/credentials';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type MemberRegistrationActionState = {
  error?: string; idempotencyKey: string;
  result?: ReturnType<typeof memberRegistrationResultSchema.parse>;
};

export type MemberEnrollmentConsentActionState = {
  error?: string;
  result?: ReturnType<typeof memberEnrollmentConsentResultSchema.parse>;
};

export async function memberEnrollmentConsentAction(slug: string, operationId: string,
  _previous: MemberEnrollmentConsentActionState, formData: FormData): Promise<MemberEnrollmentConsentActionState> {
  const parsed = memberEnrollmentConsentInputSchema.safeParse({
    decision: formData.get('decision'), currentPassword: formData.get('currentPassword'),
  });
  if (!parsed.success) return { error: 'Enter your current password and choose whether to accept this gym enrollment.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/member-enrollments/${encodeURIComponent(operationId)}/consent`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch {
    return { error: 'Consent could not be confirmed. Sign in again and retry this same request.' };
  }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = memberEnrollmentConsentResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) {
    return { error: response.status === 409
      ? 'This enrollment already has a role or its consent state changed. Contact the gym owner.'
      : 'We could not verify your account or save this choice. Check your current password and try again.' };
  }
  return { result: result.data };
}

export async function registerMemberAction(slug: string, previous: MemberRegistrationActionState, formData: FormData): Promise<MemberRegistrationActionState> {
  const keyValue = formData.get('idempotencyKey');
  const idempotencyKey = typeof keyValue === 'string' ? keyValue : previous.idempotencyKey;
  const parsed = memberRegistrationInputSchema.safeParse({
    fullName: formData.get('fullName'), email: formData.get('email'), phone: formData.get('phone'),
    dateOfBirth: formData.get('dateOfBirth'), emergencyContact: formData.get('emergencyContact') || null,
    healthNotes: formData.get('healthNotes') || null, membershipPlanId: formData.get('membershipPlanId'), idempotencyKey,
  });
  if (!parsed.success) return { idempotencyKey, error: parsed.error.issues[0]?.message ?? 'Check the member details and try again.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/member-registrations`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch {
    return { idempotencyKey, error: 'The outcome is unknown. Keep this request key and retry with the same details to recover the enrollment.' };
  }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  if (response.status === 409) return { idempotencyKey, error: 'This identity or request key conflicts with an existing enrollment. Existing people must consent before joining this gym.' };
  if (response.status === 422 || response.status === 400) return { idempotencyKey, error: 'Check the membership plan and profile values.' };
  if (!response.ok) return { idempotencyKey, error: 'Enrollment is pending recovery. Retry with the same details and request key.' };
  const result = memberRegistrationResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { idempotencyKey, error: 'Enrollment may have committed, but the result could not be confirmed. Keep the same request key and recover before starting another.' };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members`);
  return { idempotencyKey, result: result.data };
}

export async function acknowledgeMemberCredential(slug: string, operationId: string, deliveryVersion: number) {
  const input = credentialAcknowledgementInputSchema.safeParse({ deliveryVersion });
  if (!input.success) return { ok: false as const, error: 'Credential handoff is no longer valid. Contact the gym owner.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/enrollments/${encodeURIComponent(operationId)}/credentials/acknowledge`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input.data), cache: 'no-store',
    });
  } catch { return { ok: false as const, error: 'Could not confirm the handoff. Keep the credential visible and try again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = credentialAcknowledgementResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { ok: false as const, error: 'Could not confirm the handoff. Keep the credential visible and try again.' };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members`);
  return { ok: true as const };
}

export async function reissueMemberCredential(slug: string, operationId: string, expectedVersion: number, idempotencyKey: string) {
  const input = credentialReissueInputSchema.safeParse({ reason: 'LOST_HANDOFF', expectedVersion, idempotencyKey });
  if (!input.success) return { ok: false as const, error: 'The reissue request is invalid. Reload the member profile.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/enrollments/${encodeURIComponent(operationId)}/credentials/reissue`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input.data), cache: 'no-store',
    });
  } catch { return { ok: false as const, error: 'The reissue outcome is unknown. Keep the same request key and check the credential state before trying again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = credentialReissueResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { ok: false as const, error: 'The credential could not be reissued. Refresh the profile and check its status.' };
  return { ok: true as const, result: result.data };
}
