import { notFound, redirect } from 'next/navigation';
import { progressReportQuerySchema, progressReportSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { BodyMeasurementForm } from '@/components/coaching/coaching-record-forms';
import { ProgressReport } from '@/components/coaching/progress-report';
import { UploadProgressPhotoForm } from '@/components/coaching/progress-photo-forms';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

export default async function MemberProgressPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ through?: string }> }) {
  const { slug } = await params;
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const path = `${base}/member/progress`;
  const query = progressReportQuerySchema.safeParse(await searchParams);
  if (!query.success) redirect(path);
  const { token, session, gym } = await requireGymContext(slug, 'MEMBER');
  const search = query.data.through ? `?${new URLSearchParams({ through: query.data.through })}` : '';
  const response = await fetch(apiUrl(`${base}/me/progress${search}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
    .catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  if (response.status === 422 && search) redirect(path);
  const report = response.ok ? progressReportSchema.safeParse(await response.json().catch(() => null)) : null;
  return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <div className="gym-banner"><h1>Your progress</h1></div>
    {report?.success ? <>
      <Card><CardHeader title="Record a measurement"/><BodyMeasurementForm slug={slug} today={report.data.today}/></Card>
      <UploadProgressPhotoForm slug={slug} today={report.data.today}/>
      <ProgressReport report={report.data} path={path} slug={slug}/>
    </> : <Card><Feedback tone="error">Progress could not be loaded. Refresh to try again.</Feedback></Card>}
  </DashboardChrome>;
}
