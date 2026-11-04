import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { trainerSessionRequestsSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function TrainerSchedulePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const loaded = await loadSessionReadPage({ slug, token, role: 'TRAINER', query, defaultMode: query.month ? 'month' : 'day' });
  let requestResponse: Response;
  try { requestResponse = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/session-requests`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { requestResponse = new Response(null, { status: 503 }); }
  if (requestResponse.status === 401) redirect('/login?error=expired');
  if (requestResponse.status === 403 || requestResponse.status === 404) notFound();
  const requests = requestResponse.ok ? trainerSessionRequestsSchema.safeParse(await requestResponse.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER SCHEDULE</span><h1>My sessions</h1><p>Review assigned requests and sessions. The elapsed timer is display-only; server time controls session commands.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/requests`}>Session requests{requests?.success && requests.data.items.length ? ` (${requests.data.items.length})` : ''}</a></div>
    {requests?.success && requests.data.items.length > 0 ? <Card><CardHeader eyebrow="ACTION NEEDED" title={`${requests.data.items.length} pending session request${requests.data.items.length === 1 ? '' : 's'}`}/>
      <p>Member requests are ready for your decision. Review the requested time and accept or decline each request.</p>
      <a className="ui-button ui-button-primary" href={`/gyms/${encodeURIComponent(slug)}/trainer/requests`}>Review session requests</a>
    </Card> : null}
    <Card><CardHeader eyebrow="ASSIGNED SESSIONS" title={loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Schedule'} />
      <SessionReadView slug={slug} role="TRAINER" filters={loaded.filters} data={loaded.data} loadError={loaded.failed} style={style}/>
    </Card>
  </DashboardChrome>;
}
