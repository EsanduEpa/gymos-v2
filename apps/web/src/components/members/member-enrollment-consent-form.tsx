'use client';

import { useActionState } from 'react';
import { memberEnrollmentConsentAction, type MemberEnrollmentConsentActionState } from '@/app/member-actions';
import { Button, Feedback } from '@/components/ui';

export function MemberEnrollmentConsentForm({ slug, operationId }: { slug: string; operationId: string }) {
  const [state, action, pending] = useActionState(
    memberEnrollmentConsentAction.bind(null, slug, operationId),
    {} satisfies MemberEnrollmentConsentActionState,
  );
  if (state.result?.status === 'CONSENT_RECORDED') return <Feedback tone="success">
    Your consent is securely recorded. The gym owner can now finish your enrollment. No password was shared with the gym.
  </Feedback>;
  if (state.result?.status === 'CONSENT_DECLINED') return <Feedback tone="info">
    You declined this enrollment. The gym owner cannot link your account through this request.
  </Feedback>;

  return <form action={action} className="stack-form">
    <p>This request asks to link your existing GymOS identity to one gym as a member. Your current password is used only to confirm that you control this identity. It is never shown to the gym owner or saved in the enrollment record.</p>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    <label className="ui-field"><span className="ui-field-label">Current password</span>
      <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={1024} />
    </label>
    <div className="button-row">
      <Button className="gym-button" type="submit" name="decision" value="ACCEPT" pending={pending}>Accept gym enrollment</Button>
      <Button type="submit" variant="secondary" name="decision" value="DECLINE" pending={pending}>Decline</Button>
    </div>
  </form>;
}
