'use client';

import { gymosSubscriptionTiers } from '@gymos/contracts';
import { useActionState, useState } from 'react';
import { prepareGymosSubscriptionCheckout, stopGymosSubscription } from '@/app/gymos-subscription-actions';
import { Button, Card, CardHeader, Feedback } from '@/components/ui';
import { PayHereBillingFields, PayHereCheckoutHandoff } from './payhere-checkout-fields';

type Tier = (typeof gymosSubscriptionTiers)[number]['id'];

export function GymosSubscriptionCheckout({ slug, requestKey, pendingTier }: {
  slug: string; requestKey: string; pendingTier: Tier | null;
}) {
  const [idempotencyKey] = useState(requestKey);
  const [tier, setTier] = useState(pendingTier ?? '');
  const [state, action, pending] = useActionState(prepareGymosSubscriptionCheckout.bind(null, slug, idempotencyKey), {});
  const plans = pendingTier ? gymosSubscriptionTiers.filter(plan => plan.id === pendingTier) : gymosSubscriptionTiers;
  return <Card>
    <CardHeader title={pendingTier ? 'Resume recurring GymOS checkout' : 'Set up recurring GymOS billing'}/>
    {state.checkout ? <PayHereCheckoutHandoff checkout={state.checkout}>
      <p>PayHere Sandbox will ask you to authorize monthly recurring charges.</p>
    </PayHereCheckoutHandoff> : <form action={action} className="stack-form">
      <p>Use synthetic billing details. PayHere Sandbox collects the payment details.</p>
      <label className="ui-field"><span className="ui-field-label">GymOS plan</span>
        <select name="tier" required value={pendingTier ?? tier} onChange={event => setTier(event.currentTarget.value)}>
          <option value="" disabled>Select a plan</option>
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · LKR {plan.amount} per month</option>)}
        </select>
      </label>
      <PayHereBillingFields/>
      {state.error && <Feedback tone="error">{state.error}</Feedback>}
      <Button type="submit" pending={pending} pendingLabel="Preparing subscription…">Prepare recurring checkout</Button>
    </form>}
  </Card>;
}

export function StopGymosRecurringBilling({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(stopGymosSubscription.bind(null, slug), {});
  return <details>
    <summary>Change plan or payment method</summary>
    <form action={action} className="stack-form">
      <p>Stop future recurring charges before choosing a plan and authorizing a payment method in PayHere Sandbox.</p>
      <label>
        <input type="checkbox" name="confirm" value="true" required/>
        <span>Stop future charges for this subscription.</span>
      </label>
      {state.error && <Feedback tone="error">{state.error}</Feedback>}
      <Button type="submit" variant="secondary" pending={pending} pendingLabel="Stopping recurring charges…">Stop recurring charges</Button>
    </form>
  </details>;
}
