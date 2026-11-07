import { notFound, redirect } from 'next/navigation';
import { memberWorkoutPlanPageSchema, memberWorkoutPlansQuerySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function TrainerWorkoutPlansPage({ params, searchParams }: { params: Promise<{ slug: string; memberId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug, memberId } = await params;
  const search = await searchParams;
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(memberId)) notFound();
  const query = memberWorkoutPlansQuerySchema.safeParse({ page: search.page ?? '1', pageSize: 20 });
  if (!query.success) notFound();
  const { token, session, gym } = await requireGymContext(slug, 'TRAINER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}/workout-plans?page=${query.data.page}&pageSize=${query.data.pageSize}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const page = response.ok ? memberWorkoutPlanPageSchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">CLIENT PLANS</span><h1>Workout plans</h1><p>All workout plans assigned to this client.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}#workouts`}>Back to client</a></header>
      {!page?.success ? <Card><p role="alert">Workout plans are temporarily unavailable. Refresh to retry.</p></Card> : page.data.items.length ? <>
        <div className="trainer-plan-list">{page.data.items.map(plan => <Card key={plan.id}><h2>{plan.name}</h2>{plan.description ? <p>{plan.description}</p> : null}
          <ol>{plan.exercises.map(row => <li key={row.id}>{row.name} · {row.sets} sets{row.reps !== null ? ` × ${row.reps} reps` : ''}{row.weightKg !== null ? ` · ${row.weightKg} kg` : ''}{row.notes ? ` · ${row.notes}` : ''}</li>)}</ol>
          <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/workout/${encodeURIComponent(plan.id)}/edit?memberId=${encodeURIComponent(memberId)}`}>Edit workout plan</a>
        </Card>)}</div>
        <nav className="trainer-plan-pagination" aria-label="Workout plan pages">{page.data.page > 1 ? <a href={`?page=${page.data.page - 1}`}>Previous plans</a> : null}
          <span>Page {page.data.page} of {Math.max(1, page.data.totalPages)}</span>{page.data.hasMore ? <a href={`?page=${page.data.page + 1}`}>More plans</a> : null}</nav>
      </> : <Card><h2>No workout plans</h2><p>This client has no assigned workout plans.</p></Card>}
    </main>
  </DashboardChrome>;
}
