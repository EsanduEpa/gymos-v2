'use client';

import { useActionState } from 'react';
import { Card, Feedback } from '@/components/ui';
import { changeMemberStatus, resumeMemberLifecycle, type MemberLifecycleActionState } from '@/app/member-lifecycle-actions';

export function MemberLifecycleForm({ slug, memberId, status, version, initialRequestKey }: {
  slug: string; memberId: string; status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'; version: number; initialRequestKey: string;
}) {
  const [state, action, pending] = useActionState(changeMemberStatus.bind(null, slug, memberId, initialRequestKey), {} satisfies MemberLifecycleActionState);
  const [recovery, resumeAction, recovering] = useActionState(resumeMemberLifecycle.bind(null, slug, memberId, state.recoveryOperationId ?? ''), {} satisfies MemberLifecycleActionState);
  return <Card>
    <span className="eyebrow dark">STATUS MANAGEMENT</span>
    <h3>Change member status</h3>
    <p>Suspending or deactivating blocks gym access and cancels future pending or confirmed PT sessions, releasing any held credits. Past and active sessions remain in history. Reactivation does not restore cancelled sessions.</p>
    {state.error && <Feedback tone="error">{state.error}</Feedback>}
    {state.success && <Feedback tone={state.operation?.state === 'COMPLETE' ? 'success' : 'info'}>{state.success}</Feedback>}
    {state.outcomeUnknown && <Feedback tone="info">Retry with this same request key to resolve the original operation.</Feedback>}
    <form action={action} className="trainer-lifecycle-form">
      <label className="ui-field"><span className="ui-field-label">New status</span><select name="targetStatus" defaultValue={status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}>
        {(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).filter(value => value !== status).map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
      </select></label>
      <input type="hidden" name="expectedVersion" value={version}/>
      <input type="hidden" name="idempotencyKey" value={state.nextIdempotencyKey ?? state.currentIdempotencyKey ?? initialRequestKey}/>
      <label className="ui-field"><span className="ui-field-label">Reason</span><input name="reason" minLength={1} maxLength={500} required/></label>
      <label className="trainer-lifecycle-confirm"><input type="checkbox" name="confirm" value="true" required/><span>I confirm this status change and its effects on access and future PT sessions.</span></label>
      <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? 'Saving status…' : 'Change status'}</button>
    </form>
    {state.recoveryOperationId && <form action={resumeAction} className="trainer-lifecycle-recovery">
      <p>Operation <code>{state.recoveryOperationId}</code> is retained for recovery.</p>
      {recovery.error && <Feedback tone="error">{recovery.error}</Feedback>}
      {recovery.success && <Feedback tone={recovery.operation?.state === 'COMPLETE' ? 'success' : 'info'}>{recovery.success}</Feedback>}
      <button className="ui-button ui-button-secondary" type="submit" disabled={recovering}>{recovering ? 'Recovering…' : 'Resume original operation'}</button>
    </form>}
  </Card>;
}
