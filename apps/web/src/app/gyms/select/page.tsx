import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveCurrentSession } from '@/lib/navigation';
import { gymRolePath, SESSION_COOKIE } from '@/lib/gymos';
import { signOut } from '../../actions';
import { Button, LoadingState } from '@/components/ui';

async function GymSelectionContent() {
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
  const session = await response.json() as { globalRole: string; gyms: { id: string; slug: string; name: string; role: 'OWNER' | 'TRAINER' | 'MEMBER' }[] };
  if (session.globalRole === 'SUPER_ADMIN') redirect('/admin');
  if (session.gyms.length === 0) redirect('/no-access');
  if (session.gyms.length === 1) {
    const gym = session.gyms[0];
    if (gym) redirect(`/gyms/${encodeURIComponent(gym.slug)}/${gymRolePath(gym.role)}`);
  }

  return <main className="auth-shell"><section className="form-card auth-card" aria-labelledby="gym-selection-heading">
    <div className="eyebrow dark">YOUR WORKSPACES</div>
    <h1 id="gym-selection-heading">Choose a gym</h1>
    <p className="muted">Select the gym workspace you want to open.</p>
    <div className="stack-form">
      {session.gyms.map((gym) => <a className="primary-button" key={gym.id}
        href={`/gyms/${encodeURIComponent(gym.slug)}/${gym.role === 'OWNER' ? 'owner' : gymRolePath(gym.role)}`}>
        {gym.name} <span>{gym.role.toLowerCase()} →</span>
      </a>)}
    </div>
    <form action={signOut} data-session-exit><Button type="submit" variant="secondary">Sign out</Button></form>
  </section></main>;
}

export default function GymSelectionPage() {
  return <Suspense fallback={<LoadingState label="Loading your gyms…" page />}><GymSelectionContent /></Suspense>;
}

