import 'server-only';

// Used only after the API has authenticated the token. This decoding bounds
// browser cookie lifetime; it never authorizes a request.
export function tokenExpiry(token: string): number {
  try {
    const value: unknown = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());
    if (!value || typeof value !== 'object' || !('exp' in value) || typeof value.exp !== 'number' || !Number.isSafeInteger(value.exp)) return 0;
    return value.exp * 1000;
  } catch { return 0; }
}

export function sessionCookieOptions(token: string, expiresIn: number) {
  // Chromium adjusts Expires using the second-precision HTTP Date header.
  // Expire two seconds early so that rounding cannot extend the JWT lifetime.
  const expires = new Date(Math.min(tokenExpiry(token) - 2000, Date.now() + Math.min(expiresIn, 900) * 1000));
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', expires };
}
