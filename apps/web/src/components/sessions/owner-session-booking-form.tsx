'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import type { SessionBookingOptions } from '@gymos/contracts';
import { createOwnerSessionBooking, type SessionBookingActionState } from '@/app/session-booking-actions';
import { loadSessionSlots } from '@/app/availability-actions';

export function OwnerSessionBookingForm({ slug, initialKey, options }: {
  slug: string; initialKey: string; options: SessionBookingOptions;
}) {
  const action = createOwnerSessionBooking.bind(null, slug, initialKey);
  const [state, formAction, pending] = useActionState<SessionBookingActionState, FormData>(action, {});
  const [memberId, setMemberId] = useState(options.selectedMember?.memberId ?? options.members.items[0]?.memberId ?? '');
  const [trainerId, setTrainerId] = useState(options.selectedTrainer?.trainerId ?? options.trainers.items[0]?.trainerId ?? '');
  const [draft, setDraft] = useState({ localDate: options.policy.localDate, localTime: '', offset: '', durationMinutes: '60', notes: '' });
  const [slotResult, setSlotResult] = useState<Awaited<ReturnType<typeof loadSessionSlots>>>({ error: 'Choose a date to load times.' }); const [loadingSlots, startSlotLoad] = useTransition();
  useEffect(() => { if (!memberId || !trainerId || !draft.localDate) return; startSlotLoad(async () => { const result = await loadSessionSlots(slug, trainerId, draft.localDate, memberId); setSlotResult(result); setDraft(current => ({ ...current, localTime: '', offset: '' })); }); }, [slug, memberId, trainerId, draft.localDate]);
  const updateDraft = (field: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const fee = options.trainers.items.find(item => item.trainerId === trainerId)?.level === 'LEVEL_2'
    ? options.rateInfo.level2SessionFee ?? options.rateInfo.defaultSessionFee : options.rateInfo.defaultSessionFee;
  const activeKey = state.currentKey ?? state.nextKey ?? initialKey;
  const today = options.policy.localDate;
  const maxDate = (() => { const date = new Date(`${today}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 14); return date.toISOString().slice(0, 10); })();
  return <form action={formAction} className="ui-form-stack owner-booking-form" onSubmit={event => { const values = new FormData(event.currentTarget); setDraft(current => ({ ...current, localDate: String(values.get('localDate') ?? current.localDate), localTime: String(values.get('localTime') ?? ''), offset: String(values.get('offset') ?? ''), durationMinutes: String(values.get('durationMinutes') ?? '60'), notes: String(values.get('notes') ?? '') })); }}>
    <input type="hidden" name="idempotencyKey" value={activeKey}/>
    <input type="hidden" name="timeZone" value={options.policy.timeZone}/>
    <label className="ui-field booking-field-full"><span className="ui-field-label">Select member (eligible pack balance &gt; 0) *</span><select name="memberId" required value={memberId} onChange={event => setMemberId(event.target.value)}>
      {options.members.items.map(member => <option key={member.memberId} value={member.memberId} disabled={member.eligibility !== 'ELIGIBLE'}>{member.name} · {member.availableCredits} available · {member.eligibility.replaceAll('_', ' ').toLowerCase()}</option>)}
    </select></label>
    <label className="ui-field booking-field-full"><span className="ui-field-label">Select personal trainer *</span><select name="trainerId" required value={trainerId} onChange={event => setTrainerId(event.target.value)}>
      {options.trainers.items.map(trainer => <option key={trainer.trainerId} value={trainer.trainerId}>{trainer.name} · {trainer.level.replace('_', ' ')} · {trainer.shiftStart && trainer.shiftEnd ? `${trainer.shiftStart}–${trainer.shiftEnd}` : 'flexible hours'}</option>)}
    </select></label>
    <label className="ui-field booking-field-half"><span className="ui-field-label">Session date ({options.policy.timeZone})</span><input type="date" name="localDate" min={today} max={maxDate} value={draft.localDate} onChange={event => updateDraft('localDate', event.target.value)} required/></label>
    <label className="ui-field booking-field-half"><span className="ui-field-label">Available start time ({options.policy.timeZone})</span><select name="slot" disabled={loadingSlots || !slotResult.data?.slots.length} value={draft.localTime ? `${draft.localDate}T${draft.localTime}${draft.offset}` : ''} onChange={event => { const slot = slotResult.data?.slots.find(item => `${draft.localDate}T${item.localTime}${item.offset}` === event.currentTarget.value); if (slot) setDraft(current => ({ ...current, localTime: slot.localTime, offset: slot.offset })); }} required><option value="">{loadingSlots ? 'Loading times…' : slotResult.data?.slots.length ? 'Choose a time' : 'No times available'}</option>{slotResult.data?.slots.map(slot => <option key={slot.startAt} value={`${draft.localDate}T${slot.localTime}${slot.offset}`}>{slot.localTime} · UTC{slot.offset}</option>)}</select>{slotResult.error ? <small role="alert">{slotResult.error}</small> : null}{slotResult.data?.reason ? <small>{slotResult.data.reason === 'NO_AVAILABILITY' ? 'No published times for this date.' : slotResult.data.reason === 'CLOSED' ? 'The gym is closed.' : 'No available times remain.'}</small> : null}</label>
    <input type="hidden" name="localTime" value={draft.localTime}/><input type="hidden" name="offset" value={draft.offset}/>
    <input type="hidden" name="type" value="IN_PERSON"/><input type="hidden" name="durationMinutes" value="60"/><div className="ui-feedback">In-person PT · 60 minutes · 1 credit.</div>
    <label className="ui-field booking-field-full"><span className="ui-field-label">Session notes (optional)</span><textarea name="notes" maxLength={4000} rows={4} value={draft.notes} onChange={event => updateDraft('notes', event.target.value)}/></label>
    <div className="ui-feedback ui-feedback-success booking-field-full"><strong>Server pricing and policy</strong><p>Fee: {fee} {options.rateInfo.currency} · Service: in-person · 60 minutes · 1 credit · Cancellation window: {options.policy.cancellationWindowMinutes} minutes.</p><p>The booking command checks the exact slot, membership, trainer, pack and quote again before committing.</p></div>
    {options.members.items.length === 0 || options.members.items.every(member => member.eligibility !== 'ELIGIBLE') ? <p role="status" className="ui-feedback">{options.noEligibleMembersReason === 'NO_ACTIVE_MEMBERSHIP_OR_CREDIT' ? 'No active member has an eligible membership and pack credit for this date.' : 'No eligible members are available.'}</p> : null}
    {state.error ? <p role="alert" className="ui-feedback ui-feedback-error">{state.error}</p> : null}
    {state.outcomeUnknown ? <p role="status">Your retry will use the same idempotency key to resolve the original attempt.</p> : null}
    {state.booking ? <div role="status" className="ui-feedback ui-feedback-success"><strong>{state.success}</strong><p>{new Date(state.booking.scheduledStartAt).toLocaleString('en', { timeZone: state.booking.timeZone })} · {state.booking.fee} {state.booking.currency}</p><p>Held credit #{state.booking.creditOrdinal}: {state.booking.creditValue} {state.booking.currency} allocated value.</p><a href={`/gyms/${encodeURIComponent(slug)}/owner/sessions?created=${encodeURIComponent(state.booking.sessionId)}`}>Open session oversight</a></div> : null}
    <button className="ui-button ui-button-primary" type="submit" disabled={pending || !memberId || !trainerId || options.members.items.every(member => member.eligibility !== 'ELIGIBLE')}>{pending ? 'Booking session…' : 'Confirm and book'}</button>
  </form>;
}
