import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberMealPlanPageSchema, sessionReadPageSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader } from '@/components/ui';
import { MemberSessionCalendar } from '@/components/sessions/member-session-calendar';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

function localDate(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function MemberCalendarPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { slug } = await params;
  const rawMonth = (await searchParams).month;
  const requestedMonth = rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : null;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  const fetchPage = async (query: string) => {
    try {
      const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/sessions?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.status === 401) redirect('/login?error=expired');
      if (response.status === 403 || response.status === 404) notFound();
      return response.ok ? sessionReadPageSchema.safeParse(await response.json().catch(() => null)) : null;
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) throw error;
      return null;
    }
  };
  const fetchMealPlans = async () => {
    try {
      const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/meal-plans?page=1&pageSize=100`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.status === 401) redirect('/login?error=expired');
      if (response.status === 403 || response.status === 404) notFound();
      return response.ok ? memberMealPlanPageSchema.safeParse(await response.json().catch(() => null)) : null;
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) throw error;
      return null;
    }
  };
  const discovery = await fetchPage(requestedMonth ? `month=${requestedMonth}&page=1&pageSize=100` : 'page=1&pageSize=1');
  const today = discovery?.success ? localDate(discovery.data.asOf, discovery.data.timeZone) : new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const month = requestedMonth ?? today.slice(0, 7);
  const [data, mealData] = await Promise.all([
    requestedMonth ? Promise.resolve(discovery) : discovery?.success ? fetchPage(`month=${month}&page=1&pageSize=100`) : Promise.resolve(null),
    fetchMealPlans(),
  ]);
  const parsed = data?.success ? data.data : null;
  const mealPlans = mealData?.success ? mealData.data : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;

  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">YOUR SCHEDULE</span><h1>Calendar</h1><p>See your PT sessions and weekly meal plan activities by gym-local day.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/member/sessions`}>My PT Sessions</a></div>
    <Card><CardHeader eyebrow="MEMBER CALENDAR" title={parsed ? `${parsed.totalCount} session${parsed.totalCount === 1 ? '' : 's'} this month` : 'Your schedule'}/>
      {parsed ? <MemberSessionCalendar slug={slug} month={month} today={today} timeZone={parsed.timeZone} sessions={parsed.items} totalCount={parsed.totalCount} mealPlans={mealPlans?.items ?? []} mealPlansTruncated={Boolean(mealPlans?.hasMore)}/> : <div className="ui-empty-state" role="alert"><h2>Calendar could not be loaded</h2><p>Your session records were not changed. Refresh to try again.</p></div>}
      {!mealPlans ? <p role="status">Meal plan activities could not be loaded; PT sessions remain available.</p> : null}
    </Card>
  </DashboardChrome>;
}
