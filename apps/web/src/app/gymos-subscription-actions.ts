'use server';

import { isPayHereCheckoutEnabled } from '@/lib/payhere-checkout';

import { gymosSubscriptionCheckoutInputSchema, gymosSubscriptionCheckoutSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

type CheckoutState = { checkout?: ReturnType<typeof gymosSubscriptionCheckoutSchema.parse>; error?: string };
type StopState = { error?: string };

function requestSubscriptionUpdate(slug: string, operation: 'checkout' | 'stop', token: string, body?: unknown) {
  return fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/gymos-subscription/${operation}`), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
}

export async function prepareGymosSubscriptionCheckout(
  slug: string, idempotencyKey: string, _previous: CheckoutState, form: FormData,
): Promise<CheckoutState> {
  if (!isPayHereCheckoutEnabled('SUBSCRIPTION')) return { error: 'Sandbox checkout is currently unavailable.' };
  const { token } = await requireGymContext(slug, 'OWNER');
  const input = gymosSubscriptionCheckoutInputSchema.safeParse({
    tier: form.get('tier'),
    idempotencyKey,
    firstName: form.get('firstName'),
    lastName: form.get('lastName'),
    email: form.get('email'),
    phone: form.get('phone'),
    address: form.get('address'),
    city: form.get('city'),
    country: form.get('country'),
  });
  if (!input.success) return { error: 'Check the plan, contact details and billing address.' };
  const response = await requestSubscriptionUpdate(slug, 'checkout', token, input.data);
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403 || response?.status === 404) notFound();
  if (response?.status === 409) return { error: 'The subscription changed. Refresh this page and review its current status.' };
  if (response?.status === 422) return { error: 'Check the plan and billing details and try again.' };
  const result = response?.ok ? gymosSubscriptionCheckoutSchema.safeParse(await response.json().catch(() => null)) : null;
  return result?.success && result.data.action === 'https://sandbox.payhere.lk/pay/checkout'
    ? { checkout: result.data }
    : { error: 'The subscription order could not be confirmed. Retry with the same details.' };
}

export async function stopGymosSubscription(slug: string, _previous: StopState, form: FormData): Promise<StopState> {
  if (!isPayHereCheckoutEnabled('SUBSCRIPTION')) return { error: 'Sandbox subscription changes are currently unavailable.' };
  if (form.get('confirm') !== 'true') return { error: 'Confirm that future recurring charges should stop.' };
  const { token } = await requireGymContext(slug, 'OWNER');
  const response = await requestSubscriptionUpdate(slug, 'stop', token);
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403 || response?.status === 404) notFound();
  if (response?.status === 409) return { error: 'The subscription changed. Refresh this page and review its current status.' };
  if (response?.status !== 204) return { error: 'The change could not be confirmed. Refresh this page before trying again.' };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/subscription`);
  return {};
}
