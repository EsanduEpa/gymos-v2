'use client';

import { useActionState, useState } from 'react';
import type { DietaryProfile } from '@gymos/contracts';
import { saveBodyReading, updateDietaryProfile } from '@/app/coaching-record-actions';
import { Button, Feedback, Field } from '@/components/ui';

export function BodyMeasurementForm({ slug, today }: { slug: string; today: string }) {
  const [state, action, pending] = useActionState(saveBodyReading.bind(null, slug), {});
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  return <form action={action} className="stack-form">
    <Field label="Measurement date" name="measuredOn" type="date" min="0001-01-01" max={today} required value={date} onChange={event => setDate(event.currentTarget.value)}/>
    <Field label="Weight (kg)" name="weightKg" type="number" min={0.01} max={700} step="0.01" value={weight}
      onChange={event => setWeight(event.currentTarget.value)} hint="0.01 to 700"/>
    <Field label="Height (cm)" name="heightCm" type="number" min={30} max={300} step="0.01" value={height}
      onChange={event => setHeight(event.currentTarget.value)} hint="30 to 300"/>
    <Field label="Body fat (%)" name="bodyFatPct" type="number" min={0} max={100} step="0.01" value={bodyFat}
      onChange={event => setBodyFat(event.currentTarget.value)} hint="0 to 100"/>
    <p className="ui-field-hint">Enter at least one value. Leaving a field blank keeps any value already recorded that day.</p>
    {state.error && <Feedback tone="error">{state.error}</Feedback>}
    {state.success && <Feedback tone="success">{state.success}</Feedback>}
    <Button type="submit" pending={pending}>Save measurement</Button>
  </form>;
}

export function DietaryProfileForm({ slug, memberId, initial }: { slug: string; memberId: string; initial: DietaryProfile }) {
  const [state, action, pending] = useActionState(updateDietaryProfile.bind(null, slug, memberId, initial.version), {});
  const [allergies, setAllergies] = useState(initial.allergies.join('\n'));
  const [restrictions, setRestrictions] = useState(initial.restrictions.join('\n'));
  return <form action={action} className="stack-form">
    <p className="ui-field-hint">Enter one item per line. These notes are visible to the client and their assigned trainers.</p>
    <label className="ui-field"><span>Food allergies</span>
      <textarea name="allergies" rows={3} maxLength={1212} value={allergies} onChange={event => setAllergies(event.currentTarget.value)}/>
    </label>
    <label className="ui-field"><span>Dietary restrictions</span>
      <textarea name="restrictions" rows={3} maxLength={1212} value={restrictions} onChange={event => setRestrictions(event.currentTarget.value)}/>
    </label>
    {state.error && <Feedback tone="error">{state.error}</Feedback>}
    {state.success && <Feedback tone="success">{state.success}</Feedback>}
    <Button type="submit" pending={pending}>Save dietary notes</Button>
  </form>;
}
