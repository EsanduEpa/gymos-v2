import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';
import { notificationFilterSchema, notificationHistoryQuerySchema, notificationHistorySchema, notificationHref } from '@gymos/contracts';
import { markGymNotificationRead, markGymNotificationsReadThrough } from '@/app/notification-history-actions';

type Props = { params: Promise<{slug:string}>; searchParams: Promise<{filter?:string;cursor?:string;error?:string}> };
export default async function GymNotificationsPage({ params, searchParams }: Props) {
  const { slug } = await params; const { session, gym, token } = await requireGymContext(slug); const search = await searchParams;
  const filter = notificationFilterSchema.safeParse(search.filter ?? 'ALL');
  const input = notificationHistoryQuerySchema.safeParse({ filter: filter.success ? filter.data : 'INVALID', pageSize: 20, ...(search.cursor ? { cursor: search.cursor } : {}) });
  const response = input.success ? await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/notification-history?filter=${input.data.filter}&pageSize=${input.data.pageSize}${input.data.cursor ? `&cursor=${encodeURIComponent(input.data.cursor)}` : ''}`),
    { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null) : null;
  if (response?.status === 401) redirect('/login?error=expired'); if (response?.status === 403 || response?.status === 404) notFound();
  const page = response?.ok ? notificationHistorySchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">{gym.name.toUpperCase()}</span><h1>Gym notifications</h1><p>Operational notifications for this gym, including personal training updates.</p></div><Link className="ui-button ui-button-secondary" href="/account/notifications">Account notifications</Link></header>
      <nav className="notification-scope-tabs" aria-label="Notification scope"><Link href="/account/notifications">Account</Link><a href={`/gyms/${encodeURIComponent(slug)}/notifications`} aria-current="page">{gym.name}</a></nav>
      {search.error === 'read' ? <Feedback tone="error">The read state could not be confirmed. Refresh before retrying.</Feedback> : null}
      {page?.success ? <>
        <div className="notification-history-toolbar"><p>{page.data.unreadCount} unread in {gym.name}</p>
          <nav aria-label="Filter gym notifications"><a aria-current={page.data.filter === 'ALL' ? 'page' : undefined} href={`/gyms/${encodeURIComponent(slug)}/notifications?filter=ALL`}>All</a><a aria-current={page.data.filter === 'UNREAD' ? 'page' : undefined} href={`/gyms/${encodeURIComponent(slug)}/notifications?filter=UNREAD`}>Unread</a></nav>
          <form action={markGymNotificationsReadThrough.bind(null, slug)}><input type="hidden" name="through" value={page.data.asOf}/><button className="ui-button ui-button-secondary" type="submit" disabled={page.data.unreadCount === 0}>Mark loaded snapshot read</button></form>
        </div>
        {page.data.items.length ? <ul className="notification-history-list">{page.data.items.map(item => <li key={item.id} className={item.readAt ? '' : 'is-unread'}>
          <div><Link href={notificationHref(slug, item)}><strong>{item.title}</strong></Link><p>{item.message}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
          {!item.readAt ? <form action={markGymNotificationRead.bind(null, slug, item.id)}><button className="ui-button ui-button-secondary" type="submit">Mark read</button></form> : <span>Read</span>}
        </li>)}</ul> : <p className="ui-card">No {page.data.filter === 'UNREAD' ? 'unread ' : ''}gym notifications.</p>}
        {page.data.nextCursor ? <nav className="notification-history-pagination" aria-label="Notification pages"><Link className="ui-button ui-button-secondary" rel="next" href={`/gyms/${encodeURIComponent(slug)}/notifications?filter=${page.data.filter}&cursor=${encodeURIComponent(page.data.nextCursor)}`}>Older notifications</Link></nav> : null}
      </> : <section className="ui-card"><Feedback tone="error">Gym notifications are temporarily unavailable. Account notifications remain available separately.</Feedback></section>}
    </main>
  </DashboardChrome>;
}
