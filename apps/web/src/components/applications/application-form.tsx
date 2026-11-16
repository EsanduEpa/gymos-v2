'use client';

import { useActionState } from 'react';
import { submitAuthenticatedApplication, submitPublicApplication } from '@/app/application-actions';
import { Button, Feedback, Field } from '@/components/ui';
import type { ApplicationFormState } from '@/lib/application-form';

const initialState: ApplicationFormState = {};
const consentErrorId = 'application-consent-error';

export function ApplicationForm({ slug, signedIn = false }: { slug: string; signedIn?: boolean }) {
  const action = signedIn ? submitAuthenticatedApplication : submitPublicApplication;
  const [state, submit, pending] = useActionState(action.bind(null, slug), initialState);
  const { draft, fieldErrors: errors } = state;

  return (
    <form key={state.attempt} action={submit} className="stack-form">
      {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
      <Field label="Full name" name="fullName" autoComplete="name" required maxLength={120}
        defaultValue={draft?.fullName} error={errors?.fullName}/>
      {signedIn ? null : <Field label="Email address" type="email" name="email" autoComplete="email" required maxLength={254}
        defaultValue={draft?.email} error={errors?.email}/>}
      <Field label="Phone" type="tel" name="phone" autoComplete="tel" required maxLength={40}
        defaultValue={draft?.phone} error={errors?.phone}/>
      {signedIn ? null : <Field label="Create password" type="password" name="password" autoComplete="new-password" required maxLength={200}
        hint="Use at least 10 characters and include a number or symbol." error={errors?.password}/>}
      <label className="ui-checkbox">
        <input type="checkbox" name="consent" value="yes" required defaultChecked={draft?.consent}
          aria-invalid={errors?.consent ? true : undefined}
          aria-describedby={errors?.consent ? consentErrorId : undefined}/>
        <span>{signedIn
          ? 'I request to join this gym. The owner must approve my access.'
          : 'I am applying to join this gym and understand the owner must approve access. My account password remains mine.'}</span>
      </label>
      {errors?.consent ? <span className="ui-field-error" id={consentErrorId}>{errors.consent}</span> : null}
      <Button fullWidth type="submit" pending={pending} pendingLabel="Submitting…">Submit application</Button>
    </form>
  );
}
