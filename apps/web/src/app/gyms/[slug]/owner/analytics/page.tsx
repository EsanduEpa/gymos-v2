import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { gymAnalyticsSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, EmptyState, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function OwnerAnalyticsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ window?: string }> }) {
  const { slug } = await params; const search = await searchParams;
  const window = search.window === '6m' ? '6m' : '30d';
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/analytics?window=${window}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login'); if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? gymAnalyticsSchema.safeParse(await response.json().catch(() => null)) : null;
  const data = parsed?.success ? parsed.data : null;
  const brand = resolveGymBrandColors(theme.primaryColor); const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">OWNER INSIGHTS</span><h1>Operational analytics</h1><p>{data ? `${data.timeZone} · ${data.rangeStart} to ${data.rangeEndExclusive} · as of ${data.asOf}` : 'Windowed gym metrics'}</p></div></div>
    <nav className="finance-tabs" aria-label="Analytics windows"><a className={`finance-tab ${window === '30d' ? 'finance-tab-active' : ''}`} aria-current={window === '30d' ? 'page' : undefined} href="?window=30d">30 days</a><a className={`finance-tab ${window === '6m' ? 'finance-tab-active' : ''}`} aria-current={window === '6m' ? 'page' : undefined} href="?window=6m">Six months</a></nav>
    {!data ? <Card><Feedback tone="error">Analytics are unavailable. No data is inferred from another gym or partial response.</Feedback></Card> : <div className="dashboard-grid">
      <Card><CardHeader eyebrow="CAPACITY ESTIMATE" title={data.utilization.label}/><p>{data.utilization.formula}</p>{data.utilization.points.length ? <div className="member-list">{data.utilization.points.map(point => <div className="member-row" key={point.trainerId}><div><strong>{point.trainerName}</strong><small>{point.scheduledHours} scheduled hours · {point.idleHours} estimated idle · {point.availableHours} available</small></div><span>{point.valuePercent === null ? 'Unavailable' : `${point.valuePercent}%`}</span></div>)}</div> : <EmptyState title="No active trainers to compare." hint="Trainer utilization appears when trainer profiles have operating shifts or use the documented default."/>}</Card>
      <Card><CardHeader eyebrow="PEAK SESSION HOURS" title={data.peakHours.label}/><p>{data.peakHours.formula}</p><div className="dashboard-chart">{data.peakHours.points.map(point => <div key={point.hour}><span>{String(point.hour).padStart(2, '0')}:00</span><strong>{point.averagePerDay}</strong><small>{point.sessionCount} sessions</small></div>)}</div></Card>
      <Card><CardHeader eyebrow="MEMBER GROWTH" title={data.memberGrowth.label}/><p>{data.memberGrowth.formula}</p><div className="dashboard-chart">{data.memberGrowth.points.map(point => <div key={point.month}><span>{point.month}</span><strong>{point.count}</strong><small>profiles</small></div>)}</div></Card>
    </div>}
  </DashboardChrome>;
}
