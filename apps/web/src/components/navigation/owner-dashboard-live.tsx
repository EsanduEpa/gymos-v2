'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, CircleDollarSign, Clock3, Dumbbell, RefreshCw, UserPlus, UsersRound } from 'lucide-react';
import { LatestRequestSequence, type OwnerDashboard } from '@gymos/contracts';
import { loadOwnerDashboard } from '@/app/dashboard-actions';
import { EmptyState, Feedback, StatusBadge } from '@/components/ui';

type Data = OwnerDashboard;
function money(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return `${BigInt(whole!).toLocaleString('en-US')}.${fraction.padEnd(2, '0').replace(/0+$/, '').padEnd(2, '0')}`;
}

export function OwnerDashboardLive({ slug, initial }: { slug: string; initial: Data | null }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const sequence = useRef(new LatestRequestSequence());
  const refresh = useCallback(async () => {
    const id = sequence.current.begin();
    setPending(true);
    try {
      const result = await loadOwnerDashboard(slug);
      if (!sequence.current.isCurrent(id)) return;
      if (!result.unavailable) setData(result.data as Data | null);
      setError(result.unavailable);
    } catch {
      if (sequence.current.isCurrent(id)) setError(true);
    } finally {
      if (sequence.current.isCurrent(id)) setPending(false);
    }
  }, [slug]);
  useEffect(() => {
    const requestSequence = sequence.current;
    requestSequence.invalidate();
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    return () => { window.clearInterval(timer); requestSequence.invalidate(); };
  }, [refresh]);
  const base = `/gyms/${encodeURIComponent(slug)}/owner`;
  const metrics = data ? [
    { label: 'Active PT sessions today', metric: data.metrics.membersInGym, hint: 'Scheduled today · currently active', icon: Activity },
    { label: 'Active PT sessions', metric: data.metrics.activeSessions, hint: 'Currently active · all dates', icon: CalendarDays },
    { label: 'Today’s operational earnings', metric: data.metrics.todayOperationalEarning, hint: 'Recognized value · not cash received', icon: CircleDollarSign },
    { label: 'Trainers scheduled today', metric: data.metrics.trainersOnFloor, hint: 'With a PT session scheduled today', icon: Dumbbell },
  ] : [];
  const maximum = Math.max(1, ...(data?.earningChart.map(item => Number(item.amount)) ?? []));
  return <section className="owner-dashboard-live" aria-label="Live gym dashboard" aria-busy={pending}>
    <div className="owner-live-toolbar"><div><span className="owner-live-dot" aria-hidden="true"/><span>{data ? <>Updated <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleTimeString('en-GB', { timeZone: data.timeZone, hour: '2-digit', minute: '2-digit' })}</time> · {data.timeZone}</> : 'Dashboard data unavailable'}</span></div><button type="button" className="ui-button ui-button-secondary" onClick={() => void refresh()} disabled={pending}><RefreshCw size={15}/>{pending ? 'Refreshing…' : 'Refresh live status'}</button></div>
    {error && <Feedback tone="error">{data ? 'The dashboard could not be refreshed. The last loaded values remain visible; try refreshing again.' : 'The dashboard could not be refreshed. Please try again shortly.'}</Feedback>}
    {!data ? <div className="ui-card"><EmptyState title="Your dashboard is temporarily unavailable." hint="Refresh to try again. You can still use the sidebar to manage your gym."/></div> : <>
      <div className="dashboard-metrics" aria-label="Gym metrics">{metrics.map(({ label, metric, hint, icon: Icon }) => <article className="dashboard-metric" key={label} title={metric.definition}><div><span>{label}</span><Icon size={19}/></div><strong>{'currency' in metric ? <><small>{metric.currency}</small> {money(metric.value)}</> : metric.value}</strong><p>{hint}</p><details className="owner-metric-definition"><summary>How this is calculated</summary><p>{metric.definition}</p></details></article>)}</div>
      <div className="owner-overview-grid">
        <article className="dashboard-chart-card"><header><div><span className="platform-eyebrow">EARNINGS OVERVIEW</span><h2>Today’s operational earnings</h2><p>Recognized value by two-hour window · {data.currency} · gym local time.</p></div><a href={`${base}/financials`} className="platform-text-link">Financials <ArrowUpRight size={16}/></a></header>
          <ol className="dashboard-bars" aria-label={`Operational earnings by two-hour window, ${data.timeZone}`}>
            {data.earningChart.map(bucket => <li key={bucket.startHour}><span className="dashboard-bar-value">{money(bucket.amount)}</span><span className="dashboard-bar-track" aria-hidden="true"><span className="dashboard-bar" style={{ height: `${Number(bucket.amount) / maximum * 100}%` }}/></span><span className="dashboard-bar-label">{String(bucket.startHour).padStart(2, '0')}:00<span className="owner-chart-end">–{String(bucket.endHour).padStart(2, '0')}:00</span></span></li>)}
          </ol><p className="owner-chart-footnote">Operational earnings are not cash received. This chart covers 06:00–22:00; the daily total includes the full day.</p>
        </article>
        <aside className="owner-quick-panel" aria-labelledby="owner-quick-heading"><span className="platform-eyebrow">DAILY WORKSPACE</span><h2 id="owner-quick-heading">Keep your gym moving</h2><div className="owner-request-summary"><span className="platform-section-icon"><Clock3 size={20}/></span><div><strong>{data.metrics.pendingRequests.value} pending PT {data.metrics.pendingRequests.value === 1 ? 'request' : 'requests'}</strong><p>Sessions awaiting confirmation.</p></div></div><div className="owner-quick-actions"><a href={`${base}/members/new`}><UserPlus size={18}/><span>Register a member</span><ArrowUpRight size={15}/></a><a href={`${base}/trainers/new`}><Dumbbell size={18}/><span>Add a trainer</span><ArrowUpRight size={15}/></a><a href={`${base}/sessions/book`}><CalendarDays size={18}/><span>Book a PT session</span><ArrowUpRight size={15}/></a></div><a href={`${base}/sessions`} className="platform-text-link">Review sessions <ArrowUpRight size={16}/></a></aside>
      </div>
      <article className="dashboard-sessions-card"><header><div><span className="platform-eyebrow">LIVE PT</span><h2>Sessions in progress</h2><p>Every currently active session across your gym’s trainers, including sessions scheduled on earlier dates.</p></div></header>
        {data.activeSessionItems.length ? <div className="ui-table-shell"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="All active PT sessions"><table aria-label="All active PT sessions"><thead><tr><th>Started</th><th>Member</th><th>Trainer</th></tr></thead><tbody>{data.activeSessionItems.map(session => <tr key={session.id}><td><time dateTime={session.startedAt}>{new Date(session.startedAt).toLocaleString('en-GB', { timeZone: data.timeZone, dateStyle: 'medium', timeStyle: 'short' })}</time></td><td><a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(session.id)}`}>{session.memberName}</a></td><td>{session.trainerName}</td></tr>)}</tbody></table></div></div> : <EmptyState title="No sessions in progress." hint="Active PT sessions across all scheduled dates will appear here."/>}
      </article>
      <article className="dashboard-sessions-card"><header><div><span className="platform-eyebrow">TODAY’S SCHEDULE</span><h2>Scheduled PT sessions</h2><p>Across your gym’s trainers · {data.timeZone}.</p></div><a href={`${base}/sessions`} className="platform-text-link">View all sessions <ArrowUpRight size={16}/></a></header>
        {data.sessions.length ? <div className="ui-table-shell"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Today's scheduled PT sessions"><table aria-label="Today's scheduled PT sessions"><thead><tr><th>Time</th><th>Member</th><th>Trainer</th><th>Status</th><th>Fee</th></tr></thead><tbody>{data.sessions.map(session => <tr key={session.id}><td><time dateTime={session.scheduledStartAt}>{new Date(session.scheduledStartAt).toLocaleTimeString('en-GB', { timeZone: data.timeZone, hour: '2-digit', minute: '2-digit' })}</time></td><td><a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(session.id)}`}>{session.memberName}</a></td><td>{session.trainerName}</td><td><StatusBadge status={session.state}/></td><td>{session.currency} {money(session.fee)}</td></tr>)}</tbody></table></div></div> : <EmptyState title="No PT sessions scheduled today." hint="Book a session to add it to your gym’s schedule."/>}
      </article>
      <section className="dashboard-trainer-roster" aria-labelledby="dashboard-trainer-heading"><div className="owner-section-heading"><div><span className="platform-eyebrow">YOUR TEAM</span><h2 id="dashboard-trainer-heading">Today’s trainer roster</h2><p>Scheduled sessions and current session activity.</p></div><a href={`${base}/trainers`} className="platform-text-link">View trainers <ArrowUpRight size={16}/></a></div>{data.trainerCards.length ? <div className="dashboard-trainer-grid">{data.trainerCards.map(trainer => <article className="dashboard-trainer-card" key={trainer.id}><div><span className="owner-trainer-avatar" aria-hidden="true"><UsersRound size={19}/></span><a href={`${base}/trainers/${encodeURIComponent(trainer.id)}`}>{trainer.name}</a><span className={trainer.activeToday ? 'is-on-floor' : ''}>{trainer.activeToday ? 'In session' : 'No active session'}</span></div><dl><div><dt>Sessions today</dt><dd>{trainer.scheduledToday}</dd></div><div><dt>Active now</dt><dd>{trainer.activeToday ? 'Yes' : 'No'}</dd></div></dl></article>)}</div> : <div className="ui-card"><EmptyState title="No trainers scheduled today." hint="Your trainer roster appears here when PT sessions are scheduled."/></div>}</section>
    </>}
  </section>;
}
