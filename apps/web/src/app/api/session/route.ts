import { cookies } from 'next/headers';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { resolveCurrentSession } from '@/lib/navigation';
import { SESSION_COOKIE } from '@/lib/gymos';
import { tokenExpiry } from '@/lib/session-transport';
import { checkSupportSummary } from '@/lib/support-context';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response(null, { status: 401, headers });
  try {
    const response = await resolveCurrentSession(token);
    if (!response.ok) return new Response(null, { status: response.status === 401 || response.status === 403 ? response.status : 503, headers });
    const session = currentSessionSchema.parse(await response.json());
    const slug = new URL(request.url).searchParams.get('support');
    const supportCheck = slug && session.globalRole === 'SUPER_ADMIN' ? await checkSupportSummary(slug, token) : null;
    if (supportCheck?.kind === 'unavailable') return new Response(null, { status: 503, headers });
    const summary = supportCheck?.kind === 'valid' ? supportCheck.summary : null;
    return Response.json({ identityId: session.identityId, expiresAt: tokenExpiry(token), gyms: session.gyms.map(({ slug, role }) => ({ slug, role })), support: summary ? { id: summary.id, slug: summary.gym.slug, expiresAt: Date.parse(summary.expiresAt) } : null }, { headers });
  } catch { return new Response(null, { status: 503, headers }); }
}
