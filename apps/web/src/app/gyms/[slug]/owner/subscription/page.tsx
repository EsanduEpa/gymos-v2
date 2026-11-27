import { isPayHereCheckoutEnabled } from '@/lib/payhere-checkout';
import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { gymosSubscriptionStatusSchema, gymosSubscriptionTiers } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { GymosSubscriptionCheckout, StopGymosRecurringBilling } from '@/components/billing/gymos-subscription-controls';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { formatDisplayDateTime } from '@/lib/display-date';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

const statusLabels = {
  NOT_STARTED: 'No subscription',
  PENDING: 'Awaiting PayHere confirmation',
  ACTIVE: 'Active',
  GRACE: 'Payment grace period',
  PAST_DUE: 'Payment overdue',
} as const;
const monthlyPrice = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

export default async function OwnerSubscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  if (!gym) notFound();
  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/gymos-subscription`), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403) notFound();
  const result = response?.ok ? gymosSubscriptionStatusSchema.safeParse(await response.json().catch(() => null)) : null;
  const subscription = result?.success ? result.data : null;
  const checkoutEnabled = isPayHereCheckoutEnabled('SUBSCRIPTION');
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <header className="owner-page-header"><div><h1>Subscription &amp; Billing</h1><p>Manage your GymOS service subscription.</p></div></header>
    <Card>
      <CardHeader title="Current subscription"/>
      {subscription ? <>
        <dl className="member-profile-details">
          <div><dt>Plan</dt><dd>{gymosSubscriptionTiers.find(plan => plan.id === subscription.tier)?.name ?? 'No plan selected'}</dd></div>
          <div><dt>Billing status</dt><dd>{statusLabels[subscription.status]}</dd></div>
          {subscription.pendingTier && <div><dt>Pending plan</dt>
            <dd>{gymosSubscriptionTiers.find(plan => plan.id === subscription.pendingTier)?.name}</dd>
          </div>}
          {subscription.paidThrough && <div><dt>Paid through</dt><dd>
            <time dateTime={subscription.paidThrough}>{formatDisplayDateTime(subscription.paidThrough, undefined, true)}</time>
          </dd></div>}
          {subscription.graceEndsAt && <div><dt>Grace period ends</dt><dd>
            <time dateTime={subscription.graceEndsAt}>{formatDisplayDateTime(subscription.graceEndsAt, undefined, true)}</time>
          </dd></div>}
        </dl>
        {subscription.pendingTier && <Feedback>Refresh this page to check for payment confirmation.</Feedback>}
        {checkoutEnabled && subscription.canStop && <StopGymosRecurringBilling slug={slug}/>}
      </> : <Feedback tone="error">Subscription status could not be loaded. Refresh this page to try again.</Feedback>}
    </Card>
    <Card>
      <CardHeader title="Proposed GymOS plans"/>
      <div className="ui-table-shell"><div className="ui-table-scroll">
        <table>
          <thead><tr><th scope="col">Plan</th><th scope="col">Monthly price</th></tr></thead>
          <tbody>
            {gymosSubscriptionTiers.map(plan => <tr key={plan.id}>
              <th scope="row">{plan.name}</th><td>LKR {monthlyPrice.format(Number(plan.amount))}</td>
            </tr>)}
            <tr><th scope="row">Enterprise</th><td>Custom quote</td></tr>
          </tbody>
        </table>
      </div></div>
      <Feedback>Prices are provisional.{!checkoutEnabled && ' Sandbox checkout is currently unavailable.'}</Feedback>
    </Card>
    {checkoutEnabled && subscription?.canStart &&
      <GymosSubscriptionCheckout key={subscription.pendingTier ?? 'new'} slug={slug} requestKey={randomUUID()} pendingTier={subscription.pendingTier}/>}
  </DashboardChrome>;
}
