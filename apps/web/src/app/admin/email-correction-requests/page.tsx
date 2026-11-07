import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { emailCorrectionAdminListSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Feedback } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { resolveCurrentSession } from '@/lib/navigation';
import { EmailCorrectionCloseForm } from '@/components/profile/email-correction-queue';

async function EmailCorrectionQueueContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) redirect('/login');
  const current = await resolveCurrentSession(token); if (current.status === 401) redirect('/login?error=expired'); if (!current.ok) return <main className="platform-page"><Feedback tone="error">Account status is unavailable.</Feedback></main>;
  const session = currentSessionSchema.parse(await current.json()); if (session.globalRole !== 'SUPER_ADMIN') redirect('/');
  const response = await fetch(apiUrl('/admin/email-correction-requests'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
  const parsed = response?.ok ? emailCorrectionAdminListSchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} gyms={[]} displayName={session.displayName ?? 'Platform administrator'}>
    <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">PLATFORM SECURITY</span><h1>Email correction requests</h1><p>Review follow-up requests. Closing records staff handling only; it never changes login identity or gym contact details.</p></div></header>
      {!parsed?.success ? <Feedback tone="error">The correction queue is unavailable. No review outcome is assumed.</Feedback> : parsed.data.length ? parsed.data.map(item => <section className="ui-card" key={item.id}><h2>{item.displayName ?? item.currentEmail}</h2><p>Current login: {item.currentEmail}</p><p>Requested address: {item.requestedEmail}</p><p>Request {item.id} · submitted {new Date(item.submittedAt).toLocaleString()}</p><EmailCorrectionCloseForm id={item.id} version={item.version}/></section>) : <section className="ui-card"><p>No pending requests.</p></section>}
      <p>Do not claim mailbox ownership or change credentials from this queue. Follow the CF-05 login email correction runbook in the project operations documentation.</p>
    </main>
  </DashboardChrome>;
}

export default function EmailCorrectionQueuePage() {
  return <Suspense fallback={<main className="page-loading">Loading email correction queue…</main>}><EmailCorrectionQueueContent/></Suspense>;
}
