import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerClientProfileSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card } from '@/components/ui';
import { MealPlanBuilder } from '@/components/coaching/meal-plan-builder';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function NewMealPlanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ memberId?: string }> }) {
  const { slug } = await params;
  const { memberId } = await searchParams;
  if (!memberId || !/^[A-Za-z0-9_:-]{1,128}$/.test(memberId)) notFound();
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const profile = response.ok ? trainerClientProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={session.identityId + ':' + gym.id + ':' + gym.role} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">MEAL PLAN</span><h1>{profile?.success ? `Plan for ${profile.data.client.fullName}` : 'Create meal plan'}</h1>
      <p>This form is available only while the confirmed client relationship is active.</p></div></div>
    {!profile?.success ? <Card><p role="alert">The client profile could not be loaded. Refresh to retry.</p></Card> : <Card>
      <MealPlanBuilder slug={slug} memberId={profile.data.client.id} memberName={profile.data.client.fullName} initialKey={randomUUID()}/>
    </Card>}
  </DashboardChrome>;
}
