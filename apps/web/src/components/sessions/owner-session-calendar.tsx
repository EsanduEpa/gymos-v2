import type { SessionReadPage } from '@gymos/contracts';
import styles from './owner-session-calendar.module.css';

type Session = SessionReadPage['items'][number];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function localDate(value: string, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, number! - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function OwnerSessionCalendar({ slug, month, timeZone, sessions, totalCount, complete }: { slug: string; month: string; timeZone: string; sessions: Session[]; totalCount: number; complete: boolean }) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year!, number! - 1, 1));
  const count = new Date(Date.UTC(year!, number!, 0)).getUTCDate();
  const byDay = new Map<string, Session[]>();
  for (const session of sessions) {
    const day = localDate(session.scheduledStartAt, timeZone);
    if (!day.startsWith(`${month}-`)) continue;
    const list = byDay.get(day) ?? []; list.push(session); byDay.set(day, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt) || a.id.localeCompare(b.id));
  const base = `/gyms/${encodeURIComponent(slug)}/owner/sessions`;
  const title = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  return <section className={styles.calendar} aria-label={`Gym PT session calendar for ${title}`}>
    <nav className={styles.toolbar} aria-label="Calendar month"><div><h2>{title}</h2><p>{totalCount} PT sessions · {timeZone}</p></div><div className={styles.actions}><a className="ui-button ui-button-secondary" href={`${base}?view=calendar&month=${shiftMonth(month, -1)}`} aria-label="Previous month">←</a><a className="ui-button ui-button-secondary" href={`${base}?view=calendar`}>Today</a><a className="ui-button ui-button-secondary" href={`${base}?view=calendar&month=${shiftMonth(month, 1)}`} aria-label="Next month">→</a></div></nav>
    {!complete ? <p className="ui-feedback ui-feedback-warning" role="status">Some sessions could not be loaded. Refresh to see the full month.</p> : null}
    <div className={styles.grid}>{weekdays.map(day => <span className={styles.weekday} key={day}>{day}</span>)}
      {Array.from({ length: first.getUTCDay() }, (_, index) => <div className={styles.placeholder} aria-hidden="true" key={`lead-${index}`}/>)}
      {Array.from({ length: count }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`;
        const daySessions = byDay.get(date) ?? [];
        return <article className={styles.day} key={date}><a className={styles.dayNumber} href={`${base}?view=list&mode=day&date=${date}`}>{index + 1}<span className={styles.mobileWeekday}> {weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()]}</span></a><div className={styles.events}>{daySessions.map(session => <a key={session.id} href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(session.id)}`} className={styles.event} title={`${session.memberName} with ${session.trainerName} · ${session.state.replaceAll('_', ' ')}`}><time dateTime={session.scheduledStartAt}>{new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(session.scheduledStartAt))}</time><strong>{session.memberName}</strong><small>{session.trainerName} · {session.state.replaceAll('_', ' ').toLowerCase()}</small></a>)}</div></article>;
      })}
    </div>
  </section>;
}
