'use client';

import { useActionState, useState } from 'react';
import { saveWorkoutPlan, type WorkoutPlanActionState } from '@/app/workout-plan-actions';
import type { WorkoutPlanView, WorkoutTemplate } from '@gymos/contracts';
import styles from './workout-plan-builder.module.css';

type Row = { id: string; name: string; sets: string; reps: string; weightKg: string; durationMinutes: string; restSeconds: string; notes: string };
const newRow = (): Row => ({ id: globalThis.crypto.randomUUID(), name: '', sets: '', reps: '', weightKg: '', durationMinutes: '', restSeconds: '', notes: '' });
const initialState: WorkoutPlanActionState = {};
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkoutPlanBuilder({ slug, memberId, memberName, initialKey, initialPlan, initialTemplate, copy = false }: { slug: string; memberId: string; memberName: string; initialKey: string; initialPlan?: WorkoutPlanView; initialTemplate?: WorkoutTemplate; copy?: boolean }) {
  const editing = initialPlan && !copy;
  const source = initialPlan ?? initialTemplate;
  const [rows, setRows] = useState<Row[]>(() => source?.exercises.map(exercise => ({ id: globalThis.crypto.randomUUID(), name: exercise.name,
    sets: String(exercise.sets), reps: exercise.reps == null ? '' : String(exercise.reps), weightKg: exercise.weightKg ?? '',
    durationMinutes: exercise.durationMinutes == null ? '' : String(exercise.durationMinutes),
    restSeconds: exercise.restSeconds == null ? '' : String(exercise.restSeconds), notes: exercise.notes ?? '' })) ?? [newRow()]);
  const [name, setName] = useState(copy && initialPlan ? `${initialPlan.name.slice(0, 113)} (copy)` : source?.name ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [date, setDate] = useState(editing ? initialPlan.scheduledDate ?? '' : '');
  const [weekdays, setWeekdays] = useState(editing ? initialPlan.scheduledWeekdays ?? [] : []);
  const [schedule, setSchedule] = useState(date ? 'DATE' : weekdays.length ? 'WEEKLY' : 'UNSCHEDULED');
  const action = saveWorkoutPlan.bind(null, slug, initialKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  const currentKey = state.currentKey ?? state.nextKey ?? initialKey;
  function update(index: number, patch: Partial<Row>) {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }
  return <form action={formAction} className={styles.form}>
    <input type="hidden" name="memberId" value={memberId}/>
    {editing ? <><input type="hidden" name="planId" value={initialPlan.id}/><input type="hidden" name="expectedRevision" value={state.revision ?? initialPlan.revision}/></> : null}
    <input type="hidden" name="exerciseCount" value={rows.length}/>
    <input type="hidden" name="idempotencyKey" value={currentKey}/>
    <div className={styles.fields}>
      <label>Plan title<input name="name" value={name} onChange={event => setName(event.currentTarget.value)} required maxLength={120} placeholder="Workout plan title"/></label>
      <label>Description (optional)<textarea name="description" value={description} onChange={event => setDescription(event.currentTarget.value)} rows={2} maxLength={4000}/></label>
      <label>Workout schedule<select name="scheduleKind" value={schedule} onChange={event => setSchedule(event.currentTarget.value)}>
        <option value="UNSCHEDULED">No date</option><option value="DATE">Specific date</option><option value="WEEKLY">Repeat weekly</option>
      </select></label>
      {schedule === 'DATE' && <label>Workout date<input type="date" name="scheduledDate" required value={date} onChange={event => setDate(event.currentTarget.value)}/></label>}
      {schedule === 'WEEKLY' && <fieldset className={styles.weekdays}><legend>Repeat on</legend>{days.map((day, index) => {
        const value = index + 1;
        return <label key={day}><input type="checkbox" name="scheduledWeekday" value={value} checked={weekdays.includes(value)}
          onChange={event => setWeekdays(event.currentTarget.checked ? [...weekdays, value] : weekdays.filter(item => item !== value))}/>{day}</label>;
      })}</fieldset>}
      <p className={styles.assigned}>Client <strong>{memberName}</strong></p>
    </div>
    <div className={styles.rowHeader}><div><h2>Exercises</h2><p>1–100 exercises. Weight is in kilograms; zero is preserved.</p></div>
      <button type="button" className="ui-button ui-button-secondary" disabled={pending || rows.length >= 100} onClick={() => setRows(current => [...current, newRow()])}>Add exercise</button></div>
    <div className={styles.rows}>{rows.map((row, index) => <fieldset className={styles.row} key={row.id} disabled={pending}>
      <legend>Exercise {index + 1}</legend>
      <div className={styles.rowFields}>
        <label>Exercise name<input required maxLength={120} value={row.name} name={`exercise-${index}-name`} onChange={event => update(index, { name: event.currentTarget.value })}/></label>
        <label>Sets<input required type="number" min={1} max={100} step={1} value={row.sets} name={`exercise-${index}-sets`} onChange={event => update(index, { sets: event.currentTarget.value })}/></label>
        <label>Reps (optional)<input type="number" min={1} max={1000} step={1} value={row.reps} name={`exercise-${index}-reps`} onChange={event => update(index, { reps: event.currentTarget.value })}/></label>
        <label>Weight kg (optional)<input type="number" min={0} max={1000} step="0.001" value={row.weightKg} name={`exercise-${index}-weightKg`} onChange={event => update(index, { weightKg: event.currentTarget.value })}/></label>
        <label>Duration minutes (optional)<input type="number" min={1} max={1440} step={1} value={row.durationMinutes} name={`exercise-${index}-durationMinutes`} onChange={event => update(index, { durationMinutes: event.currentTarget.value })}/></label>
        <label>Rest seconds (optional)<input type="number" min={0} max={3600} step={1} value={row.restSeconds} name={`exercise-${index}-restSeconds`} onChange={event => update(index, { restSeconds: event.currentTarget.value })}/></label>
        <label className={styles.notes}>Notes (optional)<textarea maxLength={4000} rows={2} value={row.notes} name={`exercise-${index}-notes`} onChange={event => update(index, { notes: event.currentTarget.value })}/></label>
      </div>
      {rows.length > 1 ? <button type="button" className="ui-button ui-button-secondary" onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))}>Remove exercise {index + 1}</button> : null}
    </fieldset>)}</div>
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    {state.success ? <div className={styles.success} role="status"><p>{state.success}</p>{state.planId ? <a href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`}>View client profile</a> : null}</div> : null}
    <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : state.outcomeUnknown ? 'Retry save with same key' : editing ? 'Save workout plan changes' : 'Save and assign workout plan'}</button>
  </form>;
}
