'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OwnerDashboard } from '@gymos/contracts';
import { loadOwnerDashboard } from '@/app/dashboard-actions';

type Data = OwnerDashboard;
export function OwnerDashboardLive({ slug, initial }: { slug: string; initial: Data | null }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    const target = slug;
    const result = await loadOwnerDashboard(target);
    if (id !== sequence.current) return;
    if (!result.unavailable) setData(result.data as Data | null);
    setError(result.unavailable);
  }, [slug]);
  useEffect(() => {
    const requestSequence = sequence;
    requestSequence.current++;
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    return () => { window.clearInterval(timer); requestSequence.current++; };
  }, [refresh]);
  return <section className="owner-dashboard-live" aria-label="Live gym dashboard">
    <div className="finance-toolbar"><span>{data ? `As of ${new Date(data.asOf).toLocaleTimeString([], { timeZone: data.timeZone })} · ${data.timeZone}` : 'Dashboard data unavailable'}</span><button type="button" className="ui-button ui-button-secondary" onClick={() => void refresh()}>Refresh now</button></div>
    {error && <p role="status">Dashboard data could not be refreshed. The last loaded values are shown.</p>}
    {!data ? <p>Dashboard data is temporarily unavailable.</p> : <>
      <div className="finance-metrics">
        {([['Members in Gym', data.metrics.membersInGym], ['Active Sessions', data.metrics.activeSessions], ['Trainers on Floor', data.metrics.trainersOnFloor], ['Today Operational Earning', data.metrics.todayOperationalEarning], ['Pending Requests', data.metrics.pendingRequests]] as const).map(([label, metric]) => <article className="finance-metric" key={label} title={metric.definition}><span>{label}</span><strong>{'currency' in metric ? `${metric.currency} ${metric.value}` : metric.value}</strong><small>{metric.definition}</small></article>)}
      </div>
      <article className="finance-panel"><h2>Operational earnings today</h2><p>Two-hour windows, 06:00–22:00 gym local time. Buckets show recognized operational earnings, not cash received.</p><div className="dashboard-chart" role="img" aria-label="Operational earnings by two-hour window">{data.earningChart.map(bucket => <div key={bucket.startHour}><span>{String(bucket.startHour).padStart(2, '0')}:00</span><strong>{bucket.amount}</strong><small>{bucket.sourceCount} records</small></div>)}</div></article>
      <div className="finance-panels"><article className="finance-panel"><h2>Today’s sessions</h2>{data.sessions.length ? <ul>{data.sessions.map(session => <li key={session.id}><strong>{new Date(session.scheduledStartAt).toLocaleTimeString([], { timeZone: data.timeZone, hour: '2-digit', minute: '2-digit' })} · {session.memberName}</strong><span>{session.trainerName} · {session.state} · {session.currency} {session.fee}</span></li>)}</ul> : <p>No sessions scheduled today.</p>}</article><article className="finance-panel"><h2>Trainers scheduled today</h2>{data.trainerCards.length ? <ul>{data.trainerCards.map(trainer => <li key={trainer.id}><strong>{trainer.name}</strong><span>{trainer.scheduledToday} scheduled sessions · {trainer.activeToday ? 'has an active session' : 'no active session'}</span></li>)}</ul> : <p>No trainers scheduled today.</p>}</article></div>
    </>}
  </section>;
}
