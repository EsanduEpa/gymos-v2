import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { randomUUID } from 'node:crypto';
import { Plus, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { ProvisioningForm } from '@/components/platform/provisioning-form';
import { Registry } from '@/components/platform/registry';
import { PlatformOverview } from '@/components/platform/overview';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { Feedback, LoadingState } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { resolveCurrentSession } from '@/lib/navigation';
import { currentSupportCookie } from '@/lib/support-context';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { platformAnalyticsSummarySchema, registryPageSchema } from '@gymos/contracts/platform';

type Search = Promise<{ error?: string; cursor?: string }>;
async function AdminContent({ searchParams }: { searchParams: Search }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const current = await resolveCurrentSession(token);
  if (current.status === 401) redirect('/login');
  if (current.status === 403) redirect('/change-password');
  if (!current.ok) throw new Error('Account unavailable');
  const session = currentSessionSchema.parse(await current.json());
  if (session.globalRole !== 'SUPER_ADMIN') redirect('/');
  const { error, cursor } = await searchParams;
  const [registryResponse, summaryResponse] = await Promise.all([
    fetch(apiUrl(`/admin/gyms${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null),
    fetch(apiUrl('/admin/analytics/summary'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null),
  ]);
  if (registryResponse?.status === 401 || summaryResponse?.status === 401) redirect('/login');
  const registryParsed = registryResponse?.ok ? registryPageSchema.safeParse(await registryResponse.json().catch(() => null)) : null;
  const summaryParsed = summaryResponse?.ok ? platformAnalyticsSummarySchema.safeParse(await summaryResponse.json().catch(() => null)) : null;
  const page = registryParsed?.success ? registryParsed.data : null;
  const selected = await currentSupportCookie();
  return <DashboardChrome identityId={session.identityId} gyms={[]} displayName={session.displayName ?? 'Platform administrator'}>
    <div className="platform-page" id="platform-overview">
      <header className="platform-page-heading"><div><span className="platform-eyebrow">YOUR PLATFORM, AT A GLANCE</span><h1>Platform overview</h1><p>Keep your gyms connected. Keep every workspace running smoothly.</p></div><a className="ui-button ui-button-primary" href="#create-gym"><Plus size={17}/> Create a gym</a></header>
      {error === 'support-exit-uncertain' ? <Feedback tone="error">Browser support state was cleared. The API could not confirm revocation; the context still expires at its original time.</Feedback> : null}
      {page ? <PlatformOverview total={page.total} summary={summaryParsed?.success ? summaryParsed.data : null} cursor={cursor}/> : <section className="platform-panel"><h2>Gym registry unavailable</h2><Feedback tone="error">We couldn’t load this registry page. Your workspaces have not been changed.</Feedback><Link className="ui-button ui-button-secondary" href="/admin">Retry from the first page</Link></section>}
      {page ? <Registry page={page} selectedSlug={selected?.slug} supportExpiresAt={selected?.expiresAt} hasCursor={Boolean(cursor)}/> : null}
      <div className="platform-onboarding-grid" id="create-gym"><section className="platform-panel"><div className="platform-panel-heading"><div><span className="platform-eyebrow">GROW YOUR PLATFORM</span><h2>Create a gym workspace</h2><p>Set up a dedicated space for a gym and its owner.</p></div><span className="platform-section-icon"><Plus size={22}/></span></div><ProvisioningForm requestKey={randomUUID()}/></section>
        <aside className="platform-onboarding-note"><span className="platform-section-icon"><ShieldCheck size={25}/></span><span className="platform-eyebrow">A THOUGHTFUL START</span><h2>One gym.<br/>Its own workspace.</h2><p>Each gym gets an isolated environment for its members, trainers and day-to-day operations.</p><ol><li><span>01</span><div><strong>Add the gym details</strong><p>Choose its web address, currency and time zone.</p></div></li><li><span>02</span><div><strong>Follow the setup</strong><p>Check progress while the workspace is prepared.</p></div></li><li><span>03</span><div><strong>Connect the owner</strong><p>Complete private approval or securely hand over their one-time sign-in details.</p></div></li></ol><a className="platform-text-link" href="#gym-registry">Back to gym registry <ArrowUpRight size={16}/></a></aside>
      </div>
      <footer className="platform-page-footer"><span>GymOS · Platform administration</span><span><ShieldCheck size={14}/> Scoped access. Separate workspaces.</span></footer>
    </div>
  </DashboardChrome>;
}
export default function AdminPage({ searchParams }: { searchParams: Search }) {
  return <Suspense fallback={<div className="platform-dashboard platform-loading"><LoadingState label="Loading platform overview…" page/></div>}><AdminContent searchParams={searchParams}/></Suspense>;
}
