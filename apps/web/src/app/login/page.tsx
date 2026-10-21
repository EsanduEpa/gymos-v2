import Link from 'next/link';
import { Suspense } from 'react';
import { login } from '../actions';

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
          {error && messages[error] ? <p className="notice error" role="alert">{messages[error]}</p> : null}
          <form action={login} className="stack-form">
            <label>Email address<input type="email" name="email" autoComplete="email" required /></label>
            <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
            <button className="primary-button full" type="submit">Sign in <span>→</span></button>
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
  return <Suspense fallback={<main className="page-loading">Loading sign in…</main>}><LoginContent searchParams={searchParams} /></Suspense>;
}
