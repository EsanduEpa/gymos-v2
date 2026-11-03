import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberDetailSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { MemberProfileTabs } from '@/components/members/member-profile-tabs';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { cookies } from 'next/headers';

export default async function MemberProfilePage({ params, searchParams }: { params: Promise<{ slug: string; memberId: string }>; searchParams: Promise<{ membershipPage?: string; membershipPageSize?: string }> }) {
  const { slug, memberId } = await params;
  const query = await searchParams;
  const membershipPage = /^[1-9][0-9]*$/.test(query.membershipPage ?? '') ? query.membershipPage : '1';
  const requestedPageSize = Number(query.membershipPageSize);
  const membershipPageSize = Number.isInteger(requestedPageSize) && requestedPageSize >= 1 && requestedPageSize <= 100 ? String(requestedPageSize) : '25';
  const { session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}?page=${membershipPage}&pageSize=${membershipPageSize}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? memberDetailSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    {!parsed?.success ? <Card><CardHeader eyebrow="MEMBER PROFILE" title="Profile unavailable"/><Feedback tone="error">The profile could not be loaded. No changes were made.</Feedback><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`}>Retry</a></Card> : <>
      <div className="gym-banner"><div><span className="eyebrow">MEMBER PROFILE</span><h1>{parsed.data.fullName}</h1><p>{parsed.data.email ?? 'No email'} · {parsed.data.phone ?? 'No phone'}</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner`}>Back to members</a></div>
      <MemberProfileTabs member={parsed.data} slug={slug}/>
    </>}
  </DashboardChrome>;
}
