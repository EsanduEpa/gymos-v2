import type { CSSProperties } from 'react';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { OwnerMonthOverview } from '@/components/sessions/read-views/owner-month-overview';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';

export default async function OwnerSessionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const loaded = await loadSessionReadPage({ slug, token, role: 'OWNER', query, defaultMode: query.month ? 'month' : 'day' });
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">SESSIONS</span><h1>Session management</h1><p>Review the gym session ledger by local date, month, state or member and trainer.</p></div>
      <a className="ui-button" href={`/gyms/${encodeURIComponent(slug)}/owner/sessions/book`}>Book a session</a></div>
    <Card><CardHeader eyebrow="GYM SESSION LEDGER" title={loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Session ledger'} />
      {loaded.filters.mode === 'month' ? <OwnerMonthOverview slug={slug} month={loaded.filters.month ?? ''} q={loaded.filters.q} data={loaded.memberOverview} failed={loaded.overviewFailed}/> : null}
      <SessionReadView slug={slug} role="OWNER" filters={loaded.filters} data={loaded.data} loadError={loaded.failed} style={style}/>
    </Card>
  </DashboardChrome>;
}
