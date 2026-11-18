'use client';

import { useActionState } from 'react';
import { saveWorkoutTemplate, type WorkoutPlanActionState } from '@/app/workout-plan-actions';
import { Button, Feedback } from '@/components/ui';

export function SaveWorkoutTemplate({ slug, memberId, planId }: { slug: string; memberId: string; planId: string }) {
  const [state, action, pending] = useActionState(saveWorkoutTemplate.bind(null, slug, memberId, planId), {} satisfies WorkoutPlanActionState);
  return <form action={action} className="stack-form">
    <Button type="submit" pending={pending} disabled={Boolean(state.success)}>Save as template</Button>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    {state.success ? <div role="status"><Feedback tone="success">{state.success}</Feedback></div> : null}
  </form>;
}
