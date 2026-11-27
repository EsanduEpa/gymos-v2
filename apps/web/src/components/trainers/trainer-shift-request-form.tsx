'use client';

import { useActionState } from 'react';
import type { SelfTrainerProfile } from '@gymos/contracts';
import { requestTrainerShift } from '@/app/profile-actions';
import { Button, Card, CardHeader, Feedback, Field } from '@/components/ui';
import { initialProfileActionState } from '@/lib/profile-action-state';

export function TrainerShiftRequestForm({ slug, profile, requestKey }: { slug: string; profile: SelfTrainerProfile; requestKey: string }) {
  const [state, action, pending] = useActionState(requestTrainerShift.bind(null, slug, profile.version, requestKey), initialProfileActionState);
  const proposal = profile.pendingShift;
  return <Card id="recurring-shift"><CardHeader title="Recurring shift"/>
    <p>Approved hours {profile.shiftStart && profile.shiftEnd ? `${profile.shiftStart}–${profile.shiftEnd} gym local time` : 'have not been set.'}</p>
    {proposal ? <p>Pending owner approval <strong>{proposal.start}–{proposal.end}{proposal.overnight ? ' overnight' : ''}</strong></p> : null}
    <form action={action} className="stack-form">
      <Field label="Requested shift start" name="start" type="time" defaultValue={proposal?.start ?? profile.shiftStart ?? ''} required/>
      <Field label="Requested shift end" name="end" type="time" defaultValue={proposal?.end ?? profile.shiftEnd ?? ''} required/>
      <p className="ui-field-hint">Your gym owner reviews the request before new hours take effect. Use gym local time.</p>
      <Button type="submit" pending={pending}>{proposal ? 'Replace pending request' : 'Request shift change'}</Button>
    </form>
    {state.message ? <div role="status"><Feedback tone={state.status === 'error' ? 'error' : 'success'}>{state.message}</Feedback></div> : null}
  </Card>;
}
