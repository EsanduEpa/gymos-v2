import { SessionExceptionControls } from '@/components/sessions/session-exception-controls';
import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { sessionDetailSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback, StatusBadge } from '@/components/ui';
import { SessionLifecycleControls } from '@/components/sessions/session-lifecycle-controls';
import { SessionPolicyControls } from '@/components/sessions/read-views/session-policy-controls';
import { SessionRequestDecisionForm } from '@/components/sessions/session-request-forms';
import { SessionReadRefresh } from '@/components/sessions/read-views/session-read-refresh';
import { ElapsedSessionClock } from '@/components/sessions/read-views/elapsed-session-clock';
import styles from '@/components/sessions/session-detail.module.css';

export default async function SessionDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string; sessionId: string }>; searchParams: Promise<{ timelinePage?: string }>;
}) {
  const { slug, sessionId } = await params;
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(sessionId)) notFound();
  const query = await searchParams;
  const { token, session: account, gym, theme } = await requireGymContext(slug);
  const role = gym.role;
  if (role !== 'OWNER' && role !== 'TRAINER' && role !== 'MEMBER') notFound();
  const detailUrl = `/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}`;
  const page = /^[1-9][0-9]{0,5}$/.test(query.timelinePage ?? '') ? query.timelinePage! : '1';
  let response: Response;
  try { response = await fetch(apiUrl(`${detailUrl}?timelinePage=${page}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? sessionDetailSchema.safeParse(await response.json().catch(() => null)) : null;
  const data = parsed?.success ? parsed.data : null;
  const booking = data?.session;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  const back = `/gyms/${encodeURIComponent(slug)}/${role === 'OWNER' ? 'owner/sessions' : role === 'TRAINER' ? 'trainer/schedule' : 'member/sessions'}`;
  const time = (instant: string) => new Intl.DateTimeFormat('en-GB', { timeZone: booking!.gymTimeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
  const state = (value: string) => value.replaceAll('_', ' ').toLowerCase();
  return <DashboardChrome identityId={account.identityId} key={`${account.identityId}:${gym.id}:${role}`} gym={gym} gyms={account.gyms} displayName={account.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><h1>PT booking details</h1><p>Your appointment, credit outcome and session history.</p></div><a className="ui-button ui-button-secondary" href={back}>Back to sessions</a></div>
    <SessionReadRefresh href={`${detailUrl}?timelinePage=${page}`}/>
    {!data || !booking ? <Card><Feedback tone="error">Booking details could not be loaded. Refresh to try again.</Feedback></Card> : <div className={styles.layout}>
      <Card><CardHeader eyebrow="APPOINTMENT" title={`${booking.memberName} with ${booking.trainerName}`}/><StatusBadge status={booking.state}/>
        <dl className={styles.facts}>
          <div><dt>Start</dt><dd><time dateTime={booking.scheduledStartAt}>{time(booking.scheduledStartAt)}</time></dd></div>
          <div><dt>End</dt><dd><time dateTime={booking.scheduledEndAt}>{time(booking.scheduledEndAt)}</time></dd></div>
          <div><dt>Timezone</dt><dd>{booking.gymTimeZone}</dd></div>
          <div><dt>Location</dt><dd>{data.location || 'Contact the gym for location details.'}</dd></div>
          <div><dt>Service</dt><dd>{state(booking.type)} · {Math.round((Date.parse(booking.scheduledEndAt) - Date.parse(booking.scheduledStartAt)) / 60_000)} minutes · 1 PT credit</dd></div>
          <div><dt>Credit reservation</dt><dd>{state(data.reservation)}</dd></div>
          <div><dt>Settlement</dt><dd>{data.settlement ? `${state(data.settlement)} · ${data.creditConsumed ? '1 credit used' : 'No credit used'}` : 'Not settled'}</dd></div>
          <div><dt>{booking.state === 'PENDING_CONFIRMATION' ? 'If accepted, free cancellation through' : 'Free cancellation through'}</dt><dd>{data.cancellationDeadline ? time(data.cancellationDeadline) : 'Policy information unavailable'}</dd></div>
          {booking.requestExpiresAt ? <div><dt>Request response deadline</dt><dd>{time(booking.requestExpiresAt)}</dd></div> : null}
          {booking.startedAt ? <div><dt>Started</dt><dd>{time(booking.startedAt)}</dd></div> : null}
          {booking.endedAt ? <div><dt>Ended</dt><dd>{time(booking.endedAt)}</dd></div> : null}
        </dl>
        {data.replacementSessionId ? <p>This booking was replaced. <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(data.replacementSessionId)}`}>Open replacement booking</a></p> : null}
        {data.originalSessionId ? <p><a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(data.originalSessionId)}`}>View original booking and history</a></p> : null}
        {data.creditRemedyStatus === 'AWAITING_OWNER' ? <Feedback tone="info">The restored credit has expired and is awaiting owner resolution. It is not available to book yet.</Feedback> : data.creditRemedyStatus === 'APPROVED' ? <Feedback tone="info">The owner approved this source credit for use before {data.restoredCreditExpiry}. Membership and current credit availability are checked when booking.</Feedback> : null}
        {data.expiryAwaitingSweep ? <Feedback tone="info">The request deadline has passed. This time is available again and no credit was reserved. Its expiry history is awaiting background processing.</Feedback> : null}
        {booking.declineReason ? <p>Trainer’s message: {booking.declineReason}</p> : null}
        {booking.fee !== null ? <p>Session fee: {booking.currency} {booking.fee}</p> : null}
        {booking.trainerPay !== null ? <p>Your recorded earning: {booking.currency} {booking.trainerPay}</p> : null}
        <h2>Member-visible session notes</h2><p className={styles.notes}>{booking.notes || 'No session notes yet.'}</p>
      </Card>
      <div className={styles.stack}>
        <Card><CardHeader eyebrow="SESSION ACTIONS" title={booking.state === 'ACTIVE' ? 'Training in progress' : 'Manage this booking'}/>
          {role !== 'MEMBER' ? <SessionLifecycleControls slug={slug} session={booking}/> : null}
          <SessionPolicyControls slug={slug} session={booking} role={role}/>
          {booking.commandAffordances.includes('ACCEPT') ? <SessionRequestDecisionForm slug={slug} sessionId={sessionId} expectedVersion={booking.version} action="ACCEPT" requestKey={randomUUID()}/> : null}
          {booking.commandAffordances.includes('DECLINE') ? <SessionRequestDecisionForm slug={slug} sessionId={sessionId} expectedVersion={booking.version} action="DECLINE" requestKey={randomUUID()}/> : null}
          {booking.state === 'ACTIVE' && booking.startedAt ? <><ElapsedSessionClock startedAt={booking.startedAt}/><p>The timer is for display. Completion must be recorded explicitly.</p>{data.minimumCompletionMinutes !== null ? <p>The booked service is {Math.round((Date.parse(booking.scheduledEndAt) - Date.parse(booking.scheduledStartAt)) / 60_000)} minutes. Ordinary completion is available after {data.minimumCompletionMinutes} elapsed minutes{data.completionAvailableAt ? `, from ${time(data.completionAvailableAt)}` : ''}.</p> : <p>The confirmation policy is unavailable. Contact the owner.</p>}</> : null}
          {role === 'OWNER' ? <SessionExceptionControls slug={slug} data={data}/> : null}
          {booking.commandAffordances.length === 0 ? <p>No ordinary session actions are available right now.</p> : null}
        </Card>
        <Card><CardHeader eyebrow="BOOKING HISTORY" title="Timeline"/>
          {data.timeline.length ? <ol className={styles.timeline}>{data.timeline.map((event, index) => <li key={`${data.timelinePage}:${index}`}><strong>{event.adjustmentKind ? `${state(event.adjustmentKind)} · ${state(event.to)}` : event.notesUpdated ? 'Session notes updated' : state(event.to)}</strong><br/><time dateTime={event.at}>{time(event.at)}</time></li>)}</ol> : <p>No recorded state events for this booking.</p>}
          <nav className={styles.pager} aria-label="Booking history pages">{data.timelinePage > 1 ? <a href={`${detailUrl}?timelinePage=${data.timelinePage - 1}`}>Previous history</a> : null}{data.timelinePage < data.timelinePages ? <a href={`${detailUrl}?timelinePage=${data.timelinePage + 1}`}>More history</a> : null}</nav>
          <small>Updated {time(data.asOf)}</small>
        </Card>
      </div>
    </div>}
  </DashboardChrome>;
}
