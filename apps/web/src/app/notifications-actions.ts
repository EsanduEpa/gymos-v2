'use server';

import { notificationListSchema, notificationReadAllSchema, notificationReadSchema,
  notificationListQuerySchema, notificationReadAllInputSchema, idSchema, gymSlugSchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

async function authorizedHeaders() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : null;
}

export async function readNotifications(slug: string, limit: unknown = 5) {
  const gym = gymSlugSchema.safeParse(slug);
  const parsed = notificationListQuerySchema.safeParse({ limit });
  const headers = await authorizedHeaders();
  if (!gym.success || !parsed.success || !headers) return { ok: false as const, message: 'Notifications are unavailable.' };
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(gym.data)}/me/notifications?limit=${parsed.data.limit}`), { headers, cache: 'no-store' });
    const body = notificationListSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !body.success) return { ok: false as const, message: 'Notifications could not be refreshed.' };
    return { ok: true as const, data: body.data };
  } catch {
    return { ok: false as const, message: 'Notifications could not be refreshed.' };
  }
}

export async function markNotificationRead(slug: string, notificationId: string) {
  const gym = gymSlugSchema.safeParse(slug);
  const id = idSchema.safeParse(notificationId);
  const headers = await authorizedHeaders();
  if (!gym.success || !id.success || !headers) return { ok: false as const, message: 'Notification could not be marked as read.' };
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(gym.data)}/me/notifications/${encodeURIComponent(id.data)}/read`), {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}', cache: 'no-store',
    });
    const body = notificationReadSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !body.success) return { ok: false as const, message: 'Notification could not be marked as read.' };
    return { ok: true as const, data: body.data };
  } catch {
    return { ok: false as const, message: 'Notification could not be marked as read.' };
  }
}

export async function markNotificationsReadThrough(slug: string, through?: string) {
  const gym = gymSlugSchema.safeParse(slug);
  const input = notificationReadAllInputSchema.safeParse(through ? { through } : {});
  const headers = await authorizedHeaders();
  if (!gym.success || !input.success || !headers) return { ok: false as const, message: 'Notifications could not be marked as read.' };
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(gym.data)}/me/notifications/read-all`), {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(input.data), cache: 'no-store',
    });
    const body = notificationReadAllSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !body.success) return { ok: false as const, message: 'Notifications could not be marked as read.' };
    return { ok: true as const, data: body.data };
  } catch {
    return { ok: false as const, message: 'Notifications could not be marked as read.' };
  }
}
