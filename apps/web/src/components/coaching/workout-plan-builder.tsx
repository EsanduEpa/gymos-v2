'use client';

import { useActionState, useState } from 'react';
import { saveWorkoutPlan, type WorkoutPlanActionState } from '@/app/workout-plan-actions';
import type { WorkoutPlanView } from '@gymos/contracts';
import styles from './workout-plan-builder.module.css';

type Row = { id: string; name: string; sets: string; reps: string; weightKg: string; durationMinutes: string; notes: string };
const newRow = (name = '', sets = '', reps = '', weightKg = ''): Row => ({ id: globalThis.crypto.randomUUID(), name, sets, reps, weightKg, durationMinutes: '', notes: '' });
const initialState: WorkoutPlanActionState = {};

export function WorkoutPlanBuilder({ slug, memberId, memberName, initialKey, initialPlan }: { slug: string; memberId: string; memberName: string; initialKey: string; initialPlan?: WorkoutPlanView }) {
  const [rows, setRows] = useState<Row[]>(() => initialPlan?.exercises.map(exercise => ({ id: globalThis.crypto.randomUUID(), name: exercise.name,
    sets: String(exercise.sets), reps: exercise.reps === null ? '' : String(exercise.reps), weightKg: exercise.weightKg ?? '',
    durationMinutes: exercise.durationMinutes === null ? '' : String(exercise.durationMinutes), notes: exercise.notes ?? '' })) ?? [newRow()]);
  const [name, setName] = useState(initialPlan?.name ?? '');
  const [description, setDescription] = useState(initialPlan?.description ?? '');
  const action = saveWorkoutPlan.bind(null, slug, initialKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  const currentKey = state.currentKey ?? state.nextKey ?? initialKey;
  function update(index: number, patch: Partial<Row>) {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }
  return <form action={formAction} className={styles.form}>
    <input type="hidden" name="memberId" value={memberId}/>
    {initialPlan ? <><input type="hidden" name="planId" value={initialPlan.id}/><input type="hidden" name="expectedRevision" value={initialPlan.revision}/></> : null}
    <input type="hidden" name="exerciseCount" value={rows.length}/>
    <input type="hidden" name="idempotencyKey" value={currentKey}/>
    <div className={styles.fields}>
      <label>Plan title<input name="name" value={name} onChange={event => setName(event.currentTarget.value)} required maxLength={120} placeholder="Workout plan title"/></label>
      <label>Description (optional)<textarea name="description" value={description} onChange={event => setDescription(event.currentTarget.value)} rows={2} maxLength={4000}/></label>
      <p className={styles.assigned}>Client: <strong>{memberName}</strong>. {initialPlan ? 'Saving updates this assigned plan.' : 'Saving explicitly assigns this plan to this client.'}</p>
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
        <label className={styles.notes}>Notes (optional)<textarea maxLength={4000} rows={2} value={row.notes} name={`exercise-${index}-notes`} onChange={event => update(index, { notes: event.currentTarget.value })}/></label>
      </div>
      {rows.length > 1 ? <button type="button" className="ui-button ui-button-secondary" onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))}>Remove exercise {index + 1}</button> : null}
    </fieldset>)}</div>
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    {state.success ? <div className={styles.success} role="status"><p>{state.success}</p>{state.planId ? <a href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`}>View client profile</a> : null}</div> : null}
    <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : state.outcomeUnknown ? 'Retry save with same key' : initialPlan ? 'Save workout plan changes' : 'Save and assign workout plan'}</button>
  </form>;
}
