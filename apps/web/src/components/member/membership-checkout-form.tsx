'use client';

import { useActionState, useState } from 'react';
import { prepareMembershipCheckout, type MemberCheckoutKind } from '@/app/membership-checkout-actions';
import { PayHereBillingFields, PayHereCheckoutHandoff } from '@/components/billing/payhere-checkout-fields';
import { Button, Feedback } from '@/components/ui';

type Offer = { id: string; name: string; price: string; currency: string };

export function MembershipCheckoutForm({ slug, kind, orderKey, offers }: {
  slug: string; kind: MemberCheckoutKind; orderKey: string; offers: Offer[];
}) {
  const [idempotencyKey] = useState(orderKey);
  const [state, action, pending] = useActionState(prepareMembershipCheckout.bind(null, slug, kind, idempotencyKey), {});
  const [productId, setProductId] = useState(offers[0]?.id ?? '');
  const title = kind === 'PT_PACK' ? 'PT pack' : 'membership';

  if (state.checkout) return <PayHereCheckoutHandoff checkout={state.checkout}/>;

  return <details>
    <summary>Start {title} sandbox checkout</summary>
    <form action={action} className="stack-form compact-workspace-form">
      <p>Use synthetic billing details. PayHere Sandbox collects the payment details.</p>
      <label className="ui-field"><span className="ui-field-label">{kind === 'PT_PACK' ? 'PT pack offer' : 'Membership plan'}</span>
        <select name="productId" value={productId} onChange={event => setProductId(event.currentTarget.value)} required>
          {offers.map(offer => <option key={offer.id} value={offer.id}>{offer.name} · {offer.currency} {offer.price}</option>)}
        </select>
      </label>
      <PayHereBillingFields/>
      {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
      <Button type="submit" pending={pending} pendingLabel="Preparing order…">Prepare {title} order</Button>
    </form>
  </details>;
}
