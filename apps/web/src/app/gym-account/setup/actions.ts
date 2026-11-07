'use server';

import { redirect } from 'next/navigation';
import { gymAccountSetupSchema, gymAccountSetupResultSchema } from '@gymos/contracts/credentials';
import { apiUrl } from '@/lib/gymos';

export type SetupState = { error?: string };

export async function setupGymAccount(_state: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = gymAccountSetupSchema.safeParse({
    gymSlug: formData.get('gymSlug'), legacyEmail: formData.get('legacyEmail'), legacyPassword: formData.get('legacyPassword'),
    username: formData.get('username'), newPassword: formData.get('newPassword'),
  });
  if (!parsed.success || parsed.data.newPassword !== formData.get('confirmPassword')) return { error: 'Check the gym, username, password requirements and confirmation.' };
  let response: Response;
  try { response = await fetch(apiUrl('/auth/gym-account/setup'), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store' }); }
  catch { return { error: 'Setup is temporarily unavailable. Your existing records have not changed.' }; }
  if (!response.ok) return { error: response.status === 409 ? 'This account or username is already set up. Choose another username or ask for help.'
    : response.status === 401 ? 'The existing login or gym relationship could not be verified.' : 'Setup could not be completed. Try again or ask for help.' };
  if (!gymAccountSetupResultSchema.safeParse(await response.json().catch(() => null)).success) return { error: 'The result could not be confirmed. Try signing in with your new username.' };
  redirect('/login');
}
