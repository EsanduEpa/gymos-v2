import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { recoveryCandidateListSchema } from '@gymos/contracts/credentials';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { cookies } from 'next/headers';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { RecoveryManager } from '@/components/credentials/recovery-manager';
import { Card, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export default async function OwnerRecoveryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/owner/account-recovery/candidates`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const parsed = response.ok ? recoveryCandidateListSchema.safeParse(await response.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">ACCOUNT SECURITY</span><h1>Staff-assisted recovery</h1><p>Verify identity in person or through a known contact before issuing a one-use link.</p></div></div>
    <Card><Feedback tone="info">This automated flow is only for ordinary single-gym members, trainers, and pending applicants. Owner, platform, shared, multi-gym, temporary-password, and ambiguous accounts require the independent operator process. Never record identity document numbers or send recovery links by email or message.</Feedback></Card>
    {!parsed?.success ? <Card><Feedback tone="error">Eligible accounts could not be confirmed. No recovery was issued.</Feedback></Card> : <RecoveryManager slug={slug} candidates={parsed.data.items}/ >}
  </DashboardChrome>;
}
