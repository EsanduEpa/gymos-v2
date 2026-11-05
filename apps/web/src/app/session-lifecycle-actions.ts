'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { sessionCompleteResultSchema, sessionLifecycleCommandInputSchema, sessionNotesInputSchema, sessionNotesResultSchema, sessionStartResultSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type SessionLifecycleActionState = { error?: string; success?: string; outcomeUnknown?: boolean; currentKey?: string; nextKey?: string };
const safeRoute = (slug: string, id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(id);
async function tokenOrRedirect() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  return token;
}
function refresh(slug: string) {
  revalidatePath(`/gyms/${encodeURIComponent(slug)}`, 'layout');
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/schedule`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/sessions`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/member/sessions`);
}
async function send(slug: string, sessionId: string, suffix: string, token: string, body: unknown, idempotencyKey: string) {
  try {
    return await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/${suffix}`), {
      method: suffix === 'notes' ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(body), cache: 'no-store',
    });
  } catch { return null; }
}

export async function startSession(slug: string, sessionId: string, expectedVersion: number, initialKey: string,
  _state: SessionLifecycleActionState, formData: FormData): Promise<SessionLifecycleActionState> {
  if (!safeRoute(slug, sessionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return { error: 'This session action is invalid.' };
  const key = String(formData.get('idempotencyKey') ?? initialKey);
  const parsed = sessionLifecycleCommandInputSchema.safeParse({ expectedVersion, idempotencyKey: key });
  if (!parsed.success) return { error: 'Refresh the session before starting it.', nextKey: randomUUID() };
  const token = await tokenOrRedirect(); const response = await send(slug, sessionId, 'start', token, parsed.data, key);
  if (!response) return { error: 'The start outcome is unknown. Retry with this same key to resolve it.', currentKey: key, outcomeUnknown: true };
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This session is not available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'This session changed or cannot be started. Refresh the schedule.', nextKey: randomUUID() };
  const result = sessionStartResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'The server start window has not opened or has passed.' : 'The start outcome is unknown. Retry with this same key.',
    currentKey: key, outcomeUnknown: response.status >= 500 || response.ok };
  refresh(slug);
  return { success: 'Session started using server time.', nextKey: randomUUID() };
}

export async function completeSession(slug: string, sessionId: string, expectedVersion: number, initialKey: string,
  _state: SessionLifecycleActionState, formData: FormData): Promise<SessionLifecycleActionState> {
  if (!safeRoute(slug, sessionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return { error: 'This session action is invalid.' };
  const key = String(formData.get('idempotencyKey') ?? initialKey);
  const parsed = sessionLifecycleCommandInputSchema.safeParse({ expectedVersion, idempotencyKey: key });
  if (!parsed.success) return { error: 'Refresh the session before completing it.', nextKey: randomUUID() };
  const token = await tokenOrRedirect(); const response = await send(slug, sessionId, 'complete', token, parsed.data, key);
  if (!response) return { error: 'The completion outcome is unknown. Retry with this same key to resolve it.', currentKey: key, outcomeUnknown: true };
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This session is not available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'This session changed or cannot be completed. Refresh the schedule.', nextKey: randomUUID() };
  const result = sessionCompleteResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'The session is not ready to complete yet.' : 'The completion outcome is unknown. Retry with this same key.',
    currentKey: key, outcomeUnknown: response.status >= 500 || response.ok };
  refresh(slug);
  return { success: `Session completed. ${result.data.recognizedRevenue.currency} ${result.data.recognizedRevenue.amount} recognized; trainer earning ${result.data.trainerPay.currency} ${result.data.trainerPay.amount}.`, nextKey: randomUUID() };
}

export async function saveSessionNotes(slug: string, sessionId: string, expectedVersion: number, initialKey: string,
  _state: SessionLifecycleActionState, formData: FormData): Promise<SessionLifecycleActionState> {
  if (!safeRoute(slug, sessionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return { error: 'This session action is invalid.' };
  const key = String(formData.get('idempotencyKey') ?? initialKey);
  const parsed = sessionNotesInputSchema.safeParse({ notes: String(formData.get('notes') ?? ''), expectedVersion, idempotencyKey: key });
  if (!parsed.success) return { error: 'Session notes must be at most 4,000 characters.', nextKey: randomUUID() };
  const token = await tokenOrRedirect(); const response = await send(slug, sessionId, 'notes', token, parsed.data, key);
  if (!response) return { error: 'The save outcome is unknown. Retry with this same key to resolve it.', currentKey: key, outcomeUnknown: true };
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) return { error: 'This session is not available to your trainer account.', nextKey: randomUUID() };
  if (response.status === 409) return { error: 'These notes changed elsewhere. Refresh the session before saving.', nextKey: randomUUID() };
  const result = sessionNotesResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 422 ? 'Notes can only be saved for a completed session.' : 'The save outcome is unknown. Retry with this same key.',
    currentKey: key, outcomeUnknown: response.status >= 500 || response.ok };
  refresh(slug);
  return { success: 'Shared session notes saved.', nextKey: randomUUID() };
}
