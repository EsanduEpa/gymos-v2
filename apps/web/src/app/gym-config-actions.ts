'use server';

import {
  configurationReadSchema, createdMembershipPlanSchema, createMembershipPlanSchema, gymConfigurationSchema, gymPublicProfileSchema, gymThemeSettingsSchema,
  updateConfigurationSchema, updateGymPublicProfileSchema, updateGymThemeSchema,
} from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

async function token() { return (await cookies()).get(SESSION_COOKIE)?.value; }
function safeError(status: number) {
  if (status === 401) return 'Your session expired. Sign in again.';
  if (status === 403) return 'Only a gym owner can change these settings.';
  if (status === 409) return 'These settings changed elsewhere. Reload the latest values before saving.';
  if (status === 422 || status === 400) return 'Check the highlighted values and try again.';
  return 'GymOS could not save this change. Your edits are still here; try again.';
}
async function send<T>(slug: string, path: string, method: string, body: unknown, schema: { safeParse(value: unknown): { success: boolean; data?: T } }) {
  const accessToken = await token();
  if (!accessToken) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/${path}`), {
      method, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store',
    });
  } catch { return { ok: false as const, error: 'GymOS is unavailable. Your draft is still here; try again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return { ok: false as const, error: safeError(response.status) };
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return { ok: false as const, error: 'GymOS returned a response we could not confirm. Reload before retrying.' };
  revalidatePath(`/gyms/${slug}/owner/gym-config`);
  return { ok: true as const, data: parsed.data as T };
}

export async function loadGymConfiguration(slug: string) {
  const accessToken = await token();
  if (!accessToken) redirect('/login');
  const requests = [
    ['configuration', configurationReadSchema], ['theme/settings', gymThemeSettingsSchema], ['public-profile', gymPublicProfileSchema],
  ] as const;
  try {
    const results = await Promise.all(requests.map(async ([path, schema]) => {
      const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/${path}`), { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      if (response.status === 401) redirect('/login?error=expired');
      if (response.status === 403 || response.status === 404) notFound();
      if (!response.ok) throw new Error('unavailable');
      const parsed = schema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new Error('invalid');
      return parsed.data;
    }));
    const [configuration, theme, publicProfile] = results;
    return { ok: true as const, data: { configuration: configurationReadSchema.parse(configuration), theme: gymThemeSettingsSchema.parse(theme), publicProfile: gymPublicProfileSchema.parse(publicProfile) } };
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string'
      && (error.digest.startsWith('NEXT_REDIRECT') || error.digest.startsWith('NEXT_HTTP_ERROR'))) throw error;
    return { ok: false as const, error: 'Gym settings could not load. Check your connection and retry.' };
  }
}

export async function saveOperationalConfiguration(slug: string, body: unknown) {
  const parsed = updateConfigurationSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Check the configuration fields.' };
  return send(slug, 'configuration', 'POST', parsed.data, gymConfigurationSchema);
}
export async function saveMembershipPlan(slug: string, body: unknown) {
  const parsed = createMembershipPlanSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Check the plan fields.' };
  return send(slug, 'membership-plans', 'POST', parsed.data, createdMembershipPlanSchema);
}
export async function savePublicProfile(slug: string, body: unknown) {
  const parsed = updateGymPublicProfileSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: 'Enter a gym name between 2 and 120 characters.' };
  return send(slug, 'public-profile', 'PATCH', parsed.data, gymPublicProfileSchema);
}
export async function saveGymTheme(slug: string, body: unknown) {
  const parsed = updateGymThemeSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: 'Use a six digit color and an HTTPS logo address.' };
  return send(slug, 'theme', 'PATCH', parsed.data, gymThemeSettingsSchema);
}
