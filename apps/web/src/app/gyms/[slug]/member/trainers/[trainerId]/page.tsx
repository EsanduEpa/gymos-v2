import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { memberTrainerProfileSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function MemberTrainerProfilePage({ params }: { params: Promise<{ slug: string; trainerId: string }> }) {
  const { slug, trainerId } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'MEMBER');
  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/trainers/${encodeURIComponent(trainerId)}/profile`),
    { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
  if (response?.status === 401) redirect('/login?error=expired');
  if (response?.status === 403 || response?.status === 404) notFound();
  const profile = response?.ok ? memberTrainerProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  const trainer = profile?.success ? profile.data.trainer : null;
  const completedSessions = profile?.success ? profile.data.completedSessions : 0;
  return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">PERSONAL TRAINING</span><h1>{trainer?.fullName ?? 'Trainer profile'}</h1>
      <p>Review this trainer’s gym profile before requesting a private session.</p></div>
      <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/member/trainers`}>← All trainers</a></div>
    {!trainer ? <Card><Feedback tone="error">This trainer profile is temporarily unavailable. No request was sent.</Feedback></Card> : <div className="trainer-review-grid">
      <Card><CardHeader eyebrow="TRAINER PROFILE" title="About your trainer"/>
        <div className="trainer-review-identity"><span className="trainer-avatar" aria-hidden="true">{trainer.fullName.charAt(0).toUpperCase()}</span>
          <div><h2>{trainer.fullName}</h2><p>{trainer.level === 'LEVEL_2' ? 'Level 2 Senior Trainer' : trainer.level === 'LEVEL_1' ? 'Level 1 Trainer' : 'Trainer level not listed'}</p></div></div>
        <p>{trainer.bio || 'This trainer has not added a biography yet.'}</p>
        <h3>Specialisations</h3><div className="trainer-specialisations">{trainer.specialisations.length ? trainer.specialisations.map(item => <span key={item}>{item}</span>) : <span>Not listed</span>}</div>
      </Card>
      <Card><CardHeader eyebrow="AT A GLANCE" title="Training details"/>
        <dl className="trainer-profile-summary"><dt>Experience</dt><dd>{trainer.yearsExperience === null ? 'Not provided' : `${trainer.yearsExperience} years`}</dd>
          <dt>Gym shift</dt><dd>{trainer.shiftStart && trainer.shiftEnd ? `${trainer.shiftStart}–${trainer.shiftEnd} gym local time` : 'Not listed'}</dd>
          <dt>Completed PT sessions</dt><dd>{completedSessions}</dd><dt>Member rating</dt><dd>Not available; this gym does not collect ratings.</dd></dl>
        <a className="ui-button ui-button-primary ui-button-full" href={`/gyms/${encodeURIComponent(slug)}/member/trainers/${encodeURIComponent(trainer.id)}/book`}>Request a private session</a>
      </Card>
    </div>}
  </DashboardChrome>;
}
