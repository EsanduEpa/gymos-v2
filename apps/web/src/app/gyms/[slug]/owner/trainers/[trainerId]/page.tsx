import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerProfileSchema } from '@gymos/contracts';
import { availabilitySchema } from '@gymos/contracts';
import { Card, CardHeader, Feedback, StatusBadge } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { TrainerShiftForm } from '@/components/trainers/trainer-shift-form';
import { TrainerLifecycleForm } from '@/components/trainers/trainer-lifecycle-form';
import { AvailabilityEditor } from '@/components/sessions/availability-editor';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { randomUUID } from 'node:crypto';

function formatSessionStart(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone, timeZoneName: 'short' }).format(new Date(value));
}

export default async function OwnerTrainerProfilePage({ params }: { params: Promise<{ slug: string; trainerId: string }> }) {
  const { slug, trainerId } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? trainerProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  const today = new Date().toISOString().slice(0, 10); const through = new Date(`${today}T00:00:00Z`); through.setUTCDate(through.getUTCDate() + 59);
  let availabilityResponse: Response;
  try { availabilityResponse = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainers/${encodeURIComponent(trainerId)}/availability?from=${today}&through=${through.toISOString().slice(0, 10)}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { availabilityResponse = new Response(null, { status: 503 }); }
  if (availabilityResponse.status === 401) redirect('/login?error=expired');
  const availability = availabilityResponse.ok ? availabilitySchema.safeParse(await availabilityResponse.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    {!result?.success ? <Card><CardHeader eyebrow="TRAINER PROFILE" title="Profile unavailable"/><Feedback tone="error">The trainer profile could not be loaded. No changes were made.</Feedback><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainerId)}`}>Retry profile</a></Card> : <>
      <div className="gym-banner"><div><h1>{result.data.trainer.fullName}</h1><p>{result.data.profile.email ?? 'No email'} · {result.data.profile.phone ?? 'No phone'}</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/trainers`}>← Back to Trainer Roster</a></div>
      <div className="dashboard-grid">
        <Card><CardHeader eyebrow="PROFILE" title="Trainer details" action={<StatusBadge status={result.data.trainer.status}/>}/><dl className="trainer-profile-summary"><dt>Level</dt><dd>{result.data.trainer.level?.replace('_', ' ') ?? 'Not set'}</dd><dt>Experience</dt><dd>{result.data.trainer.yearsExperience === null ? 'Not provided' : `${result.data.trainer.yearsExperience} years`}</dd><dt>Specialisations</dt><dd>{result.data.trainer.specialisations.join(', ') || 'None listed'}</dd><dt>Joined</dt><dd>{new Date(result.data.profile.joinedAt).toLocaleDateString('en', { timeZone: 'UTC' })}</dd><dt>Biography</dt><dd>{result.data.profile.biography || 'No biography provided'}</dd></dl></Card>
        <TrainerLifecycleForm slug={slug} trainerId={trainerId} status={result.data.trainer.status} version={result.data.trainer.version} initialRequestKey={randomUUID()}/>
        <Card><CardHeader eyebrow="SCHEDULE" title="Approve recurring shift"/><TrainerShiftForm slug={slug} trainerId={trainerId} version={result.data.trainer.version} shiftStart={result.data.trainer.shiftStart} shiftEnd={result.data.trainer.shiftEnd}/><p>Current shift: {result.data.trainer.shiftStart && result.data.trainer.shiftEnd ? `${result.data.trainer.shiftStart}–${result.data.trainer.shiftEnd}` : 'No approved shift'}</p></Card>
        <Card><CardHeader eyebrow="BOOKABLE PT AVAILABILITY" title="Manage session windows"/>{availability?.success ? <AvailabilityEditor slug={slug} trainerId={trainerId} initialKey={randomUUID()} data={availability.data} canEditClosures closureFrom={today} closureThrough={through.toISOString().slice(0, 10)}/> : <Feedback tone="error">Bookable availability is unavailable. No changes were made.</Feedback>}</Card>
        <Card><CardHeader eyebrow="SESSION HISTORY" title="Performance summary"/>
          <dl className="trainer-profile-session-metrics" aria-label="Session performance">
            <div><dt>Related clients</dt><dd>{result.data.stats.relatedClientCount}</dd></div>
            <div><dt>Completed sessions</dt><dd>{result.data.stats.totalCompleted}</dd></div>
            <div><dt>Completed in latest ten</dt><dd>{result.data.stats.completedInLoadedWindow}</dd></div>
          </dl>
          <h3 className="trainer-profile-session-heading">Recent sessions</h3>
          {result.data.recentSessions.items.length === 0
            ? <Feedback tone="info">No sessions recorded yet.</Feedback>
            : <ul className="trainer-profile-sessions">{result.data.recentSessions.items.map(item => <li key={item.id}>
              <div><strong>{item.state.replaceAll('_', ' ')}</strong><span>{item.type.replaceAll('_', ' ').toLowerCase()}</span></div>
              <time dateTime={item.scheduledStartAt}>{formatSessionStart(item.scheduledStartAt, result.data.gymTimeZone)}</time>
            </li>)}</ul>}
          {result.data.recentSessions.totalCount > 0 && <p className="trainer-profile-session-total">Showing {result.data.recentSessions.items.length} of {result.data.recentSessions.totalCount} sessions{result.data.recentSessions.hasMore ? ' · latest ten shown' : ''}.</p>}
          <p>Ratings are unavailable until members submit ratings.</p>
        </Card>
      </div>
    </>}
  </DashboardChrome>;
}
