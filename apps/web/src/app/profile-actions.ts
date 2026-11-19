'use server';

import { profileCommandResultSchema, updateAccountProfileSchema, updateSelfMemberProfileSchema,
  updateSelfTrainerProfileSchema, ownerMemberProfileCorrectionSchema, trainerShiftProposalInputSchema, idempotencyKeySchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentSupportCookie } from '@/lib/support-context';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import type { ProfileActionState } from '@/lib/profile-action-state';

function value(form: FormData, key: string) { const result = form.get(key); return typeof result === 'string' ? result : ''; }
function errors(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(Object.entries(error.flatten().fieldErrors).flatMap(([name, messages]) => messages?.length ? [[name, messages[0]!]] : []));
}
async function token() { return (await cookies()).get(SESSION_COOKIE)?.value; }

async function save(path: string, body: Record<string, unknown>, key: string): Promise<ProfileActionState> {
  if (await currentSupportCookie()) return { status: 'error', message: 'Profile changes are unavailable during read-only support.' };
  const access = await token();
  if (!access) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { method: 'PATCH', headers: { authorization: `Bearer ${access}`,
      'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(8000) });
  } catch { return { status: 'error', message: 'The save result could not be confirmed. Refresh your profile before retrying.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) return { status: 'error', message: 'Your access changed. Refresh your profile and try again.' };
  if (response.status === 409) return { status: 'error', message: 'This profile changed since it was loaded. Review the latest values before saving.' };
  if (!response.ok) return { status: 'error', message: response.status >= 500
    ? 'The save result could not be confirmed. Refresh your profile before retrying.' : 'Check the highlighted profile values and try again.' };
  const result = profileCommandResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { status: 'error', message: 'The save result could not be confirmed. Refresh your profile before retrying.' };
  return { status: 'success', message: 'Profile saved.', version: result.data.version };
}

export async function updateAccountProfile(_previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const displayName = value(formData, 'displayName').trim();
  const expectedVersion = Number(value(formData, 'expectedVersion'));
  const idempotencyKey = value(formData, 'idempotencyKey');
  const parsed = updateAccountProfileSchema.safeParse({ displayName, expectedVersion, idempotencyKey });
  if (!parsed.success) return { status: 'error', message: 'Correct the highlighted field and save again.', fieldErrors: errors(parsed.error) };
  const result = await save('/auth/profile', { displayName, expectedVersion }, parsed.data.idempotencyKey);
  if (result.status === 'success') revalidatePath('/', 'layout');
  return result;
}

export async function updateGymSelfProfile(slug: string, role: 'MEMBER' | 'TRAINER', _previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !['MEMBER', 'TRAINER'].includes(role)) return { status: 'error', message: 'Gym context is invalid.' };
  const expectedVersion = Number(value(formData, 'expectedVersion'));
  const idempotencyKey = value(formData, 'idempotencyKey');
  if (role === 'MEMBER') {
    const body = { expectedVersion, phone: value(formData, 'phone').trim() || null,
      emergencyContact: value(formData, 'emergencyContact').trim() || null,
      healthNotes: formData.has('healthNotes') ? value(formData, 'healthNotes').trim() || null : undefined };
    const parsed = updateSelfMemberProfileSchema.safeParse({ ...body, idempotencyKey });
    if (!parsed.success) return { status: 'error', message: 'Correct the highlighted fields and save again.', fieldErrors: errors(parsed.error) };
    const result = await save(`/gyms/${encodeURIComponent(slug)}/me/profile`, {
      phone: parsed.data.phone, emergencyContact: parsed.data.emergencyContact, healthNotes: parsed.data.healthNotes,
      expectedVersion: parsed.data.expectedVersion,
    }, parsed.data.idempotencyKey);
    if (result.status === 'success') revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
    return result;
  }
  {
    const raw = value(formData, 'specialisations').split('\n').map(item => item.trim()).filter(Boolean);
    const years = value(formData, 'yearsExperience');
    const body = { expectedVersion, phone: value(formData, 'phone').trim() || null,
      biography: value(formData, 'biography').trim() || null, specialisations: raw,
      yearsExperience: years === '' ? null : Number(years),
      ...(formData.has('virtualPtPreferencePresent') ? { offersVirtualPt: formData.get('offersVirtualPt') === 'on' } : {}) };
    const parsed = updateSelfTrainerProfileSchema.safeParse({ ...body, idempotencyKey });
    if (!parsed.success) return { status: 'error', message: 'Correct the highlighted fields and save again.', fieldErrors: errors(parsed.error) };
    const result = await save(`/gyms/${encodeURIComponent(slug)}/me/profile`, {
      phone: parsed.data.phone, biography: parsed.data.biography, specialisations: parsed.data.specialisations,
      yearsExperience: parsed.data.yearsExperience, offersVirtualPt: parsed.data.offersVirtualPt, expectedVersion: parsed.data.expectedVersion,
    }, parsed.data.idempotencyKey);
    if (result.status === 'success') revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
    return result;
  }
}

export async function changeProfilePhoto(slug: string, expectedVersion: number, key: string,
  _previous: ProfileActionState, form: FormData): Promise<ProfileActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !idempotencyKeySchema.safeParse(key).success) return { status: 'error', message: 'Reload your profile before changing the photo.' };
  if (await currentSupportCookie()) return { status: 'error', message: 'Photo changes require access to your gym profile.' };
  const access = await token();
  if (!access) redirect('/login');
  const remove = form.get('operation') === 'remove';
  const photo = form.get('photo');
  let body: FormData | undefined;
  if (!remove) {
    if (!(photo instanceof File) || !photo.size || photo.size > 768 * 1024) {
      return { status: 'error', message: 'Choose a JPEG, PNG, or WebP photo under 768 KB.' };
    }
    body = new FormData();
    body.set('photo', photo, 'profile-photo');
  }
  const response = await fetch(apiUrl(`/gyms/${slug}/me/profile/photo?version=${expectedVersion}`), {
    method: remove ? 'DELETE' : 'PUT', headers: { authorization: `Bearer ${access}`, 'idempotency-key': key },
    body, cache: 'no-store', signal: AbortSignal.timeout(8000),
  }).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 409) return { status: 'error', message: 'Your profile changed. Reload before changing the photo.' };
  if (response.status === 413 || response.status === 422) return { status: 'error', message: 'Choose a JPEG, PNG, or WebP photo under 768 KB and 16 megapixels.' };
  const result = response.ok ? profileCommandResultSchema.safeParse(await response.json().catch(() => null)) : null;
  if (!result?.success) return { status: 'error', message: 'The photo change could not be confirmed. Refresh your profile and try again.' };
  revalidatePath(`/gyms/${slug}`, 'layout');
  return { status: 'success', message: remove ? 'Profile photo removed.' : 'Profile photo saved.', version: result.data.version };
}

