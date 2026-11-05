import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberListSchema } from '@gymos/contracts';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { DashboardChrome } from './dashboard-chrome';
import { Card, EmptyState, Feedback, LoadingState, StatusBadge } from '@/components/ui';

async function GymPageContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const filters = await searchParams;
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q.slice(0, 120));
  if (filters.status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(filters.status)) query.set('status', filters.status);
  query.set('page', /^[1-9][0-9]*$/.test(filters.page ?? '') ? filters.page! : '1'); query.set('pageSize', '25');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/members?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? memberListSchema.safeParse(await response.json().catch(() => null)) : null;
  const data = parsed?.success ? parsed.data : null;
  const brand = resolveGymBrandColors(theme.primaryColor); const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  const base = `/gyms/${encodeURIComponent(slug)}/owner/members`;
  const pageLink = (page: number) => `${base}?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}), page: String(page) })}`;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <header className="owner-page-header"><div><h1>Member Management</h1><p>Register new members, view membership status, and manage member profiles.</p></div><a className="ui-button ui-button-primary" href={`${base}/new`}>Register New Member</a></header>
    {!data ? <Card><Feedback tone="error">The member list could not be loaded. No changes were made.</Feedback><a className="ui-button ui-button-secondary" href={`${base}?${query}`}>Retry member list</a></Card> : <Card className="owner-directory-card">
      <form method="get" className="member-directory-filters owner-member-filters" role="search"><label className="ui-field"><span className="ui-field-label">Search</span><input name="q" defaultValue={filters.q ?? ''} maxLength={120} placeholder="Search name or email"/></label><label className="ui-field"><span className="ui-field-label">Status</span><select name="status" defaultValue={filters.status ?? ''}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="INACTIVE">Inactive</option></select></label><button className="ui-button ui-button-secondary" type="submit">Search</button></form>
      {data.items.length === 0 ? <EmptyState title={filters.q || filters.status ? 'No matching members.' : 'No members yet.'} hint={filters.q || filters.status ? 'Change or clear filters to see more members.' : 'Register the first member in this gym.'}/> : <div className="ui-table-shell"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table"><table aria-label="Gym members"><thead><tr><th>Member name</th><th>Contact</th><th>Active plan</th><th>Status</th><th>Expiry date</th><th>Actions</th></tr></thead><tbody>{data.items.map(member => <tr key={member.id}><td><strong>{member.fullName}</strong></td><td>{member.email ?? '—'}</td><td>{member.currentTerm?.planName ?? 'No active membership'}</td><td><StatusBadge status={member.status}/></td><td>{member.currentTerm?.endDateExclusive ?? '—'}</td><td><a className="ui-button ui-button-secondary" href={`${base}/${encodeURIComponent(member.id)}`}>View Profile</a></td></tr>)}</tbody></table></div></div>}
      <div className="ui-pager"><span>Showing {data.items.length ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount}</span><div><a className="ui-button ui-button-secondary" aria-disabled={data.page <= 1} href={data.page > 1 ? pageLink(data.page - 1) : undefined}>Previous</a><span>{data.page} / {Math.max(data.totalPages, 1)}</span><a className="ui-button ui-button-secondary" aria-disabled={data.page >= data.totalPages} href={data.page < data.totalPages ? pageLink(data.page + 1) : undefined}>Next</a></div></div>
    </Card>}
  </DashboardChrome>;
}
export function OwnerGymPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; status?: string; page?: string }> }) { return <Suspense fallback={<LoadingState label="Loading members…" page/>}><GymPageContent {...props}/></Suspense>; }
