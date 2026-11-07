import { NextResponse, type NextRequest } from 'next/server';
import { sessionRenewalSchema } from '@gymos/contracts';
import { SESSION_COOKIE, SESSION_REFRESH_COOKIE } from '@/lib/gymos';

function accessExpiry(token: string | undefined) {
  try {
    const segment = token?.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!segment) return 0;
    const payload = JSON.parse(atob(segment)) as { exp?: unknown };
    return typeof payload.exp === 'number' && Number.isSafeInteger(payload.exp) ? payload.exp * 1000 : 0;
  } catch { return 0; }
}

async function renewForNavigation(request: NextRequest) {
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(SESSION_REFRESH_COOKIE)?.value;
  if (!refreshToken || accessExpiry(accessToken) > Date.now() + 120_000) return NextResponse.next();
  let upstream: Response;
  try {
    upstream = await fetch(`${(process.env.GYMOS_API_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '')}/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken, activity: true }), cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch { return NextResponse.next(); }
  if (!upstream.ok) return NextResponse.next();
  const parsed = sessionRenewalSchema.safeParse(await upstream.json().catch(() => null));
  if (!parsed.success) return NextResponse.next();
  const issued = parsed.data;
  const expires = new Date(Math.min(accessExpiry(issued.accessToken) - 2000, Date.now() + issued.expiresIn * 1000));
  const refreshExpires = new Date(Date.parse(issued.refreshExpiresAt));
  if (!Number.isFinite(refreshExpires.getTime()) || expires.getTime() <= Date.now() || refreshExpires.getTime() <= Date.now()) return NextResponse.next();
  const requestHeaders = new Headers(request.headers);
  const values = new Map(request.cookies.getAll().map(cookie => [cookie.name, cookie.value]));
  values.set(SESSION_COOKIE, issued.accessToken); values.set(SESSION_REFRESH_COOKIE, issued.refreshToken);
  requestHeaders.set('cookie', [...values].map(([name, value]) => `${name}=${value}`).join('; '));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const common = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  response.cookies.set(SESSION_COOKIE, issued.accessToken, { ...common, expires });
  response.cookies.set(SESSION_REFRESH_COOKIE, issued.refreshToken, { ...common, expires: refreshExpires });
  return response;
}

export async function proxy(request: NextRequest) {
  // A configured origin is mandatory in production. Do not trust forwarded
  // hosts or expand Server Action allowedOrigins to support arbitrary proxies.
  const configured = process.env.GYMOS_WEB_ORIGIN ?? (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    let trusted = false;
    try {
      const expected = new URL(configured);
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(expected.hostname);
      trusted = expected.origin === configured && (expected.protocol === 'https:' || (expected.protocol === 'http:' && loopback))
        && request.headers.get('origin') === expected.origin
        && request.headers.get('sec-fetch-site') !== 'cross-site';
    } catch { /* configuration fails closed */ }
    if (!trusted) return new NextResponse('Request origin denied', { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const acceptsPage = request.headers.get('accept')?.includes('text/html') || request.headers.get('rsc') === '1';
  const prefetch = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
  const isSessionEndpoint = request.nextUrl.pathname.startsWith('/api/session');
  const response = request.method === 'GET' && acceptsPage && !prefetch && !isSessionEndpoint
    ? await renewForNavigation(request) : NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
