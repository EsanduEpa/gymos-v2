import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { mealPlanViewSchema, trainerClientProfileSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card } from '@/components/ui';
import { MealPlanBuilder } from '@/components/coaching/meal-plan-builder';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function EditMealPlanPage({ params, searchParams }: { params: Promise<{ slug: string; planId: string }>; searchParams: Promise<{ memberId?: string }> }) {
  const { slug, planId } = await params;
  const { memberId } = await searchParams;
  if (!memberId || !/^[A-Za-z0-9_:-]{1,128}$/.test(memberId) || !/^[A-Za-z0-9_:-]{1,128}$/.test(planId)) notFound();
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const profile = response.ok ? trainerClientProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  let planResponse: Response | null = null;
  if (profile?.success) {
    try { planResponse = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/meal-plans/${encodeURIComponent(planId)}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
    catch { planResponse = null; }
  }
  if (planResponse?.status === 401) redirect('/login?error=expired');
  if (planResponse?.status === 403 || planResponse?.status === 404) notFound();
  const parsedPlan = planResponse?.ok ? mealPlanViewSchema.safeParse(await planResponse.json().catch(() => null)) : null;
  const plan = parsedPlan?.success ? parsedPlan.data : undefined;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">EDIT MEAL PLAN</span><h1>{plan && profile?.success ? `Plan for ${profile.data.client.fullName}` : 'Meal plan unavailable'}</h1>
      <p>Changes replace the current meal entries for this client.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}#meals`}>Back to client plans</a></div>
    {!profile?.success || !plan ? <Card><p role="alert">This plan could not be loaded. Reload the client profile to continue.</p></Card> : <Card>
      <MealPlanBuilder slug={slug} memberId={profile.data.client.id} memberName={profile.data.client.fullName} initialKey={randomUUID()} initialPlan={plan}/>
    </Card>}
  </DashboardChrome>;
}
