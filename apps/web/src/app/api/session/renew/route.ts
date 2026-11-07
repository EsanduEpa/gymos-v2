import { cookies } from 'next/headers';
import { sessionRenewalSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE, SESSION_REFRESH_COOKIE } from '@/lib/gymos';
import { refreshCookieOptions, sessionCookieOptions, tokenExpiry } from '@/lib/session-transport';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const jar = await cookies();
  const refreshToken = jar.get(SESSION_REFRESH_COOKIE)?.value;
  if (!refreshToken) return new Response(null, { status: 401, headers });
  let activity = false;
  try { const body: unknown = await request.json(); activity = Boolean(body && typeof body === 'object' && 'activity' in body && body.activity === true); } catch { /* no activity assertion */ }
  let response: Response;
  try {
    response = await fetch(apiUrl('/auth/refresh'), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken, activity }), cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  } catch { return new Response(null, { status: 503, headers }); }
  if (response.status === 401) {
    jar.delete(SESSION_COOKIE); jar.delete(SESSION_REFRESH_COOKIE);
    return new Response(null, { status: 401, headers });
  }
  if (!response.ok) return new Response(null, { status: 503, headers });
  const parsed = sessionRenewalSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 503, headers });
  const result = parsed.data;
  const access = sessionCookieOptions(result.accessToken, result.expiresIn);
  const refresh = refreshCookieOptions(result.refreshExpiresAt);
  if (access.expires.getTime() <= Date.now() || refresh.expires.getTime() <= Date.now()) {
    jar.delete(SESSION_COOKIE); jar.delete(SESSION_REFRESH_COOKIE);
    return new Response(null, { status: 401, headers });
  }
  jar.set(SESSION_COOKIE, result.accessToken, access);
  jar.set(SESSION_REFRESH_COOKIE, result.refreshToken, refresh);
  return Response.json({ sessionId: result.sessionId, deviceClass: result.deviceClass,
    expiresAt: tokenExpiry(result.accessToken), refreshExpiresAt: result.refreshExpiresAt }, { headers });
}
