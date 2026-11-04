'use client';

import { useActionState } from 'react';
import { Card, Feedback } from '@/components/ui';
import { changeTrainerStatus, resumeTrainerLifecycle, type TrainerLifecycleActionState } from '@/app/trainer-management-actions';

export function TrainerLifecycleForm({ slug, trainerId, status, version, initialRequestKey }: {
  slug: string; trainerId: string; status: 'ACTIVE' | 'DEACTIVATED'; version: number; initialRequestKey: string;
}) {
  const [state, action, pending] = useActionState(changeTrainerStatus.bind(null, slug, trainerId, initialRequestKey), {} satisfies TrainerLifecycleActionState);
  const [recovery, resumeAction, recovering] = useActionState(
    resumeTrainerLifecycle.bind(null, slug, trainerId, state.recoveryOperationId ?? ''), {} satisfies TrainerLifecycleActionState);
  const targetStatus = status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
  const buttonLabel = targetStatus === 'DEACTIVATED' ? 'Deactivate trainer' : 'Reactivate trainer';
  return <Card>
    <span className="eyebrow">STATUS MANAGEMENT</span>
    <h2>{buttonLabel}</h2>
    <p>{status === 'ACTIVE'
      ? 'Deactivation blocks this trainer’s gym access, cancels future pending and confirmed sessions, and releases held credits without a fee. Past and active sessions stay in history.'
      : 'Reactivation restores gym access. Sessions cancelled during deactivation remain cancelled.'}</p>
    {state.error && <Feedback tone="error">{state.error}</Feedback>}
    {state.success && <Feedback tone={state.operation?.state === 'COMPLETE' ? 'success' : 'info'}>{state.success}</Feedback>}
    {state.outcomeUnknown && <Feedback tone="info">The same request key is retained so a retry resolves the original operation.</Feedback>}
    <form action={action} className="trainer-lifecycle-form">
      <input type="hidden" name="targetStatus" value={targetStatus}/>
      <input type="hidden" name="expectedVersion" value={version}/>
      <input type="hidden" name="idempotencyKey" value={state.nextIdempotencyKey ?? state.currentIdempotencyKey ?? initialRequestKey}/>
      <label className="ui-field"><span className="ui-field-label">Reason</span><input name="reason" minLength={1} maxLength={500} required/></label>
      <label className="trainer-lifecycle-confirm"><input type="checkbox" name="confirm" value="true" required/>
        <span>I confirm this trainer status change and its effect on future sessions.</span></label>
      <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? 'Saving status…' : buttonLabel}</button>
    </form>
    {state.recoveryOperationId && <form action={resumeAction} className="trainer-lifecycle-recovery">
      <p>Operation <code>{state.recoveryOperationId}</code> is retained for recovery.</p>
      {recovery.error && <Feedback tone="error">{recovery.error}</Feedback>}
      {recovery.success && <Feedback tone={recovery.operation?.state === 'COMPLETE' ? 'success' : 'info'}>{recovery.success}</Feedback>}
      <button className="ui-button ui-button-secondary" type="submit" disabled={recovering}>{recovering ? 'Recovering…' : 'Resume original operation'}</button>
    </form>}
  </Card>;
}
