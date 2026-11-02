'use client';

import { useActionState } from 'react';
import { trainerEnrollmentConsentAction, type TrainerEnrollmentConsentActionState } from '@/app/trainer-actions';
import { Button, Feedback } from '@/components/ui';

export function TrainerEnrollmentConsentForm({ slug, operationId }: { slug: string; operationId: string }) {
  const [state, action, pending] = useActionState(trainerEnrollmentConsentAction.bind(null, slug, operationId), {} satisfies TrainerEnrollmentConsentActionState);
  if (state.result?.status === 'CONSENT_RECORDED') return <Feedback tone="success">Your consent is recorded. The owner can finish enrollment. No password was shared.</Feedback>;
  if (state.result?.status === 'CONSENT_DECLINED') return <Feedback tone="info">You declined this trainer enrollment.</Feedback>;
  return <form action={action} className="stack-form"><label className="ui-field"><span className="ui-field-label">Current password</span><input name="currentPassword" type="password" autoComplete="current-password" required maxLength={1024}/></label>{state.error ? <Feedback tone="error">{state.error}</Feedback> : null}<div className="button-row"><Button type="submit" name="decision" value="ACCEPT" pending={pending}>Accept trainer enrollment</Button><Button type="submit" variant="secondary" name="decision" value="DECLINE" pending={pending}>Decline</Button></div></form>;
}
