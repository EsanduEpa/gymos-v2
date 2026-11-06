import Link from 'next/link';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, apiUrl } from '@/lib/gymos';
import { memberApplicationStatusSchema } from '@gymos/contracts';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { withdrawMemberApplication } from '@/app/application-actions';
async function ApplicationsPageContent({searchParams}:{searchParams:Promise<{submitted?:string;consent?:string;withdrawn?:string;error?:string}>}) {
 const token=(await cookies()).get(SESSION_COOKIE)?.value; if(!token) redirect('/login');
 let response:Response; try { response=await fetch(apiUrl('/gyms/me/applications'),{headers:{authorization:'Bearer '+token},cache:'no-store'}); } catch { return <main className="page-loading">Application status is temporarily unavailable. Retry shortly.</main>; }
 if(response.status===401) redirect('/login?error=expired'); if(!response.ok) return <main className="page-loading">Application status is temporarily unavailable.</main>;
 const parsed=memberApplicationStatusSchema.array().max(50).safeParse(await response.json().catch(()=>null)); if(!parsed.success) return <main className="page-loading">Application status could not be confirmed.</main>;
 const {submitted,consent,withdrawn,error}=await searchParams;
 return <main className="auth-shell themed-workspace application-status-shell"><div className="auth-illustration"><Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
  <div className="auth-illustration-copy"><div className="eyebrow">MEMBERSHIP</div><h1>Follow your application.</h1><p>Your gym reviews your request and completes enrollment before access begins.</p></div>
  <span className="auth-footnote">GymOS V2 · Member applications</span></div><section className="auth-form-wrap"><div className="form-card auth-card"><div className="eyebrow dark">YOUR APPLICATIONS</div><h2>Application status</h2>
 {submitted&&<Feedback tone="success">Your application was submitted. The gym owner will review it.</Feedback>}
 {consent==='recorded'&&<Feedback tone="success">Your earlier enrollment consent is recorded. Access begins after enrollment completes.</Feedback>}
 {consent==='invalid'&&<Feedback tone="error">The earlier enrollment offer could not be confirmed. Contact the gym for help.</Feedback>}
 {consent==='unavailable'&&<Feedback tone="error">Enrollment could not be confirmed. Contact the gym; your access has not been activated.</Feedback>}
 {withdrawn&&<Feedback tone="success">Application withdrawn.</Feedback>}
 {error==='withdraw'&&<Feedback tone="error">The application could not be withdrawn. Refresh its status before retrying.</Feedback>}
 <p><Link href="/account/notifications">Account notifications</Link> · <Link href="/help">Help and privacy information</Link></p>
 {parsed.data.length===0?<p className="muted">No applications are linked to this account. Sign in before applying if you already have a GymOS account.</p>:parsed.data.map(item=><Card key={item.id} id={item.id}><CardHeader eyebrow={item.gymName} title={item.state==='APPROVED'?'Approved':item.state==='REJECTED'?'Application update':item.state==='WITHDRAWN'?'Withdrawn':item.state==='PROCESSING'?'Enrollment in progress':'Pending review'}/>
 {item.state==='APPROVED'?<><p>Your gym enrollment is complete. Your member workspace is now available.</p><Link className="ui-button ui-button-primary" href={`/gyms/${encodeURIComponent(item.gymSlug)}/member`}>Open member workspace</Link></>:item.state==='REJECTED'?<p>{item.applicantReason||'The gym is unable to approve this application. Contact the gym for help.'}</p>:item.state==='WITHDRAWN'?<p>This application is closed. Contact the gym if you want to apply again.</p>:item.state==='PROCESSING'?<><p>The owner approved your request. Enrollment is being completed; gym access remains unavailable until its effects reconcile.</p>{item.membershipPlanName&&item.membershipPrice&&item.membershipCurrency&&item.membershipDurationDays&&<div className="application-offer"><strong>Selected membership</strong><p>{item.membershipPlanName} · {item.membershipPrice} {item.membershipCurrency} · {item.membershipDurationDays} days</p></div>}</>:<><p>The owner will review your application. This does not grant membership or personal training access.</p>{item.canWithdraw?<form action={withdrawMemberApplication.bind(null,item.id)}><button className="ui-button ui-button-secondary" type="submit">Withdraw application</button></form>:null}</>}</Card>)}
 <p className="form-note"><Link href="/">Return to GymOS</Link> · <Link href="/login">Sign out</Link></p></div></section></main>;
}
export default function ApplicationsPage(props:{searchParams:Promise<{submitted?:string;consent?:string;withdrawn?:string;error?:string}>}) { return <Suspense fallback={<main className="page-loading">Loading application status…</main>}><ApplicationsPageContent {...props}/></Suspense>; }
