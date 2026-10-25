import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { createMember, signOut } from '@/app/actions';
import { apiUrl, gymRolePath, type GymTheme, type Member, SESSION_COOKIE } from '@/lib/gymos';
import { resolveCurrentSession } from '@/lib/navigation';
import { Button, Card, CardHeader, EmptyState, Feedback, Field, LoadingState, StatusBadge } from '@/components/ui';

const messages: Record<string, string> = {
  'member-input': 'Enter a member name and a valid email address.',
  duplicate: 'A member with that email already exists in this gym.',
  forbidden: 'Your account cannot add members to this gym.',
  unavailable: 'Could not reach the API. Please try again.',
};

async function GymPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  let themeResponse: Response;
  let accessResponse: Response;
  try {
    [themeResponse, accessResponse] = await Promise.all([
      fetch(apiUrl(`/gyms/${slug}/theme`), { cache: 'no-store' }),
      fetch(apiUrl(`/gyms/${slug}/access`), {
        headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
      }),
    ]);
  } catch {
    return <LoadingState label="The API is unavailable. Please try again shortly." page />;
  }

  if (accessResponse.status === 401) redirect('/login');
  if (themeResponse.status === 404 || accessResponse.status === 403) notFound();
  if (!themeResponse.ok || !accessResponse.ok) {
    return <main className="page-loading">Could not load this gym right now.</main>;
  }

  const theme = (await themeResponse.json()) as GymTheme;
  const access = (await accessResponse.json()) as { role: 'OWNER' | 'TRAINER' | 'MEMBER'; slug: string };
  if (access.slug !== slug) notFound();
  const currentResponse = await resolveCurrentSession(token);
  if (currentResponse.status === 401) redirect('/login');
  if (currentResponse.status === 403) redirect('/change-password');
  if (!currentResponse.ok) return <main className="page-loading">Could not load your account right now.</main>;
  const current = await currentResponse.json() as { gyms: { slug: string; role: string }[] };
  const currentGym = current.gyms.find((gym) => gym.slug === slug);
  if (!currentGym || currentGym.role !== access.role) notFound();
  if (access.role !== 'OWNER') redirect(`/gyms/${encodeURIComponent(slug)}/${gymRolePath(access.role)}`);
  let membersResponse: Response;
  try {
    membersResponse = await fetch(apiUrl(`/gyms/${slug}/members`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
  } catch {
    return <LoadingState label="The API is unavailable. Please try again shortly." page />;
  }
  if (membersResponse.status === 401) redirect('/login');
  if (membersResponse.status === 403 || membersResponse.status === 404) notFound();
  if (!membersResponse.ok) return <main className="page-loading">Could not load this gym right now.</main>;
  const members = (await membersResponse.json()) as Member[];
  const { error, created } = await searchParams;
  const brand = resolveGymBrandColors(theme.theme.primaryColor);
  const style = {
    '--gym-color': brand.primary,
    '--gym-on-color': brand.onPrimary,
  } as CSSProperties;
  const createMemberForGym = createMember.bind(null, slug);

  return (
    <main className="dashboard-shell gym-dashboard" style={style}>
      <header className="dashboard-header">
        <Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
        <span className="header-label">{theme.name}</span>
        <form action={signOut}><Button variant="secondary" type="submit">Sign out</Button></form>
      </header>
      <div className="dashboard-content">
        <div className="gym-banner">
          <div className="gym-logo">
            {theme.theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.theme.logoUrl ?? undefined} alt={`${theme.name} logo`} />
            ) : theme.name.slice(0, 1).toUpperCase()}
          </div>
          <div><span className="eyebrow">YOUR GYM WORKSPACE</span><h1>{theme.name}</h1><p>Members, all in one place.</p></div>
          <span className="role-pill">{access.role}</span>
        </div>
        {created ? <Feedback tone="success">Member added to {theme.name}.</Feedback> : null}
        {error ? <Feedback tone="error">{messages[String(error)] ?? 'This request could not be completed.'}</Feedback> : null}
        <div className="dashboard-grid">
          <Card>
            <CardHeader eyebrow="MEMBERSHIP" title="Members" action={<span className="count-badge">{members.length}</span>} />
            {members.length === 0 ? <EmptyState title="No members yet." hint="Add the first member to this gym." /> : (
              <div className="member-list">
                {members.map((member) => <div className="member-row" key={member.id}>
                  <span className="member-avatar">{member.fullName.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{member.fullName}</strong><small>{member.email ?? 'No email added'}</small></div>
                  <StatusBadge status={member.status} className="member-status" />
                </div>)}
              </div>
            )}
          </Card>
          {access.role === 'OWNER' ? <Card>
            <CardHeader eyebrow="GROW YOUR COMMUNITY" title="Add a member" action={<span className="panel-icon">＋</span>} />
            <form action={createMemberForGym} className="stack-form">
              <Field label="Full name" name="fullName" placeholder="Alex Morgan" minLength={2} maxLength={120} required />
              <Field label="Email address" optional type="email" name="email" placeholder="alex@example.com" />
              <Button className="gym-button" fullWidth type="submit">Add member <span>→</span></Button>
            </form>
          </Card> : null}
        </div>
      </div>
    </main>
  );
}

export function OwnerGymPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; created?: string }> }) {
  return <Suspense fallback={<LoadingState label="Loading gym…" page />}><GymPageContent {...props} /></Suspense>;
}

