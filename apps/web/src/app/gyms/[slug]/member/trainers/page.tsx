import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberTrainerDirectorySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

function trainerLevel(level: 'LEVEL_1' | 'LEVEL_2' | null) {
  return level === 'LEVEL_2' ? 'Level 2 Senior Trainer' : level === 'LEVEL_1' ? 'Level 1 Trainer' : 'Trainer level not listed';
}

export default async function MemberTrainerDirectoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const { slug } = await params;
  const filters = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  const query = new URLSearchParams({ page: /^[1-9][0-9]*$/.test(filters.page ?? '') ? filters.page! : '1', pageSize: '24' });
  if (filters.q) query.set('q', filters.q.slice(0, 120));
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/trainer-directory?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? memberTrainerDirectorySchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER DIRECTORY</span><h1>Find a trainer</h1><p>Browse active trainers at {gym.name}.</p></div></div>
    <Card><CardHeader eyebrow="MEMBER DIRECTORY" title="Active trainers"/>
      <form method="get" role="search" className="trainer-directory-search"><label className="ui-field"><span className="ui-field-label">Search by trainer name</span><input name="q" defaultValue={filters.q ?? ''} maxLength={120}/></label><button className="ui-button ui-button-secondary" type="submit">Search</button></form>
      {!result?.success ? <Feedback tone="error">The trainer directory could not be loaded. Please retry.</Feedback> : result.data.items.length === 0 ? <div className="ui-empty-state"><h2>No active trainers found</h2><p>Try another name or check back later.</p></div> : <>
        <div className="trainer-directory-grid">{result.data.items.map(trainer => <article className="trainer-directory-card" key={trainer.id}>
          <div className="trainer-directory-heading"><span className="trainer-avatar" aria-hidden="true">{trainer.fullName.charAt(0).toUpperCase()}</span><div className="trainer-directory-title"><h2>{trainer.fullName}</h2><span className={`trainer-level ${trainer.level === 'LEVEL_2' ? 'is-senior' : ''}`}>{trainerLevel(trainer.level)}</span></div></div>
          <p><strong>Shift:</strong> {trainer.shiftStart && trainer.shiftEnd ? `${trainer.shiftStart}–${trainer.shiftEnd} gym local time` : 'Not listed'}</p>
          <div className="trainer-specialisations" aria-label="Specialisations">{trainer.specialisations.length ? trainer.specialisations.map(specialisation => <span key={specialisation}>{specialisation}</span>) : <span>Specialisations not listed</span>}</div>
          <p>{trainer.bio || 'No biography available.'}</p>
          <p className="trainer-rating">Rating unavailable; this gym does not collect member ratings.</p>
          <a className="ui-button ui-button-primary ui-button-full" aria-label="Request this trainer" href={`/gyms/${encodeURIComponent(slug)}/member/trainers/${encodeURIComponent(trainer.id)}/book`}>Request session</a>
        </article>)}</div>
        <div className="ui-pager"><span aria-live="polite">Page {result.data.page} of {Math.max(1, result.data.totalPages)} · {result.data.totalCount} active trainers</span><div>{result.data.page > 1 ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), page: String(result.data.page - 1) })}`}>Previous</a> : null}{result.data.page < result.data.totalPages ? <a className="ui-button ui-button-secondary" href={`?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), page: String(result.data.page + 1) })}`}>Next</a> : null}</div></div>
      </>}
    </Card>
  </DashboardChrome>;
}
