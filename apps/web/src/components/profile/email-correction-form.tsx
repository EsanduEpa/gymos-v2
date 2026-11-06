'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, Feedback, Field } from '@/components/ui';
import { submitEmailCorrection, type EmailCorrectionActionState } from '@/app/email-correction-actions';

export function EmailCorrectionForm() {
  const [state, action, pending] = useActionState(submitEmailCorrection, { status: 'idle' } as EmailCorrectionActionState);
  const form = useRef<HTMLFormElement>(null); const router = useRouter();
  useEffect(() => { if (state.status === 'success') { form.current?.reset(); router.refresh(); }
    else if (state.status === 'error') { const password = form.current?.elements.namedItem('currentPassword'); if (password instanceof HTMLInputElement) password.value = ''; }
  }, [state.status, router]);
  return <Card><CardHeader eyebrow="LOGIN IDENTITY" title="Request an email correction"/>
    <p>This creates a staff follow-up request. It does not change your login email, gym contact details, access, or credentials. GymOS will not send a verification email.</p>
    {state.message ? <div role="status"><Feedback tone={state.status === 'success' ? 'success' : 'error'}>{state.message}</Feedback></div> : null}
    <form ref={form} action={action} className="profile-form">
      <Field label="Requested email" name="requestedEmail" type="email" autoComplete="email" maxLength={254} required/>
      <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" maxLength={1024} required hint="Used to confirm this request only; it is not stored with the request."/>
      <Button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Request staff follow-up'}</Button>
    </form>
  </Card>;
}
