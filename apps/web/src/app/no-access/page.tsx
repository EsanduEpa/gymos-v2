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
  return <main className="auth-shell themed-workspace application-status-shell">
    <div className="auth-illustration"><Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
      <div className="auth-illustration-copy"><div className="eyebrow">YOUR ACCOUNT</div><h1>Your gym journey starts here.</h1>
        <p>Keep track of your application and join your gym once enrollment is complete.</p></div>
      <span className="auth-footnote">GymOS V2 · Member access</span></div>
    <section className="auth-form-wrap"><div className="form-card auth-card"><div className="eyebrow dark">ACCESS STATUS</div>
      <h2>No active gym access</h2><p className="muted">Your account is ready. Gym features appear after the owner approves your application and enrollment completes.</p>
      <div className="application-status-actions"><Link className="ui-button ui-button-primary" href="/applications">View application status</Link>
        <Link className="ui-button ui-button-secondary" href="/apply">Apply to join a gym</Link></div>
      <p className="form-note"><Link href="/help">Need help with your access?</Link></p>
      <form action={signOut} data-session-exit><Button variant="secondary" type="submit">Sign out</Button></form>
    </div></section></main>;
}

export default function NoAccessPage() {
  return <Suspense fallback={<LoadingState label="Loading account access…" page />}><NoAccessContent /></Suspense>;
}
