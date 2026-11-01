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
import { registryPageSchema } from '@gymos/contracts/platform';

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
 return <DashboardChrome identityId={session.identityId} gyms={[]} displayName={session.displayName??'Platform administrator'}>
  <PageHeader eyebrow="PLATFORM CONTROL" title="Gym workspaces" description="Manage tenant gyms and enter scoped read-only support." action={<StatCard label="Total gyms" value={page.total}/>}/>
  {error==='support-exit-uncertain'?<Feedback tone="error">Browser support state was cleared. The API could not confirm revocation; the context still expires at its original time.</Feedback>:null}
  <Registry page={page} selectedSlug={selected?.slug}/>
  {cursor?<p><Link href="/admin">← First page</Link></p>:null}
  <Card><CardHeader eyebrow="NEW WORKSPACE" title="Create a gym"/><ProvisioningForm requestKey={randomUUID()}/></Card>
 </DashboardChrome>;
}
export default function AdminPage({searchParams}:{searchParams:Search}){return <Suspense fallback={<LoadingState label="Loading gyms…" page/>}><AdminContent searchParams={searchParams}/></Suspense>;}
