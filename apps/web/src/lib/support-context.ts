import 'server-only';
import { cookies } from 'next/headers';
import { supportEntryResultSchema, supportSummarySchema } from '@gymos/contracts/platform';
import { apiUrl, SESSION_COOKIE } from './gymos';
export const SUPPORT_COOKIE = 'gymos_support_context';
const contextCookieSchema = supportEntryResultSchema;
export async function currentSupportCookie() {
  try { return contextCookieSchema.parse(JSON.parse((await cookies()).get(SUPPORT_COOKIE)?.value ?? 'null')); }
  catch { return null; }
}
export async function readSupportSummary(slug: string, token?: string) {
  const context = await currentSupportCookie();
  if (!context || context.slug !== slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const bearer = token ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!bearer) return null;
  const response = await fetch(apiUrl(`/admin/support-sessions/${encodeURIComponent(context.id)}/gyms/${encodeURIComponent(slug)}/summary`), {
    headers: { authorization: `Bearer ${bearer}`, 'x-gymos-support-context': context.context }, cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const parsed = supportSummarySchema.safeParse(await response.json());
  return parsed.success && parsed.data.id === context.id && parsed.data.gym.slug === slug ? parsed.data : null;
}
