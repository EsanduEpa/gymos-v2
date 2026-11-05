import { Activity, Building2, UsersRound, Dumbbell, ShieldCheck, ArrowUpRight, AlertCircle } from 'lucide-react';
import type { platformAnalyticsSummarySchema } from '@gymos/contracts/platform';
import { Feedback } from '@/components/ui';
import { RefreshSummaries } from './refresh-summaries';

type Summary = typeof platformAnalyticsSummarySchema._output;

export function PlatformOverview({ total, summary, cursor }: { total: number; summary: Summary | null; cursor?: string }) {
  const metrics = [
    { label: 'Total gyms', value: total, hint: 'Registered workspaces', icon: Building2 },
    { label: 'Active gyms', value: summary?.activeGyms ?? '—', hint: 'Enabled for gym operations', icon: Activity },
    { label: 'Member profiles', value: summary?.memberCount ?? '—', hint: summary?.partial ? 'Awaiting a complete summary' : 'Across verified workspaces', icon: UsersRound },
    { label: 'Trainer profiles', value: summary?.trainerCount ?? '—', hint: summary?.partial ? 'Awaiting a complete summary' : 'Across verified workspaces', icon: Dumbbell },
  ];
  return <>
    <section className="platform-metrics" aria-label="Platform metrics">
      {metrics.map(({ label, value, hint, icon: Icon }) => <article className="platform-metric" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{typeof value === 'number' ? value.toLocaleString('en-US') : value}</strong><p>{hint}</p></article>)}
    </section>
    <section className="platform-health" aria-labelledby="platform-health-heading">
      <div className="platform-health-heading"><span className="platform-section-icon"><ShieldCheck size={21}/></span><div><h2 id="platform-health-heading">Workspace health</h2><p>Verified summaries help keep your platform overview reliable.</p></div><a href="#gym-registry" className="platform-text-link">View gyms <ArrowUpRight size={16}/></a></div>
      {summary ? <>
        <div className="platform-health-body"><div className="platform-health-counts"><div><i className="health-dot is-success"/><span>Verified & current</span><strong>{summary.verifiedGyms}</strong></div><div><i className="health-dot is-warning"/><span>Stale summaries</span><strong>{summary.staleGyms}</strong></div><div><i className="health-dot is-muted"/><span>Unavailable, including stale</span><strong>{summary.unavailableGyms}</strong></div></div>
          <div className="platform-freshness"><span className={`platform-health-tag ${summary.partial ? 'is-warning' : ''}`}>{summary.partial ? <AlertCircle size={14}/> : <ShieldCheck size={14}/>} {summary.partial ? 'Summary needs attention' : 'Summaries are current'}</span><p>{summary.partial ? 'Profile totals are withheld until every eligible gym has a current, verified summary.' : `Profile counts use verified summaries from the last ${Math.round(summary.freshnessSeconds / 60)} minutes.`}</p><small>Snapshot <time dateTime={summary.asOf}>{new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(summary.asOf))} UTC</time></small></div>
        </div>
      </> : <Feedback tone="info">The aggregate summary is unavailable. You can still manage gyms from the registry below.</Feedback>}
      <RefreshSummaries cursor={cursor}/>
    </section>
  </>;
}
