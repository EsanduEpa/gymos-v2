'use server';

import { progressPhotoDateSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

type PhotoActionResult = { error?: string; success?: string };
const maxPhotoBytes = 768 * 1024;
const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];

async function updatePhoto(slug: string, method: 'POST' | 'DELETE', photoId?: string, body?: FormData): Promise<PhotoActionResult> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login?error=expired');
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const resource = photoId ? `/${encodeURIComponent(photoId)}` : '';
  const response = await fetch(apiUrl(`${base}/me/progress/photos${resource}`), {
    method, body, headers: { authorization: `Bearer ${token}` },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
  }).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) {
    return { error: 'This photo change is unavailable. Refresh your progress report.' };
  }
  if (response.status === 413 || response.status === 422) {
    return { error: 'Use today or an earlier date and choose a JPEG, PNG or WebP photo up to 768 KB and 16 megapixels.' };
  }
  if (response.status === 409) return { error: 'The photo could not be added. Review the current photos before trying again.' };
  if (response.status !== 204) {
    return { error: 'The photo change could not be confirmed. Refresh the report before trying again.' };
  }
  revalidatePath(`${base}/member/progress`);
  return { success: method === 'POST' ? 'Progress photo saved.' : 'Progress photo deleted.' };
}

export async function uploadProgressPhoto(slug: string, _previous: PhotoActionResult, form: FormData): Promise<PhotoActionResult> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: 'This gym is unavailable.' };
  const takenOn = progressPhotoDateSchema.safeParse(form.get('takenOn'));
  if (!takenOn.success) return { error: 'Enter the date the photo was taken.' };
  const photo = form.get('photo');
  if (!(photo instanceof File) || !photo.size || photo.size > maxPhotoBytes || !photoTypes.includes(photo.type)) {
    return { error: 'Choose a JPEG, PNG or WebP photo up to 768 KB.' };
  }
  const body = new FormData();
  body.set('photo', photo, 'progress-photo');
  body.set('takenOn', takenOn.data);
  return updatePhoto(slug, 'POST', undefined, body);
}

export async function deleteProgressPhoto(slug: string, photoId: string): Promise<PhotoActionResult> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(photoId)) {
    return { error: 'This progress photo is unavailable.' };
  }
  return updatePhoto(slug, 'DELETE', photoId);
}
