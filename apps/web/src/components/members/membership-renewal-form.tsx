'use client';

import { useActionState, useState } from 'react';
import type { MemberDetail, MembershipPlan } from '@gymos/contracts';
import { renewMembership, type RenewalIntent, type RenewalState } from '@/app/membership-renewal-actions';
import { formatDisplayDate } from '@/lib/display-date';
import { Button, Feedback } from '@/components/ui';

export function MembershipRenewalForm({ slug, member, plans, requestKey }: {
  slug: string; member: MemberDetail; plans: MembershipPlan[] | null; requestKey: string;
}) {
  const [planId, setPlanId] = useState('');
  const [startPolicy, setStartPolicy] = useState<RenewalIntent['startPolicy']>('NEXT_AVAILABLE');
  const [idempotencyKey] = useState(requestKey);
  const plan = plans?.find(option => option.id === planId);
  const [state, submit, pending] = useActionState(async (previous: RenewalState) => {
    if (previous.result || previous.refresh) return previous;
    if (!plan && !previous.retry) return { error: 'Choose a membership plan.' };
    const intent = previous.retry ?? { planId: plan!.id, expectedPlanVersion: plan!.version, expectedMemberVersion: member.version, startPolicy, idempotencyKey };
    try {
      const response = await renewMembership(slug, member.id, intent);
      return previous.retry && response.error && !response.refresh && !response.result ? { ...response, retry: intent } : response;
    } catch {
      return { error: 'The renewal outcome is unknown. Retry this renewal before recording another payment.', retry: intent };
    }
  }, {});
  const latestHistory = `/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(member.id)}?membershipPage=1`;

  return <section aria-labelledby="renew-membership-heading">
    <h3 id="renew-membership-heading">Renew membership</h3>
    {state.result ? <Feedback tone="success">
      {state.result.planName} renewed for {state.result.currency} {state.result.agreedPrice}. Starts {formatDisplayDate(state.result.startDate)} and expires {formatDisplayDate(state.result.endDateExclusive)}.
      {' '}<a href={latestHistory}>Open the latest membership history</a>
    </Feedback> : state.refresh ? <Feedback tone="error">{state.error} <a href={latestHistory}>Reload membership and plans</a></Feedback> :
      plans === null && !state.retry ? <Feedback tone="error">Membership plans could not be loaded. <a href={latestHistory}>Retry</a></Feedback> :
        plans?.length === 0 && !state.retry ? <p>There are no active membership plans.</p> : <form action={submit} className="ui-form-stack">
          <div className="ui-field"><label htmlFor="renew-plan">Membership plan</label>
            <select id="renew-plan" value={planId} onChange={event => setPlanId(event.target.value)} required disabled={pending || Boolean(state.retry)}>
              <option value="" disabled>Choose a plan</option>
              {plans?.map(option => <option value={option.id} key={option.id}>{option.name} · {option.currency} {option.price} · {option.durationDays} days · {option.includedPtCredits} PT credits included</option>)}
            </select>
          </div>
          <div className="ui-field"><label htmlFor="renew-start">Start policy</label>
            <select id="renew-start" value={startPolicy} onChange={event => setStartPolicy(event.target.value as RenewalIntent['startPolicy'])} disabled={pending || Boolean(state.retry)}>
              <option value="NEXT_AVAILABLE">Next available date</option>
              <option value="IMMEDIATE">Today in the gym’s timezone</option>
            </select>
          </div>
          <p>Next available queues this plan after its last covered term. Starting today requires the same plan to have no active or upcoming term. Record the membership payment in the gym cashbook.</p>
          {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
          <Button type="submit" pending={pending} pendingLabel="Confirming renewal…" disabled={!plan && !state.retry}>
            {state.retry ? 'Retry the same renewal' : 'Confirm membership renewal'}
          </Button>
        </form>}
  </section>;
}
