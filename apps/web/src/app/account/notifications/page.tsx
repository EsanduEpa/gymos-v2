import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { accountNotificationPageSchema, accountNotificationQuerySchema, notificationTargetHref } from '@gymos/contracts';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { Feedback } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { resolveCurrentSession } from '@/lib/navigation';
import { markAccountNotificationRead, markAccountNotificationsReadThrough } from '@/app/notification-history-actions';

type Props = { searchParams: Promise<{ filter?: string; cursor?: string; error?: string }> };
async function AccountNotificationsContent({ searchParams }: Props) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) redirect('/login');
  const current = await resolveCurrentSession(token); if (current.status === 401) redirect('/login?error=expired'); if (current.status === 403) redirect('/change-password');
  if (!current.ok) return <main className="platform-page"><Feedback tone="error">Account notification status is temporarily unavailable.</Feedback></main>;
  const session = currentSessionSchema.parse(await current.json()); const search = await searchParams;
  const params = accountNotificationQuerySchema.safeParse({ filter: search.filter ?? 'ALL', pageSize: 20, ...(search.cursor ? { cursor: search.cursor } : {}) });
  const response = params.success ? await fetch(apiUrl(`/auth/notifications?filter=${params.data.filter}&pageSize=${params.data.pageSize}${params.data.cursor ? `&cursor=${encodeURIComponent(params.data.cursor)}` : ''}`),
    { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null) : null;
  if (response?.status === 401) redirect('/login?error=expired');
  const page = response?.ok ? accountNotificationPageSchema.safeParse(await response.json().catch(() => null)) : null;
  return <main className="platform-page">
    <header className="platform-page-heading"><div><span className="platform-eyebrow">ACCOUNT NOTIFICATIONS</span><h1>Notifications</h1><p>Application updates and account security events for {session.displayName ?? 'your account'}.</p></div><Link className="ui-button ui-button-secondary" href="/security">Open Security</Link></header>
    <nav className="notification-scope-tabs" aria-label="Notification scope"><a href="/account/notifications" aria-current="page">Account</a>{session.gyms.map(gym => <a key={gym.id} href={`/gyms/${encodeURIComponent(gym.slug)}/notifications`}>{gym.name}</a>)}</nav>
    {search.error === 'read' ? <Feedback tone="error">The read state could not be confirmed. Refresh the notification list before retrying.</Feedback> : null}
    {page?.success ? <>
      <div className="notification-history-toolbar"><p>{page.data.unreadCount} unread account notifications</p>
        <nav aria-label="Filter account notifications"><a aria-current={page.data.filter === 'ALL' ? 'page' : undefined} href="/account/notifications?filter=ALL">All</a><a aria-current={page.data.filter === 'UNREAD' ? 'page' : undefined} href="/account/notifications?filter=UNREAD">Unread</a></nav>
        <form action={markAccountNotificationsReadThrough}><input type="hidden" name="through" value={page.data.asOf}/><button className="ui-button ui-button-secondary" type="submit" disabled={page.data.unreadCount === 0}>Mark loaded snapshot read</button></form>
      </div>
      {page.data.items.length ? <ul className="notification-history-list">{page.data.items.map(item => <li key={item.id} className={item.readAt ? '' : 'is-unread'}>
        <div><Link href={notificationTargetHref(item.target)}><strong>{item.title}</strong></Link><p>{item.message}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
        {!item.readAt ? <form action={markAccountNotificationRead}><input type="hidden" name="source" value={item.kind}/><input type="hidden" name="sourceId" value={item.sourceId}/><button className="ui-button ui-button-secondary" type="submit">Mark read</button></form> : <span>Read</span>}
      </li>)}</ul> : <p className="ui-card">No {page.data.filter === 'UNREAD' ? 'unread ' : ''}account notifications.</p>}
      {page.data.nextCursor ? <nav className="notification-history-pagination" aria-label="Notification pages"><Link className="ui-button ui-button-secondary" rel="next" href={`/account/notifications?filter=${page.data.filter}&cursor=${encodeURIComponent(page.data.nextCursor)}`}>Older notifications</Link></nav> : null}
    </> : <section className="ui-card"><Feedback tone="error">Account notifications could not be loaded. Application and account sources are shown together only when Master responds; no unread count is assumed.</Feedback></section>}
    <p><Link href="/applications">Application status</Link> · <Link href="/help">Help</Link></p>
  </main>;
}
export default function AccountNotificationsPage(props: Props) {
  return <Suspense fallback={<main className="page-loading">Loading account notifications…</main>}><AccountNotificationsContent {...props}/></Suspense>;
}
