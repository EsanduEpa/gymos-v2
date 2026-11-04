import type { CSSProperties } from 'react';
import { sessionReadPageSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { OwnerMonthOverview } from '@/components/sessions/read-views/owner-month-overview';
import { OwnerSessionCalendar } from '@/components/sessions/owner-session-calendar';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function OwnerSessionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string; view?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const calendar = query.view !== 'list';
  const loaded = await loadSessionReadPage({ slug, token, role: 'OWNER', query: calendar ? { month: query.month, mode: 'month', page: '1', pageSize: '100' } : query, defaultMode: calendar || query.month ? 'month' : 'day' });
  const calendarItems = loaded.data ? [...loaded.data.items] : [];
  let complete = Boolean(loaded.data);
  if (calendar && loaded.data && loaded.filters.month) {
    for (let page = 2; page <= loaded.data.totalPages; page++) {
      try {
        const params = new URLSearchParams({ month: loaded.filters.month, page: String(page), pageSize: '100' });
        const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions?${params}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
        const parsed = response.ok ? sessionReadPageSchema.safeParse(await response.json().catch(() => null)) : null;
        if (!parsed?.success || parsed.data.timeZone !== loaded.data.timeZone) { complete = false; break; }
        calendarItems.push(...parsed.data.items);
      } catch { complete = false; break; }
    }
  }
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><h1>PT Session Oversight &amp; Analytics</h1><p>Monitor PT sessions across all personal trainers and track session outcomes.</p></div>
      <a className="ui-button ui-button-primary" href={`/gyms/${encodeURIComponent(slug)}/owner/sessions/book`}>＋ Book PT Session</a></div>
    <nav className="finance-tabs" aria-label="Session views"><a className={`finance-tab ${calendar ? 'finance-tab-active' : ''}`} aria-current={calendar ? 'page' : undefined} href={`/gyms/${encodeURIComponent(slug)}/owner/sessions?view=calendar${loaded.filters.month ? `&month=${loaded.filters.month}` : ''}`}>Calendar</a><a className={`finance-tab ${!calendar ? 'finance-tab-active' : ''}`} aria-current={!calendar ? 'page' : undefined} href={`/gyms/${encodeURIComponent(slug)}/owner/sessions?view=list&mode=day`}>Session list</a></nav>
    <Card><CardHeader eyebrow="GYM SESSIONS" title={calendar ? 'Gym calendar' : loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Session ledger'} />
      {calendar ? loaded.data && loaded.filters.month ? <OwnerSessionCalendar slug={slug} month={loaded.filters.month} timeZone={loaded.data.timeZone} sessions={calendarItems} totalCount={loaded.data.filterTotal} complete={complete}/> : <p role="alert">The gym calendar could not be loaded. Reload to try again.</p> : <>
        {loaded.filters.mode === 'month' ? <OwnerMonthOverview slug={slug} month={loaded.filters.month ?? ''} q={loaded.filters.q} data={loaded.memberOverview} failed={loaded.overviewFailed}/> : null}
        <SessionReadView slug={slug} role="OWNER" filters={loaded.filters} data={loaded.data} loadError={loaded.failed} style={style}/>
      </>}
    </Card>
  </DashboardChrome>;
}
