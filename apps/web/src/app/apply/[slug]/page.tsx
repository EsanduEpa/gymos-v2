import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { existingEndpointContracts } from '@gymos/contracts/legacy';
import { ApplicationForm } from '@/components/applications/application-form';
import { normalizeGymCodeSegment } from '@/lib/application-form';
import { apiUrl } from '@/lib/gymos';

type ApplyPageProps = { params: Promise<{ slug: string }> };

async function ApplyPageContent({ params }: ApplyPageProps) {
  const { slug } = await params;
  const code = normalizeGymCodeSegment(slug);
  if (!code) notFound();
  if (slug !== code) redirect(`/apply/${encodeURIComponent(code)}`);

  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(code)}/theme`), { cache: 'no-store' }).catch(() => null);
  if (response?.status === 404) notFound();
  const gym = existingEndpointContracts.E04.response.safeParse(response?.ok ? await response.json().catch(() => null) : null);
  if (!gym.success) {
    return (
      <main className="auth-shell themed-workspace">
        <section className="auth-form-wrap">
          <div className="form-card auth-card">
            <h1>Gym information is temporarily unavailable</h1>
            <p className="muted">Wait a moment and try again.</p>
            <a className="ui-button ui-button-primary" href={`/apply/${encodeURIComponent(code)}`}>Try again</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell themed-workspace">
      <section className="auth-illustration">
        <Link href="/" className="brand-lockup"><span className="brand-mark">G</span> GymOS</Link>
        <div className="auth-illustration-copy">
          <div className="eyebrow">APPLY TO JOIN</div>
          <h1>{gym.data.name}</h1>
          <p>Your application is reviewed by the gym owner. Creating an account does not grant gym, membership, credit or personal training access.</p>
        </div>
      </section>
      <section className="auth-form-wrap">
        <div className="form-card auth-card">
          <h2>Apply to join</h2>
          <p className="muted">Start with your account and contact details. The gym will review your request.</p>
          <ApplicationForm slug={code}/>
          <p className="form-note"><Link href={`/login?applyGym=${encodeURIComponent(code)}`}>Already have an account? Sign in first to apply.</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function ApplyPage(props: ApplyPageProps) {
  return <Suspense fallback={<main className="page-loading">Loading application…</main>}><ApplyPageContent {...props}/></Suspense>;
}
