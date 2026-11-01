import { cookies } from 'next/headers';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { resolveCurrentSession } from '@/lib/navigation';
import { SESSION_COOKIE } from '@/lib/gymos';
import { tokenExpiry } from '@/lib/session-transport';

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response(null, { status: 401, headers });
  try {
    const response = await resolveCurrentSession(token);
    if (!response.ok) return new Response(null, { status: response.status === 401 || response.status === 403 ? response.status : 503, headers });
    const session = currentSessionSchema.parse(await response.json());
    return Response.json({ identityId: session.identityId, expiresAt: tokenExpiry(token), gyms: session.gyms.map(({ slug, role }) => ({ slug, role })) }, { headers });
  } catch { return new Response(null, { status: 503, headers }); }
}
