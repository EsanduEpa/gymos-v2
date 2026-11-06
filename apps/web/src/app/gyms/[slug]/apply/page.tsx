import Link from 'next/link';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { submitAuthenticatedApplication } from '@/app/application-actions';
import { Field, Button, Feedback } from '@/components/ui';
async function ExistingApplyPageContent({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{error?:string}>}) {
 const {slug}=await params; if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))notFound(); const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)redirect('/login');
 let gymResponse:Response;try{gymResponse=await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/theme`),{cache:'no-store'});}catch{return <main className="page-loading">Gym information is unavailable.</main>;}
 if(!gymResponse.ok)notFound();const gym=await gymResponse.json() as {name:string};const {error}=await searchParams;
 return <main className="auth-shell themed-workspace"><section className="auth-form-wrap"><div className="form-card auth-card"><div className="eyebrow dark">{gym.name}</div><h1>Apply to join</h1><p className="muted">Your application is tied to your signed-in account. The owner must approve access.</p>{error&&<Feedback tone="error">Your application could not be submitted. The result may be unconfirmed; check your application status before submitting again. If the gym is unavailable, retry later.</Feedback>}<form action={submitAuthenticatedApplication.bind(null,slug)} className="stack-form"><Field label="Full name" name="fullName" autoComplete="name" required/><Field label="Phone" type="tel" name="phone" autoComplete="tel" required/><label className="ui-checkbox"><input type="checkbox" name="consent" value="yes" required/><span>I request to join this gym. The owner must approve my access.</span></label><Button fullWidth type="submit">Submit application</Button></form><p className="form-note"><Link href="/help">Help and privacy information</Link></p></div></section></main>;
}
export default function ExistingApplyPage(props:{params:Promise<{slug:string}>;searchParams:Promise<{error?:string}>}) { return <Suspense fallback={<main className="page-loading">Loading application…</main>}><ExistingApplyPageContent {...props}/></Suspense>; }
