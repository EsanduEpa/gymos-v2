import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

const headers = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'cross-origin-resource-policy': 'same-origin' };

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trainer = request.nextUrl.searchParams.get('trainer');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (trainer !== null && !/^[A-Za-z0-9_:-]{1,128}$/.test(trainer))) {
    return new Response(null, { status: 404, headers });
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response(null, { status: 401, headers });
  const path = trainer ? `/gyms/${slug}/me/trainers/${encodeURIComponent(trainer)}/photo` : `/gyms/${slug}/me/profile/photo`;
  const response = await fetch(apiUrl(path), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: request.signal,
  }).catch(() => new Response(null, { status: 503 }));
  if (!response.ok) return new Response(null, { status: response.status, headers });
  if (response.headers.get('content-type') !== 'image/webp') return new Response(null, { status: 502, headers });
  return new Response(response.body, { headers: { ...headers, 'content-type': 'image/webp' } });
}
