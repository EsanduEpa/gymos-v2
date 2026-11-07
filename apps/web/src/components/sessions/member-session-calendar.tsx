'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import type { MemberMealPlanPage, SessionReadPage, SessionReadState } from '@gymos/contracts';
import styles from './member-session-calendar.module.css';

const status: Record<SessionReadState, string> = {
  PENDING_CONFIRMATION: 'Pending', SCHEDULED: 'Confirmed', ACTIVE: 'In progress', COMPLETED: 'Completed',
  MISSED: 'No show', CANCELLED: 'Cancelled', DECLINED: 'Declined', EXPIRED: 'Expired',
};
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type SessionReadItem = SessionReadPage['items'][number];
type MealPlan = MemberMealPlanPage['items'][number];

function localDate(value: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function localTime(value: string, zone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year!, month! - 1, 1)));
}
function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function MemberSessionCalendar({ slug, month, today, timeZone, sessions, totalCount, mealPlans, mealPlansTruncated }: {
  slug: string; month: string; today: string; timeZone: string; sessions: SessionReadItem[]; totalCount: number; mealPlans: MealPlan[]; mealPlansTruncated: boolean;
}) {
  const initialDay = today.startsWith(`${month}-`) ? today : sessions[0] ? localDate(sessions[0].scheduledStartAt, timeZone) : `${month}-01`;
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year!, monthNumber! - 1, 1)).getUTCDay() + 6) % 7;
  const cells = useMemo(() => {
    const count = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: count }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > daysInMonth ? null : `${month}-${String(day).padStart(2, '0')}`;
    });
  }, [daysInMonth, month, offset]);
  const byDay = useMemo(() => {
    const grouped = new Map<string, SessionReadItem[]>();
    for (const session of sessions) {
      const date = localDate(session.scheduledStartAt, timeZone);
      grouped.set(date, [...(grouped.get(date) ?? []), session]);
    }
    return grouped;
  }, [sessions, timeZone]);
  const partial = totalCount > sessions.length || mealPlansTruncated;
  function moveDay(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const current = new Date(`${date}T12:00:00Z`);
    const weekday = (current.getUTCDay() + 6) % 7;
    const day = Math.max(1, Math.min(daysInMonth, current.getUTCDate() + (offset ?? (event.key === 'Home' ? -weekday : 6 - weekday))));
    const next = `${month}-${String(day).padStart(2, '0')}`;
    setSelectedDay(next);
    event.currentTarget.closest('table')?.querySelector<HTMLButtonElement>(`[data-calendar-date="${next}"]`)?.focus();
  }
  const selectedSessions = byDay.get(selectedDay) ?? [];
  const selectedWeekday = new Date(`${selectedDay}T12:00:00Z`).getUTCDay() || 7;
  const selectedMeals = mealPlans.flatMap(plan => plan.entries.filter(entry => entry.dayOfWeek === selectedWeekday).map(entry => ({ ...entry, planName: plan.name })));
  const mealActivityCount = (date: string) => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
    return mealPlans.reduce((count, plan) => count + plan.entries.filter(entry => entry.dayOfWeek === weekday).length, 0);
  };
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const calendarUrl = (value: string) => `/gyms/${encodeURIComponent(slug)}/member/calendar?month=${value}`;

  return <div className={styles.calendar}>
    <div className={styles.monthBar}>
      <a className="ui-button ui-button-secondary" href={calendarUrl(previous)} aria-label={`Go to ${monthLabel(previous)}`}>‹ <span className={styles.wideLabel}>Previous month</span></a>
      <h2 aria-live="polite">{monthLabel(month)}</h2>
      <a className="ui-button ui-button-secondary" href={calendarUrl(next)} aria-label={`Go to ${monthLabel(next)}`}><span className={styles.wideLabel}>Next month</span> ›</a>
    </div>
    <p className={styles.timezone}>Times are shown in {timeZone} · Select a date to see your sessions.</p>
    {partial ? <p className={styles.limit} role="status">This calendar is a partial preview. PT Sessions and Meal Plans contain the full paged records.</p> : null}
    <div className={styles.layout}>
      <div className={styles.gridWrap}>
        <table className={styles.grid} aria-label={`${monthLabel(month)} session calendar`}>
          <thead><tr>{weekdays.map(day => <th key={day} scope="col"><span className={styles.weekdayLong}>{day}</span><span className={styles.weekdayShort}>{day.slice(0, 1)}</span></th>)}</tr></thead>
          <tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((date, column) => {
            if (!date) return <td key={`${row}-${column}`} className={styles.outside} aria-hidden="true"/>;
            const events = byDay.get(date) ?? [];
            const meals = mealActivityCount(date);
            const itemCount = events.length + meals;
            const dayNumber = Number(date.slice(-2));
            return <td key={date} className={`${date === selectedDay ? styles.selected : ''} ${date === today ? styles.today : ''}`}>
              <button type="button" className={styles.day} data-calendar-date={date} tabIndex={date === selectedDay ? 0 : -1} onKeyDown={event => moveDay(event, date)} aria-pressed={date === selectedDay} aria-label={`${date}${itemCount ? `, ${itemCount} schedule item${itemCount === 1 ? '' : 's'}` : partial ? ', no loaded items' : ', no scheduled items'}`} onClick={() => setSelectedDay(date)}>
                <span className={styles.dayNumber}>{dayNumber}</span>
                {itemCount ? <span className={styles.eventCount}>{itemCount} <span className={styles.eventWord}>item{itemCount === 1 ? '' : 's'}</span></span> : <span className={styles.noEvents}>—</span>}
                {itemCount ? <span className={styles.dots} aria-hidden="true">{events.slice(0, 2).map(event => <i key={event.id} className={styles[`state${event.state}`]}/>)}{meals ? <i className={styles.mealDot}/> : null}</span> : null}
              </button>
            </td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <aside className={styles.dayPanel} aria-live="polite" aria-label={`Sessions on ${selectedDay}`}>
        <span className={styles.panelEyebrow}>DAY SCHEDULE</span>
        <h3>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDay}T12:00:00Z`))}</h3>
        {selectedSessions.length || selectedMeals.length ? <ul>{selectedSessions.map(session => <li key={session.id} className={styles.event}>
          <span className={`${styles.statePill} ${styles[`pill${session.state}`]}`}>{status[session.state]}</span>
          <strong>{localTime(session.scheduledStartAt, timeZone)}–{localTime(session.scheduledEndAt, timeZone)}</strong>
          <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(session.id)}`}>PT session with {session.trainerName}</a>
          <small>{session.type.replaceAll('_', ' ').toLowerCase()}</small>
          {session.notes ? <small className={styles.note}>{session.notes}</small> : null}
        </li>)}{selectedMeals.map(entry => <li key={`${entry.planName}:${entry.id}`} className={`${styles.event} ${styles.mealEvent}`}>
          <span className={styles.mealPill}>Meal plan activity</span>
          <strong>{entry.mealType}</strong>
          <span>{entry.foodItem}</span>
          <small>{entry.planName} · repeats weekly on this day</small>
        </li>)}</ul> : <div className={styles.empty}><span aria-hidden="true">▦</span><strong>{partial ? 'No loaded activities this day' : 'No scheduled activities this day'}</strong><p>{partial ? 'Check the full session and meal-plan pages for more records.' : 'Choose another date to view your schedule.'}</p></div>}
        <a className="ui-button ui-button-secondary ui-button-full" href={`/gyms/${encodeURIComponent(slug)}/member/sessions?mode=day&date=${selectedDay}`}>View this day’s sessions</a>
        <a className="ui-button ui-button-primary ui-button-full" href={`/gyms/${encodeURIComponent(slug)}/member/trainers`}>Find a trainer</a>
      </aside>
    </div>
    <div className={styles.legend} aria-label="Calendar status legend"><span><i className={styles.statePENDING_CONFIRMATION}/>Pending</span><span><i className={styles.stateSCHEDULED}/>Confirmed</span><span><i className={styles.stateACTIVE}/>In progress</span><span><i className={styles.stateCOMPLETED}/>Completed</span><span><i className={styles.stateCANCELLED}/>Cancelled or declined</span><span><i className={styles.mealDot}/>Meal plan</span></div>
    {totalCount > sessions.length ? <p className={styles.limit} role="status">Showing the first {sessions.length} of {totalCount} sessions this month. Use My PT Sessions to search and browse the full history.</p> : null}
    {mealPlansTruncated ? <p className={styles.limit} role="status">More than 100 meal plans are assigned. Calendar activities show the first 100 plans.</p> : null}
  </div>;
}
