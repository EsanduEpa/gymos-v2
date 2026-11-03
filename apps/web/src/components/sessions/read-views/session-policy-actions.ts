'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  sessionCancelInputSchema, sessionCancelResultSchema, sessionLifecycleQuoteSchema,
  sessionNoShowInputSchema, sessionNoShowResultSchema, type SessionLifecycleQuote,
} from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type SessionPolicyActionState = {
  error?: string;
  success?: string;
  outcomeUnknown?: boolean;
  currentKey?: string;
  nextKey?: string;
  refreshQuote?: boolean;
};
export type SessionQuoteResult = { quote?: SessionLifecycleQuote; error?: string };

function safeRoute(slug: string, id: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(id);
}
async function tokenOrRedirect() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  return token;
}
function refresh(slug: string) {
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/schedule`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/sessions`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/sessions`);
}

export async function getSessionPolicyQuote(slug: string, sessionId: string, action: 'CANCEL' | 'NO_SHOW'): Promise<SessionQuoteResult> {
  if (!safeRoute(slug, sessionId)) return { error: 'This session action is invalid.' };
  const token = await tokenOrRedirect();
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/quote?action=${action}`), {
      method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, cache: 'no-store',
    });
  } catch { return { error: 'The current policy quote is unavailable. Retry to request it again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  const quote = sessionLifecycleQuoteSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !quote.success || quote.data.sessionId !== sessionId || quote.data.action !== action) {
    return { error: response.status === 403 || response.status === 404 ? 'This session is not available to your account.' : 'The current policy quote is unavailable.' };
  }
  return { quote: quote.data };
}

export async function cancelSessionWithQuote(slug: string, sessionId: string, expectedVersion: number, policyVersion: number,
  acknowledgmentToken: string | null, initialKey: string): Promise<SessionPolicyActionState> {
  if (!safeRoute(slug, sessionId)) return { error: 'This session action is invalid.' };
  const idempotencyKey = initialKey;
  const parsed = sessionCancelInputSchema.safeParse({ expectedVersion, policyVersion, idempotencyKey, acknowledgmentToken });
  if (!parsed.success) return { error: 'Refresh this session and review its current cancellation quote.', nextKey: randomUUID(), refreshQuote: true };
  const token = await tokenOrRedirect();
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/cancel`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The cancellation outcome is unknown. Retry with this same key to resolve it.', currentKey: idempotencyKey, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This session is not available to your account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'The session or policy changed. Request a fresh quote before continuing.', nextKey: randomUUID(), refreshQuote: true };
  const result = sessionCancelResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'This session can no longer be cancelled.' : 'The cancellation outcome is unknown. Retry with this same key.',
    currentKey: idempotencyKey, outcomeUnknown: response.status >= 500 || response.ok };
  refresh(slug);
  const effect = result.data.deductedCredits > 0 ? ` ${result.data.deductedCredits} session credit was used.` : ' No session credit was used.';
  return { success: `Session cancelled.${effect}`, nextKey: randomUUID() };
}

export async function markSessionNoShowWithQuote(slug: string, sessionId: string, expectedVersion: number, policyVersion: number,
  acknowledgmentToken: string | null, initialKey: string): Promise<SessionPolicyActionState> {
  if (!safeRoute(slug, sessionId)) return { error: 'This session action is invalid.' };
  const idempotencyKey = initialKey;
  const parsed = sessionNoShowInputSchema.safeParse({ expectedVersion, policyVersion, idempotencyKey, acknowledgmentToken });
  if (!parsed.success) return { error: 'Refresh this session and review the current no-show quote.', nextKey: randomUUID(), refreshQuote: true };
  const token = await tokenOrRedirect();
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/no-show`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The no-show outcome is unknown. Retry with this same key to resolve it.', currentKey: idempotencyKey, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This session is not available to your account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'The session or policy changed. Request a fresh no-show quote before continuing.', nextKey: randomUUID(), refreshQuote: true };
  const result = sessionNoShowResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'No-show is not available for this session yet.' : 'The no-show outcome is unknown. Retry with this same key.',
    currentKey: idempotencyKey, outcomeUnknown: response.status >= 500 || response.ok };
  refresh(slug);
  return { success: 'Session marked no-show. The approved credit and revenue effects were recorded.', nextKey: randomUUID() };
}
