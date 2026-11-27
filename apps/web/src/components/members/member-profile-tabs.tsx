'use client';

import { formatDisplayDate, formatDisplayDateTime } from '@/lib/display-date';
import { useState } from 'react';
import type { MemberDetail, MembershipPlan } from '@gymos/contracts';
import { Card, EmptyState, StatusBadge, Tabs } from '@/components/ui';
import { SessionPackPanel } from '@/components/members/session-pack-panel';
import { MembershipRenewalForm } from '@/components/members/membership-renewal-form';
import { MemberLifecycleForm } from '@/components/members/member-lifecycle-form';
import { OwnerMemberCorrectionForm } from '@/components/profile/profile-forms';

const items = [{ id: 'overview', label: 'Overview' }, { id: 'sessions', label: 'PT Session History' }, { id: 'history', label: 'Membership & Packs' }];

export function MemberProfileTabs({ member, slug, requestKey, plans, initialTab = 'overview' }: { member: MemberDetail; slug: string; requestKey: string; plans: MembershipPlan[] | null; initialTab?: 'overview' | 'history' }) {
  const [active, setActive] = useState<string>(initialTab);
  return <section className="member-profile-tabs">
    <Card>
      <div className="ui-card-header"><div><span className="eyebrow dark">ACCOUNT</span><h2>{member.fullName}</h2></div><StatusBadge status={member.status}/></div>
      <Tabs label="Member profile" items={items} value={active} onChange={setActive}/>
      {active === 'overview' ? <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" tabIndex={0} className="member-profile-panel">
        <p>{member.accountState === 'BASIC' ? 'Basic contact · no login account' : member.accountState === 'OPERATIONAL' ? 'Operational account' : 'Historical account · access unavailable'}</p>
        <dl className="member-profile-details">
          <div><dt>Joined</dt><dd><time dateTime={member.joinedAt}>{formatDisplayDateTime(member.joinedAt, member.timeZone ?? undefined)}</time></dd></div>
          <div><dt>Email</dt><dd>{member.email ?? 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{member.phone ?? 'Not provided'}</dd></div>
          <div><dt>Date of birth</dt><dd>{member.dateOfBirth ? <time dateTime={member.dateOfBirth}>{formatDisplayDate(member.dateOfBirth)}</time> : 'Not provided'}</dd></div><div><dt>Emergency contact</dt><dd>{member.emergencyContact ?? 'Not provided'}</dd></div>
        </dl>
        <div><h3>Current registration</h3><p><StatusBadge status={member.registrationState}/></p></div>
        {member.registrationState === 'COMPLETE' ? <MemberLifecycleForm slug={slug} memberId={member.id} status={member.status} version={member.version} initialRequestKey={requestKey}/> : null}
        {member.registrationState === 'COMPLETE' ? <OwnerMemberCorrectionForm key={`${member.id}:${member.version}`} slug={slug} member={member} requestKey={`${requestKey}-profile`}/> : null}
      </div> : null}
      {active === 'sessions' ? <div id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" tabIndex={0} className="member-profile-panel">
        <h3>Recent PT sessions</h3>
        {member.recentSessions.length ? <ol>{member.recentSessions.map(session => <li key={session.id}><a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(session.id)}`}>{formatDisplayDateTime(session.scheduledStart, member.timeZone ?? undefined)} · {session.state === 'MISSED' ? 'No show' : session.state.toLowerCase()}</a></li>)}</ol>
          : <EmptyState title="No PT sessions recorded yet." hint="Scheduled sessions and their outcomes will appear here."/>}
        <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/sessions?view=list&mode=month&memberId=${encodeURIComponent(member.id)}`}>Browse this member’s PT sessions</a>
      </div> : null}
      <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" tabIndex={0} className="member-profile-panel" hidden={active !== 'history'}>
        {member.status === 'ACTIVE' ? <MembershipRenewalForm slug={slug} member={member} plans={plans} requestKey={`${requestKey}-renewal`}/> : null}
        <h3>Membership history</h3>
        {member.memberships.length ? <div className="member-history-list">{member.memberships.map(term => <article key={term.id}>
          <div><strong>{term.planName}</strong><small>{formatDisplayDate(term.startDate)} to the day before {formatDisplayDate(term.endDateExclusive)}</small>
            {term.includedPtCredits !== undefined ? <small>{term.includedPtCredits} PT credits included</small> : null}</div>
          <span>{term.agreedPrice} {term.currency}<small>Membership value</small></span>
        </article>)}</div> : <EmptyState title="No membership history."/>}
        {member.membershipTotalCount > member.membershipPageSize ? <nav aria-label="Membership history pages" className="member-history-pagination">
          <p>Page {member.membershipPage} of {member.membershipTotalPages} · {member.membershipTotalCount} membership terms</p>
          {member.membershipPage > 1 ? <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(member.id)}?membershipPage=${member.membershipPage - 1}&membershipPageSize=${member.membershipPageSize}#history`}>Previous membership page</a> : null}
          {member.membershipPage < member.membershipTotalPages ? <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(member.id)}?membershipPage=${member.membershipPage + 1}&membershipPageSize=${member.membershipPageSize}#history`}>Next membership page</a> : null}
        </nav> : null}
        <SessionPackPanel packs={member.sessionPacks}/>
      </div>
    </Card>
  </section>;
}
