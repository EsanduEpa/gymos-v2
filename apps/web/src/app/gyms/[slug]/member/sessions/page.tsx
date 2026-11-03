import type { CSSProperties } from 'react';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';

export default async function MemberSessionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  const loaded = await loadSessionReadPage({ slug, token, role: 'MEMBER', query, defaultMode: query.date ? 'day' : 'month' });
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">MY SESSIONS</span><h1>Session history</h1><p>Review session requests, upcoming appointments and completed sessions by gym-local month.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/member/trainers`}>Find a trainer</a></div>
    <Card><CardHeader eyebrow="MEMBER SESSION HISTORY" title={loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Session history'} />
      <SessionReadView slug={slug} role="MEMBER" filters={loaded.filters} data={loaded.data} stateCounts={loaded.stateCounts} countsFailed={loaded.countsFailed} loadError={loaded.failed} style={style}/>
    </Card>
  </DashboardChrome>;
}
