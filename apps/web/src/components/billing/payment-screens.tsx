import { notFound, redirect } from 'next/navigation';
import { memberPaymentHistorySchema, memberPaymentReceiptSchema, ownerPaymentHistorySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { formatDisplayDateTime } from '@/lib/display-date';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';
import { PrintReceiptButton } from './print-receipt-button';
import styles from './payment-receipt.module.css';

type PaymentRole = 'OWNER' | 'MEMBER';

function paymentPaths(slug: string, role: PaymentRole) {
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const parent = role === 'OWNER' ? `${base}/owner/financials` : `${base}/member/membership`;
  return { parent, history: `${parent}/payments`, api: `${base}/${role === 'MEMBER' ? 'me/' : ''}payments` };
}

async function readPayment(path: string, token: string) {
  const response = await fetch(apiUrl(path), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403 || response?.status === 404) notFound();
  return response?.ok ? response.json().catch(() => null) : null;
}

const productLabels = { MEMBERSHIP: 'Membership', PT_PACK: 'PT pack' } as const;
const statusLabels = {
  PENDING: 'Pending',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
  REVIEW_REQUIRED: 'Review required',
  CHARGEBACK: 'Charged back',
} as const;

function PaymentDate({ value }: { value: string }) {
  return <time dateTime={value}>{formatDisplayDateTime(value, 'UTC')} UTC</time>;
}

export async function PaymentHistoryScreen({ slug, role }: { slug: string; role: PaymentRole }) {
  const { token, session, gym } = await requireGymContext(slug, role);
  const paths = paymentPaths(slug, role);
  const body: unknown = await readPayment(paths.api, token);
  const parsed = role === 'OWNER' ? ownerPaymentHistorySchema.safeParse(body) : memberPaymentHistorySchema.safeParse(body);
  const items = parsed.success ? parsed.data.items : null;

  return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <div className="platform-page">
      <header className="platform-page-heading">
        <h1>Payment history</h1>
        <a className="ui-button ui-button-secondary" href={paths.parent}>{role === 'OWNER' ? 'Back to financials' : 'Back to membership'}</a>
      </header>
      <Card>
        <CardHeader title={role === 'OWNER' ? 'Member payments' : 'Your payments'}/>
        {items === null ? <Feedback tone="error">Payments could not be loaded. Refresh to try again.</Feedback> :
          items.length ? <>
            <div className="ui-table-shell">
              <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Payment records">
                <table>
                  <thead><tr>
                    <th scope="col">Order date</th>{role === 'OWNER' ? <th scope="col">Member</th> : null}
                    <th scope="col">Item</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Receipt</th>
                  </tr></thead>
                  <tbody>{items.map(item => <tr key={item.orderId}>
                    <td><PaymentDate value={item.createdAt}/></td>
                    {'memberId' in item && typeof item.memberId === 'string' ? <td><a className="platform-text-link"
                      href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(item.memberId)}`}>
                      {'memberName' in item && typeof item.memberName === 'string' ? item.memberName : item.memberId}
                    </a></td> : null}
                    <td>{item.itemName} · {productLabels[item.kind]}</td>
                    <td>{item.currency} {item.amount}</td>
                    <td>{statusLabels[item.status]}</td>
                    <td>{item.confirmedAt ? <a className="platform-text-link"
                      href={`${paths.history}/${encodeURIComponent(item.orderId)}`}>View receipt</a> : '—'}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>
            {items.length === 100 ? <p>Showing the 100 most recent orders.</p> : null}
          </> : <p>No payments have been recorded.</p>}
      </Card>
    </div>
  </DashboardChrome>;
}

export async function PaymentReceiptScreen({ slug, role, orderId }: { slug: string; role: PaymentRole; orderId: string }) {
  const { token } = await requireGymContext(slug, role);
  if (!memberPaymentReceiptSchema.shape.orderId.safeParse(orderId).success) notFound();
  const paths = paymentPaths(slug, role);
  const result = memberPaymentReceiptSchema.safeParse(await readPayment(`${paths.api}/${encodeURIComponent(orderId)}/receipt`, token));
  const receipt = result.success && result.data.orderId === orderId ? result.data : null;

  return <main className={styles.page}>
    <nav className={styles.controls} aria-label="Receipt actions">
      <a className="ui-button ui-button-secondary" href={paths.history}>Back to payment history</a>
      {receipt ? <PrintReceiptButton/> : null}
    </nav>
    <Card className={styles.receipt}>
      <h1>Payment receipt</h1>
      {receipt ? <>
        <p>{receipt.gymName} · PayHere Sandbox</p>
        {receipt.status === 'CHARGEBACK' ? <p className={styles.notice}>This order was originally paid and later charged back.</p> : null}
        <dl className={styles.details}>
          <dt>Member</dt><dd>{receipt.memberName}</dd>
          <dt>Item</dt><dd>{receipt.itemName} · {productLabels[receipt.kind]}</dd>
          <dt>Amount confirmed</dt><dd>{receipt.currency} {receipt.amount}</dd>
          <dt>Payment confirmed</dt><dd><PaymentDate value={receipt.confirmedAt}/></dd>
          <dt>Current status</dt><dd>{statusLabels[receipt.status]}</dd>
          <dt>Order reference</dt><dd>{receipt.orderId}</dd>
        </dl>
      </> : <Feedback tone="error">The receipt could not be verified. Refresh to try again.</Feedback>}
    </Card>
  </main>;
}
