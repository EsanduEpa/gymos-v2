import type { CSSProperties } from 'react';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';

export default async function TrainerSchedulePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const loaded = await loadSessionReadPage({ slug, token, role: 'TRAINER', query, defaultMode: query.month ? 'month' : 'day' });
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER SCHEDULE</span><h1>My sessions</h1><p>Review assigned requests and sessions. The elapsed timer is display-only; server time controls session commands.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/requests`}>Session requests</a></div>
    <Card><CardHeader eyebrow="ASSIGNED SESSIONS" title={loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Schedule'} />
      <SessionReadView slug={slug} role="TRAINER" filters={loaded.filters} data={loaded.data} loadError={loaded.failed} style={style}/>
    </Card>
  </DashboardChrome>;
}
