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

function trainerLevel(level: 'LEVEL_1' | 'LEVEL_2' | null) {
  return level === 'LEVEL_2' ? 'Level 2 Senior Trainer' : level === 'LEVEL_1' ? 'Level 1 Trainer' : 'Trainer level not listed';
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
        <p>{trainerLevel(options.data.level)} · {options.data.specialisations.join(' · ') || 'Specialisations not listed'}</p>
        <p><strong>Trainer shift:</strong> {options.data.shiftStart && options.data.shiftEnd ? `${options.data.shiftStart}–${options.data.shiftEnd} gym local time` : 'Not listed'}</p>
        <p><strong>Session credits available today:</strong> {options.data.availableCredits} · <strong>Held:</strong> {options.data.heldCredits} · <strong>Expired:</strong> {options.data.expiredCredits}</p>
        {!options.data.activeMembershipToday ? <p role="status">There is no active membership today. A session request is eligible only when both your membership and a pack cover the selected gym-local date; the API will recheck this when you submit.</p> : options.data.availableCredits === 0 ? <p role="status">No unheld, unexpired session credits are available today{options.data.expiredCredits ? `; ${options.data.expiredCredits} credit${options.data.expiredCredits === 1 ? ' is' : 's are'} expired` : ''}. You may still choose a future date; membership and pack eligibility are checked for that date when submitted.</p> : <p>One credit is reserved only if the trainer accepts. Eligibility is checked again for your selected date.</p>}
        <SessionRequestForm slug={slug} trainerId={trainerId} timeZone={options.data.timeZone}
          requestKey={randomUUID()} minDate={dateInZone(options.data.asOf, options.data.timeZone)}/>
      </>}
    </Card>
  </DashboardChrome>;
}
