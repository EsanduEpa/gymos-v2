'use client';

import { useActionState, type ReactNode } from 'react';
import { saveJournalEntry, type JournalActionState, type JournalFormKind } from '@/app/training-journal-actions';
import { Button, Feedback } from '@/components/ui';

export function JournalForm({ slug, kind, id = null, version = null, label, children }: {
  slug: string; kind: JournalFormKind; id?: string | null; version?: number | null; label: string; children: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveJournalEntry.bind(null, slug, kind, id, version), {} satisfies JournalActionState);
  return <form action={action} className="stack-form">
    {children}
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    <Button type="submit" pending={pending}>{label}</Button>
  </form>;
}
