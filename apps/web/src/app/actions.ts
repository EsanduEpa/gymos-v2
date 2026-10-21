'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

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
    redirect(`/login?error=${response.status === 429 ? 'rate' : 'invalid'}`);
  }

  const result = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
    globalRole: string;
    gyms: { slug: string }[];
  };
  if (!result.accessToken) redirect('/login?error=unavailable');

  const destination = result.globalRole === 'SUPER_ADMIN'
    ? '/admin'
    : result.gyms[0]
      ? `/gyms/${encodeURIComponent(result.gyms[0].slug)}`
      : null;
  if (!destination) redirect('/login?error=access');

  (await cookies()).set(SESSION_COOKIE, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: result.expiresIn,
  });

  redirect(destination);
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
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

  const name = field(formData, 'name');
  const slug = field(formData, 'slug').toLowerCase();
  const ownerEmail = field(formData, 'ownerEmail').toLowerCase();
  const ownerPassword = formData.get('ownerPassword');
  if (
    name.length < 2 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !ownerEmail.includes('@') ||
    typeof ownerPassword !== 'string' ||
    ownerPassword.length < 12
  ) {
    redirect('/admin?error=gym-input');
  }

  let response: Response;
  try {
    response = await fetch(apiUrl('/admin/gyms'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, slug, ownerEmail, ownerPassword }),
      cache: 'no-store',
    });
  } catch {
    redirect('/admin?error=unavailable');
  }

  if (response.status === 401) redirect('/login');
  if (response.status === 403) redirect('/admin?error=forbidden');
  if (response.status === 409) redirect('/admin?error=duplicate');
  if (!response.ok) redirect('/admin?error=unavailable');

  revalidatePath('/admin');
  redirect(`/admin?created=${encodeURIComponent(slug)}`);
}
