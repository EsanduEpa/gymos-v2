'use client';

import { useActionState, useState } from 'react';
import type { DietaryProfile } from '@gymos/contracts';
import { saveBodyReading, updateDietaryProfile } from '@/app/coaching-record-actions';
import { Button, Feedback, Field } from '@/components/ui';

const readingFields = [
  { name: 'weightKg', label: 'Weight (kg)', min: 0.01, max: 700 },
  { name: 'heightCm', label: 'Height (cm)', min: 30, max: 300 },
  { name: 'bodyFatPct', label: 'Body fat (%)', min: 0, max: 100 },
  { name: 'chestCm', label: 'Chest (cm)', min: 0.01, max: 999.99 },
  { name: 'waistCm', label: 'Waist (cm)', min: 0.01, max: 999.99 },
  { name: 'armCm', label: 'Arm (cm)', min: 0.01, max: 999.99 },
] as const;

export function BodyMeasurementForm({ slug, today, memberId = null }: { slug: string; today: string; memberId?: string | null }) {
  const [state, action, pending] = useActionState(saveBodyReading.bind(null, slug, memberId), {});
  const [date, setDate] = useState(today);
  const [readings, setReadings] = useState<Partial<Record<(typeof readingFields)[number]['name'], string>>>({});
  return <form action={action} className="stack-form compact-workspace-form">
    <Field label="Measurement date" name="measuredOn" type="date" min="0001-01-01" max={today} required value={date} onChange={event => setDate(event.currentTarget.value)}/>
    {readingFields.map(({ name, label, min, max }) => <Field key={name} label={label} name={name} type="number"
      min={min} max={max} step="0.01" value={readings[name] ?? ''} hint={`${min} to ${max}`}
      onChange={event => {
        const value = event.currentTarget.value;
        setReadings(previous => ({ ...previous, [name]: value }));
      }}/>)}
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
  return <form action={action} className="stack-form compact-workspace-form">
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
