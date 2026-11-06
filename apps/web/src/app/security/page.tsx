import Link from 'next/link';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { sessionListSchema } from '@gymos/contracts';
import { Button, Card, CardHeader, Feedback } from '@/components/ui';
import { revokeIdentitySession, signOut, signOutAll } from '@/app/actions';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

async function SecurityContent({ searchParams }: { searchParams: Promise<{ revoked?: string; error?: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let sessionsResponse: Response;
  let sessionResponse: Response;
  try {
    [sessionsResponse, sessionResponse] = await Promise.all([
      fetch(apiUrl('/auth/sessions'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }),
      fetch(apiUrl('/auth/session'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }),
    ]);
  } catch { return <main className="platform-page"><h1>Security</h1><Feedback tone="error">Session information is unavailable. Try again shortly.</Feedback></main>; }
  if (sessionsResponse.status === 401 || sessionResponse.status === 401) redirect('/login?error=expired');
  if (sessionsResponse.status === 403 || sessionResponse.status === 403) redirect('/change-password');
  const sessions = sessionsResponse.ok ? sessionListSchema.safeParse(await sessionsResponse.json().catch(() => null)) : null;
  const session = sessionResponse.ok ? currentSessionSchema.safeParse(await sessionResponse.json().catch(() => null)) : null;
  if (!sessions?.success || !session?.success) return <main className="platform-page"><h1>Security</h1><Feedback tone="error">Session information could not be confirmed.</Feedback></main>;
  const { revoked, error } = await searchParams;
  const current = session.data;
  return <main className="platform-page security-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">ACCOUNT SECURITY</span><h1>Security</h1><p>Review devices that can access your GymOS account.</p></div><Link href="/" className="ui-button ui-button-secondary">Back to workspace</Link></header>
    {revoked && <Feedback tone="success">The selected device was signed out.</Feedback>}
    {error === 'unavailable' && <Feedback tone="error">Session changes could not be confirmed. Refresh the list before retrying.</Feedback>}
    {error === 'invalid' && <Feedback tone="error">That session could not be selected.</Feedback>}
    <Card><CardHeader eyebrow="THIS DEVICE" title={current.deviceLabel}/><p>{current.deviceClass === 'PERSONAL' ? 'Personal device' : 'Shared device'} · Last activity {new Date(current.lastActivityAt).toLocaleString('en', { timeZone: 'UTC', timeZoneName: 'short' })}</p>
      <p className="muted">Access tokens are short-lived. Your selected session can renew while its inactivity and maximum lifetime limits remain valid.</p></Card>
    <section aria-label="Signed-in devices"><h2>Signed-in devices</h2>{sessions.data.items.length === 0 ? <Card><p>No active devices were found.</p></Card> : sessions.data.items.map(item => <Card key={item.id} className="security-session-card"><CardHeader eyebrow={item.current ? 'THIS DEVICE' : item.deviceClass === 'PERSONAL' ? 'PERSONAL DEVICE' : 'SHARED DEVICE'} title={item.deviceLabel}/><p>Last active {new Date(item.lastActivityAt).toLocaleString('en', { timeZone: 'UTC', timeZoneName: 'short' })}</p><p className="muted">Session ends after inactivity or by {new Date(item.absoluteExpiresAt).toLocaleString('en', { timeZone: 'UTC', timeZoneName: 'short' })}.</p>
      {item.current ? <form action={signOut}><Button variant="secondary" type="submit">Sign out this device</Button></form>
        : <form action={revokeIdentitySession.bind(null, item.id)}><Button variant="secondary" type="submit">Sign out this device</Button></form>}</Card>)}</section>
    <Card><CardHeader eyebrow="ALL DEVICES" title="End every signed-in session"/><p>This signs out every device, including this one. You’ll need to enter your password again.</p><form action={signOutAll}><Button variant="secondary" type="submit">Sign out all devices</Button></form></Card>
  </main>;
}

export default function SecurityPage({ searchParams }: { searchParams: Promise<{ revoked?: string; error?: string }> }) {
  return <Suspense fallback={<main className="page-loading">Loading security settings…</main>}><SecurityContent searchParams={searchParams}/></Suspense>;
}
