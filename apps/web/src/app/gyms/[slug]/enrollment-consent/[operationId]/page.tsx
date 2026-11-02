import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui';
import { MemberEnrollmentConsentForm } from '@/components/members/member-enrollment-consent-form';
import { SESSION_COOKIE } from '@/lib/gymos';

export default async function MemberEnrollmentConsentPage({ params }: { params: Promise<{ slug: string; operationId: string }> }) {
  const { slug, operationId } = await params;
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(operationId)) notFound();
  if (!(await cookies()).get(SESSION_COOKIE)?.value) {
    redirect(`/login?returnTo=${encodeURIComponent(`/gyms/${slug}/enrollment-consent/${operationId}`)}`);
  }
  return <main className="auth-shell">
    <Card className="member-registration-card">
      <CardHeader eyebrow="ACCOUNT CONSENT" title="Review gym enrollment" />
      <p>Confirm that you want this gym to link your existing GymOS account as a member. Your password is used only to verify your identity. The gym owner will not receive it.</p>
      <MemberEnrollmentConsentForm slug={slug} operationId={operationId} />
    </Card>
  </main>;
}
