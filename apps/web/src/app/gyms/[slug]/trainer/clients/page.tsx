import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerClientPageSchema, trainerClientQuerySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import styles from '@/components/coaching/trainer-clients.module.css';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function TrainerClientsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const queryParams = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const query = trainerClientQuerySchema.safeParse({ q: typeof queryParams.q === 'string' ? queryParams.q : undefined,
    page: typeof queryParams.page === 'string' ? queryParams.page : undefined, pageSize: 25, projection: 'summary' });
  if (!query.success) notFound();
  let response: Response;
  try {
    const search = new URLSearchParams({ page: String(query.data.page), pageSize: '25', projection: 'summary', ...(query.data.q ? { q: query.data.q } : {}) });
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/clients?${search}`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
  } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? trainerClientPageSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER CLIENTS</span><h1>Confirmed clients</h1><p>Clients appear while an active or confirmed session relationship is current.</p></div></div>
    <Card><CardHeader eyebrow="CLIENT ROSTER" title={result?.success ? `${result.data.totalCount} matching clients` : 'Client roster'}/>
      <form method="get" className={styles.search}><label>Search clients<input type="search" name="q" maxLength={100} defaultValue={query.data.q ?? ''}/></label><button className="ui-button ui-button-secondary" type="submit">Search</button></form>
      {!result?.success ? <Feedback tone="error">Clients could not be loaded. Refresh the page to retry.</Feedback> : result.data.items.length === 0 ?
        <div className="ui-empty-state"><h2>No confirmed clients</h2><p>Clients with a current confirmed relationship will appear here.</p></div> :
        <div className={styles.list}>{result.data.items.map(client => <article className={styles.card} key={client.id}>
          <div><h2><a href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(client.id)}`}>{client.fullName}</a></h2>
            {client.email ? <p>{client.email}</p> : null}{client.phone ? <p>{client.phone}</p> : null}
          </div>
          <div><strong>{client.usablePackBalance?.available ?? 0}</strong><span> usable credits</span>
            <p>{client.usablePackBalance?.held ?? 0} held</p></div>
          <div>{client.latestSession ? <><span>{client.latestSession.state.replaceAll('_', ' ').toLowerCase()}</span>
            <p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: result.data.timeZone }).format(new Date(client.latestSession.scheduledStartAt))}</p></> : <span>No qualifying session</span>}</div>
          <nav className={styles.actions} aria-label={`Plan actions for ${client.fullName}`}>
            <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(client.id)}`}>View profile</a>
            <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/workout/new?memberId=${encodeURIComponent(client.id)}`}>Create workout</a>
            <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/meal/new?memberId=${encodeURIComponent(client.id)}`}>Create meal plan</a>
          </nav>
        </article>)}</div>}
      {result?.success ? <div className={styles.pager}><p>Page {result.data.page} of {Math.max(1, result.data.totalPages)} · {result.data.totalCount} matching clients</p>
        <nav aria-label="Client pages">{result.data.page > 1 ? <a className="ui-button ui-button-secondary" href={`?q=${encodeURIComponent(query.data.q ?? '')}&page=${result.data.page - 1}`}>Previous</a> : null}
          {result.data.page < result.data.totalPages ? <a className="ui-button ui-button-secondary" href={`?q=${encodeURIComponent(query.data.q ?? '')}&page=${result.data.page + 1}`}>Next</a> : null}</nav>
      </div> : null}
    </Card>
  </DashboardChrome>;
}
