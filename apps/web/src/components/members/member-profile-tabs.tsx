'use client';

import { useState } from 'react';
import type { MemberDetail } from '@gymos/contracts';
import { Card, EmptyState, StatusBadge, Tabs } from '@/components/ui';

const items = [{ id: 'overview', label: 'Overview' }, { id: 'sessions', label: 'Attendance' }, { id: 'history', label: 'Membership & Packs' }];

export function MemberProfileTabs({ member }: { member: MemberDetail }) {
  const [active, setActive] = useState('overview');
  return <section className="member-profile-tabs">
    <Card>
      <div className="ui-card-header"><div><span className="eyebrow dark">ACCOUNT</span><h2>{member.fullName}</h2></div><StatusBadge status={member.status}/></div>
      <Tabs label="Member profile" items={items} value={active} onChange={setActive}/>
      {active === 'overview' ? <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="member-profile-panel">
        <dl className="member-profile-details">
          <div><dt>Email</dt><dd>{member.email ?? 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{member.phone ?? 'Not provided'}</dd></div>
          <div><dt>Date of birth</dt><dd>{member.dateOfBirth ?? 'Not provided'}</dd></div><div><dt>Emergency contact</dt><dd>{member.emergencyContact ?? 'Not provided'}</dd></div>
        </dl>
        <div><h3>Health notes</h3><p>{member.healthNotes || 'No health notes have been added.'}</p><small>Private gym information. Visible to the owner and a confirmed trainer with an active relationship.</small></div>
        <div><h3>Current registration</h3><p><StatusBadge status={member.registrationState}/></p></div>
      </div> : null}
      {active === 'sessions' ? <div id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" className="member-profile-panel">
        {member.recentSessions.length ? <ol>{member.recentSessions.map(session => <li key={session.id}>{session.scheduledStart} · {session.state}</li>)}</ol>
          : <EmptyState title="Session history is not available yet." hint="PT session history will appear after the session record feature is delivered."/>}
      </div> : null}
      {active === 'history' ? <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" className="member-profile-panel">
        <h3>Membership history</h3>
        {member.memberships.length ? <div className="member-history-list">{member.memberships.map(term => <article key={term.id}>
          <div><strong>{term.planName}</strong><small>{term.startDate} to the day before {term.endDateExclusive}</small></div>
          <span>{term.agreedPrice} {term.currency}<small>agreed value · no payment recorded</small></span>
        </article>)}</div> : <EmptyState title="No membership history."/>}
        <h3>Session-pack balance</h3>
        {member.sessionPacks.length ? <div className="member-history-list">{member.sessionPacks.map(pack => <article key={pack.id}>
          <div><strong>{pack.issuedCredits} sessions issued</strong><small>{pack.startDate} to the day before {pack.endDateExclusive}</small></div>
          <span>{pack.availableCredits} available<small>{pack.price} {pack.currency} · entitlement only</small></span>
        </article>)}</div> : <EmptyState title="Pack history will appear when the session credit ledger is available."/>}
      </div> : null}
    </Card>
  </section>;
}
