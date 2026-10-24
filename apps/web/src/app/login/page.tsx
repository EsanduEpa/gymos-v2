import Link from 'next/link';
import { Suspense } from 'react';
import { login } from '../actions';
import { Button, Feedback, Field, LoadingState } from '@/components/ui';

const messages: Record<string, string> = {
  invalid: 'Check your email and password, then try again.',
  rate: 'Too many attempts. Please wait a minute and try again.',
  unavailable: 'GymOS is temporarily unavailable. Please try again shortly.',
  access: 'This account does not have access to an active gym.',
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
          <p className="muted">Use your GymOS owner or Super Admin account.</p>
          {error && messages[error] ? <Feedback tone="error">{messages[error]}</Feedback> : null}
          <form action={login} className="stack-form">
            <Field label="Email address" type="email" name="email" autoComplete="email" required />
            <Field label="Password" type="password" name="password" autoComplete="current-password" required />
            <Button fullWidth type="submit">Sign in <span>→</span></Button>
          </form>
          <p className="form-note">Your session lasts 15 minutes. Sign in again when it expires.</p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <Suspense fallback={<LoadingState label="Loading sign in…" page />}><LoginContent searchParams={searchParams} /></Suspense>;
}
