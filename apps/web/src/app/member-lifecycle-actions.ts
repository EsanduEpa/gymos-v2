'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { idempotencyKeySchema, memberLifecycleResultSchema, memberStatusCommandSchema } from '@gymos/contracts';
import { cookies } from 'next/headers';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type MemberLifecycleActionState = { error?: string; success?: string; operation?: { operationId: string; state: string; targetStatus: string };
  recoveryOperationId?: string; outcomeUnknown?: boolean; currentIdempotencyKey?: string; nextIdempotencyKey?: string };
function validRoute(slug: string, memberId: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(memberId); }

export async function changeMemberStatus(slug: string, memberId: string, initialKey: string,
  _previous: MemberLifecycleActionState, formData: FormData): Promise<MemberLifecycleActionState> {
  if (!validRoute(slug, memberId)) return { error: 'This member profile is invalid.' };
  const key = idempotencyKeySchema.safeParse(formData.get('idempotencyKey') ?? initialKey);
  const payload = memberStatusCommandSchema.safeParse({ targetStatus: formData.get('targetStatus'),
    expectedVersion: Number(formData.get('expectedVersion')), reason: formData.get('reason') });
  if (!key.success || !payload.success || formData.get('confirm') !== 'true') return { error: 'Confirm the status change and provide a reason.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/status`), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': key.data },
      body: JSON.stringify(payload.data), cache: 'no-store',
    });
  } catch { return { error: 'The status outcome is unknown. Retry using the same request key.', currentIdempotencyKey: key.data, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) return { error: 'Your owner access changed. Reload before making another update.' };
  if (response.status === 404) return { error: 'Member not found in this gym.' };
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const operationId = json && typeof json === 'object' && 'operationId' in json && typeof json.operationId === 'string' ? json.operationId : undefined;
    if (response.status === 503 && operationId) return { error: 'The status change is pending recovery. Resume the original operation.', recoveryOperationId: operationId, currentIdempotencyKey: key.data };
    if (response.status === 409) return { error: 'The member profile or lifecycle operation changed. Reload before trying again.' };
    return { error: response.status === 422 ? 'Check the status confirmation and reason.' : 'Could not confirm the result. Retry with this same key.', currentIdempotencyKey: key.data, outcomeUnknown: response.status >= 500 };
  }
  const result = memberLifecycleResultSchema.safeParse(json);
  if (!result.success) return { error: 'The status result could not be verified. Retry with the same key.', currentIdempotencyKey: key.data, outcomeUnknown: true };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`);
  return { operation: result.data, success: result.data.state === 'COMPLETE' ? `Member status changed to ${result.data.targetStatus}.` : 'Member status is pending recovery.',
    nextIdempotencyKey: randomUUID(), currentIdempotencyKey: key.data, ...(result.data.state === 'COMPLETE' ? {} : { recoveryOperationId: result.data.operationId }) };
}

export async function resumeMemberLifecycle(slug: string, memberId: string, operationId: string,
  _previous: MemberLifecycleActionState, _formData: FormData): Promise<MemberLifecycleActionState> {
  void _previous; void _formData;
  if (!validRoute(slug, memberId) || !/^[A-Za-z0-9_:-]{1,128}$/.test(operationId)) return { error: 'This recovery operation is invalid.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/member-lifecycle/${encodeURIComponent(operationId)}/resume`), {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: '{}', cache: 'no-store' }); }
  catch { return { error: 'Recovery outcome is unknown. Check the operation before retrying.', recoveryOperationId: operationId, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  const result = memberLifecycleResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { error: response.status === 409 ? 'The operation is active or needs review after its lease expires.' : 'The original operation remains pending.', recoveryOperationId: operationId, outcomeUnknown: response.status >= 500 };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`);
  return { operation: result.data, success: result.data.state === 'COMPLETE' ? `Member status changed to ${result.data.targetStatus}.` : 'Member status remains pending.',
    ...(result.data.state === 'COMPLETE' ? {} : { recoveryOperationId: operationId }) };
}
