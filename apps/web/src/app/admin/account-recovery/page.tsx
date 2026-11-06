import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { OperatorRecoveryManager } from '@/components/credentials/operator-recovery-manager';
import { LoadingState } from '@/components/ui';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { Suspense } from 'react';

async function OperatorRecoveryContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl('/auth/session'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { throw new Error('Account unavailable'); }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403) redirect('/change-password');
  if (!response.ok) throw new Error('Account unavailable');
  const session = currentSessionSchema.parse(await response.json());
  if (session.globalRole !== 'SUPER_ADMIN') redirect('/');
  return <DashboardChrome identityId={session.identityId} gyms={[]} displayName={session.displayName ?? 'Platform administrator'}>
    <div className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">PLATFORM SECURITY</span><h1>Operator account recovery</h1><p>Independently verified, one-use recovery for privileged or ambiguous accounts.</p></div></header>
      <OperatorRecoveryManager/>
    </div>
  </DashboardChrome>;
}

export default function OperatorRecoveryPage() {
  return <Suspense fallback={<LoadingState label="Loading recovery tools…" page/>}><OperatorRecoveryContent/></Suspense>;
}
