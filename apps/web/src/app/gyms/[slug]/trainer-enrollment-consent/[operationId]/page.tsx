import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui';
import { TrainerEnrollmentConsentForm } from '@/components/trainers/trainer-enrollment-consent-form';
import { SESSION_COOKIE } from '@/lib/gymos';

export default async function TrainerEnrollmentConsentPage({ params }: { params: Promise<{ slug: string; operationId: string }> }) {
  const { slug, operationId } = await params;
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(operationId)) notFound();
  if (!(await cookies()).get(SESSION_COOKIE)?.value) redirect(`/login?returnTo=${encodeURIComponent(`/gyms/${slug}/trainer-enrollment-consent/${operationId}`)}`);
  return <main className="auth-shell themed-workspace"><Card className="member-registration-card"><CardHeader eyebrow="ACCOUNT CONSENT" title="Review trainer enrollment"/><p>Confirm whether this gym may link your existing GymOS account as a trainer. Your current password verifies your identity and is not shared with the gym.</p><TrainerEnrollmentConsentForm slug={slug} operationId={operationId}/></Card></main>;
}
