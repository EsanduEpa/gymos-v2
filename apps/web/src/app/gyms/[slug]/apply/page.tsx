import Link from 'next/link';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { existingEndpointContracts } from '@gymos/contracts/legacy';
import { ApplicationForm } from '@/components/applications/application-form';
import { normalizeGymCodeSegment } from '@/lib/application-form';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

type ExistingApplyPageProps = { params: Promise<{ slug: string }> };

async function ExistingApplyPageContent({ params }: ExistingApplyPageProps) {
  const { slug } = await params;
  const code = normalizeGymCodeSegment(slug);
  if (!code) notFound();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  if (slug !== code) redirect(`/gyms/${encodeURIComponent(code)}/apply`);

  const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(code)}/theme`), { cache: 'no-store' }).catch(() => null);
  if (response?.status === 404) notFound();
  const gym = existingEndpointContracts.E04.response.safeParse(response?.ok ? await response.json().catch(() => null) : null);
  if (!gym.success) return <main className="page-loading">Gym information is temporarily unavailable. Refresh to try again.</main>;

  return (
    <main className="auth-shell themed-workspace">
      <section className="auth-form-wrap">
        <div className="form-card auth-card">
          <div className="eyebrow dark">{gym.data.name}</div>
          <h1>Apply to join</h1>
          <p className="muted">Your application is tied to your signed-in account. The owner must approve access.</p>
          <ApplicationForm slug={code} signedIn/>
          <p className="form-note"><Link href="/help">Help and privacy information</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function ExistingApplyPage(props: ExistingApplyPageProps) {
  return <Suspense fallback={<main className="page-loading">Loading application…</main>}><ExistingApplyPageContent {...props}/></Suspense>;
}
