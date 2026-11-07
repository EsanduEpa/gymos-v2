import { randomUUID } from 'node:crypto';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { accountProfileSchema } from '@gymos/contracts';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { AccountProfileForm } from '@/components/profile/profile-forms';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, Feedback } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { resolveCurrentSession } from '@/lib/navigation';

async function AccountProfileContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const [current, response] = await Promise.all([
    resolveCurrentSession(token), fetch(apiUrl('/auth/profile'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => new Response(null, { status: 503 })),
  ]);
  if (current.status === 401 || response.status === 401) redirect('/login?error=expired');
  if (current.status === 403 || response.status === 403) redirect('/change-password');
  if (!current.ok) return <main className="platform-page"><h1>Account profile</h1><Feedback tone="error">Account information is temporarily unavailable.</Feedback></main>;
  const session = currentSessionSchema.parse(await current.json());
  const profile = response.ok ? accountProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">ACCOUNT</span><h1>Profile</h1><p>Manage the profile for this signed-in account.</p></div></header>
      {profile?.success ? <AccountProfileForm key={`identity:${profile.data.version}`} profile={profile.data} requestKey={randomUUID()}/> : <Card><Feedback tone="error">Your account profile is unavailable. No changes were made.</Feedback></Card>}
    </main>
  </DashboardChrome>;
}

export default function AccountProfilePage() {
  return <Suspense fallback={<main className="page-loading">Loading account profile…</main>}><AccountProfileContent/></Suspense>;
}
