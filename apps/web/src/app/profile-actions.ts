'use server';

import { profileCommandResultSchema, updateAccountProfileSchema, updateSelfMemberProfileSchema,
  updateSelfTrainerProfileSchema, ownerMemberProfileCorrectionSchema } from '@gymos/contracts';
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
      emergencyContact: value(formData, 'emergencyContact').trim() || null };
    const parsed = updateSelfMemberProfileSchema.safeParse({ ...body, idempotencyKey });
    if (!parsed.success) return { status: 'error', message: 'Correct the highlighted fields and save again.', fieldErrors: errors(parsed.error) };
    const result = await save(`/gyms/${encodeURIComponent(slug)}/me/profile`, {
      phone: parsed.data.phone, emergencyContact: parsed.data.emergencyContact, expectedVersion: parsed.data.expectedVersion,
    }, parsed.data.idempotencyKey);
    if (result.status === 'success') revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
    return result;
  }
  {
    const raw = value(formData, 'specialisations').split('\n').map(item => item.trim()).filter(Boolean);
    const years = value(formData, 'yearsExperience');
    const body = { expectedVersion, phone: value(formData, 'phone').trim() || null,
      biography: value(formData, 'biography').trim() || null, specialisations: raw,
      yearsExperience: years === '' ? null : Number(years) };
    const parsed = updateSelfTrainerProfileSchema.safeParse({ ...body, idempotencyKey });
    if (!parsed.success) return { status: 'error', message: 'Correct the highlighted fields and save again.', fieldErrors: errors(parsed.error) };
    const result = await save(`/gyms/${encodeURIComponent(slug)}/me/profile`, {
      phone: parsed.data.phone, biography: parsed.data.biography, specialisations: parsed.data.specialisations,
      yearsExperience: parsed.data.yearsExperience, expectedVersion: parsed.data.expectedVersion,
    }, parsed.data.idempotencyKey);
    if (result.status === 'success') revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
    return result;
  }
}

export async function correctMemberProfile(slug: string, memberId: string, _previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(memberId)) return { status: 'error', message: 'Member context is invalid.' };
  const expectedVersion = Number(value(formData, 'expectedVersion'));
  const idempotencyKey = value(formData, 'idempotencyKey');
  const rawDate = value(formData, 'dateOfBirth');
  const body = { fullName: value(formData, 'fullName').trim(), dateOfBirth: rawDate || null,
    phone: value(formData, 'phone').trim() || null, emergencyContact: value(formData, 'emergencyContact').trim() || null,
    expectedVersion, reason: value(formData, 'reason') };
  const parsed = ownerMemberProfileCorrectionSchema.safeParse({ ...body, idempotencyKey });
  if (!parsed.success) return { status: 'error', message: 'Correct the highlighted fields and save again.', fieldErrors: errors(parsed.error) };
  const validatedBody = { fullName: parsed.data.fullName, dateOfBirth: parsed.data.dateOfBirth, phone: parsed.data.phone,
    emergencyContact: parsed.data.emergencyContact, expectedVersion: parsed.data.expectedVersion, reason: parsed.data.reason };
  const result = await save(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/profile`, validatedBody, parsed.data.idempotencyKey);
  if (result.status === 'success') {
    revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
    revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`);
  }
  return result;
}
