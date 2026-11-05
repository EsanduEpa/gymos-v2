import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { availabilitySchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { AvailabilityEditor } from '@/components/sessions/availability-editor';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function TrainerAvailabilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const today = new Date().toISOString().slice(0, 10);
  const through = new Date(`${today}T00:00:00Z`); through.setUTCDate(through.getUTCDate() + 59);
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/availability?from=${today}&through=${through.toISOString().slice(0, 10)}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired'); if (response.status === 403 || response.status === 404) notFound();
  const data = response.ok ? availabilitySchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor); const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER SCHEDULE</span><h1>Published availability</h1><p>Members can request times shown here. Existing sessions are protected when you edit your windows.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/schedule`}>Back to schedule</a></div>
    <Card><CardHeader eyebrow="BOOKABLE WINDOWS" title="Manage availability"/>{data?.success ? <AvailabilityEditor slug={slug} trainerId={data.data.trainerId} initialKey={randomUUID()} data={data.data} canEditClosures={false} closureFrom={today} closureThrough={through.toISOString().slice(0, 10)}/> : <><Feedback tone="error">Availability could not be loaded. No changes were made.</Feedback><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/availability`}>Retry</a></>}</Card>
  </DashboardChrome>;
}
