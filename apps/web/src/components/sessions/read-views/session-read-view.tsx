import type { CSSProperties } from 'react';
import { StatusBadge } from '@/components/ui';
import { SessionLifecycleControls } from '@/components/sessions/session-lifecycle-controls';
import { SessionPolicyControls } from './session-policy-controls';
import { ElapsedSessionClock } from './elapsed-session-clock';
import { SessionReadRefresh } from './session-read-refresh';
import styles from './session-read-view.module.css';
import { sessionReadStateSchema } from '@gymos/contracts';
import type { SessionReadPage, SessionReadState } from '@gymos/contracts';

type Page = SessionReadPage;
type Session = Page['items'][number];
type Role = 'OWNER' | 'TRAINER' | 'MEMBER';
type Filters = { date?: string; month?: string; state?: string; q?: string; memberId?: string; page: number; pageSize: number; mode: 'day' | 'month' };
type StateCount = { state: SessionReadState; totalCount: number };

const stateLabels: Record<Session['state'], string> = {
  PENDING_CONFIRMATION: 'Pending', SCHEDULED: 'Scheduled', ACTIVE: 'In progress', COMPLETED: 'Completed', MISSED: 'No show', CANCELLED: 'Cancelled', DECLINED: 'Declined',
};
const actionLabels: Record<Session['commandAffordances'][number], string> = {
  ACCEPT: 'Accept request', DECLINE: 'Decline request', START: 'Start session', UPDATE_NOTES: 'Edit session notes', CANCEL: 'Cancel session', WITHDRAW: 'Withdraw request', NO_SHOW: 'Mark no-show', COMPLETE: 'Complete session',
};

function addLocalDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function dateForZone(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function monthForZone(instant: string, timeZone: string) { return dateForZone(instant, timeZone).slice(0, 7); }
function moveMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function dateLabel(value: string, timeZone: string, includeZone = false) {
  const options: Intl.DateTimeFormatOptions = includeZone
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone }
    : { dateStyle: 'medium', timeStyle: 'short', timeZone };
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}
function href(slug: string, role: Role, filters: Filters, overrides: Partial<Filters> = {}) {
  const path = role === 'OWNER' ? 'owner/sessions' : role === 'TRAINER' ? 'trainer/schedule' : 'member/sessions';
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  params.set('mode', next.mode); params.set('page', String(next.page)); params.set('pageSize', String(next.pageSize));
  if (next.date) params.set('date', next.date);
  if (next.month) params.set('month', next.month);
  if (next.state) params.set('state', next.state);
  if (next.q) params.set('q', next.q);
  if (next.memberId) params.set('memberId', next.memberId);
  return `/gyms/${encodeURIComponent(slug)}/${path}?${params}`;
}
function noQueryUrl(slug: string, role: Role, filters: Filters) {
  return href(slug, role, filters);
}
function Affordances({ session, role }: { session: Session; role: Role }) {
  if (role === 'TRAINER') return null;
  const supported = role === 'OWNER' ? ['CANCEL', 'NO_SHOW'] : ['CANCEL', 'WITHDRAW'];
  const unavailable = session.commandAffordances.filter(action => !supported.includes(action));
  if (unavailable.length === 0) return null;
  return <p className={styles.affordance} aria-label="Session actions">
    Available by session policy: {unavailable.map(action => actionLabels[action]).join(', ')}. These session commands are not available on this view yet.
  </p>;
}
function SessionCard({ session, role, slug }: { session: Session; role: Role; slug: string }) {
  const counterpart = role === 'MEMBER' ? `Trainer: ${session.trainerName}` : `Member: ${session.memberName}`;
  const duration = Math.max(0, Math.round((new Date(session.scheduledEndAt).getTime() - new Date(session.scheduledStartAt).getTime()) / 60_000));
  const content = <>
    <div className={styles.sessionMeta}><StatusBadge status={session.state}/><span>{session.type.replaceAll('_', ' ').toLowerCase()}</span></div>
    <h2>{counterpart}</h2>
    {role === 'TRAINER' ? <p>{duration} minutes{session.trainerPay !== null ? ` · Trainer earning: ${session.currency ?? ''} ${session.trainerPay}` : ''}</p> : <p><time dateTime={session.scheduledStartAt}>{dateLabel(session.scheduledStartAt, session.gymTimeZone, true)}</time><br/>{duration} minutes</p>}
    {session.state === 'ACTIVE' && session.startedAt && role === 'TRAINER' ? <ElapsedSessionClock startedAt={session.startedAt}/> : null}
    {session.fee !== null && session.currency ? <p>Session fee: {session.currency} {session.fee}</p> : null}
    {role !== 'TRAINER' && session.trainerPay !== null ? <p>Trainer earning: {session.currency ?? ''} {session.trainerPay}</p> : null}
    {session.notes ? <p className={styles.sessionNotes}><strong>Session notes</strong><br/>{session.notes}</p> : null}
    {role === 'MEMBER' && session.state === 'DECLINED' && session.declineReason ? <p className={styles.sessionNotes}><strong>Trainer’s reason</strong><br/>{session.declineReason}</p> : null}
    {role === 'TRAINER' ? <SessionLifecycleControls slug={slug} session={session}/> : null}
    <SessionPolicyControls slug={slug} session={session} role={role}/>
    <Affordances session={session} role={role}/>
  </>;
  return <article id={`session-${session.id}`} tabIndex={-1} className={`${styles.sessionCard} ${role === 'TRAINER' ? 'trainer-session-card' : ''}`}>
    {role === 'TRAINER' ? <div className="trainer-session-date"><strong><time dateTime={session.scheduledStartAt}>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: session.gymTimeZone }).format(new Date(session.scheduledStartAt))}</time></strong><small>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: session.gymTimeZone }).format(new Date(session.scheduledStartAt))}</small></div> : null}
    <div className={role === 'TRAINER' ? 'trainer-session-content' : undefined}>{content}</div>
  </article>;
}
function OwnerTable({ items, slug }: { items: Session[]; slug: string }) {
  return <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Session table"><table className={styles.table} aria-label="Gym session ledger">
    <thead><tr><th>Session</th><th>Member</th><th>Trainer</th><th>Status</th><th>Fee</th><th>Notes and available actions</th></tr></thead>
    <tbody>{items.map(session => <tr key={session.id}>
      <td><time dateTime={session.scheduledStartAt}>{dateLabel(session.scheduledStartAt, session.gymTimeZone, true)}</time><small>{Math.round((new Date(session.scheduledEndAt).getTime() - new Date(session.scheduledStartAt).getTime()) / 60_000)} min · {session.type.replaceAll('_', ' ').toLowerCase()}</small></td>
      <td>{session.memberName}</td><td>{session.trainerName}</td><td><StatusBadge status={session.state}/></td>
      <td>{session.currency ?? ''} {session.fee ?? '—'}</td><td>{session.notes ? <small>{session.notes}</small> : <small>No session notes</small>}
        <SessionPolicyControls slug={slug} session={session} role="OWNER"/><Affordances session={session} role="OWNER"/></td>
    </tr>)}</tbody>
  </table></div>;
}

