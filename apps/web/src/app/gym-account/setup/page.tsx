import Link from 'next/link';
import { SetupForm } from './setup-form';

export default function GymAccountSetupPage() {
  return <main className="auth-shell themed-workspace"><div className="auth-illustration"><Link href="/login" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link><div className="auth-illustration-copy"><div className="eyebrow">YOUR GYM ACCOUNT</div><h1>One sign-in for one gym.</h1><p>Set up separate credentials for a gym linked to your existing account.</p></div></div><div className="auth-form-wrap"><div className="form-card auth-card"><div className="eyebrow dark">ACCOUNT SETUP</div><h2>Set up this gym</h2><p className="muted">Use your existing login once to verify the gym relationship. Your new username and password will sign in only to this gym.</p><SetupForm/><p className="form-note"><Link href="/login">Back to sign in</Link></p></div></div></main>;
}
