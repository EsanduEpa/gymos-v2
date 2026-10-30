'use server';

import { platformOperationSchema, provisioningInputSchema, idempotencyKeySchema } from '@gymos/contracts/platform';
import { existingEndpointContracts, logoutResultSchema } from '@gymos/contracts/legacy';
import { changePasswordInputSchema, changePasswordResultSchema } from '@gymos/contracts/credentials';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionCookieOptions } from '@/lib/session-transport';
import { apiUrl, gymRolePath, SESSION_COOKIE } from '@/lib/gymos';

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function login(formData: FormData) {
  const email = field(formData, 'email').toLowerCase();
  const password = formData.get('password');
  if (!email || typeof password !== 'string' || !password) {
    redirect('/login?error=invalid');
  }

  let response: Response;
  try {
    response = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    redirect('/login?error=unavailable');
  }

  if (!response.ok) {
    const error = response.status === 429
      ? 'rate'
      : response.status >= 500
        ? 'unavailable'
        : 'invalid';
    redirect(`/login?error=${error}`);
  }

  const parsed = existingEndpointContracts.E01.response.safeParse(await response.json().catch(() => null));
  if (!parsed.success) redirect('/login?error=unavailable');
  const result = parsed.data;

  const options = sessionCookieOptions(result.accessToken, result.expiresIn);
  if (options.expires.getTime() <= Date.now()) redirect('/login?error=expired');
  (await cookies()).set(SESSION_COOKIE, result.accessToken, options);
  revalidatePath('/', 'layout');
  if (result.mustChangePassword) redirect('/change-password');

  const firstGym = result.gyms[0];
  redirect(result.globalRole === 'SUPER_ADMIN' ? '/admin' : firstGym === undefined ? '/no-access'
    : result.gyms.length === 1 ? `/gyms/${encodeURIComponent(firstGym.slug)}/${firstGym.role === 'OWNER' ? 'owner' : gymRolePath(firstGym.role)}` : '/gyms/select');
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  let uncertain = false;
  try {
    if (token) {
      const response = await fetch(apiUrl('/auth/logout'), {
        method: 'POST', headers: { authorization: `Bearer ${token}` },
        cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      // Even a 401 cannot confirm identity-wide revocation of other sessions.
      uncertain = !response.ok || !logoutResultSchema.safeParse(await response.json().catch(() => null)).success;
    }
  } catch { uncertain = true; }
  finally {
    jar.delete(SESSION_COOKIE);
    revalidatePath('/', 'layout');
  }
  redirect(uncertain ? '/login?error=logout-uncertain' : '/login');
}

export async function changePasswordAction(formData: FormData) {
  const token = await sessionToken();
  if (!token) return { error: 'Sign in again to change your password.' };

  const parsed = changePasswordInputSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the password fields.' };

  let response: Response;
  try {
    response = await fetch(apiUrl('/auth/change-password'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
  } catch {
    return { error: 'GymOS is temporarily unavailable. Please try again.' };
  }

  if (response.status === 401) redirect('/login?error=invalid');
  if (response.status === 400) return { error: 'Your current password is incorrect.' };
  if (response.status === 429) return { error: 'Too many attempts. Please wait a minute and try again.' };
  if (!response.ok) return { error: 'Could not update your password. Please try again.' };

  const result = changePasswordResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { error: 'Could not confirm the password update. Sign in to check your account.' };

  return { success: true as const };
}

export async function finishPasswordChangeAction() {
  (await cookies()).delete(SESSION_COOKIE);
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function createMember(slug: string, formData: FormData) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect('/');
  const token = await sessionToken();
  if (!token) redirect('/login');

  const fullName = field(formData, 'fullName');
  const email = field(formData, 'email').toLowerCase();
  if (fullName.length < 2 || (email && !email.includes('@'))) {
    redirect(`/gyms/${slug}?error=member-input`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${slug}/members`), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fullName, ...(email ? { email } : {}) }),
      cache: 'no-store',
    });
  } catch {
    redirect(`/gyms/${slug}?error=unavailable`);
  }

  if (response.status === 401) redirect('/login');
  if (response.status === 403) redirect(`/gyms/${slug}?error=forbidden`);
  if (response.status === 409) redirect(`/gyms/${slug}?error=duplicate`);
  if (!response.ok) redirect(`/gyms/${slug}?error=member-input`);

  revalidatePath(`/gyms/${slug}`);
  redirect(`/gyms/${slug}?created=1`);
}

export async function createGym(formData: FormData) {
  const token = await sessionToken();
  if (!token) redirect('/login');
  const input = provisioningInputSchema.safeParse({
    name: field(formData, 'name'), slug: field(formData, 'slug'), ownerEmail: field(formData, 'ownerEmail'),
    currency: field(formData, 'currency'), timezone: field(formData, 'timezone'),
  });
  const key = idempotencyKeySchema.safeParse(formData.get('requestKey'));
  if (!input.success || !key.success) return { error: 'Check the gym, owner, currency and timezone fields.' };
  try {
    const response = await fetch(apiUrl('/admin/gyms'), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': key.data },
      body: JSON.stringify(input.data), cache: 'no-store',
    });
    if (response.status === 401) redirect('/login');
    if (response.status === 403) return { error: 'Platform administrator access is required.' };
    if (response.status === 409) return { error: 'This request key or gym slug conflicts with an existing request. Keep the original details when checking a request.' };
    if (!response.ok) return { error: 'The request outcome could not be confirmed. Submit the same unchanged details to check the original request.' };
    const operation = platformOperationSchema.safeParse(await response.json().catch(() => null));
    if (!operation.success) return { error: 'The request outcome could not be confirmed. Keep the original request key and details.' };
    revalidatePath('/admin');
    return { operation: operation.data };
  } catch (error) {
    // Preserve framework redirects without exposing transport failures.
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
    return { error: 'The request outcome could not be confirmed. Submit the same unchanged details to check the original request.' };
  }
}

export async function readProvisioningStatus(operationId: string) {
  const token = await sessionToken();
  if (!token) redirect('/login');
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(operationId)) return { error: 'Operation unavailable.' };
  let response: Response;
  try { response = await fetch(apiUrl(`/admin/operations/${operationId}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { return { error: 'Status is temporarily unavailable. Your request has not been resubmitted.' }; }
  if (response.status === 401) redirect('/login');
  const parsed = platformOperationSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) return { error: 'Could not load this operation status.' };
  return { operation: parsed.data };
}
