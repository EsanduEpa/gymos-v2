'use client';

import { useActionState, useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { createSessionRequest, decideSessionRequest, type SessionCommandState } from '@/app/session-request-actions';
import { loadSessionSlots } from '@/app/availability-actions';

const subscribeToReadiness = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SessionRequestForm({ slug, trainerId, timeZone, requestKey, minDate }: {
  slug: string; trainerId: string; timeZone: string; requestKey: string; minDate: string;
}) {
  // Keep the server-rendered fields disabled until their draft handlers are attached.
  const ready = useSyncExternalStore(subscribeToReadiness, clientReady, serverReady);
  const [draft, setDraft] = useState({ localDate: minDate, localTime: '', offset: '', notes: '', startAt: '' });
  const [slotResult, setSlotResult] = useState<Awaited<ReturnType<typeof loadSessionSlots>>>({ error: 'Choose a date to load times.' }); const [loadingSlots, startSlotLoad] = useTransition();
  useEffect(() => { startSlotLoad(async () => { const result = await loadSessionSlots(slug, trainerId, draft.localDate); setSlotResult(result); setDraft(current => ({ ...current, localTime: '', offset: '', startAt: '' })); }); }, [slug, trainerId, draft.localDate]);
  const update = (name: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [name]: value }));
  const action = createSessionRequest.bind(null, slug, trainerId, requestKey);
  const [state, formAction, pending] = useActionState<SessionCommandState, FormData>(action, {});
  return <form action={formAction} className="ui-form-stack member-request-form">
    <input type="hidden" name="idempotencyKey" value={state.currentKey ?? state.nextKey ?? requestKey}/>
    <input type="hidden" name="timeZone" value={timeZone}/>
    <label className="ui-field"><span className="ui-field-label">Session date</span><input disabled={!ready} type="date" name="localDate" min={minDate} value={draft.localDate} onChange={event => update('localDate', event.currentTarget.value)} required/></label>
    <label className="ui-field"><span className="ui-field-label">Available start time ({timeZone})</span><select disabled={!ready || loadingSlots || !slotResult.data?.slots.length} value={draft.startAt} onChange={event => { const slot = slotResult.data?.slots.find(item => item.startAt === event.currentTarget.value); setDraft(current => ({ ...current, startAt: slot?.startAt ?? '', localTime: slot?.localTime ?? '', offset: slot?.offset ?? '' })); }} required><option value="">{loadingSlots ? 'Loading times…' : slotResult.data?.slots.length ? 'Choose a time' : 'No times available'}</option>{slotResult.data?.slots.map(slot => <option key={slot.startAt} value={slot.startAt}>{slot.localTime} · UTC{slot.offset}</option>)}</select>{slotResult.error ? <small role="alert">{slotResult.error}</small> : null}{slotResult.data?.reason ? <small>{slotResult.data.reason === 'NO_AVAILABILITY' ? 'This trainer has not published bookable times for this date.' : slotResult.data.reason === 'CLOSED' ? 'The gym is closed on this date.' : 'No available times remain for this date.'}</small> : null}</label>
    <input type="hidden" name="localTime" value={draft.localTime}/><input type="hidden" name="offset" value={draft.offset}/>
    <input type="hidden" name="type" value="IN_PERSON"/><input type="hidden" name="durationMinutes" value="60"/><div className="ui-feedback">In-person PT · 60 minutes · 1 credit. Requests made within 24 hours of the start are already in the late-cancellation window if accepted.</div>
    <label className="ui-field"><span className="ui-field-label">Note for the trainer (optional)</span><textarea disabled={!ready} name="notes" value={draft.notes} onChange={event => update('notes', event.currentTarget.value)} maxLength={4000} rows={4}/></label>
    {state.error ? <p role="alert" className="ui-feedback ui-feedback-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="ui-feedback ui-feedback-success">{state.success} {state.sessionId ? <a href={`/gyms/${encodeURIComponent(slug)}/member/sessions`}>View your sessions</a> : null}</p> : null}
    <button className="ui-button ui-button-primary" type="submit" disabled={!ready || pending}>{pending ? 'Sending request…' : 'Request session'}</button>
  </form>;
}

export function SessionRequestDecisionForm({ slug, sessionId, expectedVersion, action, requestKey }: {
  slug: string; sessionId: string; expectedVersion: number; action: 'ACCEPT' | 'DECLINE'; requestKey: string;
}) {
  const bound = decideSessionRequest.bind(null, slug, sessionId, requestKey, action, expectedVersion);
  const [state, formAction, pending] = useActionState<SessionCommandState, FormData>(bound, {});
  return <form action={formAction} className="ui-form-stack session-request-decision">
    <input type="hidden" name="idempotencyKey" value={state.currentKey ?? state.nextKey ?? requestKey}/>
    {action === 'DECLINE' ? <details className="session-request-message"><summary>Add optional message for member</summary><label className="ui-field"><span className="ui-field-label">Message for member</span><textarea name="reason" maxLength={500} rows={2}/></label></details> : null}
    {state.error ? <p role="alert" className="ui-feedback ui-feedback-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="ui-feedback ui-feedback-success">{state.success}</p> : null}
    <button className={action === 'ACCEPT' ? 'ui-button ui-button-primary' : 'ui-button ui-button-secondary'} disabled={pending} type="submit">{pending ? 'Saving…' : action === 'ACCEPT' ? 'Accept and reserve one credit' : 'Decline request'}</button>
  </form>;
}
