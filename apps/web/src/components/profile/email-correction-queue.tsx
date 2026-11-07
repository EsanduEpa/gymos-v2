'use client';
import { useActionState } from 'react';
import { Button, Feedback } from '@/components/ui';
import { closeEmailCorrection } from '@/app/email-correction-actions';

export function EmailCorrectionCloseForm({ id, version }: { id: string; version: number }) {
  const [state, action, pending] = useActionState(closeEmailCorrection, { status: 'idle' as const });
  return <form action={action} className="profile-form"><input type="hidden" name="id" value={id}/><input type="hidden" name="expectedVersion" value={version}/>
    <label className="ui-field"><span className="ui-field-label">Staff outcome</span><select name="resolution" defaultValue="FOLLOW_UP_RECORDED"><option value="FOLLOW_UP_RECORDED">Follow-up recorded</option><option value="CLOSED_NO_CHANGE">Closed without change</option></select></label>
    {state.message ? <Feedback tone={state.status === 'success' ? 'success' : 'error'}>{state.message}</Feedback> : null}
    <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Record outcome'}</Button>
  </form>;
}

import { withdrawEmailCorrection } from '@/app/email-correction-actions';
export function WithdrawEmailCorrection({ id }: { id: string }) {
  return <form action={withdrawEmailCorrection.bind(null, id)}><Button variant="secondary" type="submit">Withdraw request</Button></form>;
}
