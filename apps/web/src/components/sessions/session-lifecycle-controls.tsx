'use client';

import { useActionState, useState } from 'react';
import type { SessionReadPage } from '@gymos/contracts';
import { completeSession, saveSessionNotes, startSession, type SessionLifecycleActionState } from '@/app/session-lifecycle-actions';

type Session = SessionReadPage['items'][number];
const initialState: SessionLifecycleActionState = {};

function ActionNotice({ state }: { state: SessionLifecycleActionState }) {
  if (!state.error && !state.success) return null;
  return <p role={state.error ? 'alert' : 'status'} aria-live="polite">{state.error ?? state.success}</p>;
}

function CommandForm({ slug, session, kind }: { slug: string; session: Session; kind: 'start' | 'complete' }) {
  const initialKey = useState(() => globalThis.crypto.randomUUID())[0];
  const action = kind === 'start'
    ? startSession.bind(null, slug, session.id, session.version, initialKey)
    : completeSession.bind(null, slug, session.id, session.version, initialKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction}>
    <input type="hidden" name="idempotencyKey" value={state.currentKey ?? state.nextKey ?? initialKey}/>
    <button className="ui-button ui-button-secondary" type="submit" disabled={pending}
      onClick={kind === 'complete' ? event => { if (!window.confirm('Complete this started session? This will consume its held credit and create the stored trainer earning.')) event.preventDefault(); } : undefined}>
      {pending ? 'Saving…' : kind === 'start' ? 'Start session' : 'Complete session'}
    </button>
    <ActionNotice state={state}/>
  </form>;
}

function NotesForm({ slug, session }: { slug: string; session: Session }) {
  const initialKey = useState(() => globalThis.crypto.randomUUID())[0];
  const [draft, setDraft] = useState(session.notes ?? '');
  const action = saveSessionNotes.bind(null, slug, session.id, session.version, initialKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  const withinLimit = Array.from(draft).length <= 4000;
  return <form action={formAction}>
    <label>Member-visible session notes<textarea name="notes" value={draft} onChange={event => setDraft(event.currentTarget.value)} rows={3}
      aria-invalid={!withinLimit} aria-describedby={`notes-limit-${session.id}`}/></label>
    <small id={`notes-limit-${session.id}`} role={withinLimit ? undefined : 'alert'}>{Array.from(draft).length} / 4,000 characters</small>
    <input type="hidden" name="idempotencyKey" value={state.currentKey ?? state.nextKey ?? initialKey}/>
    <button className="ui-button ui-button-secondary" type="submit" disabled={pending || !withinLimit}>{pending ? 'Saving…' : 'Save notes'}</button>
    <ActionNotice state={state}/>
  </form>;
}

export function SessionLifecycleControls({ slug, session }: { slug: string; session: Session }) {
  if (!slug) return null;
  return <div className="session-lifecycle-controls" data-session-lifecycle={session.id}>
    {session.commandAffordances.includes('START') ? <CommandForm key={`start-${session.id}-${session.version}`} slug={slug} session={session} kind="start"/> : null}
    {session.commandAffordances.includes('COMPLETE') ? <CommandForm key={`complete-${session.id}-${session.version}`} slug={slug} session={session} kind="complete"/> : null}
    {session.commandAffordances.includes('UPDATE_NOTES') ? <details className="trainer-notes-editor"><summary>Edit Notes</summary><NotesForm key={`notes-${session.id}-${session.version}`} slug={slug} session={session}/></details> : null}
  </div>;
}
