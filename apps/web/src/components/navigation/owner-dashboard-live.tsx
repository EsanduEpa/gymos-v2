'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LatestRequestSequence, type OwnerDashboard } from '@gymos/contracts';
import { loadOwnerDashboard } from '@/app/dashboard-actions';

type Data = OwnerDashboard;
export function OwnerDashboardLive({ slug, initial }: { slug: string; initial: Data | null }) {
  const [data, setData] = useState(initial); const [error, setError] = useState(false);
  const sequence = useRef(new LatestRequestSequence());
  const refresh = useCallback(async () => {
    const id = sequence.current.begin(); const result = await loadOwnerDashboard(slug);
    if (!sequence.current.isCurrent(id)) return;
    if (!result.unavailable) setData(result.data as Data | null); setError(result.unavailable);
  }, [slug]);
  useEffect(() => { const requestSequence = sequence.current; requestSequence.invalidate(); const timer = window.setInterval(() => { void refresh(); }, 30_000); return () => { window.clearInterval(timer); requestSequence.invalidate(); }; }, [refresh]);
  return <section className="owner-dashboard-live" aria-label="Live gym dashboard">
    <div className="owner-live-toolbar"><span>{data ? `As of ${new Date(data.asOf).toLocaleTimeString([], { timeZone: data.timeZone })} · ${data.timeZone}` : 'Dashboard data unavailable'}</span><button type="button" className="ui-button ui-button-secondary" onClick={() => void refresh()}>Refresh Live Status</button></div>
    {error && <p role="status">Dashboard data could not be refreshed. The last loaded values are shown.</p>}
    {!data ? <p>Dashboard data is temporarily unavailable.</p> : <>
      <div className="dashboard-metrics">{([['Members in Gym', data.metrics.membersInGym], ['Active Sessions', data.metrics.activeSessions], ["Today’s Revenue", data.metrics.todayOperationalEarning], ['Trainers on Floor', data.metrics.trainersOnFloor]] as const).map(([label, metric]) => <article className="dashboard-metric" key={label} title={metric.definition}><span>{label}</span><strong>{'currency' in metric ? `${metric.currency} ${metric.value}` : metric.value}</strong></article>)}</div>
      <article className="dashboard-chart-card"><header><h2>Today’s Revenue Stream</h2><p>Recognized operational earnings by two-hour window · gym local time.</p><p className="ui-field-hint">Operational earnings are not cash received.</p></header><ol className="dashboard-bars" aria-label={`Operational earnings by two-hour window, ${data.timeZone}`}>
        {data.earningChart.map(bucket => { const maximum = Math.max(1, ...data.earningChart.map(item => Number(item.amount))); const height = Math.max(3, Number(bucket.amount) / maximum * 100); return <li key={bucket.startHour}><span className="dashboard-bar-value">{bucket.amount}</span><span className="dashboard-bar-track"><span className="dashboard-bar" style={{ height: `${height}%` }}/></span><span className="dashboard-bar-label">{String(bucket.startHour).padStart(2, '0')}:00</span></li>; })}
      </ol></article>
      <article className="dashboard-sessions-card"><header><div><h2>Today’s Scheduled PT Sessions</h2><p>Sessions scheduled across gym trainers today.</p></div><a href={`/gyms/${encodeURIComponent(slug)}/owner/sessions`}>View all sessions</a></header>
        {data.sessions.length ? <div className="ui-table-shell"><div className="ui-table-scroll"><table aria-label="Today's scheduled PT sessions"><thead><tr><th>Time</th><th>Member</th><th>Trainer</th><th>Status</th><th>Fee</th></tr></thead><tbody>{data.sessions.map(session => <tr key={session.id}><td>{new Date(session.scheduledStartAt).toLocaleTimeString([], { timeZone: data.timeZone, hour: '2-digit', minute: '2-digit' })}</td><td>{session.memberName}</td><td>{session.trainerName}</td><td>{session.state.replaceAll('_', ' ')}</td><td>{session.currency} {session.fee}</td></tr>)}</tbody></table></div></div> : <p>No sessions scheduled today.</p>}
      </article>
      <section className="dashboard-trainer-roster" aria-labelledby="dashboard-trainer-heading"><h2 id="dashboard-trainer-heading">Trainer Floor Status &amp; Roster</h2>{data.trainerCards.length ? <div className="dashboard-trainer-grid">{data.trainerCards.map(trainer => <article className="dashboard-trainer-card" key={trainer.id}><div><strong>{trainer.name}</strong><span className={trainer.activeToday ? 'is-on-floor' : ''}>{trainer.activeToday ? 'In session' : 'Off duty'}</span></div><dl><div><dt>Sessions today</dt><dd>{trainer.scheduledToday}</dd></div><div><dt>Active now</dt><dd>{trainer.activeToday ? 'Yes' : 'No'}</dd></div></dl></article>)}</div> : <p>No trainers scheduled today.</p>}</section>
    </>}
  </section>;
}
