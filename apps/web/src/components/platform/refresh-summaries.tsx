'use client';
import { useActionState } from 'react';
import { Button, Feedback } from '@/components/ui';
import { refreshPlatformSummaries } from '@/app/platform-actions';
import type { PlatformSummaryRefreshState } from '@/app/platform-actions';

export function RefreshSummaries({ cursor }: { cursor?: string }) {
  const [state, action, pending] = useActionState<PlatformSummaryRefreshState, FormData>(refreshPlatformSummaries, {});
  return <form action={action} className="stack-form"><input type="hidden" name="cursor" value={cursor ?? ''}/>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}{state.success ? <Feedback tone="success">{state.success}{state.nextCursor ? ' More gyms remain; refresh the next batch to continue.' : ' All cached summaries are current.'}</Feedback> : null}
    <Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Refreshing bounded batch…' : cursor ? 'Refresh next 25 gyms' : 'Refresh first 25 gyms'}</Button>
  </form>;
}
