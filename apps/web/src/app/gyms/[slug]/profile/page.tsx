import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { accountProfileSchema, selfMemberProfileSchema, selfTrainerProfileSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { AccountProfileForm, GymSelfProfileForm } from '@/components/profile/profile-forms';
import { Card, Feedback } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function GymProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug);
  const [accountResponse, profileResponse] = await Promise.all([
    fetch(apiUrl('/auth/profile'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => new Response(null, { status: 503 })),
    gym.role === 'OWNER' ? Promise.resolve(null) : fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/profile`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    }).catch(() => new Response(null, { status: 503 })),
  ]);
  if (accountResponse.status === 401 || profileResponse?.status === 401) redirect('/login?error=expired');
  if (accountResponse.status === 403 || profileResponse?.status === 403 || profileResponse?.status === 404) notFound();
  const account = accountResponse.ok ? accountProfileSchema.safeParse(await accountResponse.json().catch(() => null)) : null;
  const profile = profileResponse?.ok ? gym.role === 'MEMBER' ? selfMemberProfileSchema.safeParse(await profileResponse.json().catch(() => null))
    : selfTrainerProfileSchema.safeParse(await profileResponse.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">ACCOUNT PROFILE</span><h1>Profile</h1><p>Account identity and your record at {gym.name} are managed separately.</p></div></div>
    {!account?.success ? <Card><Feedback tone="error">Your account profile is unavailable. No changes were made.</Feedback></Card> : <AccountProfileForm key={`identity:${account.data.version}`} profile={account.data} requestKey={randomUUID()}/>}
    {gym.role !== 'OWNER' ? !profile?.success ? <Card><Feedback tone="error">Your gym profile is unavailable. No changes were made.</Feedback></Card>
      : <GymSelfProfileForm key={`${'memberId' in profile.data ? profile.data.memberId : profile.data.trainerId}:${profile.data.version}`} slug={slug} role={gym.role} profile={profile.data} requestKey={randomUUID()}/> : <Card><h2>Gym owner profile</h2><p>The account display name above is your profile name. Owner role and gym business details are managed separately.</p></Card>}
  </DashboardChrome>;
}
