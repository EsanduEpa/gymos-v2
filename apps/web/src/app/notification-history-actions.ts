'use server';
import { accountNotificationReadInputSchema, gymSlugSchema, idSchema, notificationReadAllInputSchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentSupportCookie } from '@/lib/support-context';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

function field(data: FormData, name: string) { const value = data.get(name); return typeof value === 'string' ? value : ''; }
async function bearer() { return (await cookies()).get(SESSION_COOKIE)?.value; }
export async function markAccountNotificationRead(data: FormData) {
  const parsed = accountNotificationReadInputSchema.safeParse({ source: field(data, 'source'), id: field(data, 'sourceId') });
  if (!parsed.success || await currentSupportCookie()) redirect('/account/notifications?error=read');
  const token = await bearer(); if (!token) redirect('/login');
  const response = await fetch(apiUrl(`/auth/notifications/${parsed.data.source}/${encodeURIComponent(parsed.data.id)}/read`), {
    method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) redirect('/account/notifications?error=read');
  revalidatePath('/account/notifications');
  redirect('/account/notifications');
}
export async function markAccountNotificationsReadThrough(data: FormData) {
  const parsed = notificationReadAllInputSchema.safeParse({ through: field(data, 'through') });
  if (!parsed.success || await currentSupportCookie()) redirect('/account/notifications?error=read');
  const token = await bearer(); if (!token) redirect('/login');
  const response = await fetch(apiUrl('/auth/notifications/read-all'), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!response?.ok) redirect('/account/notifications?error=read');
  revalidatePath('/account/notifications');
  redirect('/account/notifications');
}
export async function markGymNotificationRead(slug: string, id: string) {
  const gym = gymSlugSchema.safeParse(slug); const notificationId = idSchema.safeParse(id);
  if (!gym.success || !notificationId.success || await currentSupportCookie()) redirect('/');
  const token = await bearer(); if (!token) redirect('/login');
  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(gym.data)}/me/notifications/${encodeURIComponent(notificationId.data)}/read`), {
    method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) redirect(`/gyms/${encodeURIComponent(slug)}/notifications?error=read`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/notifications`);
  redirect(`/gyms/${encodeURIComponent(slug)}/notifications`);
}
export async function markGymNotificationsReadThrough(slug: string, data: FormData) {
  const gym = gymSlugSchema.safeParse(slug);
  const parsed = notificationReadAllInputSchema.safeParse({ through: field(data, 'through') });
  if (!parsed.success || !gym.success || await currentSupportCookie()) redirect('/');
  const token = await bearer(); if (!token) redirect('/login');
  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(gym.data)}/me/notifications/read-all`), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!response?.ok) redirect(`/gyms/${encodeURIComponent(slug)}/notifications?error=read`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/notifications`);
  redirect(`/gyms/${encodeURIComponent(slug)}/notifications`);
}
