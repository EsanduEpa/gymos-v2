import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberMealPlanPageSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { AssignedMealPlan } from '@/components/member/assigned-plans';

export default async function MemberMealPlansPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const rawPage = Number((await searchParams).page ?? '1');
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 1_000_000 ? rawPage : 1;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/meal-plans?page=${page}&pageSize=20`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const plans = response.ok ? memberMealPlanPageSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={session.identityId + ':' + gym.id + ':' + gym.role} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">YOUR NUTRITION</span><h1>Meal plans</h1><p>Your trainer’s weekly meal guidance, organised by day.</p></div></div>
    {!plans?.success ? <Card><p role="alert">Meal plans could not be loaded. Refresh to retry.</p><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/member/meal-plans`}>Retry meal plans</a></Card> : <Card><CardHeader eyebrow="ASSIGNED TO YOU" title={`${plans.data.totalCount} meal plan${plans.data.totalCount === 1 ? '' : 's'}`}/>
      {plans.data.items.length === 0 ? <div className="ui-empty-state"><h2>No meal plans yet</h2><p>Plans assigned by your trainer will appear here.</p></div> :
        <div className="member-plan-list">{plans.data.items.map(plan => <AssignedMealPlan key={plan.id} plan={plan} timeZone={plans.data.timeZone}/>)}</div>}
      <nav aria-label="Meal plan pages" className="member-plan-pager">{plans.data.page > 1 ? <a href={`?page=${plans.data.page - 1}`}>Previous</a> : null}
        <span>Page {plans.data.page} of {Math.max(1, plans.data.totalPages)}</span>{plans.data.hasMore ? <a href={`?page=${plans.data.page + 1}`}>Next</a> : null}</nav>
    </Card>}
  </DashboardChrome>;
}
