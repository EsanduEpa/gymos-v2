import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { configurationReadSchema, trainerEarningsSchema } from '@gymos/contracts';
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
function averagePerSession(total: string, count: number) {
  if (!count) return '0.0000';
  const [whole, fraction = ''] = total.split('.');
  const units = BigInt(whole!) * BigInt(10000) + BigInt(fraction.padEnd(4, '0'));
  const average = (units + BigInt(Math.floor(count / 2))) / BigInt(count);
  return `${average / BigInt(10000)}.${String(average % BigInt(10000)).padStart(4, '0')}`;
}
function formatMoney(amount: string, currency: string) {
  const [whole, fraction = ''] = amount.split('.');
  return `${currency} ${BigInt(whole!).toLocaleString('en-US')}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
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
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403 || response?.status === 404) notFound();
  const [parsed, configurationResponse] = await Promise.all([
    response?.ok ? response.json().catch(() => null).then(value => trainerEarningsSchema.safeParse(value)) : Promise.resolve(null),
    fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/configuration`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null),
  ]);
  if (configurationResponse?.status === 401) redirect('/login?error=expired');
  const configuration = configurationResponse?.ok
    ? configurationReadSchema.safeParse(await configurationResponse.json().catch(() => null)) : null;
  const earningsTimeZone = configuration?.success ? configuration.data.configuration.timezone : 'UTC';
  const data = parsed?.success ? parsed.data : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as React.CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER EARNINGS</span><h1>Trainer Earnings Portal</h1><p>Operational earnings from eligible completed sessions. These records do not report payment or payout.</p></div></div>
    {data ? <div className="trainer-earnings-metrics" aria-label="Earnings summary">
      <Card><CardHeader eyebrow="TOTAL EARNINGS" title={formatMoney(data.total, data.currency)}/><p>Operational earnings</p></Card>
      <Card><CardHeader eyebrow="ELIGIBLE PT SESSIONS" title={String(data.totalCount)}/></Card>
      <Card><CardHeader eyebrow="AVERAGE PER SESSION" title={formatMoney(averagePerSession(data.total, data.totalCount), data.currency)}/></Card>
    </div> : null}
    <Card><CardHeader eyebrow="ITEMIZED EARNINGS" title="Earnings summary" />
      <form method="get" className="member-directory-filters"><label className="ui-field"><span className="ui-field-label">Month</span><input name="month" type="month" defaultValue={month}/></label><button className="ui-button ui-button-secondary">Apply</button></form>
      {data ? <><p><strong>{formatMoney(data.total, data.currency)}</strong> · {data.totalCount} earned sessions · {data.from} to {data.to} · as of {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: earningsTimeZone }).format(new Date(data.asOf))}</p>
        {data.currentPeriod ? <p>Current pay period: {data.currentPeriod.start}–{data.currentPeriod.endExclusive} · {data.currentPeriod.state} · {formatMoney(data.currentPeriod.total, data.currency)}</p> : <p>No current pay period has been created by a completed session.</p>}
        {data.lines.length ? <div className="member-list">{data.lines.map(line => <div className="member-row" key={line.id}><div><strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: earningsTimeZone }).format(new Date(line.scheduledStartAt))}</strong><small>Session {line.sessionId} · payroll status {line.periodState.toLowerCase()}</small></div><span>{formatMoney(line.amount, line.currency)}</span></div>)}</div> : <EmptyState title="No earnings in this period." hint="Trainer earnings are recorded when an eligible session is completed."/>}
        <div className="ui-pager"><span>Page {data.page} · {data.totalCount} matching sessions</span><div>{data.page > 1 ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ month, page: String(data.page - 1) })}`}>Previous</a> : null}{data.page * data.pageSize < data.totalCount ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ month, page: String(data.page + 1) })}`}>Next</a> : null}</div></div>
      </> : <Feedback tone="error">Earnings are temporarily unavailable. No financial state was changed. Reload to try again.</Feedback>}
    </Card>
  </DashboardChrome>;
}
