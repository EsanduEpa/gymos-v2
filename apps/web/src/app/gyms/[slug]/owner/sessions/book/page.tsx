import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { sessionBookingOptionsSchema } from '@gymos/contracts';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { OwnerSessionBookingForm } from '@/components/sessions/owner-session-booking-form';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function OwnerSessionBookingPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ localDate?: string; qMembers?: string; qTrainers?: string; type?: string }>;
}) {
  const { slug } = await params; const filters = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const query = new URLSearchParams({ memberPage: '1', memberPageSize: '100', trainerPage: '1', trainerPageSize: '100' });
  if (filters.localDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.localDate)) query.set('localDate', filters.localDate);
  if (filters.qMembers) query.set('qMembers', filters.qMembers.slice(0, 120));
  if (filters.qTrainers) query.set('qTrainers', filters.qTrainers.slice(0, 120));
  if (filters.type && ['IN_PERSON', 'VIRTUAL', 'INTRODUCTORY'].includes(filters.type)) query.set('type', filters.type);
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/session-booking-options?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const options = response.ok ? sessionBookingOptionsSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor); const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">SESSIONS</span><h1>Book a session</h1><p>Choose an active member, trainer and gym-local time. One pack credit is held when the booking commits.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner`}>Back to workspace</a></div>
    <Card><CardHeader eyebrow="OWNER BOOKING" title="Session details"/>
      {!options?.success ? <Feedback tone="error">Booking options could not be verified. No booking was made. Reload to try again.</Feedback> :
        <OwnerSessionBookingForm slug={slug} initialKey={randomUUID()} options={options.data}/>}</Card>
  </DashboardChrome>;
}
