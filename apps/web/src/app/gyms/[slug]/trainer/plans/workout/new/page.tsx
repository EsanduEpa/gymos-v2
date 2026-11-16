import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerClientProfileSchema, workoutPlanViewSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card } from '@/components/ui';
import { WorkoutPlanBuilder } from '@/components/coaching/workout-plan-builder';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function NewWorkoutPlanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ memberId?: string; copyFrom?: string }> }) {
  const { slug } = await params;
  const { memberId, copyFrom } = await searchParams;
  const idPattern = /^[A-Za-z0-9_:-]{1,128}$/;
  if (!memberId || !idPattern.test(memberId) || (copyFrom !== undefined && !idPattern.test(copyFrom))) notFound();
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const clientPath = `/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}`;
  const read = (path: string) => fetch(apiUrl(path), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }).catch(() => new Response(null, { status: 503 }));
  const [response, source] = await Promise.all([read(clientPath), copyFrom ? read(`${clientPath}/workout-plans/${encodeURIComponent(copyFrom)}`) : null]);
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  if (source?.status === 401) redirect('/login?error=expired');
  if (source?.status === 403 || source?.status === 404) notFound();
  const profile = response.ok ? trainerClientProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  const copied = source?.ok ? workoutPlanViewSchema.safeParse(await source.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">WORKOUT PLAN</span><h1>{profile?.success ? `Plan for ${profile.data.client.fullName}` : 'Create workout plan'}</h1>
      <p>Build a personalised plan and assign it to your confirmed client.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`}>Back to client</a></div>
    {!profile?.success ? <Card><p role="alert">The client profile could not be loaded. Refresh to retry.</p></Card> :
      copyFrom && !copied?.success ? <Card><p role="alert">The plan to copy could not be loaded. Refresh to retry.</p></Card> : <Card>
      <WorkoutPlanBuilder slug={slug} memberId={profile.data.client.id} memberName={profile.data.client.fullName} initialKey={randomUUID()}
        initialPlan={copied?.success ? copied.data : undefined} copy={Boolean(copyFrom)}/>
    </Card>}
  </DashboardChrome>;
}
