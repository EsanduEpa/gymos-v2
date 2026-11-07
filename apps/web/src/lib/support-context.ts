import 'server-only';
import { cookies } from 'next/headers';
import { supportEntryResultSchema, supportSummarySchema } from '@gymos/contracts/platform';
import { apiUrl, SESSION_COOKIE } from './gymos';
export const SUPPORT_COOKIE = `gymos_support_context${process.env.GYMOS_COOKIE_SUFFIX ?? ''}`;
const contextCookieSchema = supportEntryResultSchema;
export async function currentSupportCookie() {
  try { return contextCookieSchema.parse(JSON.parse((await cookies()).get(SUPPORT_COOKIE)?.value ?? 'null')); }
  catch { return null; }
}
export async function readSupportSummary(slug: string, token?: string) {
  const result = await checkSupportSummary(slug, token);
  return result.kind === 'valid' ? result.summary : null;
}
export async function checkSupportSummary(slug: string, token?: string) {
  const context = await currentSupportCookie();
  if (!context || context.slug !== slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { kind: 'invalid' } as const;
  const bearer = token ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!bearer) return { kind: 'invalid' } as const;
  let response: Response;
  try {
    response = await fetch(apiUrl(`/admin/support-sessions/${encodeURIComponent(context.id)}/gyms/${encodeURIComponent(slug)}/summary`), {
      headers: { authorization: `Bearer ${bearer}`, 'x-gymos-support-context': context.context }, cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
  } catch { return { kind: 'unavailable' } as const; }
  if (response.status === 401 || response.status === 403 || response.status === 404) return { kind: 'invalid' } as const;
  if (!response.ok) return { kind: 'unavailable' } as const;
  try {
    const parsed = supportSummarySchema.safeParse(await response.json());
    if (!parsed.success) return { kind: 'unavailable' } as const;
    if (parsed.data.id !== context.id || parsed.data.gym.slug !== slug) return { kind: 'invalid' } as const;
    return { kind: 'valid', summary: parsed.data } as const;
  } catch { return { kind: 'unavailable' } as const; }
}
