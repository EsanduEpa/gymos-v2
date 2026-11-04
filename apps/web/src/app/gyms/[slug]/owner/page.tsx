import { Suspense, type CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { ownerDashboardSchema } from '@gymos/contracts';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import { currentSupportCookie } from '@/lib/support-context';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { OwnerDashboardLive } from '@/components/navigation/owner-dashboard-live';
import { SupportOwnerPage } from '@/components/platform/support-owner-page';
import { LoadingState } from '@/components/ui';

type Props = { params: Promise<{ slug: string }> };
async function Content({ params }: Props) {
  const { slug } = await params;
  const support = await currentSupportCookie();
  if (support) return <SupportOwnerPage slug={slug}/>;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/dashboard`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? ownerDashboardSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><h1>Live Gym Operations</h1><p>{gym.name} · today’s operations, local to {parsed?.success ? parsed.data.timeZone : 'your gym'}.</p></div></div>
    <OwnerDashboardLive key={slug} slug={slug} initial={parsed?.success ? parsed.data : null}/>
  </DashboardChrome>;
}
export default function OwnerWorkspace(props: Props) { return <Suspense fallback={<LoadingState label="Loading dashboard…" page/>}><Content {...props}/></Suspense>; }
