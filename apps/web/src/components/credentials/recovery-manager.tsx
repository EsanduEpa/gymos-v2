'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { issueRecoveryAction } from '@/app/actions';
import { Button, Card, Feedback } from '@/components/ui';
import { PasswordInput } from '@/components/auth/password-input';
type Candidate = { identityId: string; label: string; email: string; relationship: 'MEMBER' | 'TRAINER' | 'PENDING_APPLICANT' };
const initialState = {} as { error?: string; recovery?: { credentialId: string; secret: string; expiresAt: string; subjectLabel: string } };

export function RecoveryManager({ slug, candidates }: { slug: string; candidates: Candidate[] }) {
  return <div className="stack-form">{candidates.length === 0 ? <Card><p>No eligible accounts are available for this recovery process.</p></Card> : candidates.map(candidate =>
    <RecoveryCandidateCard key={candidate.identityId} slug={slug} candidate={candidate}/>)}</div>;
}

function RecoveryCandidateCard({ slug, candidate }: { slug: string; candidate: Candidate }) {
    const [state, action, pending] = useActionState(issueRecoveryAction.bind(null, slug, candidate.identityId), initialState);
    const submitting = useRef(false);
    const [copyStatus, setCopyStatus] = useState('');
    useEffect(() => { submitting.current = false; }, [state]);
    const link = !pending && state.recovery ? `/recover#${state.recovery.credentialId}.${state.recovery.secret}` : null;
    return <Card><h2>{candidate.label}</h2><p>{candidate.email} · {candidate.relationship.replaceAll('_', ' ').toLowerCase()}</p>
      {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
      {link && state.recovery ? <Feedback tone="success">
        <strong>One-time credential for {state.recovery.subjectLabel}</strong><br/>
        Expires {new Date(state.recovery.expiresAt).toLocaleString('en', { timeZone: 'UTC', timeZoneName: 'short' })}. Show this link to the verified account holder now. Reissue it if the handoff is lost.<br/>
        <code className="recovery-handoff-link">{link}</code><br/>
        <Button type="button" variant="secondary" onClick={async () => {
          try {
            await navigator.clipboard.writeText(new URL(link, window.location.origin).href);
            setCopyStatus('Recovery link copied.');
          } catch {
            setCopyStatus('Clipboard access failed. Select and copy the link manually.');
          }
        }}>Copy recovery link</Button>
        {copyStatus ? <p>{copyStatus}</p> : null}
      </Feedback> : null}
      <form action={action} className="stack-form" onSubmit={event => {
        if (submitting.current) { event.preventDefault(); return; }
        submitting.current = true;
        setCopyStatus('');
      }}>
        <label className="ui-field"><span className="ui-field-label">Identity check</span><select name="verificationMethod" required defaultValue=""><option value="" disabled>Select verification method</option><option value="IN_PERSON">Verified in person</option><option value="KNOWN_CONTACT">Verified through a known contact</option></select></label>
        <label className="ui-field"><span className="ui-field-label">Attestation</span><textarea name="reason" minLength={8} maxLength={500} required placeholder="Record that identity matched the gym’s enrollment/contact record."></textarea><span className="ui-field-hint">Do not record identity document numbers or upload copies.</span></label>
        <PasswordInput label="Your current password" name="currentPassword" autoComplete="current-password" maxLength={1024}/>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Issuing…' : 'Issue one-use recovery link'}</Button>
      </form>
    </Card>;
}
