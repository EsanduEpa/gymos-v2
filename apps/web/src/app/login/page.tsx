import Link from 'next/link';
import { Suspense } from 'react';
import { login } from '../actions';
import { Button, Feedback, Field, LoadingState } from '@/components/ui';
import { PasswordInput } from '@/components/auth/password-input';

const messages: Record<string, string> = {
  invalid: 'Check your email and password, then try again.',
  rate: 'Too many attempts. Please wait a minute and try again.',
  unavailable: 'GymOS is temporarily unavailable. Please try again shortly.',
  expired: 'Your session has expired. Sign in again.',
  'logout-uncertain': 'This browser is signed out locally, but the server could not confirm session revocation. Other sessions may still be active.',
  access: 'This account does not have access to an active gym.',
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; application?: string; applyGym?: string; returnTo?: string }>;
}) {
  const { error, application, applyGym, returnTo } = await searchParams;
  return (
    <main className="auth-shell">
      <div className="auth-illustration">
        <Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
        <div className="auth-illustration-copy">
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>More time with your members. Less time in the back office.</h1>
          <p>Sign in to your gym’s dedicated space.</p>
        </div>
        <span className="auth-footnote">GymOS V2 · Early access</span>
      </div>
      <div className="auth-form-wrap">
        <div className="form-card auth-card">
          <div className="eyebrow dark">WELCOME BACK</div>
          <h2>Sign in</h2>
          <p className="muted">Use your GymOS account.</p>
          {error && messages[error] ? <Feedback tone="error">{messages[error]}</Feedback> : null}
          {application ? <Feedback tone="info">Continue by signing in, then check your application status. Existing account holders must be signed in when applying.</Feedback> : null}
          <form action={login} className="stack-form">
            {applyGym && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(applyGym) ? <input type="hidden" name="applyGym" value={applyGym}/> : null}
            {returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') ? <input type="hidden" name="returnTo" value={returnTo}/> : null}
            <Field label="Email address" type="email" name="email" autoComplete="email" required />
            <PasswordInput />
            <label className="ui-checkbox"><input type="checkbox" name="deviceClass" value="PERSONAL"/><span>This is my personal device. Keep me signed in between visits for up to 7 days of inactivity.</span></label>
            <p className="form-note">Shared devices stay signed in for up to 30 minutes of inactivity and 8 hours total. The shared-device setting is selected by default.</p>
            <Button fullWidth type="submit">Sign in <span>→</span></Button>
          </form>
          <p className="form-note"><Link href="/recover">Forgot your password? Get staff help</Link></p>
          <p className="form-note"><Link href="/apply">Apply to join a gym</Link> · <Link href="/applications">Check application status</Link></p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; application?: string; applyGym?: string; returnTo?: string }>;
}) {
  return <Suspense fallback={<LoadingState label="Loading sign in…" page />}><LoginContent searchParams={searchParams} /></Suspense>;
}
