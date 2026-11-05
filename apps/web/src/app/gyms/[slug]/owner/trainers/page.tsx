import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerListSchema } from '@gymos/contracts';
import { Card, CardHeader, Feedback, StatusBadge } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function OwnerTrainersPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; status?: string; level?: string; page?: string }> }) {
  const { slug } = await params;
  const filters = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q.slice(0, 120));
  if (filters.status && ['ACTIVE', 'DEACTIVATED'].includes(filters.status)) query.set('status', filters.status);
  if (filters.level && ['LEVEL_1', 'LEVEL_2'].includes(filters.level)) query.set('level', filters.level);
  query.set('page', /^[1-9][0-9]*$/.test(filters.page ?? '') ? filters.page! : '1');
  query.set('pageSize', '25');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/trainers?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? trainerListSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><h1>Trainer Roster Management</h1><p>Add trainer accounts, configure levels and shift hours, and monitor performance.</p></div><a className="ui-button ui-button-primary" href={`/gyms/${encodeURIComponent(slug)}/owner/trainers/new`}>Add New Trainer</a></div>
    <Card><CardHeader eyebrow="TRAINER ROSTER" title={result?.success ? `${result.data.totalCount} registered ${result.data.totalCount === 1 ? 'trainer' : 'trainers'}` : 'Trainer roster'} />
      <form method="get" role="search" className="trainer-filter-form">
        <label className="ui-field"><span className="ui-field-label">Search name or email</span><input name="q" defaultValue={filters.q ?? ''} maxLength={120}/></label>
        <label className="ui-field"><span className="ui-field-label">Status</span><select name="status" defaultValue={filters.status ?? ''}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DEACTIVATED">Deactivated</option></select></label>
        <label className="ui-field"><span className="ui-field-label">Level</span><select name="level" defaultValue={filters.level ?? ''}><option value="">All levels</option><option value="LEVEL_1">Level 1</option><option value="LEVEL_2">Level 2</option></select></label>
        <button className="ui-button ui-button-secondary" type="submit">Search</button>
      </form>
      {!result?.success ? <Feedback tone="error">The trainer roster could not be loaded. No changes were made.</Feedback> : result.data.items.length === 0 ? <div className="ui-empty-state"><h2>No trainers found</h2><p>Try a different search or register a trainer.</p></div> : <>
        <div className="ui-table-shell"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table"><table aria-label="Trainer roster"><thead><tr><th>Name</th><th>Level and specialisations</th><th>Approved shift</th><th>Status</th><th>Profile</th></tr></thead><tbody>{result.data.items.map(trainer => <tr key={trainer.id}><td><strong>{trainer.fullName}</strong><br/><span>{trainer.email ?? 'No email'} · {trainer.phone ?? 'No phone'}</span></td><td>{trainer.level?.replace('_', ' ') ?? 'Level not set'}<br/><span>{trainer.specialisations.join(', ') || 'No specialisations'}</span></td><td>{trainer.shiftStart && trainer.shiftEnd ? `${trainer.shiftStart}–${trainer.shiftEnd}` : 'No approved shift'}</td><td><StatusBadge status={trainer.status}/></td><td><a href={`/gyms/${encodeURIComponent(slug)}/owner/trainers/${encodeURIComponent(trainer.id)}`}>View profile</a></td></tr>)}</tbody></table></div></div>
        <div className="ui-pager"><span aria-live="polite">Page {result.data.page} of {Math.max(1, result.data.totalPages)} · {result.data.totalCount} matching trainers</span><div>{result.data.page > 1 ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.level ? { level: filters.level } : {}), page: String(result.data.page - 1) })}`}>Previous</a> : null}{result.data.page < result.data.totalPages ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.level ? { level: filters.level } : {}), page: String(result.data.page + 1) })}`}>Next</a> : null}</div></div>
      </>}
    </Card>
  </DashboardChrome>;
}
