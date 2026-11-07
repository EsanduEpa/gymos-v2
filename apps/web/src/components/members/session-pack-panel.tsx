'use client';

import { useActionState } from 'react';
import { issueSessionPackAction, type IssuePackActionState } from '@/app/pack-actions';
import { EmptyState, Feedback } from '@/components/ui';

type Pack = { id: string; issuedCredits: number; availableCredits: number; heldCredits: number; consumedCredits: number;
  expiryAdjustments?: Array<{ creditOrdinal: number; endDateExclusive: string; state: string }>; expiredCredits: number; validityDays: number; price: string; currency: 'LKR' | 'USD'; startDate: string; endDateExclusive: string; status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' };

export function SessionPackPanel({ slug, memberId, status, currency, packs, requestKey }: {
  slug: string; memberId: string; status: string; currency: string | null; packs: Pack[]; requestKey: string;
}) {
  const action = issueSessionPackAction.bind(null, slug, memberId);
  const [state, formAction, pending] = useActionState<IssuePackActionState, FormData>(action, {});
  return <section className="session-pack-panel" aria-labelledby="session-packs-heading">
    <h3 id="session-packs-heading">Session-pack balance</h3>
    {packs.length ? <div className="member-history-list">{packs.map(pack => <article key={pack.id}>
      <div><strong>{pack.issuedCredits} sessions issued · {pack.status.toLowerCase()}</strong>
        <small>Original validity: {pack.startDate} to the day before {pack.endDateExclusive} · {pack.validityDays} days</small>{pack.expiryAdjustments?.map(unit => <small key={unit.creditOrdinal}>Restored credit {unit.creditOrdinal}: usable before {unit.endDateExclusive} · {unit.state.toLowerCase()}</small>)}</div>
      <span>{pack.availableCredits} available · {pack.heldCredits} held
        <small>{pack.consumedCredits} consumed · {pack.expiredCredits} expired</small>
        <small>{pack.price} {pack.currency} · entitlement only</small></span>
    </article>)}</div> : <EmptyState title="No session packs have been issued."/>}
    <h4>Issue session pack</h4>
    {status !== 'ACTIVE' ? <Feedback tone="error">Packs can be issued only while the member is active.</Feedback> : currency ? <form action={formAction} className="session-pack-form">
      <input type="hidden" name="idempotencyKey" value={state.nextIdempotencyKey ?? requestKey}/>
      <label>Session credits<input name="credits" type="number" min="1" max="1000" step="1" required/></label>
      <label>Validity in days<input name="validityDays" type="number" min="1" max="3650" step="1" required/></label>
      <label>Agreed pack price<input name="price" type="number" min="0" max="999999999999999" step="0.01" defaultValue="0" required/></label>
      <label>Currency<select name="currency" defaultValue={currency}><option value={currency}>{currency}</option></select></label>
      <button type="submit" disabled={pending}>{pending ? 'Issuing…' : 'Issue pack'}</button>
      {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
      {state.success ? <Feedback tone="success">{state.success}</Feedback> : null}
      <small>Issuing a pack records an entitlement and audit entry; it does not record a payment.</small>
    </form> : <Feedback tone="error">Configure the gym currency before issuing a pack.</Feedback>}
  </section>;
}
