import Link from 'next/link';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { signOut } from '../../actions';
import { Button, LoadingState } from '@/components/ui';
import { resolveCurrentSession } from '@/lib/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

async function GymRoleContent({
  params,
  expectedRole,
}: {
  params: Promise<{ slug: string }>;
  expectedRole: 'TRAINER' | 'MEMBER';
}) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let accessResponse: Response;
  let themeResponse: Response;
  try {
    [accessResponse, themeResponse] = await Promise.all([
      fetch(apiUrl(`/gyms/${slug}/access`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }),
      fetch(apiUrl(`/gyms/${slug}/theme`), { cache: 'no-store' }),
    ]);
  } catch {
    return <LoadingState label="The API is unavailable. Please try again shortly." page />;
  }
  if (accessResponse.status === 401) redirect('/login');
  if (accessResponse.status === 403 || accessResponse.status === 404 || themeResponse.status === 404) notFound();
  if (!accessResponse.ok || !themeResponse.ok) return <main className="page-loading">Could not load this gym right now.</main>;
  const access = await accessResponse.json() as { slug: string; role: string };
  const theme = await themeResponse.json() as { name: string };
  if (access.slug !== slug) notFound();
  if (access.role !== expectedRole) redirect(`/gyms/${encodeURIComponent(slug)}/${access.role === 'OWNER' ? 'owner' : access.role === 'TRAINER' ? 'trainer' : 'member'}`);
  const current = await resolveCurrentSession(token);
  if (current.status === 401) redirect('/login');
  if (current.status === 403) redirect('/change-password');
  if (!current.ok) return <main className="page-loading">Could not load your account right now.</main>;
  const session = await current.json() as { gyms: { slug: string; role: string; name: string }[] };

  return <main className="dashboard-shell gym-dashboard">
    <header className="dashboard-header">
      <Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
      <span className="header-label">{theme.name}</span>
      <form action={signOut}><Button variant="secondary" type="submit">Sign out</Button></form>
    </header>
    <div className="dashboard-content">
      <div className="gym-banner"><div className="gym-logo">{theme.name.slice(0, 1).toUpperCase()}</div>
        <div><span className="eyebrow">YOUR GYM WORKSPACE</span><h1>{theme.name}</h1>
          <p>{expectedRole === 'TRAINER' ? 'Your trainer workspace.' : 'Your member workspace.'}</p></div>
        <span className="role-pill">{expectedRole}</span>
      </div>
      {session.gyms.length > 1 ? <nav aria-label="Switch gym" className="gym-list">
        {session.gyms.filter((gym) => gym.slug !== slug).map((gym) => <Link className="topbar-link" key={gym.slug}
          href={`/gyms/${encodeURIComponent(gym.slug)}/${gym.role === 'OWNER' ? 'owner' : gym.role === 'TRAINER' ? 'trainer' : 'member'}`}>
          Switch to {gym.name}
        </Link>)}
      </nav> : null}
      <p className="muted">Your role specific tools will appear here.</p>
    </div>
  </main>;
}

export function GymRolePage(props: {
  params: Promise<{ slug: string }>;
  expectedRole: 'TRAINER' | 'MEMBER';
}) {
  return <Suspense fallback={<LoadingState label="Loading gym workspace…" page />}>
    <GymRoleContent {...props} />
  </Suspense>;
}
