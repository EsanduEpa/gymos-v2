import { randomUUID } from 'node:crypto';
import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { configurationReadSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { MemberRegistrationForm } from '@/components/members/member-registration-form';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { cookies } from 'next/headers';

export default async function NewMemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/configuration`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const configuration = response.ok ? configurationReadSchema.safeParse(await response.json().catch(() => null)) : null;
  if (!configuration?.success) return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <Card><CardHeader eyebrow="MEMBER ENROLLMENT" title="Plans are unavailable"/><Feedback tone="error">The gym membership plans could not be loaded. Your form has not been submitted.</Feedback><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/members/new`}>Retry</a></Card>
  </DashboardChrome>;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">OWNER WORKSPACE</span><h1>Register a member</h1><p>Create the member account, initial membership and one-time credential handoff.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner`}>Back to members</a></div>
    <MemberRegistrationForm slug={slug} plans={configuration.data.plans.filter(plan => plan.status === 'ACTIVE')} initialRequestKey={randomUUID()} />
  </DashboardChrome>;
}
