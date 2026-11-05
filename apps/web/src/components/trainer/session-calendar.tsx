'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import type { SessionReadPage, SessionReadState } from '@gymos/contracts';
import styles from '@/components/sessions/member-session-calendar.module.css';

type Session = SessionReadPage['items'][number];
const status: Record<SessionReadState, string> = {
  PENDING_CONFIRMATION: 'Needs response', SCHEDULED: 'Confirmed', ACTIVE: 'In progress', COMPLETED: 'Completed',
  MISSED: 'No show', CANCELLED: 'Cancelled', DECLINED: 'Declined',
};
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function localDate(value: string, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function localTime(value: string, zone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year!, month! - 1, 1)));
}
function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function TrainerSessionCalendar({ slug, month, today, timeZone, sessions, totalCount, partial }: {
  slug: string; month: string; today: string; timeZone: string; sessions: Session[]; totalCount: number; partial: boolean;
}) {
  const byDay = useMemo(() => {
    const grouped = new Map<string, Session[]>();
    for (const session of sessions) {
      const date = localDate(session.scheduledStartAt, timeZone);
      grouped.set(date, [...(grouped.get(date) ?? []), session]);
    }
    return grouped;
  }, [sessions, timeZone]);
  const firstAction = sessions.find(item => ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'].includes(item.state));
  const initialDay = today.startsWith(`${month}-`) ? today : firstAction ? localDate(firstAction.scheduledStartAt, timeZone) : sessions[0] ? localDate(sessions[0].scheduledStartAt, timeZone) : `${month}-01`;
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year!, monthNumber! - 1, 1)).getUTCDay() + 6) % 7;
  const cells = useMemo(() => Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day < 1 || day > daysInMonth ? null : `${month}-${String(day).padStart(2, '0')}`;
  }), [daysInMonth, month, offset]);
  function moveDay(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const current = new Date(`${date}T12:00:00Z`);
    const weekday = (current.getUTCDay() + 6) % 7;
    const day = Math.max(1, Math.min(daysInMonth, current.getUTCDate() + (step ?? (event.key === 'Home' ? -weekday : 6 - weekday))));
    const next = `${month}-${String(day).padStart(2, '0')}`;
    setSelectedDay(next);
    event.currentTarget.closest('table')?.querySelector<HTMLButtonElement>(`[data-calendar-date="${next}"]`)?.focus();
  }
  const base = `/gyms/${encodeURIComponent(slug)}/trainer`;
  const url = (value: string) => `${base}/calendar?month=${value}`;
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const selected = byDay.get(selectedDay) ?? [];
  const pending = sessions.filter(item => item.state === 'PENDING_CONFIRMATION').length;
  const toAttend = sessions.filter(item => item.state === 'SCHEDULED' || item.state === 'ACTIVE').length;
  return <div className={`${styles.calendar} trainer-session-calendar`}>
    <div className="trainer-calendar-summary" aria-label="Month summary"><span><strong>{toAttend}</strong> to attend</span><span><strong>{pending}</strong> requests to review</span><span><strong>{totalCount}</strong> total sessions</span></div>
    <div className={styles.monthBar}><a className="ui-button ui-button-secondary" href={url(previous)} aria-label={`Go to ${monthLabel(previous)}`}>‹ <span className={styles.wideLabel}>Previous month</span></a><h2 aria-live="polite">{monthLabel(month)}</h2><a className="ui-button ui-button-secondary" href={url(next)} aria-label={`Go to ${monthLabel(next)}`}><span className={styles.wideLabel}>Next month</span> ›</a></div>
    <p className={styles.timezone}>Times are shown in {timeZone}. Select a day to review your sessions and requests.</p>
    {partial ? <p className={styles.limit} role="status">Some session records could not be loaded. Open My Schedule for the full paged list.</p> : null}
    <div className={styles.layout}>
      <div className={styles.gridWrap}><table className={styles.grid} aria-label={`${monthLabel(month)} trainer calendar`}><thead><tr>{weekdays.map(day => <th key={day} scope="col"><span className={styles.weekdayLong}>{day}</span><span className={styles.weekdayShort}>{day[0]}</span></th>)}</tr></thead><tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((date, column) => {
        if (!date) return <td key={`${row}-${column}`} className={styles.outside} aria-hidden="true"/>;
        const items = byDay.get(date) ?? [];
        const actionCount = items.filter(item => ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'].includes(item.state)).length;
        return <td key={date} className={`${date === selectedDay ? styles.selected : ''} ${date === today ? styles.today : ''}`}><button type="button" className={styles.day} data-calendar-date={date} tabIndex={date === selectedDay ? 0 : -1} aria-pressed={date === selectedDay} aria-label={`${date}, ${items.length} session${items.length === 1 ? '' : 's'}${actionCount ? `, ${actionCount} need attention` : ''}`} onKeyDown={event => moveDay(event, date)} onClick={() => setSelectedDay(date)}><span className={styles.dayNumber}>{Number(date.slice(-2))}</span>{items.length ? <span className={styles.eventCount}>{items.length} <span className={styles.eventWord}>session{items.length === 1 ? '' : 's'}</span></span> : <span className={styles.noEvents}>—</span>}{items.length ? <span className={styles.dots} aria-hidden="true">{items.slice(0, 3).map(item => <i key={item.id} className={styles[`state${item.state}`]}/>)}</span> : null}</button></td>;
      })}</tr>)}</tbody></table></div>
      <aside className={styles.dayPanel} aria-live="polite" aria-label={`Trainer sessions on ${selectedDay}`}><span className={styles.panelEyebrow}>DAY SCHEDULE</span><h3>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDay}T12:00:00Z`))}</h3>
        {selected.length ? <ul>{selected.map(item => <li key={item.id} className={styles.event}><span className={`${styles.statePill} ${styles[`pill${item.state}`]}`}>{status[item.state]}</span><strong>{localTime(item.scheduledStartAt, timeZone)}–{localTime(item.scheduledEndAt, timeZone)}</strong><span>{item.memberName}</span><small>{item.type.replaceAll('_', ' ').toLowerCase()}</small>{item.notes ? <small className={styles.note}>{item.notes}</small> : null}{item.state === 'PENDING_CONFIRMATION' ? <a className="platform-text-link" href={`${base}/requests`}>Review request</a> : <a className="platform-text-link" href={`${base}/schedule?mode=day&date=${selectedDay}#session-${item.id}`}>Open session</a>}</li>)}</ul> : <div className={styles.empty}><span aria-hidden="true">▦</span><strong>{partial ? 'No loaded sessions this day' : 'No sessions this day'}</strong><p>{partial ? 'Check My Schedule for any records that could not be loaded.' : 'Choose another day to view your calendar.'}</p></div>}
        <a className="ui-button ui-button-secondary ui-button-full" href={`${base}/schedule?mode=day&date=${selectedDay}`}>View this day’s schedule</a><a className="ui-button ui-button-primary ui-button-full" href={`${base}/requests`}>Review requests</a>
      </aside>
    </div>
    <div className={styles.legend} aria-label="Calendar status legend"><span><i className={styles.statePENDING_CONFIRMATION}/>Needs response</span><span><i className={styles.stateSCHEDULED}/>Confirmed</span><span><i className={styles.stateACTIVE}/>In progress</span><span><i className={styles.stateCOMPLETED}/>Completed</span><span><i className={styles.stateCANCELLED}/>Cancelled, declined or missed</span></div>
  </div>;
}
