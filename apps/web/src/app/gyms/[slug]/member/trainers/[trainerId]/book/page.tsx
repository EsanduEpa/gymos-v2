import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { sessionRequestOptionsSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { SessionRequestForm } from '@/components/sessions/session-request-forms';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

function dateInZone(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const p = Object.fromEntries(parts.map(value => [value.type, value.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export default async function RequestTrainerSessionPage({ params }: { params: Promise<{ slug: string; trainerId: string }> }) {
  const { slug, trainerId } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/session-request-options?trainerId=${encodeURIComponent(trainerId)}`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const options = response.ok ? sessionRequestOptionsSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">SESSION REQUEST</span><h1>Request a trainer</h1><p>Choose a time in this gym’s local time zone. Your credit stays available until the trainer accepts.</p></div></div>
    <Card><CardHeader eyebrow="MEMBER REQUEST" title={options?.success ? options.data.trainerName : 'Session request'}/>
      {!options?.success ? <Feedback tone="error">Session request options could not be loaded. No request was sent.</Feedback> : <>
        <p>{options.data.level?.replace('_', ' ') ?? 'Trainer level not listed'} · {options.data.specialisations.join(' · ') || 'Specialisations not listed'}</p>
        <SessionRequestForm slug={slug} trainerId={trainerId} trainerName={options.data.trainerName} timeZone={options.data.timeZone}
          minimumDurationMinutes={options.data.minimumDurationMinutes} requestKey={randomUUID()} minDate={dateInZone(options.data.asOf, options.data.timeZone)}/>
      </>}
    </Card>
  </DashboardChrome>;
}
