'use client';

import { useState, type FormEvent } from 'react';
import { changePasswordAction, finishPasswordChangeAction, signOut } from '@/app/actions';
import { Button, Feedback, Field } from '@/components/ui';

export function ChangePasswordForm() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const result = await changePasswordAction(new FormData(event.currentTarget));
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="stack-form">
        <Feedback tone="success">Password updated. Sign in again with your new password.</Feedback>
        <Button fullWidth onClick={() => finishPasswordChangeAction()}>Continue to sign in</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack-form">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <Field label="Temporary password" name="currentPassword" type="password" autoComplete="current-password" required />
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={200}
        hint="10–200 characters, including a number or symbol; no leading or trailing spaces." required />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={200} required />
      <Button fullWidth type="submit" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</Button>
      <Button variant="secondary" fullWidth type="button" onClick={() => signOut()}>Sign out</Button>
    </form>
  );
}
