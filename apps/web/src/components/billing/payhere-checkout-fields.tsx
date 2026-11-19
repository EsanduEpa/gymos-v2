'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button, Field } from '@/components/ui';

const billingFields = [
  { name: 'firstName', label: 'First name', autoComplete: 'given-name', maxLength: 80 },
  { name: 'lastName', label: 'Last name', autoComplete: 'family-name', maxLength: 80 },
  { name: 'email', label: 'Email', autoComplete: 'email', maxLength: 254, type: 'email' },
  { name: 'phone', label: 'Phone', autoComplete: 'tel', maxLength: 26, type: 'tel' },
  { name: 'address', label: 'Billing address', autoComplete: 'street-address', maxLength: 160 },
  { name: 'city', label: 'City', autoComplete: 'address-level2', maxLength: 80 },
  { name: 'country', label: 'Country', autoComplete: 'country-name', maxLength: 80 },
] as const;

export function PayHereBillingFields() {
  const id = useId();
  const [billing, setBilling] = useState<Partial<Record<(typeof billingFields)[number]['name'], string>>>({});
  return billingFields.map(({ name, label, autoComplete, maxLength, ...input }) => <Field
    key={name} id={`${id}-${name}`} name={name} label={label} autoComplete={autoComplete} maxLength={maxLength} {...input}
    value={billing[name] ?? ''} onChange={event => {
      const value = event.currentTarget.value;
      setBilling(current => ({ ...current, [name]: value }));
    }} required
  />);
}

export function PayHereCheckoutHandoff({ checkout, children }: {
  checkout: { action: 'https://sandbox.payhere.lk/pay/checkout'; fields: Record<string, string> };
  children?: ReactNode;
}) {
  return <form className="stack-form compact-workspace-form" method="post" action={checkout.action}>
    {Object.entries(checkout.fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value}/>)}
    <p role="status">Order for {checkout.fields.items} · {checkout.fields.currency} {checkout.fields.amount}</p>
    {children}
    <Button type="submit">Continue to PayHere Sandbox</Button>
  </form>;
}
