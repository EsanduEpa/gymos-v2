'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { createSessionRequest, decideSessionRequest, type SessionCommandState } from '@/app/session-request-actions';

const subscribeToReadiness = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SessionRequestForm({ slug, trainerId, timeZone, minimumDurationMinutes, requestKey, minDate }: {
  slug: string; trainerId: string; timeZone: string; minimumDurationMinutes: number; requestKey: string; minDate: string;
}) {
  // Keep the server-rendered fields disabled until their draft handlers are attached.
  const ready = useSyncExternalStore(subscribeToReadiness, clientReady, serverReady);
  const [draft, setDraft] = useState({ localDate: minDate, localTime: '10:00', offset: '', type: 'IN_PERSON', durationMinutes: String(Math.max(minimumDurationMinutes, 60)), notes: '' });
  const update = (name: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [name]: value }));
  const action = createSessionRequest.bind(null, slug, trainerId, requestKey);
  const [state, formAction, pending] = useActionState<SessionCommandState, FormData>(action, {});
  return <form action={formAction} className="ui-form-stack member-request-form">
    <input type="hidden" name="idempotencyKey" value={state.currentKey ?? state.nextKey ?? requestKey}/>
    <input type="hidden" name="timeZone" value={timeZone}/>
    <label className="ui-field"><span className="ui-field-label">Session date</span><input disabled={!ready} type="date" name="localDate" min={minDate} value={draft.localDate} onChange={event => update('localDate', event.currentTarget.value)} required/></label>
    <label className="ui-field"><span className="ui-field-label">Start time ({timeZone})</span><input disabled={!ready} type="time" name="localTime" value={draft.localTime} onChange={event => update('localTime', event.currentTarget.value)} required/></label>
    <label className="ui-field"><span className="ui-field-label">UTC offset, if the local time repeats</span><input disabled={!ready} name="offset" value={draft.offset} onChange={event => update('offset', event.currentTarget.value)} maxLength={6} pattern="(\+|-)(0[0-9]|1[0-4]):[0-5][0-9]" placeholder="Optional, for example +05:30"/><small>Enter the offset only when daylight saving time makes this local time occur twice.</small></label>
    <label className="ui-field"><span className="ui-field-label">Session type</span><select disabled={!ready} name="type" value={draft.type} onChange={event => update('type', event.currentTarget.value)}><option value="IN_PERSON">In person</option><option value="VIRTUAL">Virtual</option><option value="INTRODUCTORY">Introductory</option></select></label>
    <label className="ui-field"><span className="ui-field-label">Duration in minutes</span><input disabled={!ready} name="durationMinutes" type="number" min={minimumDurationMinutes} max={480} step={1} value={draft.durationMinutes} onChange={event => update('durationMinutes', event.currentTarget.value)} required/></label>
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
    {action === 'DECLINE' ? <label className="ui-field"><span className="ui-field-label">Optional message for the member</span><textarea name="reason" maxLength={500} rows={3}/></label> : null}
    {state.error ? <p role="alert" className="ui-feedback ui-feedback-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="ui-feedback ui-feedback-success">{state.success}</p> : null}
    <button className={action === 'ACCEPT' ? 'ui-button ui-button-primary' : 'ui-button ui-button-secondary'} disabled={pending} type="submit">{pending ? 'Saving…' : action === 'ACCEPT' ? 'Accept and reserve one credit' : 'Decline request'}</button>
  </form>;
}
