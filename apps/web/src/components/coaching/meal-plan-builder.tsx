'use client';

import { useActionState, useMemo, useState } from 'react';
import { saveMealPlan, type MealPlanActionState } from '@/app/meal-plan-actions';
import styles from './meal-plan-builder.module.css';

type Row = { id: string; dayOfWeek: string; mealType: string; foodItem: string; calories: string; proteinGrams: string; carbsGrams: string; fatsGrams: string };
const newRow = (): Row => ({ id: globalThis.crypto.randomUUID(), dayOfWeek: '1', mealType: 'Breakfast', foodItem: '', calories: '', proteinGrams: '', carbsGrams: '', fatsGrams: '' });
const initialState: MealPlanActionState = {};
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function numeric(value: string) { const parsed = Number(value); return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }

export function MealPlanBuilder({ slug, memberId, memberName, initialKey }: { slug: string; memberId: string; memberName: string; initialKey: string }) {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [name, setName] = useState('');
  const action = saveMealPlan.bind(null, slug, initialKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  const currentKey = state.currentKey ?? state.nextKey ?? initialKey;
  const totals = useMemo(() => rows.reduce((sum, row) => ({
    calories: sum.calories + numeric(row.calories),
    proteinGrams: sum.proteinGrams + numeric(row.proteinGrams),
    carbsGrams: sum.carbsGrams + numeric(row.carbsGrams),
    fatsGrams: sum.fatsGrams + numeric(row.fatsGrams),
  }), { calories: 0, proteinGrams: 0, carbsGrams: 0, fatsGrams: 0 }), [rows]);
  function update(index: number, patch: Partial<Row>) { setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  return <form action={formAction} className={styles.form}>
    <input type="hidden" name="memberId" value={memberId}/><input type="hidden" name="entryCount" value={rows.length}/>
    <input type="hidden" name="idempotencyKey" value={currentKey}/>
    <label className={styles.title}>Plan title<input name="name" value={name} onChange={event => setName(event.currentTarget.value)} required maxLength={120}/></label>
    <p className={styles.assigned}>Client: <strong>{memberName}</strong>. Saving explicitly assigns this meal plan.</p>
    <section className={styles.totals} aria-live="polite" aria-label="Live nutrition totals"><h2>Live totals</h2>
      <dl><div><dt>Calories</dt><dd>{totals.calories}</dd></div><div><dt>Protein</dt><dd>{totals.proteinGrams.toFixed(2)} g</dd></div>
        <div><dt>Carbs</dt><dd>{totals.carbsGrams.toFixed(2)} g</dd></div><div><dt>Fat</dt><dd>{totals.fatsGrams.toFixed(2)} g</dd></div></dl>
    </section>
    <div className={styles.rowHeader}><div><h2>Meals</h2><p>Days are Monday to Sunday. Nutrition values are nonnegative.</p></div>
      <button type="button" className="ui-button ui-button-secondary" disabled={pending || rows.length >= 100} onClick={() => setRows(current => [...current, newRow()])}>Add meal</button></div>
    <div className={styles.rows}>{rows.map((row, index) => <fieldset className={styles.row} key={row.id} disabled={pending}><legend>Meal {index + 1}</legend>
      <div className={styles.fields}>
        <label>Day<select value={row.dayOfWeek} name={`entry-${index}-dayOfWeek`} onChange={event => update(index, { dayOfWeek: event.currentTarget.value })}>{days.map((day, dayIndex) => <option value={dayIndex + 1} key={day}>{day}</option>)}</select></label>
        <label>Meal type<select value={row.mealType} name={`entry-${index}-mealType`} onChange={event => update(index, { mealType: event.currentTarget.value })}>{mealTypes.map(type => <option key={type}>{type}</option>)}</select></label>
        <label className={styles.wide}>Food item<input value={row.foodItem} name={`entry-${index}-foodItem`} onChange={event => update(index, { foodItem: event.currentTarget.value })} required maxLength={500}/></label>
        <label>Calories<input type="number" min={0} max={100000} step={1} value={row.calories} name={`entry-${index}-calories`} onChange={event => update(index, { calories: event.currentTarget.value })}/></label>
        <label>Protein g<input type="number" min={0} max={10000} step="0.01" value={row.proteinGrams} name={`entry-${index}-proteinGrams`} onChange={event => update(index, { proteinGrams: event.currentTarget.value })}/></label>
        <label>Carbs g<input type="number" min={0} max={10000} step="0.01" value={row.carbsGrams} name={`entry-${index}-carbsGrams`} onChange={event => update(index, { carbsGrams: event.currentTarget.value })}/></label>
        <label>Fat g<input type="number" min={0} max={10000} step="0.01" value={row.fatsGrams} name={`entry-${index}-fatsGrams`} onChange={event => update(index, { fatsGrams: event.currentTarget.value })}/></label>
      </div>
      {rows.length > 1 ? <button type="button" className="ui-button ui-button-secondary" onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))}>Remove meal {index + 1}</button> : null}
    </fieldset>)}</div>
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    {state.success ? <p className={styles.success} role="status">{state.success}</p> : null}
    <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : state.outcomeUnknown ? 'Retry save with same key' : 'Save and assign meal plan'}</button>
  </form>;
}