export function SessionReadView({ slug, role, filters, data, stateCounts = [], countsFailed = false, loadError, style }: {
  slug: string; role: Role; filters: Filters; data: Page | null; stateCounts?: StateCount[]; countsFailed?: boolean; loadError?: boolean; style?: CSSProperties;
}) {
  const today = data ? dateForZone(data.asOf, data.timeZone) : filters.date ?? new Date().toISOString().slice(0, 10);
  const selectedDay = filters.date ?? today;
  const selectedMonth = filters.month ?? (data ? monthForZone(data.asOf, data.timeZone) : today.slice(0, 7));
  const mode = filters.mode;
  const retry = noQueryUrl(slug, role, filters);
  const states = sessionReadStateSchema.options;
  return <section className={role === 'TRAINER' ? 'trainer-session-view' : undefined} style={style} aria-label={`${role.toLowerCase()} session view`}>
    <div className={`${styles.toolbar} ${role === 'TRAINER' ? 'trainer-session-toolbar' : ''}`}><p>Updates every 30 seconds and when you return to this tab.</p><SessionReadRefresh href={retry}/></div>
    <div className={`${styles.switcher} ${role === 'TRAINER' ? 'trainer-session-switcher' : ''}`} aria-label="Session date range">
      <a href={href(slug, role, filters, { mode: 'day', date: selectedDay, month: undefined, page: 1 })} aria-current={mode === 'day' ? 'page' : undefined}>Daily view</a>
      <a href={href(slug, role, filters, { mode: 'month', month: selectedMonth, date: undefined, page: 1 })} aria-current={mode === 'month' ? 'page' : undefined}>Monthly view</a>
    </div>
    {mode === 'day' ? <nav className={styles.toolbar} aria-label="Daily date navigation">
      <div><a className="ui-button ui-button-secondary" href={href(slug, role, filters, { date: addLocalDays(selectedDay, -1), month: undefined, page: 1 })} aria-label="Previous day">← Previous day</a>{' '}
        <a className="ui-button ui-button-secondary" href={href(slug, role, filters, { date: today, month: undefined, page: 1 })}>Today</a>{' '}
        <a className="ui-button ui-button-secondary" href={href(slug, role, filters, { date: addLocalDays(selectedDay, 1), month: undefined, page: 1 })} aria-label="Next day">Next day →</a></div>
      <p>{selectedDay} · {data?.timeZone ?? 'Gym local time'}</p>
    </nav> : <nav className={styles.toolbar} aria-label="Monthly date navigation">
      <div><a className="ui-button ui-button-secondary" href={href(slug, role, filters, { month: moveMonth(selectedMonth, -1), date: undefined, page: 1 })} aria-label="Previous month">← Previous month</a>{' '}
        <a className="ui-button ui-button-secondary" href={href(slug, role, filters, { month: moveMonth(today.slice(0, 7), 0), date: undefined, page: 1 })}>This month</a>{' '}
        <a className="ui-button ui-button-secondary" href={href(slug, role, filters, { month: moveMonth(selectedMonth, 1), date: undefined, page: 1 })} aria-label="Next month">Next month →</a></div>
      <p>{selectedMonth} · {data?.timeZone ?? 'Gym local time'}</p>
    </nav>}
    <form method="get" className={`${styles.filters} ${role === 'TRAINER' ? 'trainer-session-filters' : ''}`}>
      <input type="hidden" name="mode" value={mode}/>
      {filters.memberId ? <input type="hidden" name="memberId" value={filters.memberId}/> : null}
      {mode === 'day' ? <label>Date<input type="date" name="date" defaultValue={selectedDay}/></label> : <label>Month<input type="month" name="month" defaultValue={selectedMonth}/></label>}
      <label>Search member or trainer<input name="q" defaultValue={filters.q ?? ''} maxLength={100}/></label>
      <label>Session state<select name="state" defaultValue={filters.state ?? ''}><option value="">All states</option>{states.map(state => <option key={state} value={state}>{stateLabels[state]}</option>)}</select></label>
      <button type="submit" className="ui-button ui-button-secondary">Apply filters</button>
    </form>
    {!data || loadError ? <div className={styles.failure} role="alert"><h2>Sessions could not be loaded</h2><p>Check the connection and retry. No session changes were made.</p><a className="ui-button ui-button-secondary" href={retry}>Retry</a></div> : <>
      {role === 'MEMBER' && mode === 'month' ? <div className={styles.stateCounts} aria-label="Monthly session counts by state">
        {countsFailed ? <p role="status">Some monthly state counts are unavailable. Retry the page to refresh them.</p> : stateCounts.map(row => <div className={styles.stateCount} key={row.state}><span>{stateLabels[row.state]}</span><strong>{row.totalCount}</strong></div>)}
      </div> : null}
      {role === 'MEMBER' && data.summary.lifetimePackCredits ? <p aria-label="Lifetime pack credit totals">Lifetime pack credits · Available {data.summary.lifetimePackCredits.available} · Held {data.summary.lifetimePackCredits.held} · Consumed {data.summary.lifetimePackCredits.consumed} · Expired unused {data.summary.lifetimePackCredits.expired}</p> : null}
      {data.items.length === 0 ? <div className={styles.empty}><h2>No sessions found</h2><p>There are no sessions for this date and filter combination.</p></div> : role === 'OWNER' ? <OwnerTable items={data.items} slug={slug}/> :
        <div className={`${styles.cards} ${role === 'TRAINER' ? 'trainer-session-cards' : ''}`}>{data.items.map(session => <SessionCard key={session.id} slug={slug} session={session} role={role}/>)}</div>}
      <div className={`${styles.pager} ${role === 'TRAINER' ? 'trainer-session-pager' : ''}`}><p aria-live="polite">Page {data.page} of {Math.max(1, data.totalPages)} · {data.filterTotal} sessions match these filters · {data.asOf ? `Updated ${dateLabel(data.asOf, data.timeZone, true)}` : ''}</p>
        <div className={styles.pagerLinks}>{data.page > 1 ? <a className="ui-button ui-button-secondary" href={href(slug, role, filters, { page: data.page - 1 })}>Previous page</a> : null}
          {data.page < data.totalPages ? <a className="ui-button ui-button-secondary" href={href(slug, role, filters, { page: data.page + 1 })}>Next page</a> : null}</div>
      </div>
    </>}
  </section>;
}

export type { Filters as SessionReadFilters, StateCount as SessionStateCount };
