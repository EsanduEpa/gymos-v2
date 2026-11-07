import { Suspense, type CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberMealPlanPageSchema, memberWorkoutPlanPageSchema, sessionReadPageSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { MemberHome } from '@/components/member/member-home';
import { LoadingState } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

async function read<T>(slug: string, token: string, resource: string, parse: (value: unknown) => { success: true; data: T } | { success: false }): Promise<T | null> {
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/${resource}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { return null; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? parse(await response.json().catch(() => null)) : null;
  return result?.success ? result.data : null;
}
function localDate(instant: string, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  const [snapshot, workouts, meals, pending] = await Promise.all([
    read(slug, token, 'sessions?page=1&pageSize=1', value => sessionReadPageSchema.safeParse(value)),
    read(slug, token, 'workout-plans?page=1&pageSize=1', value => memberWorkoutPlanPageSchema.safeParse(value)),
    read(slug, token, 'meal-plans?page=1&pageSize=1', value => memberMealPlanPageSchema.safeParse(value)),
    read(slug, token, 'sessions?state=PENDING_CONFIRMATION&page=1&pageSize=2', value => sessionReadPageSchema.safeParse(value)),
  ]);
  const today = snapshot ? localDate(snapshot.asOf, snapshot.timeZone) : null;
  const until = today ? new Date(`${today}T12:00:00Z`) : null;
  until?.setUTCDate(until.getUTCDate() + 29);
  const [upcoming, completed] = today && until ? await Promise.all([
    read(slug, token, `sessions?${new URLSearchParams({ from: today, to: until.toISOString().slice(0, 10), state: 'SCHEDULED', page: '1', pageSize: '100' })}`, value => sessionReadPageSchema.safeParse(value)),
    read(slug, token, `sessions?${new URLSearchParams({ month: today.slice(0, 7), state: 'COMPLETED', page: '1', pageSize: '1' })}`, value => sessionReadPageSchema.safeParse(value)),
  ]) : [null, null];
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <MemberHome slug={slug} name={session.displayName ?? 'there'} gymName={gym.name} snapshot={snapshot} workouts={workouts} meals={meals} upcoming={upcoming} completed={completed} pending={pending}/>
  </DashboardChrome>;
}
export default function MemberWorkspace(props: { params: Promise<{ slug: string }> }) { return <Suspense fallback={<div className="themed-workspace member-loading"><LoadingState label="Loading your training home…" page/></div>}><Content {...props}/></Suspense>; }
