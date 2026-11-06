'use server';
import { emailCorrectionCloseSchema, emailCorrectionItemSchema, emailCorrectionSubmitSchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentSupportCookie } from '@/lib/support-context';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type EmailCorrectionActionState = { status: 'idle'|'success'|'error'; message?: string };
function field(data: FormData, key: string) { const value = data.get(key); return typeof value === 'string' ? value : ''; }
async function bearer() { return (await cookies()).get(SESSION_COOKIE)?.value; }
export async function submitEmailCorrection(_state: EmailCorrectionActionState, data: FormData): Promise<EmailCorrectionActionState> {
  const parsed = emailCorrectionSubmitSchema.safeParse({ requestedEmail: field(data, 'requestedEmail'), currentPassword: field(data, 'currentPassword') });
  if (!parsed.success) return { status: 'error', message: 'Enter a valid email address and your current password.' };
  if (await currentSupportCookie()) return { status: 'error', message: 'Requests are unavailable during read-only support.' };
  const token = await bearer(); if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl('/auth/profile/email-correction-requests'), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(8000) }); }
  catch { return { status: 'error', message: 'The request could not be confirmed. Refresh this page before trying again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  try {
    if (!response.ok) return { status: 'error', message: response.status === 409 ? 'A request is already pending or this address cannot be used. Review your requests or contact staff.' : response.status === 400 ? 'The current password was not accepted.' : 'The request could not be confirmed. Refresh this page before trying again.' };
    if (!emailCorrectionItemSchema.safeParse(await response.json().catch(() => null)).success) return { status: 'error', message: 'The request result could not be confirmed. Refresh this page before trying again.' };
    revalidatePath('/account/email-correction');
    return { status: 'success', message: 'Request recorded. Your current login remains unchanged; staff will follow up through the contact route your gym already provided.' };
  } catch { return { status: 'error', message: 'The request could not be confirmed. Refresh this page before trying again.' }; }
}
export async function withdrawEmailCorrection(id: string): Promise<void> {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(id) || await currentSupportCookie()) redirect('/account/email-correction');
  const token = await bearer(); if (!token) redirect('/login');
  await fetch(apiUrl(`/auth/profile/email-correction-requests/${encodeURIComponent(id)}/withdraw`), { method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) }).catch(() => null);
  revalidatePath('/account/email-correction');
}
export async function closeEmailCorrection(_state: EmailCorrectionActionState, data: FormData): Promise<EmailCorrectionActionState> {
  const parsed = emailCorrectionCloseSchema.safeParse({ expectedVersion: Number(field(data, 'expectedVersion')), resolution: field(data, 'resolution') });
  const id = field(data, 'id');
  if (!parsed.success || !/^[A-Za-z0-9_:-]{1,128}$/.test(id)) return { status: 'error', message: 'Request details are invalid.' };
  if (await currentSupportCookie()) return { status: 'error', message: 'Changes are unavailable during read-only support.' };
  const token = await bearer(); if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/admin/email-correction-requests/${encodeURIComponent(id)}/close`), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(8000) }); }
  catch { return { status: 'error', message: 'The update could not be confirmed. Refresh the queue before retrying.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  try {
    if (!response.ok) return { status: 'error', message: response.status === 409 ? 'This request changed; refresh the queue.' : 'The update could not be confirmed. Refresh the queue before retrying.' };
    if (!emailCorrectionItemSchema.safeParse(await response.json().catch(() => null)).success) return { status: 'error', message: 'The update result could not be confirmed. Refresh the queue before retrying.' };
    revalidatePath('/admin/email-correction-requests');
    return { status: 'success', message: 'Request closed. No login email or gym contact was changed.' };
  } catch { return { status: 'error', message: 'The update could not be confirmed. Refresh the queue before retrying.' }; }
}
