import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { sessionReadPageSchema, type SessionReadPage } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { TrainerSessionCalendar } from '@/components/trainer/session-calendar';
import { Card, CardHeader } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

function localDate(instant: string, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function TrainerCalendarPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { slug } = await params;
  const rawMonth = (await searchParams).month;
  const requestedMonth = rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : null;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  async function read(query: string): Promise<SessionReadPage | null> {
    let response: Response;
    try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/sessions?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
    catch { return null; }
    if (response.status === 401) redirect('/login?error=expired');
    if (response.status === 403 || response.status === 404) notFound();
    const parsed = response.ok ? sessionReadPageSchema.safeParse(await response.json().catch(() => null)) : null;
    return parsed?.success ? parsed.data : null;
  }
  const discovery = await read(requestedMonth ? `month=${requestedMonth}&page=1&pageSize=100` : 'page=1&pageSize=1');
  const today = discovery ? localDate(discovery.asOf, discovery.timeZone) : null;
  const month = requestedMonth ?? today?.slice(0, 7);
  const first = month ? requestedMonth ? discovery : await read(`month=${month}&page=1&pageSize=100`) : null;
  const remaining: (SessionReadPage | null)[] = [];
  if (first) {
    // A month can span multiple API pages. Keep concurrent reads bounded.
    for (let start = 2; start <= first.totalPages; start += 4) {
      const pages = Array.from({ length: Math.min(4, first.totalPages - start + 1) }, (_, index) => start + index);
      remaining.push(...await Promise.all(pages.map(page => read(`month=${month}&page=${page}&pageSize=100`))));
    }
  }
  const sessions = first ? [...first.items, ...remaining.flatMap(page => page?.items ?? [])] : [];
  const partial = Boolean(first && (remaining.some(page => !page) || sessions.length !== first.totalCount));
  const monthName = month ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`)) : '';
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">COACHING CALENDAR</span><h1>My calendar</h1><p>See sessions to attend and requests to review in your gym’s local time.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/schedule`}>My schedule</a></div>
    <Card><CardHeader eyebrow="MONTH VIEW" title={first ? `${first.totalCount} session${first.totalCount === 1 ? '' : 's'} in ${monthName}` : 'Your calendar'}/>
      {first && today && month ? <TrainerSessionCalendar slug={slug} month={month} today={today} timeZone={first.timeZone} sessions={sessions} partial={partial} totalCount={first.totalCount}/> : <div className="ui-empty-state" role="alert"><h2>Calendar could not be loaded</h2><p>Refresh this page to try again. Your schedule is still available.</p><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/schedule`}>Open schedule</a></div>}
    </Card>
  </DashboardChrome>;
}
