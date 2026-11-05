'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { availabilitySlotsSchema, availabilityUpdateSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type AvailabilityState = { error?: string; success?: string; currentKey?: string; nextKey?: string };
export async function loadSessionSlots(slug: string, trainerId: string, localDate: string, memberId?: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(trainerId) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return { error: 'Choose a valid date and trainer.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) redirect('/login');
  const params = new URLSearchParams({ trainerId, localDate, ...(memberId ? { memberId } : {}) });
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/session-slots?${params}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (response.status === 401) redirect('/login?error=expired');
    if (!response.ok) return { error: response.status === 404 ? 'Trainer or member is unavailable.' : 'Available times could not be loaded.' };
    const parsed = availabilitySlotsSchema.safeParse(await response.json().catch(() => null));
    return parsed.success ? { data: parsed.data } : { error: 'Available times could not be verified.' };
  } catch { return { error: 'Available times could not be loaded. Retry after checking your connection.' }; }
}
function intervalRows(text: string) {
  return text.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => {
    const match = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(line);
    if (!match) throw new Error(`Line ${index + 1}: use HH:MM-HH:MM`);
    const startMinute = Number(match[1]) * 60 + Number(match[2]); const endMinute = Number(match[3]) * 60 + Number(match[4]);
    if (startMinute >= 1440 || endMinute > 1440 || endMinute <= startMinute || startMinute % 15 || endMinute % 15) throw new Error(`Line ${index + 1}: times must be increasing and on a 15-minute grid`);
    return { startMinute, endMinute };
  });
}
export async function saveAvailability(slug: string, trainerId: string, expectedVersion: number, _state: AvailabilityState, form: FormData): Promise<AvailabilityState> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(trainerId)) return { error: 'The trainer link is invalid.' };
  const commandKey = String(form.get('idempotencyKey') ?? randomUUID());
  try {
    const weekly: Array<{ weekday: number; effectiveFrom: string; effectiveToExclusive: string; windows: ReturnType<typeof intervalRows> }> = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const text = String(form.get(`weekly-${weekday}`) ?? ''); const windows = intervalRows(text);
      if (windows.length) weekly.push({ weekday, effectiveFrom: String(form.get('effectiveFrom')), effectiveToExclusive: String(form.get('effectiveToExclusive')), windows });
    }
    const dated = String(form.get('dated') ?? '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [localDate, range] = line.split(/\s+/, 2); if (!localDate || !range || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new Error('Dated windows use YYYY-MM-DD HH:MM-HH:MM');
      return { localDate, windows: intervalRows(range) };
    });
    const blocks = String(form.get('blocks') ?? '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [localDate, range, ...reason] = line.split(/\s+/, 3); if (!localDate || !range || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new Error('Unavailable periods use YYYY-MM-DD HH:MM-HH:MM optional-reason');
      return { localDate, ...intervalRows(range)[0]!, ...(reason.length ? { reason: reason.join(' ') } : {}) };
    });
    const closures = String(form.get('closures') ?? '').split(/[\s,]+/).filter(Boolean);
    const input = availabilityUpdateSchema.parse({ expectedVersion, idempotencyKey: commandKey, weekly,
      dated, blocks, closures, closureRange: { from: String(form.get('closureFrom') ?? ''), through: String(form.get('closureThrough') ?? '') } });
    const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) redirect('/login');
    const isTrainer = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/access`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).then(async response => response.ok && (await response.json()).role === 'TRAINER').catch(() => false);
    const path = isTrainer ? `/gyms/${encodeURIComponent(slug)}/me/availability` : `/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/availability`;
    const response = await fetch(apiUrl(path), { method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
    if (response.status === 401) redirect('/login?error=expired');
    if (response.status === 409) return { error: 'Availability changed or would affect existing sessions. Refresh and resolve listed sessions before saving.', nextKey: randomUUID() };
    if (response.status >= 500) return { error: 'Save outcome is unknown. Retry this same save to safely check its result.', currentKey: commandKey };
    if (!response.ok) return { error: response.status === 403 ? 'You cannot edit this trainer’s availability.' : 'Availability could not be saved. Your draft remains on this page.', nextKey: randomUUID() };
    revalidatePath(`/gyms/${encodeURIComponent(slug)}/trainer/schedule`); revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainerId)}`);
    return { success: 'Availability saved.', nextKey: randomUUID() };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Check availability details.', currentKey: commandKey }; }
}
