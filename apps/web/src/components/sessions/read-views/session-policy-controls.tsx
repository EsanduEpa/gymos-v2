'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { SessionReadPage } from '@gymos/contracts';
import {
  cancelSessionWithQuote,
  getSessionPolicyQuote,
  markSessionNoShowWithQuote,
  type SessionPolicyActionState,
} from './session-policy-actions';
import styles from './session-policy-controls.module.css';

type Session = SessionReadPage['items'][number];
type Role = 'OWNER' | 'TRAINER' | 'MEMBER';
type PolicyAction = 'CANCEL' | 'NO_SHOW';
const initialState: SessionPolicyActionState = {};

function consequenceLabel(consequence: string | null) {
  switch (consequence) {
    case 'PENDING_WITHDRAWAL': return 'This will withdraw the pending request without using a credit.';
    case 'FREE_CANCELLATION': return 'This cancellation is within the free cancellation period.';
    case 'LATE_CANCELLATION': return 'This cancellation is late under the gym policy.';
    case 'NO_SHOW': return 'This will mark the booking as a no-show under the gym policy.';
    default: return 'The gym policy quote did not return a consequence.';
  }
}

function quoteTime(value: string | null, timeZone: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value));
}

export function SessionPolicyControls({ slug, session, role }: { slug: string; session: Session; role: Role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panelAction, setPanelAction] = useState<PolicyAction | null>(null);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getSessionPolicyQuote>>['quote']>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, setState] = useState(initialState);
  const [initialKey, setInitialKey] = useState(() => globalThis.crypto.randomUUID());
  const [quoteLoading, setQuoteLoading] = useState(false);

  const canCancel = session.commandAffordances.includes('CANCEL') || session.commandAffordances.includes('WITHDRAW');
  const canNoShow = session.commandAffordances.includes('NO_SHOW');
  const cancelLabel = role === 'MEMBER' && session.state === 'PENDING_CONFIRMATION' ? 'Withdraw request' : 'Cancel session';

  function loadQuote(action: PolicyAction) {
    setPanelAction(action);
    setQuote(undefined);
    setAcknowledged(false);
    setState(initialState);
    setQuoteLoading(true);
    startTransition(async () => {
      const result = await getSessionPolicyQuote(slug, session.id, action);
      setQuote(result.quote);
      setState(result.error ? { error: result.error } : initialState);
      setQuoteLoading(false);
    });
  }

  function submitPolicyAction(action: PolicyAction) {
    if (!quote || quote.action !== action || !quote.eligible || (quote.requiresAcknowledgment && !acknowledged)) return;
    const key = state.currentKey ?? state.nextKey ?? initialKey;
    startTransition(async () => {
      const result = action === 'CANCEL'
        ? await cancelSessionWithQuote(slug, session.id, quote.sessionVersion, quote.policyVersion, quote.acknowledgmentToken, key)
        : await markSessionNoShowWithQuote(slug, session.id, quote.sessionVersion, quote.policyVersion, quote.acknowledgmentToken, key);
      setState(result);
      if (result.nextKey) setInitialKey(result.nextKey);
      if (result.success) {
        setPanelAction(null);
        setQuote(undefined);
        setAcknowledged(false);
        router.refresh();
      }
    });
  }

  const requiresAcknowledgment = Boolean(quote?.requiresAcknowledgment || panelAction === 'NO_SHOW');
  const creditInfo = quote?.creditValue !== null && quote?.currency ? `${quote.currency} ${quote.creditValue}` : null;
  const missingAcknowledgmentToken = Boolean(quote?.eligible && requiresAcknowledgment && !quote.acknowledgmentToken);
  if (!canCancel && !canNoShow && !panelAction && !state.error) return null;

  return <div className={styles.controls} data-session-policy={session.id}>
    {canCancel ? <button className="ui-button ui-button-secondary" type="button" disabled={pending || quoteLoading}
      onClick={() => loadQuote('CANCEL')}>{cancelLabel}</button> : null}
    {canNoShow ? <button className="ui-button ui-button-secondary" type="button" disabled={pending || quoteLoading}
      onClick={() => loadQuote('NO_SHOW')}>Mark no-show</button> : null}
    {panelAction ? <section className={styles.panel} aria-label={panelAction === 'CANCEL' ? 'Cancellation quote' : 'No-show quote'}>
      <h3>{panelAction === 'CANCEL' ? cancelLabel : 'Mark no-show'}</h3>
      {quoteLoading ? <p role="status">Loading the current gym policy quote…</p> : quote ? <>
        <p>{consequenceLabel(quote.consequence)}</p>
        {quote.eligibleAt ? <p>Available at {quoteTime(quote.eligibleAt, session.gymTimeZone)}.</p> : null}
        {quote.cancellationCutoff ? <p>Free cancellation cutoff: {quoteTime(quote.cancellationCutoff, session.gymTimeZone)}.</p> : null}
        {creditInfo ? <p>Quoted credit value: {creditInfo}{quote.creditOrdinal ? ` · credit ${quote.creditOrdinal}` : ''}</p> : null}
        {!quote.eligible ? <p role="status">This action is not currently available.</p> : null}
        {requiresAcknowledgment && quote.eligible ? <label className={styles.acknowledgment}>
          <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.currentTarget.checked)}/>
          <span>{panelAction === 'NO_SHOW'
            ? `I understand this no-show consumes the held credit${creditInfo ? ` valued at ${creditInfo}` : ''}.`
            : `I understand the late cancellation consequence${creditInfo ? ` and ${creditInfo} credit value` : ''}.`}</span>
        </label> : null}
        {missingAcknowledgmentToken ? <p role="alert">The server did not provide a valid acknowledgment token. Request a fresh quote.</p> : null}
        {quote.eligible ? <button className="ui-button ui-button-primary" type="button" disabled={pending || missingAcknowledgmentToken || (requiresAcknowledgment && !acknowledged)}
          onClick={() => submitPolicyAction(panelAction)}>
          {pending ? 'Saving…' : state.outcomeUnknown ? 'Retry with same key' : panelAction === 'CANCEL' ? cancelLabel : 'Confirm no-show'}
        </button> : null}
      </> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
      {state.refreshQuote ? <button className="ui-button ui-button-secondary" type="button" disabled={pending || quoteLoading}
        onClick={() => loadQuote(panelAction)}>{quoteLoading ? 'Refreshing quote…' : 'Review updated quote'}</button> : null}
      <button className="ui-button ui-button-secondary" type="button" disabled={pending} onClick={() => { setPanelAction(null); setQuote(undefined); setState(initialState); }}>
        Close
      </button>
    </section> : null}
    {state.error && !panelAction ? <p role="alert">{state.error}</p> : null}
  </div>;
}
