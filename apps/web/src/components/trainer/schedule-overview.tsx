import { Activity, ArrowDown, ArrowUpRight, CalendarDays, ClipboardList, UsersRound } from 'lucide-react';
import type { SessionReadPage } from '@gymos/contracts';
import type { SessionReadFilters } from '@/components/sessions/read-views/session-read-view';

export function TrainerScheduleOverview({ data, filters, pendingCount, slug }: { data: SessionReadPage | null; filters: SessionReadFilters; pendingCount: number | null; slug: string }) {
  const active = data?.items.filter(item => item.state === 'ACTIVE') ?? [];
  const focus = active[0] ?? data?.items.find(item => item.state === 'SCHEDULED' && item.scheduledStartAt >= data.asOf);
  const metrics = [
    { label: 'Matching sessions', value: data?.filterTotal ?? '—', hint: 'Selected date range and filters', icon: CalendarDays },
    { label: 'In progress · this page', value: data ? active.length : '—', hint: 'Active sessions currently shown', icon: Activity },
    { label: 'Pending requests', value: pendingCount ?? '—', hint: 'Incoming requests awaiting a response', icon: ClipboardList },
  ];
  return <section className="trainer-overview" aria-label="Coaching overview">
    <div className="trainer-metrics">{metrics.map(({ label, value, hint, icon: Icon }) => <article className="trainer-metric" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><p>{hint}</p></article>)}</div>
    <div className="trainer-focus-panel"><div className="trainer-focus-copy"><span className="platform-section-icon"><UsersRound size={22}/></span><div><span className="platform-eyebrow">{focus ? focus.state === 'ACTIVE' ? 'SESSION IN PROGRESS' : 'NEXT IN THIS VIEW' : 'YOUR COACHING WORKSPACE'}</span><h2>{focus ? focus.memberName : 'Ready for your next session'}</h2><p>{focus ? <><time dateTime={focus.scheduledStartAt}>{new Intl.DateTimeFormat('en-GB', { timeZone: focus.gymTimeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(focus.scheduledStartAt))}</time> · {focus.type.replaceAll('_', ' ').toLowerCase()}</> : data ? `Review your ${filters.mode === 'day' ? 'daily' : 'monthly'} schedule below or open a client’s profile to prepare their plan.` : 'Your schedule is temporarily unavailable. You can still open your clients and requests.'}</p></div></div><a className="ui-button ui-button-secondary" href={focus ? `/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(focus.id)}` : `/gyms/${encodeURIComponent(slug)}/trainer/clients`}>{focus ? <>Go to session <ArrowDown size={16}/></> : <>View clients <ArrowUpRight size={16}/></>}</a></div>
  </section>;
}
