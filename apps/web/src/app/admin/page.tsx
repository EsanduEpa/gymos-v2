import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { randomUUID } from 'node:crypto';
import { ProvisioningForm } from '@/components/platform/provisioning-form';
import { Registry } from '@/components/platform/registry';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { Card, CardHeader, Feedback, LoadingState, PageHeader, StatCard } from '@/components/ui';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { resolveCurrentSession } from '@/lib/navigation';
import { currentSupportCookie } from '@/lib/support-context';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { platformAnalyticsSummarySchema, registryPageSchema } from '@gymos/contracts/platform';
import { RefreshSummaries } from '@/components/platform/refresh-summaries';

type Search = Promise<{ error?: string; cursor?: string }>;
async function AdminContent({searchParams}:{searchParams:Search}) {
 const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)redirect('/login');
 const current=await resolveCurrentSession(token);if(current.status===401)redirect('/login');if(current.status===403)redirect('/change-password');if(!current.ok)throw new Error('Account unavailable');
 const session=currentSessionSchema.parse(await current.json());if(session.globalRole!=='SUPER_ADMIN')redirect('/');
 const {error,cursor}=await searchParams;
 let response:Response;
 try{response=await fetch(apiUrl(`/admin/gyms${cursor?`?cursor=${encodeURIComponent(cursor)}`:''}`),{headers:{authorization:`Bearer ${token}`},cache:'no-store'});}
 catch{return <main className="page-loading"><Feedback tone="error">The registry is unavailable. <Link href="/admin">Try again</Link>.</Feedback></main>;}
 if(response.status===401)redirect('/login');if(!response.ok)return <main className="page-loading"><Feedback tone="error">Could not load this registry page. <Link href="/admin">Return to the first page</Link>.</Feedback></main>;
 const page=registryPageSchema.parse(await response.json());const selected=await currentSupportCookie();
 let summaryResponse:Response;try{summaryResponse=await fetch(apiUrl('/admin/analytics/summary'),{headers:{authorization:`Bearer ${token}`},cache:'no-store'});}catch{summaryResponse=new Response(null,{status:503});}
 if(summaryResponse.status===401)redirect('/login');const summaryParsed=summaryResponse.ok?platformAnalyticsSummarySchema.safeParse(await summaryResponse.json().catch(()=>null)):null;const summary=summaryParsed?.success?summaryParsed.data:null;
 return <DashboardChrome identityId={session.identityId} gyms={[]} displayName={session.displayName??'Platform administrator'}>
  <PageHeader eyebrow="PLATFORM CONTROL" title="Gym workspaces" description="Manage tenant gyms and enter scoped read-only support." action={<StatCard label="Total gyms" value={page.total}/>}/>
  <Card><CardHeader eyebrow="SANITIZED PLATFORM SUMMARY" title="Tenant overview" action={<StatCard label="Active gyms" value={summary?.activeGyms??'—'}/>}/>
   {summary?<><p>{summary.partial?'Partial or stale summary · unavailable gyms are excluded and totals are withheld.':`Counts are current within ${summary.freshnessSeconds/60} minutes.`} · {summary.verifiedGyms} verified · {summary.staleGyms} stale · {summary.unavailableGyms} unavailable · as of {summary.asOf}</p>
    <div className="finance-metrics"><div className="finance-metric"><small>Member profiles</small><strong>{summary.memberCount??'Partial'}</strong></div><div className="finance-metric"><small>Trainer profiles</small><strong>{summary.trainerCount??'Partial'}</strong></div></div>
   </>:<Feedback tone="info">Cached aggregate summary is not available; registry details remain available.</Feedback>}
   <RefreshSummaries cursor={cursor}/>
  </Card>
  {error==='support-exit-uncertain'?<Feedback tone="error">Browser support state was cleared. The API could not confirm revocation; the context still expires at its original time.</Feedback>:null}
  <Registry page={page} selectedSlug={selected?.slug}/>
  {cursor?<p><Link href="/admin">← First page</Link></p>:null}
  <Card><CardHeader eyebrow="NEW WORKSPACE" title="Create a gym"/><ProvisioningForm requestKey={randomUUID()}/></Card>
 </DashboardChrome>;
}
export default function AdminPage({searchParams}:{searchParams:Search}){return <Suspense fallback={<LoadingState label="Loading gyms…" page/>}><AdminContent searchParams={searchParams}/></Suspense>;}