export async function requestTrainerShift(slug: string, expectedVersion: number, requestId: string,
  _previous: ProfileActionState, form: FormData): Promise<ProfileActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { status: 'error', message: 'Reload your trainer profile and try again.' };
  if (await currentSupportCookie()) return { status: 'error', message: 'Sign in as the trainer to request a shift.' };
  const access = await token();
  if (!access) redirect('/login');
  const start = value(form, 'start');
  const end = value(form, 'end');
  const parsed = trainerShiftProposalInputSchema.safeParse({ requestId, expectedVersion, start, end, overnight: end <= start });
  if (!parsed.success) return { status: 'error', message: 'Enter the shift start and end times.' };
  const response = await fetch(apiUrl(`/gyms/${slug}/me/shift-request`), {
    method: 'PUT', headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store',
  }).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 422) return { status: 'error', message: 'Choose a recurring shift between 15 minutes and 16 hours.' };
  if (response.status === 409) return { status: 'error', message: 'Your profile or shift request changed. Reload before submitting.' };
  const result = response.ok ? profileCommandResultSchema.safeParse(await response.json().catch(() => null)) : null;
  if (!result?.success) return { status: 'error', message: 'The shift request could not be confirmed. Reload and try again.' };
  revalidatePath(`/gyms/${slug}`, 'layout');
  return { status: 'success', message: 'Shift request sent to your gym owner.', version: result.data.version };
}

export async function correctMemberProfile(slug: string, memberId: string, _previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(memberId)) return { status: 'error', message: 'Member context is invalid.' };
  const expectedVersion = Number(value(formData, 'expectedVersion'));
  const idempotencyKey = value(formData, 'idempotencyKey');
  const rawDate = value(formData, 'dateOfBirth');
  const body = { fullName: value(formData, 'fullName').trim(), dateOfBirth: rawDate || null,
    phone: value(formData, 'phone').trim() || null, emergencyContact: value(formData, 'emergencyContact').trim() || null,
    healthNotes: value(formData, 'healthNotes').trim() || null,
    expectedVersion, reason: value(formData, 'reason') };
  const parsed = ownerMemberProfileCorrectionSchema.safeParse({ ...body, idempotencyKey });
  if (!parsed.success) return { status: 'error', message: 'Correct the highlighted fields and save again.', fieldErrors: errors(parsed.error) };
  const validatedBody = { fullName: parsed.data.fullName, dateOfBirth: parsed.data.dateOfBirth, phone: parsed.data.phone,
    emergencyContact: parsed.data.emergencyContact, healthNotes: parsed.data.healthNotes, expectedVersion: parsed.data.expectedVersion, reason: parsed.data.reason };
  const result = await save(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/profile`, validatedBody, parsed.data.idempotencyKey);
  if (result.status === 'success') {
    revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
    revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`);
  }
  return result;
}
