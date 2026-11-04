import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';

export default async function OwnerSubscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { session, gym, theme } = await requireGymContext(slug, 'OWNER');
  if (!gym) notFound();
  const brand = resolveGymBrandColors(theme.primaryColor); const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <header className="owner-page-header"><div><h1>Subscription &amp; Billing</h1><p>Manage your GymOS service subscription.</p></div></header>
    <Card><CardHeader eyebrow="SUBSCRIPTION" title="Billing is not available in GymOS V2"/><Feedback tone="info">This page is retained for navigation parity. Billing status, payment methods, invoices, and plan changes are not available here, and no payment or plan change has been made.</Feedback></Card>
  </DashboardChrome>;
}
