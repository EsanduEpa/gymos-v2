import type { MemberSessionOverview } from '@gymos/contracts';
import styles from './owner-month-overview.module.css';

const labels: Record<keyof MemberSessionOverview['items'][number]['monthSessionCounts'], string> = {
  pending: 'Pending', scheduled: 'Scheduled', active: 'Active', completed: 'Completed', missed: 'No-show', cancelled: 'Cancelled', declined: 'Declined', expired: 'Expired',
};

function href(slug: string, month: string, q: string | undefined, page: number, memberId?: string) {
  const query = new URLSearchParams({ view: 'list', mode: 'month', month, page: String(page) });
  if (q) query.set('q', q);
  if (memberId) query.set('memberId', memberId);
  return `/gyms/${encodeURIComponent(slug)}/owner/sessions?${query}`;
}

export function OwnerMonthOverview({ slug, month, q, data, failed }: {
  slug: string; month: string; q?: string; data: MemberSessionOverview | null; failed?: boolean;
}) {
  return <section className={styles.overview} aria-labelledby="member-month-overview-title">
    <div className={styles.heading}><div><h2 id="member-month-overview-title">Monthly member overview</h2><p>{month} session counts · pack balances are lifetime totals · searching all gym members</p></div>
      {data ? <p>{data.matchingMemberCount} matching members · as of {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.timeZone }).format(new Date(data.asOf))}</p> : null}</div>
    {failed || !data ? <div className={styles.error} role="alert">Monthly member totals could not be loaded. Use the page refresh control to retry. Session details below remain a separate filtered read.</div> : data.items.length === 0 ?
      <div className={styles.empty}>No members match this search.</div> : <>
        <div className={styles.wrap} tabIndex={0} role="region" aria-label="Monthly member sessions"><table className={styles.table} aria-label="Monthly member session overview">
          <thead><tr><th>Member</th><th>Latest membership</th><th>Pack credits · lifetime</th><th>Sessions · {data.month}</th><th>More</th></tr></thead>
          <tbody>{data.items.map(row => <tr key={row.member.id}>
            <td><strong>{row.member.fullName}</strong><small>{row.member.email ?? 'No email'} · {row.member.status.toLowerCase()}</small></td>
            <td>{row.latestMembership ? <>{row.latestMembership.planName}<small>{row.latestMembership.startDate} to {row.latestMembership.endDateExclusive} (exclusive)</small></> : 'No membership term'}</td>
            <td>{row.packTotals.remaining} remaining of {row.packTotals.total}<small>{row.packTotals.used} used · {row.packTotals.expiredUnused} expired unused</small></td>
            <td><div className={styles.counts}>{Object.entries(row.monthSessionCounts).filter(([, count]) => count > 0).map(([state, count]) => <span key={state}>{labels[state as keyof typeof labels]} {count}</span>)}
              {row.matchingSessionCount === 0 ? <span>None</span> : null}</div></td>
            <td><details className={styles.more}><summary>More</summary><a href={href(slug, data.month, q, 1, row.member.id)}>View {row.matchingSessionCount} matching session{row.matchingSessionCount === 1 ? '' : 's'}</a></details></td>
          </tr>)}</tbody>
        </table></div>
        <div className={styles.pager}><span>Page {data.page} of {Math.max(1, data.totalPages)} · {data.totalCount} matching member records</span><div className={styles.pagerLinks}>
          {data.page > 1 ? <a className="ui-button ui-button-secondary" href={href(slug, month, q, data.page - 1)}>Previous members</a> : null}
          {data.page < data.totalPages ? <a className="ui-button ui-button-secondary" href={href(slug, month, q, data.page + 1)}>Next members</a> : null}
        </div></div>
      </>}
  </section>;
}
