import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { emailCorrectionListSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { EmailCorrectionForm } from '@/components/profile/email-correction-form';
import { WithdrawEmailCorrection } from '@/components/profile/email-correction-queue';
import { Feedback } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { resolveCurrentSession } from '@/lib/navigation';

async function EmailCorrectionContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) redirect('/login');
  const current = await resolveCurrentSession(token); if (current.status === 401) redirect('/login?error=expired'); if (current.status === 403) redirect('/change-password'); if (!current.ok) return <main className="platform-page"><Feedback tone="error">Account status is temporarily unavailable.</Feedback></main>;
  const session = currentSessionSchema.parse(await current.json());
  const response = await fetch(apiUrl('/auth/profile/email-correction-requests'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
  const requests = response?.ok ? emailCorrectionListSchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">ACCOUNT IDENTITY</span><h1>Login email correction</h1><p>Login email is global to your GymOS account. Gym contact details are separate.</p></div><Link className="ui-button ui-button-secondary" href="/account/profile">Back to profile</Link></header>
      <EmailCorrectionForm/>
      <section className="ui-card"><h2>Your requests</h2>{!requests?.success ? <Feedback tone="error">Request status could not be loaded. No request status is assumed.</Feedback> : requests.data.length ? <ul>{requests.data.map(item => <li key={item.id}><strong>{item.state.replaceAll('_',' ')}</strong> · requested {new Date(item.submittedAt).toLocaleString()}{item.resolution ? ` · ${item.resolution === 'FOLLOW_UP_RECORDED' ? 'staff follow-up recorded' : 'closed without change'}` : ''}{item.state === 'PENDING' ? <div><WithdrawEmailCorrection id={item.id}/></div> : null}</li>)}</ul> : <p>No correction requests have been recorded.</p>}
        <p>Keep using your current login. Contact your gym in person or through contact details it has already given you. Staff must follow the account verification runbook; entering an address does not prove mailbox ownership.</p></section>
    </main>
  </DashboardChrome>;
}

export default function EmailCorrectionPage() {
  return <Suspense fallback={<main className="page-loading">Loading email correction status…</main>}><EmailCorrectionContent/></Suspense>;
}
