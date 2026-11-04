'use server';

import { ownerDashboardSchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export async function loadOwnerDashboard(slug: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/dashboard`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { return { data: null, unavailable: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? ownerDashboardSchema.safeParse(await response.json().catch(() => null)) : null;
  return { data: parsed?.success ? parsed.data : null, unavailable: !parsed?.success };
}
