import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { trainerSessionRequestsSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { TrainerScheduleOverview } from '@/components/trainer/schedule-overview';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { SessionRequestDecisionForm } from '@/components/sessions/session-request-forms';
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
    <div className="gym-banner"><div><span className="eyebrow">SCHEDULE</span><h1>Trainer Daily Schedule</h1><p>Your sessions, incoming requests and coaching notes in one place.</p></div>
      <div className="trainer-schedule-links"><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/calendar`}>Open calendar</a><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/requests`}>Review requests{requests?.success && requests.data.items.length ? ` (${requests.data.items.length})` : ''}</a></div></div>
    <TrainerScheduleOverview slug={slug} data={loaded.data} filters={loaded.filters} pendingCount={requests?.success ? requests.data.items.length : null}/>
    {requests?.success && requests.data.items.length > 0 ? <Card className="trainer-pending-card"><CardHeader eyebrow="PENDING SESSION REQUESTS" title={`Pending session requests (${requests.data.items.length})`}/>
      <div className="trainer-schedule-requests">{requests.data.items.map(item => <article className="trainer-schedule-request trainer-request-row" key={item.id}>
        <div className="trainer-schedule-request-main"><div className="trainer-schedule-request-title"><h2>{item.memberName}</h2>
          <time dateTime={item.scheduledStartAt}>{new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: item.timeZone, timeZoneName: 'short' }).format(new Date(item.scheduledStartAt))}</time>
          <span>{item.durationMinutes} min · {item.type.replace('_', ' ').toLowerCase()}</span>
          {item.notes ? <details className="trainer-request-member-note"><summary>Member note</summary><p>{item.notes}</p></details> : <span className="trainer-request-no-note">No member note</span>}
          <span className="ui-badge ui-badge-info">Pending</span></div>
        </div>
        <div className="trainer-schedule-request-actions">
          <SessionRequestDecisionForm slug={slug} sessionId={item.id} expectedVersion={item.version} action="ACCEPT" requestKey={randomUUID()}/>
          <SessionRequestDecisionForm slug={slug} sessionId={item.id} expectedVersion={item.version} action="DECLINE" requestKey={randomUUID()}/>
        </div>
      </article>)}</div>
    </Card> : !requests?.success ? <Card><CardHeader eyebrow="PENDING REQUESTS" title="Requests unavailable"/><p role="alert">We couldn’t check for new requests. Open the request page to retry.</p><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/requests`}>Open requests</a></Card> : null}
    <SessionReadView slug={slug} role="TRAINER" filters={loaded.filters} data={loaded.data} loadError={loaded.failed} style={style}/>
  </DashboardChrome>;
}
