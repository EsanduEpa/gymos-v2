import { cookies } from 'next/headers';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, LoadingState } from '@/components/ui';
import { signOut } from '../actions';
import { resolveCurrentSession } from '@/lib/navigation';
import { SESSION_COOKIE } from '@/lib/gymos';

async function NoAccessContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await resolveCurrentSession(token);
  } catch {
    return <main className="page-loading">GymOS is temporarily unavailable. Please try again shortly.</main>;
  }
  if (response.status === 401) redirect('/login');
  if (response.status === 403) redirect('/change-password');
  if (!response.ok) return <main className="page-loading">Could not load your account right now.</main>;
  const session = await response.json() as { globalRole: string; gyms: unknown[] };
  if (session.globalRole === 'SUPER_ADMIN') redirect('/admin');
  if (session.gyms.length > 0) redirect('/');
  return <main className="auth-shell"><section className="form-card auth-card">
    <div className="eyebrow dark">YOUR WORKSPACE</div>
    <h1>No active gym access</h1>
    <p className="muted">Ask your gym administrator to grant access, or review a member application linked to this account.</p>
    <p><Link href="/applications">View application status</Link> · <Link href="/apply">Apply to join a gym</Link></p>
    <form action={signOut} data-session-exit><Button variant="secondary" type="submit">Sign out</Button></form>
  </section></main>;
}

export default function NoAccessPage() {
  return <Suspense fallback={<LoadingState label="Loading account access…" page />}><NoAccessContent /></Suspense>;
}
