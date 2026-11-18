'use client';

import { useState, useTransition } from 'react';
import { saveTrainerSessionPay } from '@/app/trainer-management-actions';
import { Button, Feedback, Field } from '@/components/ui';

export function TrainerSessionPayForm({ slug, trainerId, version, amount, currency }: {
  slug: string; trainerId: string; version: number; amount: string | null; currency: string;
}) {
  const [draft, setDraft] = useState(amount ?? '');
  const [savedVersion, setSavedVersion] = useState(version);
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof saveTrainerSessionPay>> | null>(null);
  const [pending, startTransition] = useTransition();
  return <form className="stack-form" onSubmit={event => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveTrainerSessionPay(slug, trainerId, draft.trim() || null, Math.max(version, savedVersion));
      setFeedback(result);
      if (result.data) {
        setSavedVersion(result.data.version);
        setDraft(result.data.amount ?? '');
      }
    });
  }}>
    <Field label={`Pay per completed session (${currency})`} name="sessionPayOverride" inputMode="decimal" optional value={draft}
      onChange={event => setDraft(event.currentTarget.value)} error={feedback?.fieldError} hint="Leave blank to use the gym’s level default. The off-shift premium still applies."/>
    {feedback?.error ? <Feedback tone="error">{feedback.error}</Feedback> : null}
    {feedback?.data ? <Feedback tone="success">Trainer pay saved for future confirmations.</Feedback> : null}
    <Button type="submit" pending={pending}>Save trainer pay</Button>
  </form>;
}
