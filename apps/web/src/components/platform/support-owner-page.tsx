import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { currentSessionSchema } from '@gymos/contracts/legacy';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { resolveCurrentSession } from '@/lib/navigation';
import { readSupportSummary } from '@/lib/support-context';
import { SESSION_COOKIE } from '@/lib/gymos';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback, StatCard, StatusBadge, Button } from '@/components/ui';
import { exitSupport } from '@/app/platform-actions';
export async function SupportOwnerPage({slug}:{slug:string}){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)redirect('/login');
 const current=await resolveCurrentSession(token);if(current.status===401)redirect('/login');if(current.status===403)redirect('/change-password');if(!current.ok)throw new Error('Account unavailable');
 const session=currentSessionSchema.parse(await current.json());if(session.globalRole!=='SUPER_ADMIN')redirect('/');
 const summary=await readSupportSummary(slug,token);
 if(!summary)return <main className="page-loading"><Feedback tone="error">Support context ended or this gym is unavailable. Return to the registry to start a new, reasoned context.</Feedback><form action={exitSupport} data-support-exit><Button>Exit support</Button></form></main>;
 const brand=resolveGymBrandColors(summary.gym.primaryColor??'#007A35');const style={'--gym-color':brand.primary,'--gym-on-color':brand.onPrimary} as CSSProperties;
 return <DashboardChrome identityId={session.identityId} gym={{id:summary.gym.id,slug:summary.gym.slug,name:summary.gym.name,role:'OWNER'}} gyms={[]} displayName={session.displayName??'Platform administrator'} style={style} support={{id:summary.id,expiresAt:summary.expiresAt}}>
  <div className="gym-banner"><div><span className="eyebrow">READ-ONLY OWNER SUMMARY</span><h1>{summary.gym.name}</h1><p>Scoped support · <StatusBadge status={summary.gym.status}/></p></div></div>
  <Card><CardHeader eyebrow="GYM SUMMARY" title="Workspace status"/><p>Binding: {summary.health.replaceAll('_',' ')} · Operation: {summary.operationState?.replaceAll('_',' ')??'Unavailable'}</p>
  {summary.tenant?<><div className="support-stats"><StatCard label="Members" value={summary.tenant.memberCount}/><StatCard label="Trainers" value={summary.tenant.trainerCount}/></div><p>Currency: {summary.tenant.currency??'Not configured'} · Timezone: {summary.tenant.timezone??'Not configured'}</p></>:<Feedback tone="info">Only the platform summary is available while this gym is provisioning, failed or awaiting repair.</Feedback>}</Card>
 </DashboardChrome>;
}
