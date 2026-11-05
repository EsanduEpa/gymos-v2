import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { trainerClientPageSchema, trainerClientQuerySchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback, StatusBadge } from '@/components/ui';
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
    <div className="gym-banner"><div><span className="eyebrow">TRAINER CLIENTS</span><h1>Assigned Client Roster</h1><p>Find your confirmed clients, review pack balances and prepare their training plans.</p></div></div>
    <Card><CardHeader eyebrow="CLIENT ROSTER" title={result?.success ? `${result.data.totalCount} matching clients` : 'Client roster'}/>
      <form method="get" className={`${styles.search} trainer-client-search`}><label>Search clients<input type="search" name="q" maxLength={100} defaultValue={query.data.q ?? ''}/></label><button className="ui-button ui-button-secondary" type="submit">Search</button></form>
      {!result?.success ? <Feedback tone="error">Clients could not be loaded. Refresh the page to retry.</Feedback> : result.data.items.length === 0 ?
        <div className="ui-empty-state"><h2>No confirmed clients</h2><p>Clients with a current confirmed relationship will appear here.</p></div> :
        <div className="trainer-client-table-wrap" tabIndex={0} role="region" aria-label="Client roster table"><table className="trainer-client-table" aria-label="Your confirmed clients"><thead><tr><th>Client name</th><th>Member status</th><th>Pack balance</th><th>Last session</th><th>Actions</th></tr></thead><tbody>{result.data.items.map(client => <tr key={client.id}>
          <td><strong>{client.fullName}</strong>{client.email ? <small>{client.email}</small> : null}</td>
          <td><StatusBadge status={client.status}/></td>
          <td><strong>{client.usablePackBalance?.available ?? '—'} sessions left</strong>{client.usablePackBalance ? <small>{client.usablePackBalance.held} held</small> : null}</td>
          <td>{client.latestSession ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeZone: result.data.timeZone }).format(new Date(client.latestSession.scheduledStartAt)) : '—'}</td>
          <td><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(client.id)}`}>View 360° Profile</a></td>
        </tr>)}</tbody></table></div>}
      {result?.success ? <div className={styles.pager}><p>Page {result.data.page} of {Math.max(1, result.data.totalPages)} · {result.data.totalCount} matching clients</p>
        <nav aria-label="Client pages">{result.data.page > 1 ? <a className="ui-button ui-button-secondary" href={`?q=${encodeURIComponent(query.data.q ?? '')}&page=${result.data.page - 1}`}>Previous</a> : null}
          {result.data.page < result.data.totalPages ? <a className="ui-button ui-button-secondary" href={`?q=${encodeURIComponent(query.data.q ?? '')}&page=${result.data.page + 1}`}>Next</a> : null}</nav>
      </div> : null}
    </Card>
  </DashboardChrome>;
}
