import { progressPhotoLinkQuerySchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

const headers = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'cross-origin-resource-policy': 'same-origin',
  'referrer-policy': 'no-referrer',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; photoId: string }> }) {
  const { slug, photoId } = await params;
  const query = request.nextUrl.searchParams;
  const memberId = query.get('memberId');
  const validId = (id: string) => /^[A-Za-z0-9_:-]{1,128}$/.test(id);
  const link = progressPhotoLinkQuerySchema.safeParse({ expiresAt: query.get('expiresAt'), signature: query.get('signature') });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !validId(photoId) || (memberId !== null && !validId(memberId)) || !link.success) {
    return new Response(null, { status: 404, headers });
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response(null, { status: 401, headers });
  const actor = memberId === null ? 'me' : `me/clients/${encodeURIComponent(memberId)}`;
  const path = `/gyms/${slug}/${actor}/progress/photos/${encodeURIComponent(photoId)}`;
  const response = await fetch(apiUrl(`${path}?${new URLSearchParams(link.data)}`), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
  }).catch(() => new Response(null, { status: 503 }));
  if (!response.ok) return new Response(null, { status: response.status, headers });
  if (response.headers.get('content-type') !== 'image/webp') return new Response(null, { status: 502, headers });
  return new Response(response.body, { headers: { ...headers, 'content-type': 'image/webp' } });
}
