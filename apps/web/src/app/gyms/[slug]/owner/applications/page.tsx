import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { configurationReadSchema, memberApplicationQueueSchema } from '@gymos/contracts';
import { decideMemberApplication } from '@/app/application-actions';
type Props={params:Promise<{slug:string}>;searchParams:Promise<{error?:string;updated?:string}>};
export default async function OwnerApplicationsPage({params,searchParams}:Props){
 const {slug}=await params;const {session,gym}=await requireGymContext(slug,'OWNER');const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)redirect('/login');
 const [queueResponse,configResponse]=await Promise.all([
  fetch(apiUrl('/gyms/'+encodeURIComponent(slug)+'/owner/applications?page=1&pageSize=50'),{headers:{authorization:'Bearer '+token},cache:'no-store'}).catch(()=>null),
  fetch(apiUrl('/gyms/'+encodeURIComponent(slug)+'/configuration'),{headers:{authorization:'Bearer '+token},cache:'no-store'}).catch(()=>null),
 ]);
 if(queueResponse?.status===401||configResponse?.status===401)redirect('/login?error=expired');if(!queueResponse||queueResponse.status===403||queueResponse.status===404)notFound();
 const queue=queueResponse.ok?memberApplicationQueueSchema.safeParse(await queueResponse.json().catch(()=>null)):null;
 const config=configResponse?.ok?configurationReadSchema.safeParse(await configResponse.json().catch(()=>null)):null;const {error,updated}=await searchParams;
 return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName??'GymOS user'}>
 <div className="gym-banner"><div><div className="eyebrow">MEMBER ENROLLMENT</div><h1>Applications</h1><p>Review requests. Gym access is enabled only when enrollment reconciles.</p></div><a className="ui-button ui-button-secondary" href={'/gyms/'+slug+'/owner/members'}>Back to members</a></div>
 {error==='conflict'&&<Feedback tone="error">This application changed or another owner acted. Reload and review its current status.</Feedback>}{error==='outcome'&&<Feedback tone="error">Enrollment may need recovery. Reload the queue and retry the same application details.</Feedback>}{error==='invalid'&&<Feedback tone="error">Check the membership plan and date of birth.</Feedback>}{updated&&<Feedback tone="success">Application decision saved.</Feedback>}
 <p><a href="/account/notifications">Account notifications</a></p>
 {!queue?.success?<Card><CardHeader title="Applications unavailable"/><p>Retry when the gym API is available.</p></Card>:queue.data.items.length===0?<Card><CardHeader title="No applications yet"/><p>New member requests will appear here.</p></Card>:queue.data.items.map(item=><Card key={item.id} id={item.id} className="owner-application-card"><CardHeader eyebrow={item.state.replace('_',' ')} title={item.fullName}/><p>{item.email} · {item.phone}</p>{item.privateNote&&<p><strong>Private owner note:</strong> {item.privateNote}</p>}{item.applicantReason&&<p><strong>Applicant-facing update:</strong> {item.applicantReason}</p>}
 {item.state==='PENDING'||item.state==='PROCESSING'||item.state==='RECOVERY_REQUIRED'?<div className="owner-application-actions"><form action={decideMemberApplication.bind(null,slug,item.id)} className="stack-form"><input type="hidden" name="decision" value="APPROVE"/><input type="hidden" name="expectedVersion" value={item.version}/><label className="ui-field"><span>Membership plan</span><select name="membershipPlanId" required defaultValue={item.membershipPlanId??''}><option value="" disabled>Select a plan</option>{config?.success?config.data.plans.filter(plan=>plan.status==='ACTIVE').map(plan=><option key={plan.id} value={plan.id}>{plan.name} · {plan.price} {plan.currency} · {plan.durationDays} days</option>):null}</select></label><label className="ui-field"><span>Date of birth (required for member record)</span><input name="dateOfBirth" type="date" required defaultValue={item.dateOfBirth??''}/></label><button className="ui-button ui-button-primary" type="submit">{item.state==='PENDING'?'Approve and enroll member':'Retry enrollment'}</button><p className="form-note">The applicant already requested to join. Approval starts enrollment; the member appears after access and membership reconcile. No payment or PT credits are created.</p></form>{item.state==='PENDING'?<form action={decideMemberApplication.bind(null,slug,item.id)} className="stack-form"><input type="hidden" name="decision" value="REJECT"/><input type="hidden" name="expectedVersion" value={item.version}/><label className="ui-field"><span>Reason shown to applicant (optional)</span><input name="applicantReason" maxLength={240}/></label><label className="ui-field"><span>Private owner note (optional)</span><textarea name="privateNote" maxLength={2000}/></label><button className="ui-button ui-button-secondary" type="submit">Reject application</button></form>:null}</div>:null}</Card>)}
 </DashboardChrome>;
}
