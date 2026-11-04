import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerEarningsSchema } from '@gymos/contracts';
import { Card, CardHeader, EmptyState, Feedback } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function monthBounds(month: string) {
  const [year, value] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year!, value!, 0)).toISOString().slice(0, 10);
  return { from: `${month}-01`, to: last };
}

export default async function TrainerEarningsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string; page?: string }>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month ?? '') ? filters.month! : currentMonth();
  const page = /^[1-9]\d{0,5}$/.test(filters.page ?? '') ? Number(filters.page) : 1;
  const { from, to } = monthBounds(month);
  const query = new URLSearchParams({ from, to, page: String(page), pageSize: '25' });
  let response: Response | null = null;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/earnings?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { /* Render an explicit unavailable state. */ }
  if (response?.status === 401) redirect('/login');
  if (response?.status === 403 || response?.status === 404) notFound();
  const parsed = response?.ok ? trainerEarningsSchema.safeParse(await response.json().catch(() => null)) : null;
  const data = parsed?.success ? parsed.data : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as React.CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER EARNINGS</span><h1>My earnings</h1><p>Approved session earnings from completed work. Approval does not mean payout; no money received is reported here.</p></div></div>
    <Card><CardHeader eyebrow="PERIOD" title="Earnings summary" />
      <form method="get" className="member-directory-filters"><label className="ui-field"><span className="ui-field-label">Month</span><input name="month" type="month" defaultValue={month}/></label><button className="ui-button ui-button-secondary">Apply</button></form>
      {data ? <><p><strong>{data.total} {data.currency}</strong> · {data.totalCount} earned sessions · {data.from} to {data.to} · as of {data.asOf}</p>
        {data.currentPeriod ? <p>Current pay period: {data.currentPeriod.start}–{data.currentPeriod.endExclusive} · {data.currentPeriod.state} · {data.currentPeriod.total} {data.currency}</p> : <p>No current pay period has been created by a completed session.</p>}
        {data.lines.length ? <div className="member-list">{data.lines.map(line => <div className="member-row" key={line.id}><div><strong>{line.scheduledStartAt.slice(0, 10)}</strong><small>Session {line.sessionId} · {line.periodState}</small></div><span>{line.amount} {line.currency}</span></div>)}</div> : <EmptyState title="No earnings in this month." hint="Trainer earnings are recorded when an eligible session is completed."/>}
        <div className="ui-pager"><span>Page {data.page} · {data.totalCount} matching sessions</span><div>{data.page > 1 ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ month, page: String(data.page - 1) })}`}>Previous</a> : null}{data.page * data.pageSize < data.totalCount ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ month, page: String(data.page + 1) })}`}>Next</a> : null}</div></div>
      </> : <Feedback tone="error">Earnings are temporarily unavailable. No financial state was changed. Reload to try again.</Feedback>}
    </Card>
  </DashboardChrome>;
}
