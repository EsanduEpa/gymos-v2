import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { memberMembershipOverviewSchema, membershipCheckoutStatusSchema, ptPackOffersSchema } from '@gymos/contracts';
import { MembershipCheckoutForm } from '@/components/member/membership-checkout-form';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { formatDisplayDate } from '@/lib/display-date';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';
import { isPayHereCheckoutEnabled } from '@/lib/payhere-checkout';

function MembershipDate({ value }: { value: string }) {
  return <time dateTime={value}>{formatDisplayDate(value)}</time>;
}

function ptCredits(count: number) {
  return `${count} PT ${count === 1 ? 'credit' : 'credits'}`;
}

const orderStatus = {
  PENDING: 'Waiting for PayHere to confirm your payment. Refresh to check again.',
  FAILED: 'PayHere reported that the payment failed. You can start a new checkout.',
  CANCELLED: 'PayHere reported that the payment was cancelled.',
  CONFIRMED: 'Payment confirmed. Your membership appears below.',
  REVIEW_REQUIRED: 'The payment needs review. Give your gym the order reference below.',
  CHARGEBACK: 'PayHere reported a chargeback. Contact your gym with the order reference below.',
} as const;

export default async function MemberMembershipPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paymentOrder?: string | string[]; paymentKind?: string | string[] }>;
}) {
  const { slug } = await params;
  const { token, session, gym } = await requireGymContext(slug, 'MEMBER');
  const { paymentOrder, paymentKind } = await searchParams;
  const ptPackOrder = paymentKind === 'PT_PACK';
  const orderId = typeof paymentOrder === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentOrder) ? paymentOrder : null;
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const read = (resource: string) => fetch(apiUrl(`${base}/me/${resource}`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error',
  }).catch(() => new Response(null, { status: 503 }));
  const [response, ptPackResponse, paymentResponse] = await Promise.all([
    read('memberships'),
    read('pt-pack-offers'),
    orderId ? read(`${ptPackOrder ? 'pt-pack-checkouts' : 'membership-checkouts'}/${encodeURIComponent(orderId)}`) : null,
  ]);
  if (response.status === 401 || ptPackResponse.status === 401 || paymentResponse?.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? memberMembershipOverviewSchema.safeParse(await response.json().catch(() => null)) : null;
  const overview = parsed?.success ? parsed.data : null;
  const payment = paymentResponse?.ok ? membershipCheckoutStatusSchema.safeParse(await paymentResponse.json().catch(() => null)) : null;
  const order = payment?.success && payment.data.orderId === orderId ? payment.data : null;
  const ptPacks = ptPackResponse.ok ? ptPackOffersSchema.safeParse(await ptPackResponse.json().catch(() => null)) : null;
  const packOffers = ptPacks?.success ? ptPacks.data.offers : null;
  const checkoutPlans = overview?.availablePlans.filter(plan => Number(plan.price) > 0) ?? [];
  const checkoutAllowed =
    order?.status !== 'PENDING' && order?.status !== 'REVIEW_REQUIRED';

  const showPackCheckout = checkoutAllowed && isPayHereCheckoutEnabled('PT_PACK');
  const showMembershipCheckout = checkoutAllowed && isPayHereCheckoutEnabled('MEMBERSHIP');

  return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <div className="platform-page">
      <header className="platform-page-heading">
        <h1>Membership</h1>
        <a className="ui-button ui-button-secondary" href={`${base}/member/membership/payments`}>Payment history</a>
      </header>
      {paymentOrder !== undefined ? <Card>
        <CardHeader title="Payment status"/>
        {order ? <>
          <Feedback tone={order.status === 'CONFIRMED' ? 'success' : 'info'}>
            {ptPackOrder && order.status === 'CONFIRMED' ? 'Payment confirmed. Your PT pack credits appear below.' : orderStatus[order.status]}
          </Feedback>
          <p>{order.planName} · {order.currency} {order.amount}</p>
          <p>Order reference <code>{order.orderId}</code></p>
          {order.status === 'CONFIRMED' ? <a className="platform-text-link"
            href={`${base}/member/membership/payments/${order.orderId}`}>View receipt</a> : null}
          {order.status === 'PENDING' ? <a className="platform-text-link"
            href={`${base}/member/membership?${new URLSearchParams({
              paymentOrder: order.orderId, ...(ptPackOrder ? { paymentKind: 'PT_PACK' } : {}),
            })}`}>Refresh payment status</a> : null}
        </> : <Feedback tone="info">This order could not be loaded. Check the reference or refresh to try again.</Feedback>}
      </Card> : null}
      {overview ? <>
        <Card>
          <CardHeader title="Active plans"/>
          {overview.active.length > 0 ? <ul className="stack-form">
            {overview.active.map(term => <li key={term.id}>
              <strong>{term.planName}</strong> · {term.currency} {term.agreedPrice}
              <div>Started <MembershipDate value={term.startDate}/> · Expires <MembershipDate value={term.endDateExclusive}/></div>
              {term.includedPtCredits > 0 ? <div>Includes {ptCredits(term.includedPtCredits)} for this term</div> : null}
              <div>{term.renewalStartsOn ? <>Renewal starts <MembershipDate value={term.renewalStartsOn}/></> : 'No renewal scheduled'}</div>
            </li>)}
          </ul> : <>
            <p>No plan is active today.</p>
            {overview.latestExpired ? <p>
              Your {overview.latestExpired.planName} term expired on <MembershipDate value={overview.latestExpired.endDateExclusive}/>.
              {overview.latestExpired.includedPtCredits > 0 ? <> It included {ptCredits(overview.latestExpired.includedPtCredits)}.</> : null}
            </p> : null}
          </>}
        </Card>
        <Card>
          <CardHeader title="Upcoming terms"/>
          {overview.upcoming.length > 0 ? <ul className="stack-form">
            {overview.upcoming.map(term => <li key={term.id}>
              <strong>{term.planName}</strong> · {term.currency} {term.agreedPrice}
              <div>Starts <MembershipDate value={term.startDate}/> · Expires <MembershipDate value={term.endDateExclusive}/></div>
              {term.includedPtCredits > 0 ? <div>Includes {ptCredits(term.includedPtCredits)} from the start date</div> : null}
            </li>)}
          </ul> : <p>No upcoming terms.</p>}
        </Card>
        <section className="member-credit-panel" aria-labelledby="membership-credits">
          <h2 id="membership-credits">PT pack balances</h2>
          <dl>
            <div><dt>Available today</dt><dd>{overview.credits.available}</dd></div>
            <div><dt>Held for sessions</dt><dd>{overview.credits.held}</dd></div>
          </dl>
        </section>
        <Card>
          <CardHeader title="Available membership plans"/>
          {overview.availablePlans.length ? <ul className="stack-form">
            {overview.availablePlans.map(plan => <li key={plan.id}>
              <strong>{plan.name}</strong> · {plan.currency} {plan.price}
              <div>{plan.durationDays} {plan.durationDays === 1 ? 'day' : 'days'} · {ptCredits(plan.includedPtCredits)} included</div>
            </li>)}
          </ul> : <p>No membership plans are currently available.</p>}
          {showMembershipCheckout && checkoutPlans.length ? <MembershipCheckoutForm
            slug={slug} kind="MEMBERSHIP" orderKey={randomUUID()} offers={checkoutPlans}/> : null}
        </Card>
      </> : <Card><Feedback tone="error">Your membership could not be loaded. Refresh to try again.</Feedback></Card>}
      <Card>
        <CardHeader title="Available PT packs"/>
        {packOffers === null ? <Feedback tone="error">PT pack offers could not be loaded. Refresh to try again.</Feedback> :
          packOffers.length ? <ul className="stack-form">
            {packOffers.map(offer => <li key={offer.id}>
              <strong>{offer.name}</strong> · {offer.currency} {offer.price}
              <div>{ptCredits(offer.credits)} · Valid for {offer.validityDays} {offer.validityDays === 1 ? 'day' : 'days'}</div>
            </li>)}
          </ul> : <p>No PT packs are currently available.</p>}
        {showPackCheckout && packOffers?.length ? <MembershipCheckoutForm
          slug={slug} kind="PT_PACK" orderKey={randomUUID()} offers={packOffers}/> : null}
      </Card>
    </div>
  </DashboardChrome>;
}
