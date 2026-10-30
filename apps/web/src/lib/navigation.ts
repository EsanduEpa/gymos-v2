import 'server-only';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { apiUrl } from '@/lib/gymos';

export async function resolveCurrentSession(token: string): Promise<Response> {
  const response = await fetch(apiUrl('/auth/session'), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!response.ok) return response;
  const parsed = currentSessionSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? Response.json(parsed.data) : new Response(null, { status: 503 });
}
