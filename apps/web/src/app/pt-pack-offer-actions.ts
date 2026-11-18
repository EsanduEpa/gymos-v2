'use server';

import { createPtPackOfferSchema, managePtPackOfferSchema, ptPackOfferSchema, ptPackOffersSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

async function requestOffers(slug: string, offerId?: string, payload?: unknown) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login?error=expired');
  const path = `/gyms/${encodeURIComponent(slug)}/pt-pack-offers${offerId ? `/${encodeURIComponent(offerId)}` : ''}`;
  const response = await fetch(apiUrl(path), {
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(payload === undefined ? {} : { method: 'POST', body: JSON.stringify(payload) }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403) notFound();
  return response;
}

export async function loadPtPackOffers(slug: string) {
  const response = await requestOffers(slug);
  if (!response?.ok) return null;
  const parsed = ptPackOffersSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.offers : null;
}

async function save(slug: string, offerId: string | undefined, body: unknown) {
  const response = await requestOffers(slug, offerId, body);
  if (response?.status === 409 || response?.status === 404) {
    return { ok: false as const, error: 'This offer or draft changed. Refresh the list before trying again.' };
  }
  const parsed = response?.ok ? ptPackOfferSchema.safeParse(await response.json().catch(() => null)) : null;
  if (!parsed?.success) {
    return { ok: false as const, error: 'GymOS could not confirm the change. Retry with the same details.' };
  }
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/membership`);
  return { ok: true as const, offer: parsed.data };
}

export async function createPtPackOffer(slug: string, body: unknown) {
  const parsed = createPtPackOfferSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: 'Enter a name, positive price, credit count and validity in days.' };
  return save(slug, undefined, parsed.data);
}

export async function changePtPackOffer(slug: string, offerId: string, body: unknown) {
  const parsed = managePtPackOfferSchema.safeParse(body);
  if (!parsed.success || !/^[A-Za-z0-9_:-]{1,128}$/.test(offerId)) {
    return { ok: false as const, error: 'Check the offer details before saving.' };
  }
  return save(slug, offerId, parsed.data);
}
