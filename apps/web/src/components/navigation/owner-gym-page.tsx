import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { createMember } from '@/app/actions';
import { memberListSchema } from '@gymos/contracts';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { DashboardChrome } from './dashboard-chrome';
import { GymLogo } from './gym-logo';
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
  searchParams: Promise<{ error?: string; created?: string; q?: string; status?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const filters = await searchParams;
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(filters.status)) query.set('status', filters.status);
  if (filters.page) query.set('page', filters.page);
  query.set('pageSize', '25');
  let membersResponse: Response;
  try {
    membersResponse = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/members?${query.toString()}`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
  } catch {
    membersResponse = new Response(null, { status: 503 });
  }
  if (membersResponse.status === 401) redirect('/login');
  if (membersResponse.status === 403 || membersResponse.status === 404) notFound();
  const parsed = membersResponse.ok ? memberListSchema.safeParse(await membersResponse.json().catch(() => null)) : null;
  const memberPage = parsed?.success ? parsed.data : null;
  const members = memberPage?.items ?? [];
  const { error, created } = filters;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = {
    '--gym-color': brand.primary,
    '--gym-on-color': brand.onPrimary,
  } as CSSProperties;
  const createMemberForGym = createMember.bind(null, slug);

  return (
    <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
        <div className="gym-banner">
          <GymLogo key={theme.logoUrl} name={gym.name} url={theme.logoUrl} />
          <div><span className="eyebrow">YOUR GYM WORKSPACE</span><h1>{gym.name}</h1><p>Members, all in one place.</p></div>
          <span className="role-pill">{gym.role}</span>
        </div>
        {created ? <Feedback tone="success">Member added to {gym.name}.</Feedback> : null}
        {error ? <Feedback tone="error">{messages[String(error)] ?? 'This request could not be completed.'}</Feedback> : null}
        <div className="dashboard-grid">
          {memberPage ? <Card>
            <CardHeader eyebrow="MEMBERSHIP" title="Members" action={<span className="count-badge">{memberPage.totalCount}</span>} />
            <form method="get" className="member-directory-filters" role="search">
              <label className="ui-field"><span className="ui-field-label">Search members</span><input name="q" defaultValue={filters.q ?? ''} maxLength={120} placeholder="Name, email or phone"/></label>
              <label className="ui-field"><span className="ui-field-label">Status</span><select name="status" defaultValue={filters.status ?? ''}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="INACTIVE">Inactive</option></select></label>
              <button className="ui-button ui-button-secondary" type="submit">Apply filters</button>
            </form>
            <p>{memberPage.summary.operational} operational accounts · {memberPage.summary.basic} basic contacts · {memberPage.summary.historical} historical accounts in this result.</p>
            <p>{memberPage.summary.statuses.ACTIVE} active · {memberPage.summary.statuses.INACTIVE} inactive · {memberPage.summary.statuses.SUSPENDED} suspended in this result.</p>
            <p>{memberPage.summary.pendingEnrollments} pending enrollments in this gym. Pending accounts are hidden until recovery finishes.</p>
            {members.length === 0 ? <EmptyState title={filters.q || filters.status ? 'No matching members.' : 'No members yet.'} hint={filters.q || filters.status ? 'Change or clear the filters to see more members.' : 'Add the first member to this gym.'} /> : (
              <div className="member-list">
                {members.map((member) => <a className="member-row" key={member.id} href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(member.id)}`}>
                  <span className="member-avatar">{member.fullName.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{member.fullName}</strong><small>{member.currentTerm?.planName ?? 'No active membership'} · {member.email ?? 'No email added'}</small><small>{member.accountState === 'BASIC' ? 'Basic contact · no login account' : member.accountState === 'OPERATIONAL' ? 'Operational account' : 'Historical account · access unavailable'}</small></div>
                  <StatusBadge status={member.status} className="member-status" />
                </a>)}
              </div>
            )}
            <div className="ui-pager"><span>Page {memberPage.page} of {Math.max(memberPage.totalPages, 1)} · {memberPage.totalCount} matching members</span><div>
              <a className="ui-button ui-button-secondary" aria-disabled={memberPage.page <= 1} href={memberPage.page > 1 ? `?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}), page: String(memberPage.page - 1) })}` : undefined}>Previous</a>
              <a className="ui-button ui-button-secondary" aria-disabled={memberPage.page >= memberPage.totalPages} href={memberPage.page < memberPage.totalPages ? `?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}), page: String(memberPage.page + 1) })}` : undefined}>Next</a>
            </div></div>
          </Card> : <Card><CardHeader eyebrow="MEMBERSHIP" title="Members unavailable"/><Feedback tone="error">The member list could not be loaded. No changes were made.</Feedback><a className="ui-button ui-button-secondary" href={`?${query.toString()}`}>Retry member list</a></Card>}
          <Card>
            <CardHeader eyebrow="GROW YOUR COMMUNITY" title="Add a member" action={<span className="panel-icon">＋</span>} />
            <form action={createMemberForGym} className="stack-form">
              <Field label="Full name" name="fullName" placeholder="Alex Morgan" minLength={2} maxLength={120} required />
              <Field label="Email address" optional type="email" name="email" placeholder="alex@example.com" />
              <Button className="gym-button" fullWidth type="submit">Add member <span>→</span></Button>
            </form>
            <p className="ui-field-hint">This adds a basic contact record. For an account, initial membership and one-time password, use <a href={`/gyms/${encodeURIComponent(slug)}/owner/members/new`}>Full member enrollment</a>.</p>
          </Card>
        </div>
    </DashboardChrome>
  );
}

export function OwnerGymPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; created?: string; q?: string; status?: string; page?: string }> }) {
  return <Suspense fallback={<LoadingState label="Loading gym…" page />}><GymPageContent {...props} /></Suspense>;
}

