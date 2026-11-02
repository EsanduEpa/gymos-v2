import { randomUUID } from 'node:crypto';
import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { TrainerRegistrationForm } from '@/components/trainers/trainer-registration-form';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';

export default async function NewTrainerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, gym, theme } = await requireGymContext(slug, 'OWNER');
  if (!gym) notFound();
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">OWNER WORKSPACE</span><h1>Register a trainer</h1><p>Create a trainer profile and secure one-time credential handoff.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/owner`}>Back to workspace</a></div>
    <Card><CardHeader eyebrow="TRAINER PROFILE" title="Trainer details"/><Feedback tone="info">Shift start and end must be provided together. Leave both blank if the trainer has no approved shift yet.</Feedback><TrainerRegistrationForm slug={slug} initialRequestKey={randomUUID()} /></Card>
  </DashboardChrome>;
}
