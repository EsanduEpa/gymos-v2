import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Field, Button, Feedback } from '@/components/ui';
import { apiUrl } from '@/lib/gymos';
import { submitPublicApplication } from '@/app/application-actions';
const messages: Record<string,string> = { invalid: 'Check your details and use a password with at least 10 characters plus a number or symbol.',
  unavailable: 'Applications are temporarily unavailable. Try again shortly.', rate: 'Too many attempts. Wait a minute before trying again.' };
async function ApplyPageContent({ params, searchParams }: { params: Promise<{slug:string}>; searchParams: Promise<{error?:string}> }) {
  const {slug}=await params; if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  let response:Response; try { response=await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/theme`),{cache:'no-store'}); } catch { return <main className="auth-shell"><div className="auth-form-wrap">Gym information is temporarily unavailable.</div></main>; }
  if(!response.ok) notFound(); const gym=await response.json() as {name:string}; const {error}=await searchParams;
  return <main className="auth-shell"><section className="auth-illustration"><Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link><div className="auth-illustration-copy"><div className="eyebrow">APPLY TO JOIN</div><h1>{gym.name}</h1><p>Your application is reviewed by the gym owner. Creating an account does not grant gym, membership, credit or personal training access.</p></div></section><section className="auth-form-wrap"><div className="form-card auth-card"><h2>Apply to join</h2><p className="muted">Start with your account and contact details. The gym will review your request.</p>{error&&messages[error]?<Feedback tone="error">{messages[error]}</Feedback>:null}<form action={submitPublicApplication.bind(null,slug)} className="stack-form"><Field label="Full name" name="fullName" autoComplete="name" required/><Field label="Email address" type="email" name="email" autoComplete="email" required/><Field label="Phone" type="tel" name="phone" autoComplete="tel" required/><Field label="Create password" type="password" name="password" autoComplete="new-password" required/><label className="ui-checkbox"><input type="checkbox" name="consent" value="yes" required/><span>I am applying to join this gym and understand the owner must approve access. My account password remains mine.</span></label><Button fullWidth type="submit">Submit application</Button></form><p className="form-note"><Link href={'/login?applyGym='+encodeURIComponent(slug)}>Already have an account? Sign in first to apply.</Link></p></div></section></main>;
}
export default function ApplyPage(props: { params: Promise<{slug:string}>; searchParams: Promise<{error?:string}> }) {
  return <Suspense fallback={<main className="page-loading">Loading application…</main>}><ApplyPageContent {...props}/></Suspense>;
}
