import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { createMember, signOut } from '../../actions';
import { apiUrl, type GymTheme, type Member, SESSION_COOKIE } from '@/lib/gymos';

const messages: Record<string, string> = {
  'member-input': 'Enter a member name and a valid email address.',
  duplicate: 'A member with that email already exists in this gym.',
  forbidden: 'Your account cannot add members to this gym.',
  unavailable: 'Could not reach the API. Please try again.',
};

async function GymContent({
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
  let membersResponse: Response;
  try {
    [themeResponse, accessResponse, membersResponse] = await Promise.all([
      fetch(apiUrl(`/gyms/${slug}/theme`), { cache: 'no-store' }),
      fetch(apiUrl(`/gyms/${slug}/access`), {
        headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
      }),
      fetch(apiUrl(`/gyms/${slug}/members`), {
        headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
      }),
    ]);
  } catch {
    return <main className="page-loading">The API is unavailable. Please try again shortly.</main>;
  }

  if (accessResponse.status === 401 || membersResponse.status === 401) redirect('/login');
  if (themeResponse.status === 404 || accessResponse.status === 403) notFound();
  if (!themeResponse.ok || !accessResponse.ok || !membersResponse.ok) {
    return <main className="page-loading">Could not load this gym right now.</main>;
  }

  const theme = (await themeResponse.json()) as GymTheme;
  const access = (await accessResponse.json()) as { role: string };
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
        <form action={signOut}><button className="text-button" type="submit">Sign out</button></form>
      </header>
      <div className="dashboard-content">
        <div className="gym-banner">
          <div className="gym-logo">
            {theme.theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.theme.logoUrl} alt={`${theme.name} logo`} />
            ) : theme.name.slice(0, 1).toUpperCase()}
          </div>
          <div><span className="eyebrow">YOUR GYM WORKSPACE</span><h1>{theme.name}</h1><p>Members, all in one place.</p></div>
          <span className="role-pill">{access.role}</span>
        </div>
        {created ? <p className="notice success" role="status">Member added to {theme.name}.</p> : null}
        {error && messages[error] ? <p className="notice error" role="alert">{messages[error]}</p> : null}
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow dark">MEMBERSHIP</span><h2>Members</h2></div><span className="count-badge">{members.length}</span></div>
            {members.length === 0 ? <p className="empty-state">No members yet. Add the first member to this gym.</p> : (
              <div className="member-list">
                {members.map((member) => <div className="member-row" key={member.id}>
                  <span className="member-avatar">{member.fullName.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{member.fullName}</strong><small>{member.email ?? 'No email added'}</small></div>
                  <span className="status-pill active">{member.status}</span>
                </div>)}
              </div>
            )}
          </section>
          {access.role === 'OWNER' ? <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow dark">GROW YOUR COMMUNITY</span><h2>Add a member</h2></div><span className="panel-icon">＋</span></div>
            <form action={createMemberForGym} className="stack-form">
              <label>Full name<input name="fullName" placeholder="Alex Morgan" minLength={2} maxLength={120} required /></label>
              <label>Email address <span className="optional">optional</span><input type="email" name="email" placeholder="alex@example.com" /></label>
              <button className="primary-button full gym-button" type="submit">Add member <span>→</span></button>
            </form>
          </section> : null}
        </div>
      </div>
    </main>
  );
}

export default function GymPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  return <Suspense fallback={<main className="page-loading">Loading gym…</main>}><GymContent params={params} searchParams={searchParams} /></Suspense>;
}
