'use server';

import { membershipCheckoutInputSchema, membershipCheckoutSchema, ptPackCheckoutInputSchema } from '@gymos/contracts';
import { notFound, redirect } from 'next/navigation';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

type CheckoutState = {
  checkout?: ReturnType<typeof membershipCheckoutSchema.parse>;
  error?: string;
};
export type MemberCheckoutKind = 'MEMBERSHIP' | 'PT_PACK';

export async function prepareMembershipCheckout(
  slug: string, kind: MemberCheckoutKind, idempotencyKey: string, _previous: CheckoutState, form: FormData,
): Promise<CheckoutState> {
  if (process.env.GYMOS_PAYHERE_CHECKOUT_ENABLED !== '1') {
    return { error: 'Sandbox checkout is currently unavailable.' };
  }
  const { token } = await requireGymContext(slug, 'MEMBER');
  const field = (name: string) => String(form.get(name) ?? '').trim();
  const details = {
    idempotencyKey,
    firstName: field('firstName'),
    lastName: field('lastName'),
    email: field('email'),
    phone: field('phone'),
    address: field('address'),
    city: field('city'),
    country: field('country'),
  };
  const ptPack = kind === 'PT_PACK';
  const input = ptPack
    ? ptPackCheckoutInputSchema.safeParse({ ...details, offerId: field('productId') })
    : membershipCheckoutInputSchema.safeParse({ ...details, planId: field('productId') });
  if (!input.success) return { error: 'Check your selection, contact details and billing address.' };

  const resource = ptPack ? 'pt-pack-checkouts' : 'membership-checkouts';
  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/${resource}`), {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input.data), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (!response) return { error: 'The order could not be confirmed. Retry with the same details.' };
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) notFound();
  if (response.status === 404) return { error: 'That offer is unavailable. Refresh the page to see current offers.' };
  if (response.status === 409) return { error: 'The order details changed. Refresh the membership page and review the offer before starting again.' };
  if (response.status === 422) return { error: 'Check the plan and billing details and try again.' };
  if (!response.ok) return { error: 'Sandbox checkout is unavailable. Try again with the same details.' };
  const completed = membershipCheckoutSchema.safeParse(await response.json().catch(() => null));
  return completed.success && completed.data.action === 'https://sandbox.payhere.lk/pay/checkout'
    ? { checkout: completed.data }
    : { error: 'The order could not be confirmed. Retry with the same details.' };
}
