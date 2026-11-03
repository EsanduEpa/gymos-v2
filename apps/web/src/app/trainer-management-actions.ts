'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { trainerLifecycleResultSchema, trainerShiftInputSchema, trainerShiftResultSchema, trainerStatusInputSchema, idempotencyKeySchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

export type TrainerShiftActionState = { error?: string; success?: string };
export type TrainerLifecycleActionState = { error?: string; success?: string; operation?: { operationId: string; state: string; targetStatus: string };
  recoveryOperationId?: string; outcomeUnknown?: boolean; currentIdempotencyKey?: string; nextIdempotencyKey?: string };

function validRoute(slug: string, trainerId: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[A-Za-z0-9_:-]{1,128}$/.test(trainerId);
}

export async function changeTrainerStatus(slug: string, trainerId: string, initialKey: string,
  _previous: TrainerLifecycleActionState, formData: FormData): Promise<TrainerLifecycleActionState> {
  if (!validRoute(slug, trainerId)) return { error: 'This trainer profile is invalid.' };
  const key = idempotencyKeySchema.safeParse(formData.get('idempotencyKey') ?? initialKey);
  const payload = trainerStatusInputSchema.safeParse({ targetStatus: formData.get('targetStatus'),
    expectedVersion: Number(formData.get('expectedVersion')), reason: formData.get('reason') });
  if (!key.success || !payload.success || formData.get('confirm') !== 'true') return { error: 'Confirm the status change and provide a reason.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/status`), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': key.data },
      body: JSON.stringify(payload.data), cache: 'no-store',
    });
  } catch {
    return { error: 'The status outcome is unknown. Retry with this same form to resolve the original operation.', currentIdempotencyKey: key.data, outcomeUnknown: true };
  }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) return { error: 'Your owner access changed. Reload before making another update.' };
  if (response.status === 404) return { error: 'Trainer not found in this gym.' };
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const operationId = json && typeof json === 'object' && 'operationId' in json && typeof json.operationId === 'string' ? json.operationId : undefined;
    if (response.status === 503 && operationId) {
      revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainerId)}`);
      return { error: 'The status change is pending recovery. Resume the same operation after reviewing its status.', recoveryOperationId: operationId, currentIdempotencyKey: key.data };
    }
    if (response.status === 409) return { error: 'This profile or lifecycle operation changed. Reload the trainer before trying again.' };
    return { error: response.status === 422 ? 'Check the status confirmation and reason.' : 'Could not confirm the status result. Retry with this same key.', currentIdempotencyKey: key.data, outcomeUnknown: response.status >= 500 };
  }
  const result = trainerLifecycleResultSchema.safeParse(json);
  if (!result.success) return { error: 'The status result could not be verified. Retry with this same key.', currentIdempotencyKey: key.data, outcomeUnknown: true };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainerId)}`);
  return { operation: result.data, success: result.data.state === 'COMPLETE' ? `Trainer status changed to ${result.data.targetStatus}.` : 'Trainer status is pending recovery.',
    nextIdempotencyKey: randomUUID(), currentIdempotencyKey: key.data,
    ...(result.data.state === 'COMPLETE' ? {} : { recoveryOperationId: result.data.operationId }) };
}

export async function resumeTrainerLifecycle(slug: string, trainerId: string, operationId: string,
  _previous: TrainerLifecycleActionState, _formData: FormData): Promise<TrainerLifecycleActionState> {
  void _previous;
  void _formData;
  if (!validRoute(slug, trainerId) || !/^[A-Za-z0-9_:-]{1,128}$/.test(operationId)) return { error: 'This recovery operation is invalid.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainer-lifecycle/${encodeURIComponent(operationId)}/resume`), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: '{}', cache: 'no-store',
    });
  } catch { return { error: 'Recovery outcome is unknown. Check this operation before retrying.', recoveryOperationId: operationId, outcomeUnknown: true }; }
  if (response.status === 401) redirect('/login?error=expired');
  const result = trainerLifecycleResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { error: response.status === 409 ? 'This operation is still active or requires review after its lease expires.' : 'The original operation remains pending. Check its status before retrying.', recoveryOperationId: operationId, outcomeUnknown: response.status >= 500 };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainerId)}`);
  return { operation: result.data, success: result.data.state === 'COMPLETE' ? `Trainer status changed to ${result.data.targetStatus}.` : 'Trainer status remains pending.',
    ...(result.data.state === 'COMPLETE' ? {} : { recoveryOperationId: operationId }) };
}

export async function approveTrainerShift(slug: string, trainerId: string, _previous: TrainerShiftActionState, formData: FormData): Promise<TrainerShiftActionState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(trainerId)) return { error: 'This trainer profile is invalid.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const expectedVersion = Number(formData.get('expectedVersion'));
  const parsed = trainerShiftInputSchema.safeParse({ start: formData.get('start'), end: formData.get('end'), overnight: formData.get('overnight') === 'true', expectedVersion });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter a valid shift.' };
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/shift`), {
      method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The shift update outcome is unknown. Reload the profile before trying again.' }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) return { error: 'Your owner access changed. Reload before making another update.' };
  if (response.status === 404) return { error: 'Trainer not found in this gym.' };
  if (response.status === 409) return { error: 'This profile changed. Reload and review the current shift before approving.' };
  if (!response.ok) return { error: response.status === 422 ? 'Shift must be 15–960 minutes. Check the overnight setting.' : 'Could not confirm the shift update. Reload before retrying.' };
  const result = trainerShiftResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return { error: 'The shift update could not be confirmed. Reload the profile.' };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainerId)}`);
  return { success: `Shift approved in ${result.data.timeZone}.` };
}
