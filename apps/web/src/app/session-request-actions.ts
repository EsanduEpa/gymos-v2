'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { sessionDecisionInputSchema, sessionDecisionResultSchema, sessionRequestInputSchema, sessionRequestResultSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type SessionCommandState = { error?: string; success?: string; outcomeUnknown?: boolean; currentKey?: string; nextKey?: string; sessionId?: string };
const routeSafe = (slug: string, id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(id);

export async function createSessionRequest(slug: string, trainerId: string, initialKey: string, _state: SessionCommandState, formData: FormData): Promise<SessionCommandState> {
  if (!routeSafe(slug, trainerId)) return { error: 'The trainer link is invalid.' };
  const key = String(formData.get('idempotencyKey') ?? initialKey);
  const parsed = sessionRequestInputSchema.safeParse({ trainerId, localDate: formData.get('localDate'), localTime: formData.get('localTime'),
    timeZone: formData.get('timeZone'), offset: formData.get('offset') || undefined, type: formData.get('type'),
    durationMinutes: Number(formData.get('durationMinutes')), notes: formData.get('notes') || undefined, idempotencyKey: key });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the session request details.', nextKey: randomUUID() };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/session-requests`), {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(parsed.data), cache: 'no-store' }); }
  catch { return { error: 'The request outcome is unknown. Retry with this same key to resolve it.', currentKey: key, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) return { error: 'Member access changed. Reload this page before requesting.', nextKey: randomUUID() };
  if (response.status === 404) return { error: 'This trainer is no longer available at this gym.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'This time conflicts with another request or session. Choose another slot.', nextKey: randomUUID() };
  const result = sessionRequestResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'Check the session time and eligibility, then try again.' : 'The request outcome is unknown. Retry with this same key.',
    currentKey: key, outcomeUnknown: response.status >= 500 || response.ok };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/requests`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/sessions`);
  return { success: 'Request sent. The trainer must accept before credit is reserved.', sessionId: result.data.session.id, nextKey: randomUUID() };
}

export async function decideSessionRequest(slug: string, sessionId: string, initialKey: string, action: 'ACCEPT' | 'DECLINE', expectedVersion: number,
  _state: SessionCommandState, formData: FormData): Promise<SessionCommandState> {
  if (!routeSafe(slug, sessionId) || !['ACCEPT', 'DECLINE'].includes(action) || !Number.isSafeInteger(expectedVersion)) return { error: 'This session request is invalid.' };
  const key = String(formData.get('idempotencyKey') ?? initialKey);
  const payload = sessionDecisionInputSchema.safeParse({ action, expectedVersion,
    ...(action === 'DECLINE' ? { reason: formData.get('reason') || undefined } : {}), idempotencyKey: key });
  if (!payload.success) return { error: payload.error.issues[0]?.message ?? 'Check the decision details.', nextKey: randomUUID() };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/respond`), {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload.data), cache: 'no-store' }); }
  catch { return { error: 'The decision outcome is unknown. Retry with this same key to resolve it.', currentKey: key, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This request is not available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'This request changed or was already decided. Refresh before trying again.', nextKey: randomUUID() };
  const result = sessionDecisionResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'Eligibility changed. Refresh the request before trying again.' : 'The decision outcome is unknown. Retry with this same key.',
    currentKey: key, outcomeUnknown: response.status >= 500 || response.ok };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/requests`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/schedule`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/sessions`);
  return { success: result.data.session.state === 'SCHEDULED' ? 'Request accepted and one credit is now held.' : 'Request declined.', nextKey: randomUUID() };
}
