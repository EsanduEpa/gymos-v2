'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sessionExceptionIntentSchema, sessionExceptionCommitSchema, sessionExceptionQuoteSchema, sessionExceptionResultSchema, type SessionExceptionQuote } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
const safe = (slug: string, id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(id);
export type ExceptionState = { error?: string; quote?: SessionExceptionQuote; success?: string; replacementSessionId?: string | null; outcomeUnknown?: boolean; reauthenticate?: boolean };
async function post(slug: string, id: string, suffix: string, body: unknown, key?: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response(null, { status: 401 });
  try { return await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(id)}/${suffix}`), { method: 'POST', cache: 'no-store', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) }); }
  catch { return null; }
}
async function errorFor(response: Response | null) {
  if (response?.status === 401) return 'Your sign-in expired. Sign in again, then return and check this booking before submitting another change.';
  if (response?.status === 403 || response?.status === 404) return 'This booking is not available to your owner account.';
  const body = await response?.json().catch(() => null);
  return typeof body?.message === 'string' && body.message.length <= 500 ? body.message : 'The booking could not be checked. Your draft remains here.';
}
export async function quoteSessionException(slug: string, id: string, raw: unknown): Promise<ExceptionState> {
  if (!safe(slug,id)) return { error: 'This booking link is invalid.' };
  const parsed = sessionExceptionIntentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the exception details.' };
  const response = await post(slug,id,'exception-quote',parsed.data);
  if (!response?.ok) return { error: await errorFor(response), reauthenticate: response?.status === 401 };
  const result = sessionExceptionQuoteSchema.safeParse(await response.json().catch(() => null));
  return result.success ? { quote: result.data } : { error: 'The quote could not be verified. Request a fresh quote.' };
}
export async function commitSessionException(slug: string, id: string, raw: unknown): Promise<ExceptionState> {
  if (!safe(slug,id)) return { error: 'This booking link is invalid.' };
  const parsed = sessionExceptionCommitSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Review a valid quote before confirming.' };
  const response = await post(slug,id,'exceptions',parsed.data,parsed.data.idempotencyKey);
  if (!response || response.status >= 500) return { error: 'The save outcome is unknown. Keep this review open and retry the same change to resolve it.', outcomeUnknown: true };
  if (!response.ok) return { error: await errorFor(response), reauthenticate: response.status === 401, outcomeUnknown: response.status === 401 };
  const result = sessionExceptionResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { error: 'The save outcome could not be verified. Retry this same change.', outcomeUnknown: true };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
  return { success: 'The owner resolution was recorded with its credit and earning effects.', replacementSessionId: result.data.replacementSessionId };
}
