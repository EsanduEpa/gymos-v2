import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
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
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
