import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
function ApplyIndexContent({searchParams}:{searchParams:Promise<{gym?:string}>}) {
 return <Suspense fallback={<main className="page-loading">Loading application…</main>}><ApplyIndexSearch searchParams={searchParams}/></Suspense>;
}
async function ApplyIndexSearch({searchParams}:{searchParams:Promise<{gym?:string}>}) {
 const {gym}=await searchParams;
 if(gym&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gym))redirect('/apply/'+encodeURIComponent(gym));
 return <main className="auth-shell"><section className="auth-form-wrap"><div className="form-card auth-card"><div className="eyebrow dark">APPLY TO JOIN</div><h1>Find your gym</h1><p className="muted">Enter the gym code shared by the gym owner.</p><form action="/apply" method="get" className="stack-form"><label className="ui-field"><span>Gym code</span><input name="gym" pattern="[a-z0-9]+(-[a-z0-9]+)*" required/></label><button className="ui-button ui-button-primary" type="submit">Continue</button></form><p className="form-note">Already have a GymOS account? <Link href="/login">Sign in before applying.</Link></p></div></section></main>;
}
export default function ApplyIndex({searchParams}:{searchParams:Promise<{gym?:string}>}) { return <ApplyIndexContent searchParams={searchParams}/>; }
