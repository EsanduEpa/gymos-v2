import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SESSION_COOKIE } from '@/lib/gymos';
import { ChangePasswordForm } from '@/components/credentials/change-password-form';
import { LoadingState } from '@/components/ui';

async function ChangePasswordContent({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const firstChange = (await searchParams).mode !== 'normal';
  if (!(await cookies()).get(SESSION_COOKIE)?.value) redirect('/login');
  return (
    <main className="auth-shell themed-workspace">
      <aside className="auth-illustration">
        <Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
        <div className="auth-illustration-copy">
          <div className="eyebrow">ACCOUNT SECURITY</div>
          <h2>Secure your GymOS account.</h2>
          <p>Choose a password only you know.</p>
        </div>
        <span className="auth-footnote">GymOS V2</span>
      </aside>
      <div className="auth-form-wrap">
        <section className="form-card auth-card">
          <div className="eyebrow dark">ACCOUNT SECURITY</div>
          <h1>{firstChange ? 'Choose your own password' : 'Change your password'}</h1>
          <p className="muted">{firstChange ? 'If your account was issued a temporary password, enter it as your current password.' : 'Enter your current password to confirm this security change.'}</p>
          <ChangePasswordForm firstChange={firstChange} />
        </section>
      </div>
    </main>
  );
}

export default function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return <Suspense fallback={<LoadingState label="Loading password form…" page />}><ChangePasswordContent searchParams={searchParams} /></Suspense>;
}
