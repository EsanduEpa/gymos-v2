import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createGym, signOut } from '../actions';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { Button, Card, CardHeader, EmptyState, Feedback, Field, LoadingState, PageHeader, StatCard, StatusBadge } from '@/components/ui';

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
    return <LoadingState label="The API is unavailable. Please try again shortly." page />;
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
        <form action={signOut}><Button variant="secondary" type="submit">Sign out</Button></form>
      </header>
      <div className="dashboard-content">
        <PageHeader eyebrow="PLATFORM CONTROL" title="Gym workspaces" description="Create an isolated space for each gym and its owner." action={<StatCard label="Total gyms" value={gyms.length} />} />
        {created ? <Feedback tone="success">{created} is ready. Its owner can sign in now.</Feedback> : null}
        {error && messages[error] ? <Feedback tone="error">{messages[error]}</Feedback> : null}
        <div className="dashboard-grid">
          <Card>
            <CardHeader eyebrow="NEW WORKSPACE" title="Create a gym" action={<span className="panel-icon">＋</span>} />
            <form action={createGym} className="stack-form">
              <Field label="Gym name" name="name" placeholder="Harbor Fitness" minLength={2} maxLength={100} required />
              <Field label="Gym slug" name="slug" placeholder="harbor-fitness" pattern="[a-z0-9]+(-[a-z0-9]+)*" hint="Used in the gym’s web address." required />
              <Field label="Owner email" type="email" name="ownerEmail" placeholder="owner@example.com" required />
              <Field label="Owner password" type="password" name="ownerPassword" minLength={12} autoComplete="new-password" hint="Give this password to the owner through a secure channel." required />
              <Button fullWidth type="submit">Create gym <span>→</span></Button>
            </form>
          </Card>
          <Card>
            <CardHeader eyebrow="WORKSPACES" title="Existing gyms" />
            {gyms.length === 0 ? <EmptyState title="No gyms yet." hint="Create the first one using the form." /> : (
              <div className="gym-list">
                {gyms.map((gym) => <div className="gym-list-row" key={gym.id}>
                  <span className="gym-avatar">{gym.name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{gym.name}</strong><small>{gym.slug}</small></div>
                  <StatusBadge status={gym.status} />
                </div>)}
              </div>
            )}
          </Card>
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
  return <Suspense fallback={<LoadingState label="Loading gyms…" page />}><AdminContent searchParams={searchParams} /></Suspense>;
}
