'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { MembershipPlan } from '@gymos/contracts';
import { acknowledgeMemberCredential, registerMemberAction, reissueMemberCredential } from '@/app/member-actions';
import type { MemberRegistrationActionState } from '@/app/member-actions';
import { Button, Card, CardHeader, Feedback } from '@/components/ui';

export function MemberRegistrationForm({ slug, plans, initialRequestKey }: { slug: string; plans: MembershipPlan[]; initialRequestKey: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(registerMemberAction.bind(null, slug), { idempotencyKey: initialRequestKey } satisfies MemberRegistrationActionState);
  const [draft, setDraft] = useState({ fullName: '', email: '', phone: '', dateOfBirth: '', emergencyContact: '', healthNotes: '', membershipPlanId: '' });
  const [replacement, setReplacement] = useState<{ password?: string; version: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [handoffError, setHandoffError] = useState('');
  const [busy, startTransition] = useTransition();
  const retryableReissue = useRef<{ expectedVersion: number; idempotencyKey: string } | null>(null);
  const updateDraft = (field: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const result = state.result;
  const completed = result?.status === 'COMPLETE' ? result : null;
  const password = replacement ? replacement.password : completed?.temporaryPassword;
  const deliveryVersion = replacement?.version ?? completed?.credentialDeliveryVersion;
  const operationId = result?.operationId;

  async function continueToProfile() {
    if (!completed || !deliveryVersion) return;
    setHandoffError('');
    startTransition(async () => {
      const response = await acknowledgeMemberCredential(slug, completed.operationId, deliveryVersion);
      if (!response.ok) { setHandoffError(response.error); return; }
      router.push(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(completed.memberId)}`);
    });
  }

  async function reissue() {
    if (!operationId || deliveryVersion === undefined) return;
    setHandoffError('');
    if (retryableReissue.current?.expectedVersion !== deliveryVersion) {
      retryableReissue.current = { expectedVersion: deliveryVersion, idempotencyKey: `member-reissue-${globalThis.crypto.randomUUID()}` };
    }
    const request = retryableReissue.current;
    if (!request) return;
    startTransition(async () => {
      const response = await reissueMemberCredential(slug, operationId, request.expectedVersion, request.idempotencyKey);
      if (!response.ok) { setHandoffError(response.error); return; }
      retryableReissue.current = null;
      if (!response.result.temporaryPassword) {
        setReplacement({ version: response.result.deliveryVersion });
        setCopied(false);
        setHandoffError('A replacement was issued, but its one-time password could not be recovered. Issue another replacement to revoke it and receive a new password.');
        return;
      }
      setCopied(false);
      setReplacement({ password: response.result.temporaryPassword, version: response.result.deliveryVersion });
    });
  }

  return <Card className="member-registration-card">
    <CardHeader eyebrow="MEMBER PROFILE" title={password ? 'One-time credential handoff' : completed ? 'Member registered' : 'Member details'} />
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    {result?.status === 'PENDING' ? <Feedback tone="warning">
      This email belongs to an existing GymOS identity. The person must sign in, review this gym enrollment, and explicitly accept it before registration can finish. Share this private sign-in path and request reference with them, then retry this unchanged form: <a href={`/gyms/${encodeURIComponent(slug)}/enrollment-consent/${encodeURIComponent(result.operationId)}`}>Review enrollment consent</a> · <code>{result.operationId}</code>
    </Feedback> : null}
    {!completed ? <form action={action} className="stack-form" onSubmit={event => {
      // Server Actions reset their form controls after resolving. Capture the
      // submitted values into React state before that reset so a pending
      // consent response can be resumed without changing the enrollment.
      const submitted = new FormData(event.currentTarget);
      setDraft({
        fullName: String(submitted.get('fullName') ?? ''),
        email: String(submitted.get('email') ?? ''),
        phone: String(submitted.get('phone') ?? ''),
        dateOfBirth: String(submitted.get('dateOfBirth') ?? ''),
        emergencyContact: String(submitted.get('emergencyContact') ?? ''),
        healthNotes: String(submitted.get('healthNotes') ?? ''),
        membershipPlanId: String(submitted.get('membershipPlanId') ?? ''),
      });
    }}>
      <input type="hidden" name="idempotencyKey" value={state.idempotencyKey} />
      <label className="ui-field"><span className="ui-field-label">Full name</span><input name="fullName" autoComplete="name" minLength={2} maxLength={120} required value={draft.fullName} onChange={event => updateDraft('fullName', event.currentTarget.value)} /></label>
      <label className="ui-field"><span className="ui-field-label">Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} required value={draft.email} onChange={event => updateDraft('email', event.currentTarget.value)} /></label>
      <label className="ui-field"><span className="ui-field-label">Phone</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} required value={draft.phone} onChange={event => updateDraft('phone', event.currentTarget.value)} /></label>
      <label className="ui-field"><span className="ui-field-label">Date of birth</span><input name="dateOfBirth" type="date" required value={draft.dateOfBirth} onChange={event => updateDraft('dateOfBirth', event.currentTarget.value)} /></label>
      <label className="ui-field"><span className="ui-field-label">Emergency contact <small>optional</small></span><input name="emergencyContact" maxLength={240} value={draft.emergencyContact} onChange={event => updateDraft('emergencyContact', event.currentTarget.value)} /></label>
      <label className="ui-field"><span className="ui-field-label">Health notes <small>owner and confirmed trainer only</small></span><textarea name="healthNotes" maxLength={4000} rows={5} value={draft.healthNotes} onChange={event => updateDraft('healthNotes', event.currentTarget.value)} /></label>
      <label className="ui-field"><span className="ui-field-label">Initial membership plan</span><select key={state.result?.status ?? 'draft'} name="membershipPlanId" required value={draft.membershipPlanId} onChange={event => updateDraft('membershipPlanId', event.currentTarget.value)}>
        <option value="" disabled>Select a plan</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {plan.price} {plan.currency} · {plan.durationDays} days</option>)}
      </select></label>
      {plans.length === 0 ? <Feedback tone="error">Create an active membership plan before registering a member.</Feedback> : null}
      <p className="ui-field-hint">Registration records the agreed membership value. It does not record a cash payment.</p>
      <Button className="gym-button" type="submit" pending={pending} disabled={!plans.length}>{result?.status === 'PENDING' ? 'Check consent and finish enrollment' : 'Register member'}</Button>
    </form> : password ? <div className="stack-form" aria-live="polite">
      <p>Copy this temporary password and hand it to the member securely. It is shown once and expires in 24 hours. The member must change it when signing in.</p>
      <label className="ui-field"><span className="ui-field-label">Temporary password</span><input readOnly value={password} onFocus={event => event.currentTarget.select()} /></label>
      <Button type="button" variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(password); setCopied(true); setHandoffError(''); } catch { setHandoffError('Clipboard access was denied. Select and copy the password manually, then confirm below.'); } }}>Copy temporary password</Button>
      <Button type="button" variant="secondary" pending={busy} disabled={busy} onClick={reissue}>I lost this password — replace it</Button>
      <Button type="button" pending={busy} disabled={busy} onClick={continueToProfile}>{copied ? 'Continue to member profile' : 'I have recorded the password'}</Button>
      {handoffError ? <Feedback tone="error">{handoffError}</Feedback> : null}
    </div> : <div className="stack-form" aria-live="polite">
      <Feedback tone="success">{completed && !completed.credentialDeliveryVersion
        ? 'The existing identity accepted the gym link. No password was created, changed or shared.'
        : 'Member and initial membership are committed. The one-time password is not replayable; issue a replacement if the handoff was lost.'}</Feedback>
      {completed ? <p>Membership: {completed.term.planName}, {completed.term.startDate} through {completed.term.endDateExclusive} (end date exclusive). Agreed value: {completed.term.agreedPrice} {completed.term.currency}.</p> : null}
      {completed?.credentialDeliveryVersion !== undefined ? <Button type="button" variant="secondary" pending={busy} onClick={reissue}>Issue a replacement password</Button> : null}
      {completed ? <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(completed.memberId)}`}>Open member profile</a> : null}
      {handoffError ? <Feedback tone="error">{handoffError}</Feedback> : null}
    </div>}
  </Card>;
}
