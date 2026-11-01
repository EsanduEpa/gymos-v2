import { Suspense, type CSSProperties } from 'react';
import { LoadingState, EmptyState, Card } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { GymLogo } from '@/components/navigation/gym-logo';
import { resolveGymBrandColors } from '@gymos/theme-tokens';

async function GymRoleContent({ params, expectedRole }: { params: Promise<{ slug: string }>; expectedRole: 'TRAINER' | 'MEMBER' }) {
  const { slug } = await params;
  const { session, gym, theme } = await requireGymContext(slug, expectedRole);
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><GymLogo key={theme.logoUrl} name={gym.name} url={theme.logoUrl} />
      <div><span className="eyebrow">YOUR GYM WORKSPACE</span><h1>{gym.name}</h1><p>Your {expectedRole.toLowerCase()} workspace.</p></div>
      <span className="role-pill">{expectedRole}</span></div>
    <Card><EmptyState title="No tools available yet." hint="Your gym workspace is ready. Role-specific tools are still being migrated." /></Card>
  </DashboardChrome>;
}
export function GymRolePage(props: { params: Promise<{ slug: string }>; expectedRole: 'TRAINER' | 'MEMBER' }) {
  return <Suspense fallback={<LoadingState label="Loading gym workspace…" page />}><GymRoleContent {...props} /></Suspense>;
}
