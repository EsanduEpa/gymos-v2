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
    <div className="gym-banner"><div><span className="eyebrow">TRAINER SCHEDULE</span><h1>Session requests</h1><p>Accepting a request rechecks eligibility and reserves one session credit.</p></div></div>
    <Card><CardHeader eyebrow="PENDING" title={result?.success ? `${result.data.items.length} requests` : 'Session requests'}/>
      {!result?.success ? <Feedback tone="error">Requests could not be loaded. Refresh to try again.</Feedback> : result.data.items.length === 0 ?
        <div className="ui-empty-state"><h2>No pending requests</h2><p>New member requests will appear here.</p></div> :
        <div className="session-request-list">{result.data.items.map(item => <article className="session-request-card" key={item.id}>
          <h2>{item.memberName}</h2><p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: item.timeZone }).format(new Date(item.scheduledStartAt))} · {item.durationMinutes} minutes · {item.type.replace('_', ' ').toLowerCase()}</p>
          {item.notes ? <p><strong>Member note:</strong> {item.notes}</p> : null}
          <div className="session-request-actions">
            <SessionRequestDecisionForm slug={slug} sessionId={item.id} expectedVersion={item.version} action="ACCEPT" requestKey={randomUUID()}/>
            <SessionRequestDecisionForm slug={slug} sessionId={item.id} expectedVersion={item.version} action="DECLINE" requestKey={randomUUID()}/>
          </div>
        </article>)}</div>}
    </Card>
  </DashboardChrome>;
}
