import type { MemberDetail } from '@gymos/contracts';
import { EmptyState } from '@/components/ui';
import { formatDisplayDate } from '@/lib/display-date';

export function SessionPackPanel({ packs }: { packs: MemberDetail['sessionPacks'] }) {
  return <section className="session-pack-panel" aria-labelledby="session-packs-heading">
    <h3 id="session-packs-heading">PT credit balances</h3>
    {packs.length ? <div className="member-history-list">{packs.map(pack => <article key={pack.id}>
      <div><strong>{pack.membershipTermId ? `${pack.issuedCredits} PT credits included with membership` : `${pack.issuedCredits} sessions issued`} · {pack.status.toLowerCase()}</strong>
        <small>{formatDisplayDate(pack.startDate)} to the day before {formatDisplayDate(pack.endDateExclusive)} · {pack.validityDays} days</small>
        {pack.expiryAdjustments?.map(unit => <small key={unit.creditOrdinal}>Restored credit {unit.creditOrdinal}: usable before {unit.endDateExclusive} · {unit.state.toLowerCase()}</small>)}
      </div>
      <span>{pack.availableCredits} available · {pack.heldCredits} held
        <small>{pack.consumedCredits} consumed · {pack.expiredCredits} expired</small>
        {!pack.membershipTermId ? <small>{pack.price} {pack.currency} · historical pack value</small> : null}
      </span>
    </article>)}</div> : <EmptyState title="No PT credits have been issued."/>}
  </section>;
}
