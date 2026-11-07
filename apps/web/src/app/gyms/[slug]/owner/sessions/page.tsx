import type { CSSProperties } from 'react';
import { ptScheduledWorkHealthSchema, sessionAttentionPageSchema, sessionReadPageSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { SessionReadView } from '@/components/sessions/read-views/session-read-view';
import { OwnerMonthOverview } from '@/components/sessions/read-views/owner-month-overview';
import { OwnerSessionCalendar } from '@/components/sessions/owner-session-calendar';
import { loadSessionReadPage } from '@/components/sessions/read-views/load-session-read-page';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function OwnerSessionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; month?: string; mode?: string; state?: string; q?: string; memberId?: string; page?: string; pageSize?: string; view?: string; attentionPage?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const attentionPage = /^[1-9][0-9]{0,5}$/.test(query.attentionPage ?? '') ? query.attentionPage! : '1';
  let attentionResponse: Response;
  try { attentionResponse = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/attention?page=${attentionPage}&pageSize=10`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { attentionResponse = new Response(null, { status: 503 }); }
  const attention = attentionResponse.ok ? sessionAttentionPageSchema.safeParse(await attentionResponse.json().catch(() => null)) : null;
  const attentionParams = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  const attentionHref = (page: number) => { const params = new URLSearchParams(attentionParams); params.set('attentionPage', String(page)); return `/gyms/${encodeURIComponent(slug)}/owner/sessions?${params}#owner-attention`; };
  const calendar = query.view === 'calendar' || (query.view !== 'list' && Boolean(query.month || query.mode === 'month'));
  const loaded = await loadSessionReadPage({ slug, token, role: 'OWNER', query: calendar ? { month: query.month, mode: 'month', page: '1', pageSize: '100' } : query, defaultMode: calendar || query.month ? 'month' : 'day' });
  const calendarItems = loaded.data ? [...loaded.data.items] : [];
  let complete = Boolean(loaded.data);
  if (calendar && loaded.data && loaded.filters.month) {
    for (let page = 2; page <= loaded.data.totalPages; page++) {
      try {
        const params = new URLSearchParams({ month: loaded.filters.month, page: String(page), pageSize: '100' });
        const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions?${params}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
        const parsed = response.ok ? sessionReadPageSchema.safeParse(await response.json().catch(() => null)) : null;
        if (!parsed?.success || parsed.data.timeZone !== loaded.data.timeZone) { complete = false; break; }
        calendarItems.push(...parsed.data.items);
      } catch { complete = false; break; }
    }
  }
  let workHealth: ReturnType<typeof ptScheduledWorkHealthSchema.parse> | null = null;
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/scheduled-work-health`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    const parsed = response.ok ? ptScheduledWorkHealthSchema.safeParse(await response.json().catch(() => null)) : null;
    if (parsed?.success) workHealth = parsed.data;
  } catch { /* Render an honest unavailable state. */ }
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><h1>PT Session Oversight &amp; Analytics</h1><p>Monitor PT sessions across all personal trainers and track session outcomes.</p></div>
      <a className="ui-button ui-button-primary" href={`/gyms/${encodeURIComponent(slug)}/owner/sessions/book`}>＋ Book PT Session</a></div>
    <Card id="owner-attention"><CardHeader eyebrow="OWNER ATTENTION" title={attention?.success ? `${attention.data.totalCount} sessions need review` : 'Session review unavailable'}/>
      <p>Past sessions that were not started, sessions still active after their booked end, pending requests awaiting expiry processing, and restored credits needing an expiry remedy. Open a booking to review its history and the available recovery options.</p>
      {attention?.success ? <>{attention.data.items.length ? <ul>{attention.data.items.map(({ session: item, reason }) => <li key={item.id}><a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(item.id)}`}>{item.memberName} with {item.trainerName}</a> · {new Intl.DateTimeFormat('en-GB', { timeZone: item.gymTimeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.scheduledStartAt))} · {reason === 'CREDIT_REMEDY_REQUIRED' ? 'Released credit needs expiry remedy' : reason === 'REQUEST_EXPIRED' ? 'Request deadline passed' : reason === 'ACTIVE_PAST_END' ? 'Still in progress after booked end' : 'Booked end passed without a start'}</li>)}</ul> : <p>No unresolved sessions found.</p>}<nav aria-label="Owner attention pages">{attention.data.page > 1 ? <a className="ui-button ui-button-secondary" href={attentionHref(attention.data.page - 1)}>Previous reviews</a> : null}{attention.data.page < attention.data.totalPages ? <a className="ui-button ui-button-secondary" href={attentionHref(attention.data.page + 1)}>More reviews</a> : null}</nav></> : <p role="alert">The attention queue could not be loaded. Refresh to retry.</p>}
    </Card>
    <Card><CardHeader eyebrow="IN-APP REMINDERS" title="Scheduled work health"/>
      {workHealth ? <><p>{workHealth.enabled ? 'Runner enabled' : 'Runner disabled'} · {workHealth.expiredRequestsDue} requests awaiting expiry (oldest delay {workHealth.expiryLagSeconds}s) · {workHealth.overdue} reminders due · {workHealth.retrying} awaiting retry · Oldest delay {workHealth.lagSeconds}s · {workHealth.totalFailures} recorded failures.</p><p>Last successful pass: {workHealth.lastSuccessAt ? new Intl.DateTimeFormat('en-GB', { timeZone: loaded.data?.timeZone ?? 'UTC', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(workHealth.lastSuccessAt)) : 'No successful pass recorded'}.</p>{workHealth.lastError || !workHealth.enabled || !workHealth.lastSuccessAt || Date.parse(workHealth.asOf) - Date.parse(workHealth.lastSuccessAt) > 120_000 ? <p role="status">Scheduled work needs attention. Ask the application operator to check runner logs and tenant health. Reminders appear only in the app.</p> : null}</> : <p role="status">Scheduled work health is unavailable. Refresh to retry.</p>}
    </Card>
    <nav className="finance-tabs" aria-label="Session views"><a className={`finance-tab ${calendar ? 'finance-tab-active' : ''}`} aria-current={calendar ? 'page' : undefined} href={`/gyms/${encodeURIComponent(slug)}/owner/sessions?view=calendar${loaded.filters.month ? `&month=${loaded.filters.month}` : ''}`}>Calendar</a><a className={`finance-tab ${!calendar ? 'finance-tab-active' : ''}`} aria-current={!calendar ? 'page' : undefined} href={`/gyms/${encodeURIComponent(slug)}/owner/sessions?view=list&mode=day`}>Session list</a></nav>
    <Card><CardHeader eyebrow="GYM SESSIONS" title={calendar ? 'Gym calendar' : loaded.data ? `${loaded.data.filterTotal} matching sessions` : 'Session ledger'} />
      {calendar ? loaded.data && loaded.filters.month ? <OwnerSessionCalendar slug={slug} month={loaded.filters.month} timeZone={loaded.data.timeZone} sessions={calendarItems} totalCount={loaded.data.filterTotal} complete={complete}/> : <p role="alert">The gym calendar could not be loaded. Reload to try again.</p> : <>
        {loaded.filters.mode === 'month' ? <OwnerMonthOverview slug={slug} month={loaded.filters.month ?? ''} q={loaded.filters.q} data={loaded.memberOverview} failed={loaded.overviewFailed}/> : null}
        <SessionReadView slug={slug} role="OWNER" filters={loaded.filters} data={loaded.data} loadError={loaded.failed} style={style}/>
      </>}
    </Card>
  </DashboardChrome>;
}
