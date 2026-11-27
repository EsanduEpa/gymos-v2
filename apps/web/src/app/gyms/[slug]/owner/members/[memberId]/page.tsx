import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { configurationReadSchema, memberDetailSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { MemberProfileTabs } from '@/components/members/member-profile-tabs';
import { Card, Feedback } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { randomUUID } from 'node:crypto';

export default async function MemberProfilePage({ params, searchParams }: { params: Promise<{ slug: string; memberId: string }>; searchParams: Promise<{ membershipPage?: string; membershipPageSize?: string }> }) {
  const { slug, memberId } = await params;
  const query = await searchParams;
  const membershipPage = /^[1-9][0-9]*$/.test(query.membershipPage ?? '') ? query.membershipPage : '1';
  const requestedPageSize = Number(query.membershipPageSize);
  const membershipPageSize = Number.isInteger(requestedPageSize) && requestedPageSize >= 1 && requestedPageSize <= 100 ? String(requestedPageSize) : '25';
  const { session, gym, theme, token } = await requireGymContext(slug, 'OWNER');
  const read = (resource: string) => fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/${resource}`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8_000),
  }).catch(() => new Response(null, { status: 503 }));
  const [response, settings] = await Promise.all([
    read(`members/${encodeURIComponent(memberId)}?page=${membershipPage}&pageSize=${membershipPageSize}`), read('configuration'),
  ]);
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? memberDetailSchema.safeParse(await response.json().catch(() => null)) : null;
  const configuration = settings.ok ? configurationReadSchema.safeParse(await settings.json().catch(() => null)) : null;
  const plans = configuration?.success ? configuration.data.plans.filter(plan => plan.status === 'ACTIVE') : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    {!parsed?.success ? <Card><h1>Profile unavailable</h1><Feedback tone="error">The profile could not be loaded. No changes were made.</Feedback><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`}>Retry</a></Card> : <>
      <div className="gym-banner"><div><h1>{parsed.data.fullName}</h1><p>{parsed.data.email ?? 'No email'} · {parsed.data.phone ?? 'No phone'}</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members`}>← Back to Member List</a></div>
      <MemberProfileTabs member={parsed.data} slug={slug} requestKey={randomUUID()} plans={plans} initialTab={query.membershipPage ? 'history' : 'overview'}/>
    </>}
  </DashboardChrome>;
}
