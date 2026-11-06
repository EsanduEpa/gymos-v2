'use client';

import { useActionState } from 'react';
import { issueOperatorRecoveryAction } from '@/app/actions';
import { PasswordInput } from '@/components/auth/password-input';
import { Button, Card, Feedback, Field } from '@/components/ui';

const initialState = {} as { error?: string; recovery?: { credentialId: string; secret: string; expiresAt: string; subjectLabel: string } };

export function OperatorRecoveryManager() {
  const [state, action, pending] = useActionState(issueOperatorRecoveryAction, initialState);
  return <Card><h2>Issue independent recovery</h2><p>Use this audited operator path for owner, platform, shared, multi-gym, or otherwise ambiguous identities. Verify the person independently and do not use this to reset your own account.</p>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    {state.recovery ? <Feedback tone="success"><strong>One-time credential for {state.recovery.subjectLabel}</strong><br/>Expires {new Date(state.recovery.expiresAt).toLocaleString('en', { timeZone: 'UTC', timeZoneName: 'short' })}. Show the link directly to the verified account holder; it is shown once.<br/><code className="recovery-handoff-link">{`/recover#${state.recovery.credentialId}.${state.recovery.secret}`}</code></Feedback> : null}
    <form action={action} className="stack-form">
      <Field label="Account email" name="email" type="email" autoComplete="off" required/>
      <label className="ui-field"><span className="ui-field-label">Identity check</span><select name="verificationMethod" required defaultValue=""><option value="" disabled>Select verification method</option><option value="IN_PERSON">Verified in person</option><option value="KNOWN_CONTACT">Verified through a known contact</option></select></label>
      <label className="ui-field"><span className="ui-field-label">Operator attestation</span><textarea name="reason" minLength={8} maxLength={500} required placeholder="Record how the person was independently verified."></textarea><span className="ui-field-hint">Do not record identity document numbers or upload copies.</span></label>
      <PasswordInput label="Your current password" name="currentPassword" autoComplete="current-password" maxLength={1024}/>
      <Button variant="secondary" type="submit" disabled={pending}>{pending ? 'Issuing…' : 'Issue one-use recovery link'}</Button>
    </form>
  </Card>;
}
