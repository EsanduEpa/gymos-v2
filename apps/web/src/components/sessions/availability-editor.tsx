'use client';

import { useActionState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Availability } from '@gymos/contracts';
import { saveAvailability } from '@/app/availability-actions';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function AvailabilityEditor({ slug, trainerId, initialKey, data, canEditClosures, closureFrom, closureThrough }: { slug: string; trainerId: string; initialKey: string; data: Availability; canEditClosures: boolean; closureFrom: string; closureThrough: string }) {
  const action = saveAvailability.bind(null, slug, trainerId, data.version);
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: data.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(data.asOf)).map(part => [part.type, part.value]));
  const defaultFrom = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const defaultEnd = new Date(`${defaultFrom}T00:00:00.000Z`);
  defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 365);
  const weeklyText = (weekday: number) => data.weekly.filter(row => row.weekday === weekday).map(row => `${time(row.startMinute)}-${time(row.endMinute)}`).join('\n');
  const datedText = data.dated.map(row => `${row.localDate} ${time(row.startMinute)}-${time(row.endMinute)}`).join('\n');
  const blocksText = data.blocks.map(row => `${row.localDate} ${time(row.startMinute)}-${time(row.endMinute)}${row.reason ? ` ${row.reason}` : ''}`).join('\n');
  return <form action={formAction} className="ui-form-stack">
    <input type="hidden" name="idempotencyKey" value={state.currentKey ?? state.nextKey ?? initialKey}/>
    <p>Times use the gym timezone ({data.timeZone}) and 15-minute increments. A bookable session lasts 60 minutes. Weekly windows need effective dates; split days use separate lines.</p>
    <label className="ui-field"><span className="ui-field-label">Weekly effective from</span><input type="date" name="effectiveFrom" defaultValue={data.weekly[0]?.effectiveFrom ?? defaultFrom} required/></label>
    <label className="ui-field"><span className="ui-field-label">Weekly availability ends before</span><input type="date" name="effectiveToExclusive" defaultValue={data.weekly[0]?.effectiveToExclusive ?? defaultEnd.toISOString().slice(0, 10)} required/></label>
    {weekdays.map((label, weekday) => <label className="ui-field" key={weekday}><span className="ui-field-label">{label} windows (one HH:MM-HH:MM per line)</span><textarea name={`weekly-${weekday}`} rows={Math.max(2, data.weekly.filter(row => row.weekday === weekday).length + 1)} defaultValue={weeklyText(weekday)} placeholder={'09:00-12:00\n13:00-17:00'}/></label>)}
    <label className="ui-field"><span className="ui-field-label">Dated replacement windows (YYYY-MM-DD HH:MM-HH:MM)</span><textarea name="dated" rows={4} defaultValue={datedText} placeholder="2026-12-24 09:00-12:00"/></label>
    <label className="ui-field"><span className="ui-field-label">Unavailable periods (YYYY-MM-DD HH:MM-HH:MM reason)</span><textarea name="blocks" rows={4} defaultValue={blocksText} placeholder="2026-12-24 10:00-11:00 Personal leave"/></label>
    {canEditClosures ? <><label className="ui-field"><span className="ui-field-label">Closure dates to keep in the next 60 days (YYYY-MM-DD, comma or space separated)</span><textarea name="closures" rows={2} defaultValue={data.closures.join(', ')}/></label><input type="hidden" name="closureFrom" value={closureFrom}/><input type="hidden" name="closureThrough" value={closureThrough}/></> : <><input type="hidden" name="closures" value=""/><input type="hidden" name="closureFrom" value={closureFrom}/><input type="hidden" name="closureThrough" value={closureThrough}/></>}
    {state.error ? <p role="alert" className="ui-feedback ui-feedback-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="ui-feedback ui-feedback-success">{state.success}</p> : null}
    <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save availability'}</button>
  </form>;
}
