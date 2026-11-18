'use client';

import { useActionState } from 'react';
import { approveTrainerShift, type TrainerShiftActionState } from '@/app/trainer-management-actions';
import { Button, Feedback } from '@/components/ui';
import type { PendingTrainerShift } from '@gymos/contracts';

export function TrainerShiftForm({ slug, trainerId, version, shiftStart, shiftEnd, request }: {
  slug: string; trainerId: string; version: number; shiftStart: string | null; shiftEnd: string | null; request?: PendingTrainerShift | null;
}) {
  const [state, action, pending] = useActionState(approveTrainerShift.bind(null, slug, trainerId), {} satisfies TrainerShiftActionState);
  const startMinute = shiftStart ? Number(shiftStart.slice(0, 2)) * 60 + Number(shiftStart.slice(3)) : 0;
  const endMinute = shiftEnd ? Number(shiftEnd.slice(0, 2)) * 60 + Number(shiftEnd.slice(3)) : 0;
  const overnightDefault = Boolean(shiftStart && shiftEnd && endMinute <= startMinute);
  return <form action={action} className="stack-form">
    <input type="hidden" name="expectedVersion" value={version}/>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    {state.success ? <Feedback tone="success">{state.success}</Feedback> : null}
    <p className="ui-field-hint">Approved hours apply to new confirmations. Existing sessions keep their agreed terms.</p>
    {request ? <>
      <input type="hidden" name="requestId" value={request.id}/>
      <p>Trainer requested <strong>{request.start}–{request.end}{request.overnight ? ' overnight' : ''}</strong> in gym local time.</p>
      <div className="platform-card-actions">
        <Button type="submit" name="decision" value="APPROVE" pending={pending}>Approve requested shift</Button>
        <Button type="submit" name="decision" value="DECLINE" disabled={pending} variant="secondary">Decline requested shift</Button>
      </div>
    </> : <>
      <label className="ui-field"><span className="ui-field-label">Shift starts</span><input type="time" name="start" defaultValue={shiftStart ?? ''} required/></label>
      <label className="ui-field"><span className="ui-field-label">Shift ends</span><input type="time" name="end" defaultValue={shiftEnd ?? ''} required/></label>
      <label className="ui-field"><span className="ui-field-label">Does this shift continue overnight?</span><select name="overnight" defaultValue={String(overnightDefault)}><option value="false">No</option><option value="true">Yes</option></select></label>
      <p className="ui-field-hint">Recurring shift duration must be 15 minutes to 16 hours.</p>
      <Button type="submit" pending={pending}>Approve shift</Button>
    </>}
  </form>;
}
