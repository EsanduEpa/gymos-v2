'use client';

import { useState } from 'react';
import { Button, Field } from '@/components/ui';

type Exercise = { name: string; weightKg: number | null };
const blank = { name: '', weightKg: null };

export function JournalExerciseRows({ exercises = [blank] }: { exercises?: Exercise[] }) {
  const [rows, setRows] = useState(() => exercises.map((exercise, id) => ({ id, exercise })));
  return <fieldset className="stack-form">
    <legend>Exercises</legend>
    {rows.map(({ id, exercise }, index) => <div className="profile-form" key={id}>
      <Field id={`solo-name-${id}`} label={`Exercise ${index + 1}`} name="exerciseName" required maxLength={120} defaultValue={exercise.name}/>
      <Field id={`solo-weight-${id}`} label={`Exercise ${index + 1} weight (kg)`} name="exerciseWeight" type="number" min={0} max={1000} step="0.01"
        defaultValue={exercise.weightKg ?? ''} optional/>
      {rows.length > 1 ? <Button type="button" variant="secondary" onClick={() => setRows(current => current.filter(row => row.id !== id))}>Remove exercise {index + 1}</Button> : null}
    </div>)}
    <Button type="button" variant="secondary" disabled={rows.length >= 50}
      onClick={() => setRows(current => [...current, { id: (current.at(-1)?.id ?? -1) + 1, exercise: blank }])}>Add exercise</Button>
  </fieldset>;
}
