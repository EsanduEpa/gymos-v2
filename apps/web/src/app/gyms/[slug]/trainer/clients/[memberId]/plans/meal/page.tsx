import { notFound, redirect } from 'next/navigation';
import { memberMealPlanPageSchema, memberWorkoutPlansQuerySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default async function TrainerMealPlansPage({ params, searchParams }: { params: Promise<{ slug: string; memberId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug, memberId } = await params;
  const search = await searchParams;
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(memberId)) notFound();
  const query = memberWorkoutPlansQuerySchema.safeParse({ page: search.page ?? '1', pageSize: 20 });
  if (!query.success) notFound();
  const { token, session, gym } = await requireGymContext(slug, 'TRAINER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/meal-plans?page=${query.data.page}&pageSize=${query.data.pageSize}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const page = response.ok ? memberMealPlanPageSchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">CLIENT PLANS</span><h1>Meal plans</h1><p>All meal plans assigned to this client.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}#meals`}>Back to client</a></header>
      {!page?.success ? <Card><p role="alert">Meal plans are temporarily unavailable. Refresh to retry.</p></Card> : page.data.items.length ? <>
        <div className="trainer-plan-list">{page.data.items.map(plan => <Card key={plan.id}><h2>{plan.name}</h2>
          <p>{plan.totals.calories} kcal · Protein {plan.totals.proteinGrams ?? '0'} g · Carbs {plan.totals.carbsGrams ?? '0'} g · Fat {plan.totals.fatsGrams ?? '0'} g</p>
          <ul>{plan.entries.map(entry => <li key={entry.id}>{weekdays[entry.dayOfWeek - 1]} · {entry.mealType} · {entry.foodItem}{entry.calories !== null ? ` · ${entry.calories} kcal` : ''}</li>)}</ul>
          <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/meal/${encodeURIComponent(plan.id)}/edit?memberId=${encodeURIComponent(memberId)}`}>Edit meal plan</a>
        </Card>)}</div>
        <nav className="trainer-plan-pagination" aria-label="Meal plan pages">{page.data.page > 1 ? <a href={`?page=${page.data.page - 1}`}>Previous plans</a> : null}
          <span>Page {page.data.page} of {Math.max(1, page.data.totalPages)}</span>{page.data.hasMore ? <a href={`?page=${page.data.page + 1}`}>More plans</a> : null}</nav>
      </> : <Card><h2>No meal plans</h2><p>This client has no assigned meal plans.</p></Card>}
    </main>
  </DashboardChrome>;
}
