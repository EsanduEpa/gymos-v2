'use client';
import { useActionState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Feedback } from '@/components/ui';
import { refreshPlatformSummaries } from '@/app/platform-actions';
import type { PlatformSummaryRefreshState } from '@/app/platform-actions';

export function RefreshSummaries({ cursor }: { cursor?: string }) {
  const [state, action, pending] = useActionState<PlatformSummaryRefreshState, FormData>(refreshPlatformSummaries, {});
  return <form action={action} className="platform-refresh-form"><input type="hidden" name="cursor" value={state.nextCursor ?? cursor ?? ''}/>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}
    {state.success ? <Feedback tone="success">{state.success}{state.nextCursor ? ' Refresh the next batch to continue.' : ' This refresh batch is complete.'}</Feedback> : null}
    <div><span>Refresh checks up to 25 workspaces at a time.</span><Button type="submit" variant="secondary" pending={pending} pendingLabel="Refreshing summaries…"><RefreshCw size={15}/>{state.nextCursor || cursor ? 'Refresh next 25 gyms' : 'Refresh first 25 gyms'}</Button></div>
  </form>;
}
