import type { CSSProperties } from 'react';
import { redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';

export default async function MemberSessionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string; session?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  if (query.session && /^[A-Za-z0-9_:-]{1,128}$/.test(query.session)) redirect(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(query.session)}`);
  const loaded = await loadSessionReadPage({ slug, token, role: 'MEMBER', query, defaultMode: query.date ? 'day' : 'month' });
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">MY TRAINING</span><h1>My PT Sessions</h1><p>Review your requests, upcoming appointments and past sessions in {gym.name} time.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/member/trainers`}>Find a trainer</a></div>
    <Card><CardHeader eyebrow="MEMBER SESSION HISTORY" title={loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Session history'} />
      <SessionReadView slug={slug} role="MEMBER" filters={loaded.filters} data={loaded.data} stateCounts={loaded.stateCounts} countsFailed={loaded.countsFailed} loadError={loaded.failed} style={style}/>
    </Card>
  </DashboardChrome>;
}
