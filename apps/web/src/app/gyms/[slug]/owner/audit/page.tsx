import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auditPageSchema, auditQuerySchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, EmptyState, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function OwnerAuditPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ actionType?: string; page?: string; exportError?: string }>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const parsedQuery = auditQuerySchema.safeParse({ ...(search.actionType ? { actionType: search.actionType } : {}), page: search.page ?? '1', pageSize: '20' });
  if (!parsedQuery.success) notFound();
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const query = new URLSearchParams(Object.entries(parsedQuery.data).map(([key, value]) => [key, String(value)]));
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/audit?${query}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login');
  if (response.status === 403 || response.status === 404) notFound();
  const result = response.ok ? auditPageSchema.safeParse(await response.json().catch(() => null)) : null;
  const data = result?.success ? result.data : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  const base = `/gyms/${encodeURIComponent(slug)}/owner/audit`;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">OWNER RECORDS</span><h1>Security & Audit Logs</h1><p>Sanitized event transitions · as of {data?.asOf ?? 'unavailable'}.</p></div></div>
    <Card><CardHeader eyebrow="EVENTS" title={data ? `${data.totalCount} matching events` : 'Audit events'}/>
      <form method="get" className="member-directory-filters"><label className="ui-field"><span className="ui-field-label">Action</span><select name="actionType" defaultValue={search.actionType ?? ''}><option value="">All available events</option>{data?.availableActionTypes.map(code => <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>)}</select></label><button className="ui-button ui-button-secondary">Filter</button></form>
      {search.exportError ? <Feedback tone="error">The export failed or could not be verified. No file was delivered; try again.</Feedback> : null}
      {data ? <form method="post" action={`/api/gyms/${encodeURIComponent(slug)}/financials/export`} className="member-directory-filters"><input type="hidden" name="kind" value="audit"/><input type="hidden" name="page" value={data.page}/><input type="hidden" name="pageSize" value="20"/><input type="hidden" name="returnTo" value="audit"/>{search.actionType ? <input type="hidden" name="actionType" value={search.actionType}/> : null}<button className="ui-button ui-button-secondary" type="submit">Export current page CSV</button></form> : null}
      {!data ? <Feedback tone="error">Security & Audit Logs is unavailable. No record was changed.</Feedback> : data.items.length === 0 ? <EmptyState title="No matching audit events." hint="Choose another action or clear the filter."/> : <>
        <div className="ui-table-shell"><div className="ui-table-scroll"><table aria-label="Gym audit history"><thead><tr><th>When (UTC)</th><th>Action</th><th>Actor</th><th>Resource</th><th>Transition</th></tr></thead><tbody>{data.items.map(row => <tr key={row.id}><td><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })}</time></td><td>{row.eventCode.replaceAll('_', ' ')}</td><td>{row.originalActorIdentityId ?? row.actorIdentityId}</td><td>{row.resourceType} · {row.resourceId}</td><td>{row.transition.from ?? '—'} → {row.transition.to ?? '—'}{row.transition.version !== undefined ? ` · v${row.transition.version}` : ''}</td></tr>)}</tbody></table></div></div>
        <p>Page {data.page} of {data.totalPages} · export scope is this filtered page.</p>
        <div className="finance-toolbar">{data.page > 1 ? <a className="ui-button ui-button-secondary" href={`${base}?${new URLSearchParams({ ...(search.actionType ? { actionType: search.actionType } : {}), page: String(data.page - 1) })}`}>Previous</a> : <span/>}{data.page < data.totalPages ? <a className="ui-button ui-button-secondary" href={`${base}?${new URLSearchParams({ ...(search.actionType ? { actionType: search.actionType } : {}), page: String(data.page + 1) })}`}>Next</a> : null}</div>
      </>}
    </Card>
  </DashboardChrome>;
}
