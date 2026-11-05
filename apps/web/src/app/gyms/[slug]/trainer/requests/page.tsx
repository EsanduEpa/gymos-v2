import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerSessionRequestsSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { SessionRequestDecisionForm } from '@/components/sessions/session-request-forms';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function TrainerRequestsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/session-requests`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? trainerSessionRequestsSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER HIRE REQUESTS</span><h1>Client Hire Requests</h1><p>Review incoming one-on-one personal training requests. Accepting reserves a pack credit and books the session.</p></div></div>
    <div className="trainer-request-summary" aria-label="Pending requests summary"><Card><CardHeader eyebrow="PENDING REQUESTS" title={result?.success ? String(result.data.items.length) : 'Unavailable'}/></Card></div>
    <Card><CardHeader eyebrow="PENDING SESSION REQUESTS" title={result?.success ? `${result.data.items.length} requests` : 'Session requests'}/>
      {!result?.success ? <Feedback tone="error">Requests could not be loaded. Refresh to try again.</Feedback> : result.data.items.length === 0 ?
        <div className="ui-empty-state"><h2>No pending requests</h2><p>New member requests will appear here.</p></div> :
        <div className="session-request-list">{result.data.items.map(item => <article className="session-request-card trainer-request-row" key={item.id}>
          <div className="trainer-request-details"><h2>{item.memberName}</h2>
            <time dateTime={item.scheduledStartAt}>{new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: item.timeZone, timeZoneName: 'short' }).format(new Date(item.scheduledStartAt))}</time>
            <span>{item.durationMinutes} min · {item.type.replace('_', ' ').toLowerCase()}</span>
            {item.notes ? <details className="trainer-request-member-note"><summary>Member note</summary><p>{item.notes}</p></details> : <span className="trainer-request-no-note">No member note</span>}
            <span className="ui-badge ui-badge-info">Pending</span>
          </div>
          <div className="session-request-actions">
            <SessionRequestDecisionForm slug={slug} sessionId={item.id} expectedVersion={item.version} action="ACCEPT" requestKey={randomUUID()}/>
            <SessionRequestDecisionForm slug={slug} sessionId={item.id} expectedVersion={item.version} action="DECLINE" requestKey={randomUUID()}/>
          </div>
        </article>)}</div>}
    </Card>
  </DashboardChrome>;
}
