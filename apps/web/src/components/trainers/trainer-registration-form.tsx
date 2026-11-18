'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acknowledgeMemberCredential, reissueMemberCredential } from '@/app/member-actions';
import { registerTrainerAction } from '@/app/trainer-actions';
import type { TrainerRegistrationActionState } from '@/app/trainer-actions';
import { Button, Feedback } from '@/components/ui';

export function TrainerRegistrationForm({ slug, initialRequestKey }: { slug: string; initialRequestKey: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(registerTrainerAction.bind(null, slug), { idempotencyKey: initialRequestKey } satisfies TrainerRegistrationActionState);
  const submitting = useRef(false);
  useEffect(() => { submitting.current = false; }, [state]);
  const [requestKey, setRequestKey] = useState(initialRequestKey);
  const [draft, setDraft] = useState({ fullName: '', email: '', phone: '', level: 'LEVEL_1', yearsExperience: '', specialisations: '', shiftStart: '', shiftEnd: '', bio: '' });
  const updateDraft = (field: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const [handoff, setHandoff] = useState<{ password?: string; version: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();
  const retryableReissue = useRef<{ expectedVersion: number; idempotencyKey: string } | null>(null);
  const complete = state.result?.status === 'COMPLETE' ? state.result : null;
  const password = handoff ? handoff.password : complete?.temporaryPassword;
  const deliveryVersion = handoff?.version ?? complete?.credentialDeliveryVersion;

  function acknowledge() {
    if (!complete || deliveryVersion === undefined) return;
    setError('');
    startTransition(async () => {
      const result = await acknowledgeMemberCredential(slug, complete.operationId, deliveryVersion);
      if (!result.ok) { setError(result.error); return; }
      router.push(`/gyms/${encodeURIComponent(slug)}/owner`);
    });
  }

  function reissue() {
    if (!complete || deliveryVersion === undefined) return;
    setError('');
    if (retryableReissue.current?.expectedVersion !== deliveryVersion) {
      retryableReissue.current = { expectedVersion: deliveryVersion, idempotencyKey: `trainer-reissue-${crypto.randomUUID()}` };
    }
    const request = retryableReissue.current;
    startTransition(async () => {
      const result = await reissueMemberCredential(slug, complete.operationId, request.expectedVersion, request.idempotencyKey);
      if (!result.ok) { setError(result.error); return; }
      retryableReissue.current = null;
      setCopied(false);
      setHandoff({ password: result.result.temporaryPassword, version: result.result.deliveryVersion });
      if (!result.result.temporaryPassword) setError('The replacement password was already issued and cannot be displayed again. Issue another replacement before handoff.');
    });
  }

  return <div className="stack-form">
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    {state.result?.status === 'PENDING' ? <Feedback tone="warning">This email belongs to an existing identity. They must sign in and explicitly accept this gym enrollment before it can finish. Share this consent link: <a href={`/gyms/${encodeURIComponent(slug)}/trainer-enrollment-consent/${encodeURIComponent(state.result.operationId)}`}>Review trainer enrollment</a> · <code>{state.result.operationId}</code></Feedback> : null}
    {!complete ? <form action={action} className="stack-form trainer-registration-fields" onSubmit={event => {
      // Keep a queued replay from replacing the first result's password.
      if (submitting.current) { event.preventDefault(); return; }
      submitting.current = true;
      const values = new FormData(event.currentTarget);
      setDraft(current => Object.fromEntries(Object.keys(current).map(key => [key, String(values.get(key) ?? '')])) as typeof current);
    }}>
      <label className="ui-field trainer-field-full"><span className="ui-field-label">Enrollment reference</span><input name="idempotencyKey" autoComplete="off" minLength={16} maxLength={128} required value={requestKey} onChange={event => setRequestKey(event.currentTarget.value)}/><small>Keep this reference. If the result is uncertain, enter it again with the same trainer details to resume the enrollment.</small></label>
      <label className="ui-field trainer-field-full"><span className="ui-field-label">Full name</span><input name="fullName" autoComplete="name" minLength={2} maxLength={120} required value={draft.fullName} onChange={event => updateDraft('fullName', event.target.value)}/></label>
      <label className="ui-field trainer-field-half"><span className="ui-field-label">Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} required value={draft.email} onChange={event => updateDraft('email', event.target.value)}/></label>
      <label className="ui-field trainer-field-half"><span className="ui-field-label">Phone</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} required value={draft.phone} onChange={event => updateDraft('phone', event.target.value)}/></label>
      <label className="ui-field trainer-field-half"><span className="ui-field-label">Level</span><select name="level" value={draft.level} onChange={event => updateDraft('level', event.target.value)}><option value="LEVEL_1">Level 1</option><option value="LEVEL_2">Level 2</option></select></label>
      <label className="ui-field trainer-field-half"><span className="ui-field-label">Years of experience <small>optional</small></span><input name="yearsExperience" type="number" min="0" max="80" step="1" value={draft.yearsExperience} onChange={event => updateDraft('yearsExperience', event.target.value)}/></label>
      <label className="ui-field trainer-field-full"><span className="ui-field-label">Specialisations <small>comma separated</small></span><input name="specialisations" maxLength={500} value={draft.specialisations} onChange={event => updateDraft('specialisations', event.target.value)}/></label>
      <label className="ui-field trainer-field-half"><span className="ui-field-label">Shift start <small>optional</small></span><input name="shiftStart" type="time" value={draft.shiftStart} onChange={event => updateDraft('shiftStart', event.target.value)}/></label>
      <label className="ui-field trainer-field-half"><span className="ui-field-label">Shift end <small>optional</small></span><input name="shiftEnd" type="time" value={draft.shiftEnd} onChange={event => updateDraft('shiftEnd', event.target.value)}/></label>
      <label className="ui-field trainer-field-full"><span className="ui-field-label">Bio <small>optional</small></span><textarea name="bio" maxLength={2000} rows={4} value={draft.bio} onChange={event => updateDraft('bio', event.target.value)}/></label>
      <Button className="gym-button" type="submit" pending={pending}>Register trainer</Button>
    </form> : password ? <div className="stack-form" aria-live="polite">
      <p>Copy the one-time temporary password and hand it to the trainer securely. They must change it at first sign-in.</p>
      <label className="ui-field"><span className="ui-field-label">Temporary password</span><input readOnly value={password} onFocus={event => event.currentTarget.select()}/></label>
      <Button type="button" variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(password); setCopied(true); setError(''); } catch { setError('Clipboard access failed. Select and copy the password manually before confirming.'); } }}>Copy temporary password</Button>
      <Button type="button" variant="secondary" pending={busy} onClick={reissue}>I lost this password — replace it</Button>
      <Button type="button" pending={busy} disabled={busy} onClick={acknowledge}>{copied ? 'Continue' : 'I have recorded the password'}</Button>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
    </div> : <div className="stack-form" aria-live="polite">
      <Feedback tone="success">{deliveryVersion === undefined
        ? 'Trainer registration is complete. The existing identity keeps its current password.'
        : 'Trainer registration is complete. Issue a replacement if the one-time password handoff was lost.'}</Feedback>
      {state.profile ? <p>{state.profile.fullName} · {state.profile.email} · {state.profile.level}</p> : null}
      {deliveryVersion !== undefined ? <Button type="button" variant="secondary" pending={busy} onClick={reissue}>Issue replacement password</Button> : null}
      <Button type="button" onClick={() => router.push(`/gyms/${encodeURIComponent(slug)}/owner`)}>Return to workspace</Button>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
    </div>}
  </div>;
}
