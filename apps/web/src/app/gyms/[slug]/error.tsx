'use client';
import Link from 'next/link';
import { signOut } from '@/app/actions';
import { Button } from '@/components/ui';
export default function GymError({ reset }: { reset: () => void }) {
  return <main className="shell-state"><div><h1>Could not load this workspace</h1><p>GymOS is temporarily unavailable. Try again or return to your current workspaces.</p><Button onClick={reset}>Try again</Button> <Link prefetch={false} className="ui-button ui-button-secondary" href="/">Return to Dashboard</Link><form action={signOut} data-session-exit><Button variant="secondary" type="submit">Sign out</Button></form></div></main>;
}
