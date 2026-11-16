'use client';

import { useState, useTransition } from 'react';
import { saveWorkoutCompletion } from '@/app/workout-plan-actions';
import { Feedback } from '@/components/ui';

export function WorkoutCompletion({ slug, planId, date, revision, order, exercise, completed }: {
  slug: string;
  planId: string;
  date: string;
  revision: string;
  order: number;
  exercise: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(completed);
  const [error, setError] = useState<string>();

  function toggle() {
    startTransition(async () => {
      setError(undefined);
      const result = await saveWorkoutCompletion(slug, planId, {
        date, planRevision: revision, sortOrder: order, completed: !checked,
      });
      if (result.error) setError(result.error);
      else if (result.completed !== undefined) setChecked(result.completed);
    });
  }

  return <div>
    <button type="button" className="ui-button ui-button-secondary" aria-label={`${exercise} completed`}
      aria-pressed={checked} disabled={pending} onClick={toggle}>
      {pending ? 'Saving…' : checked ? 'Completed' : 'Mark complete'}
    </button>
    {error && <Feedback tone="error">{error}</Feedback>}
  </div>;
}
