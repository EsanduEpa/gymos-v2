import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberWorkoutPlanPageSchema, memberWorkoutScheduleQuerySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { AssignedWorkout } from '@/components/member/assigned-plans';
import { formatDisplayDate } from '@/lib/display-date';

export default async function MemberWorkoutPlansPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; on?: string }> }) {
  const { slug } = await params;
  const search = await searchParams;
  const query = memberWorkoutScheduleQuerySchema.safeParse({ page: search.page, on: search.on || undefined, pageSize: 20 });
  const base = `/gyms/${encodeURIComponent(slug)}/member/workout-plans`;
  if (!query.success) redirect(base);
  const { page, pageSize, on } = query.data;
  const pageQuery = (index: number) => new URLSearchParams({ page: String(index), ...(on ? { on } : {}) }).toString();
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/workout-plans?${pageQuery(page)}&pageSize=${pageSize}`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const plans = response.ok ? memberWorkoutPlanPageSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">YOUR TRAINING</span><h1>Workout plans</h1><p>Your trainer’s exercise plans, with every set, repetition and instruction in one place.</p></div></div>
    <Card>
      <nav className="member-plan-pager" aria-label="Workout schedule">
        <a href={base} aria-current={!on ? 'page' : undefined}>All plans</a>
        <a href={`${base}?on=today`} aria-current={on === 'today' ? 'page' : undefined}>Today’s workouts</a>
      </nav>
      <form action={base} method="get" className="stack-form">
        <label className="ui-field"><span>Find workouts by date</span><input name="on" type="date" required defaultValue={on === 'today' ? undefined : on}/></label>
        <button type="submit" className="ui-button ui-button-secondary">Show date</button>
      </form>
    </Card>
    {!plans?.success ? <Card><p role="alert">Workout plans could not be loaded. Refresh to retry.</p><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/member/workout-plans`}>Retry workout plans</a></Card> : <>
      <Card><CardHeader eyebrow="ASSIGNED TO YOU" title={plans.data.scheduledFor ? `Workouts for ${formatDisplayDate(plans.data.scheduledFor)}` : `${plans.data.totalCount} workout plan${plans.data.totalCount === 1 ? '' : 's'}`}/>
        {plans.data.items.length === 0 ? <div className="ui-empty-state"><h2>{on ? 'No workouts scheduled for this date' : 'No workout plans yet'}</h2></div> :
          <div className="member-plan-list">{plans.data.items.map(plan => <AssignedWorkout key={plan.id} plan={plan} timeZone={plans.data.timeZone}
            completion={plans.data.canRecordCompletion && plans.data.scheduledFor ? { slug, date: plans.data.scheduledFor } : undefined}/>)}</div>}
        <nav aria-label="Workout plan pages" className="member-plan-pager">
          {plans.data.page > 1 ? <a href={`?${pageQuery(plans.data.page - 1)}`}>Previous</a> : null}
          <span>Page {plans.data.page} of {Math.max(1, plans.data.totalPages)}</span>
          {plans.data.hasMore ? <a href={`?${pageQuery(plans.data.page + 1)}`}>Next</a> : null}
        </nav>
      </Card>
    </>}
  </DashboardChrome>;
}
