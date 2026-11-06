import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, LoadingState } from '@/components/ui';
import { RecoveryForm } from '@/components/credentials/recovery-form';

export const metadata: Metadata = { title: 'Password help | GymOS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

function RecoveryContent() {
  return <main className="auth-shell themed-workspace"><aside className="auth-illustration"><Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
    <div className="auth-illustration-copy"><div className="eyebrow">ACCOUNT SECURITY</div><h2>Get help with your password.</h2>
      <p>GymOS does not send password reset emails or messages.</p></div><span className="auth-footnote">GymOS V2</span></aside>
    <div className="auth-form-wrap"><Card className="auth-card"><div className="eyebrow dark">STAFF-ASSISTED RECOVERY</div><h1>Reset your password</h1>
      <p className="muted">Contact your gym owner directly using the contact details provided by your gym. After checking your identity in person or through a known contact, the owner can give you a one-use recovery link. It expires after 15 minutes.</p>
      <p className="muted">If you already received a recovery link, continue below. Your link is kept in this page’s URL fragment and is never sent as a referrer.</p>
      <RecoveryForm/><p className="form-note"><Link href="/help">Help and privacy information</Link> · <Link href="/login">Back to sign in</Link></p></Card></div></main>;
}

export default function RecoveryPage() {
  return <Suspense fallback={<LoadingState label="Loading recovery form…" page />}><RecoveryContent/></Suspense>;
}
