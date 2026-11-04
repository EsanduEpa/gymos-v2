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
    <div className="gym-banner"><div><h1>Operational Analytics</h1><p>Insights on trainer utilisation, member peak hours, and signup growth.</p></div></div>
    <nav className="finance-tabs" aria-label="Analytics windows"><a className={`finance-tab ${window === '30d' ? 'finance-tab-active' : ''}`} aria-current={window === '30d' ? 'page' : undefined} href="?window=30d">30 days</a><a className={`finance-tab ${window === '6m' ? 'finance-tab-active' : ''}`} aria-current={window === '6m' ? 'page' : undefined} href="?window=6m">Six months</a></nav>
    {!data ? <Card><Feedback tone="error">Analytics are unavailable. No data is inferred from another gym or partial response.</Feedback></Card> : <div className="dashboard-grid">
      <Card><CardHeader eyebrow="CAPACITY ESTIMATE" title={data.utilization.label}/><p className="owner-analytics-method">{data.utilization.formula}</p>{data.utilization.points.length ? <div className="owner-utilization-chart">{data.utilization.points.map(point => <div className="owner-utilization-row" key={point.trainerId}><span>{point.trainerName}</span><div className="owner-utilization-track" aria-label={`${point.valuePercent ?? 'Unavailable'} percent estimated utilization`}><i style={{ width: `${point.valuePercent ?? 0}%` }}/></div><strong>{point.valuePercent === null ? 'Unavailable' : `${point.valuePercent}%`}</strong><small>{point.scheduledHours} scheduled h · {point.idleHours} estimated idle h · {point.availableHours} available h</small></div>)}</div> : <EmptyState title="No active trainers to compare." hint="Trainer utilization appears when trainer profiles have operating shifts or use the documented default."/>}</Card>
      <Card><CardHeader eyebrow="PEAK SESSION HOURS" title={data.peakHours.label}/><p className="owner-analytics-method">{data.peakHours.formula}</p><div className="owner-analytics-bars" role="img" aria-label="Average sessions by gym-local hour; exact values are listed below">{data.peakHours.points.map(point => { const max = Math.max(1, ...data.peakHours.points.map(value => value.averagePerDay)); return <div key={point.hour}><b>{point.averagePerDay}</b><i style={{ height: `${Math.max(2, point.averagePerDay / max * 100)}%` }}/><small>{String(point.hour).padStart(2, '0')}</small></div>; })}</div><p className="owner-analytics-sr-only">{data.peakHours.points.map(point => `${String(point.hour).padStart(2, '0')}:00, ${point.averagePerDay} average per day; `)}</p></Card>
      <Card><CardHeader eyebrow="MEMBER GROWTH" title={data.memberGrowth.label}/><p className="owner-analytics-method">{data.memberGrowth.formula}</p><div className="owner-analytics-bars owner-growth-chart" role="img" aria-label="Member profiles created by month; exact values are listed below">{data.memberGrowth.points.map(point => { const max = Math.max(1, ...data.memberGrowth.points.map(value => value.count)); return <div key={point.month}><b>{point.count}</b><i style={{ height: `${Math.max(2, point.count / max * 100)}%` }}/><small>{point.month}</small></div>; })}</div><p className="owner-analytics-sr-only">{data.memberGrowth.points.map(point => `${point.month}, ${point.count} profiles; `)}</p></Card>
    </div>}
  </DashboardChrome>;
}
