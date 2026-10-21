import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createGym, signOut } from '../actions';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

type GymRow = { id: string; name: string; slug: string; status: string };

const messages: Record<string, string> = {
  'gym-input': 'Check the gym details. Owner passwords need at least 12 characters.',
  duplicate: 'That gym slug or owner email is already in use.',
  forbidden: 'Your account does not have Super Admin access.',
  unavailable: 'Gym creation could not finish. Check the API and try again.',
};

async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  let response: Response;
  try {
    response = await fetch(apiUrl('/admin/gyms'), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return <main className="page-loading">The API is unavailable. Please try again shortly.</main>;
  }
  if (response.status === 401) redirect('/login');
  if (response.status === 403) {
    return <main className="page-loading">This account cannot open Super Admin. <Link href="/login">Use another account</Link>.</main>;
  }
  if (!response.ok) return <main className="page-loading">Could not load gyms right now.</main>;

  const gyms = (await response.json()) as GymRow[];
  const { error, created } = await searchParams;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
        <span className="header-label">Super Admin</span>
        <form action={signOut}><button className="text-button" type="submit">Sign out</button></form>
      </header>
      <div className="dashboard-content">
        <div className="section-heading">
          <div><div className="eyebrow dark">PLATFORM CONTROL</div><h1>Gym workspaces</h1><p>Create an isolated space for each gym and its owner.</p></div>
          <div className="metric-card"><strong>{gyms.length}</strong><span>Total gyms</span></div>
        </div>
        {created ? <p className="notice success" role="status">{created} is ready. Its owner can sign in now.</p> : null}
        {error && messages[error] ? <p className="notice error" role="alert">{messages[error]}</p> : null}
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow dark">NEW WORKSPACE</span><h2>Create a gym</h2></div><span className="panel-icon">＋</span></div>
            <form action={createGym} className="stack-form">
              <label>Gym name<input name="name" placeholder="Harbor Fitness" minLength={2} maxLength={100} required /></label>
              <label>Gym slug<input name="slug" placeholder="harbor-fitness" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /><small>Used in the gym’s web address.</small></label>
              <label>Owner email<input type="email" name="ownerEmail" placeholder="owner@example.com" required /></label>
              <label>Owner password<input type="password" name="ownerPassword" minLength={12} autoComplete="new-password" required /><small>Give this password to the owner through a secure channel.</small></label>
              <button className="primary-button full" type="submit">Create gym <span>→</span></button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow dark">WORKSPACES</span><h2>Existing gyms</h2></div></div>
            {gyms.length === 0 ? <p className="empty-state">No gyms yet. Create the first one using the form.</p> : (
              <div className="gym-list">
                {gyms.map((gym) => <div className="gym-list-row" key={gym.id}>
                  <span className="gym-avatar">{gym.name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{gym.name}</strong><small>{gym.slug}</small></div>
                  <span className={`status-pill ${gym.status.toLowerCase()}`}>{gym.status}</span>
                </div>)}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  return <Suspense fallback={<main className="page-loading">Loading gyms…</main>}><AdminContent searchParams={searchParams} /></Suspense>;
}
