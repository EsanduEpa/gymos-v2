import type { CSSProperties } from 'react';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { OwnerGymConfiguration } from '@/components/configuration/owner-gym-configuration';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { requireGymContext } from '@/lib/gym-context';
import { loadGymConfiguration } from '@/app/gym-config-actions';

export default async function GymConfigurationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const result = await loadGymConfiguration(slug);
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">OWNER WORKSPACE</span><h1>Gym Configuration</h1><p>Manage your profile, plans, rates and membership policy.</p></div></div>
    {!result.ok ? <Card><CardHeader eyebrow="GYM SETTINGS" title="Settings unavailable"/><Feedback tone="error">{result.error}</Feedback><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner/gym-config`}>Retry loading settings</a></Card> :
      <OwnerGymConfiguration slug={slug} initial={result.data} />}
  </DashboardChrome>;
}
