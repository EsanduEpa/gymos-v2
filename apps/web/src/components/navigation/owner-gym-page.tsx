import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { createMember } from '@/app/actions';
import { existingEndpointContracts } from '@gymos/contracts/legacy';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { DashboardChrome } from './dashboard-chrome';
import { GymLogo } from './gym-logo';
import { Button, Card, CardHeader, EmptyState, Feedback, Field, LoadingState, StatusBadge } from '@/components/ui';

const messages: Record<string, string> = {
  'member-input': 'Enter a member name and a valid email address.',
  duplicate: 'A member with that email already exists in this gym.',
  forbidden: 'Your account cannot add members to this gym.',
  unavailable: 'Could not reach the API. Please try again.',
};

async function GymPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  let membersResponse: Response;
  try {
    membersResponse = await fetch(apiUrl(`/gyms/${slug}/members`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
  } catch {
    throw new Error('Gym unavailable');
  }
  if (membersResponse.status === 401) redirect('/login');
  if (membersResponse.status === 403 || membersResponse.status === 404) notFound();
  if (!membersResponse.ok) throw new Error('Gym unavailable');
  const members = existingEndpointContracts.E07.response.parse(await membersResponse.json());
  const { error, created } = await searchParams;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = {
    '--gym-color': brand.primary,
    '--gym-on-color': brand.onPrimary,
  } as CSSProperties;
  const createMemberForGym = createMember.bind(null, slug);

  return (
    <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
        <div className="gym-banner">
          <GymLogo key={theme.logoUrl} name={gym.name} url={theme.logoUrl} />
          <div><span className="eyebrow">YOUR GYM WORKSPACE</span><h1>{gym.name}</h1><p>Members, all in one place.</p></div>
          <span className="role-pill">{gym.role}</span>
        </div>
        {created ? <Feedback tone="success">Member added to {gym.name}.</Feedback> : null}
        {error ? <Feedback tone="error">{messages[String(error)] ?? 'This request could not be completed.'}</Feedback> : null}
        <div className="dashboard-grid">
          <Card>
            <CardHeader eyebrow="MEMBERSHIP" title="Members" action={<span className="count-badge">{members.length}</span>} />
            {members.length === 0 ? <EmptyState title="No members yet." hint="Add the first member to this gym." /> : (
              <div className="member-list">
                {members.map((member) => <div className="member-row" key={member.id}>
                  <span className="member-avatar">{member.fullName.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{member.fullName}</strong><small>{member.email ?? 'No email added'}</small></div>
                  <StatusBadge status={member.status} className="member-status" />
                </div>)}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader eyebrow="GROW YOUR COMMUNITY" title="Add a member" action={<span className="panel-icon">＋</span>} />
            <form action={createMemberForGym} className="stack-form">
              <Field label="Full name" name="fullName" placeholder="Alex Morgan" minLength={2} maxLength={120} required />
              <Field label="Email address" optional type="email" name="email" placeholder="alex@example.com" />
              <Button className="gym-button" fullWidth type="submit">Add member <span>→</span></Button>
            </form>
          </Card>
        </div>
    </DashboardChrome>
  );
}

export function OwnerGymPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; created?: string }> }) {
  return <Suspense fallback={<LoadingState label="Loading gym…" page />}><GymPageContent {...props} /></Suspense>;
}

