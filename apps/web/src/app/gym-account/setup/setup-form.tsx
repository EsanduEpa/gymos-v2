'use client';

import { useActionState } from 'react';
import { setupGymAccount, type SetupState } from './actions';
import { Button, Feedback, Field } from '@/components/ui';

export function SetupForm() {
  const [state, action, pending] = useActionState(setupGymAccount, {} as SetupState);
  return <form action={action} className="stack-form">
    <Field label="Gym address name" name="gymSlug" type="text" required />
    <Field label="Existing email address" name="legacyEmail" type="email" autoComplete="email" required />
    <Field label="Existing password" name="legacyPassword" type="password" autoComplete="current-password" required />
    <Field label="New username for this gym" name="username" type="text" autoComplete="username" required />
    <Field label="New password for this gym" name="newPassword" type="password" autoComplete="new-password" required />
    <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required />
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    <Button type="submit" fullWidth disabled={pending}>{pending ? 'Setting up…' : 'Set up gym account'}</Button>
  </form>;
}
