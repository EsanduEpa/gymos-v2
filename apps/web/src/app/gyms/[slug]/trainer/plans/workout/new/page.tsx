import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { memberWorkoutPlansQuerySchema, trainerClientProfileSchema, workoutPlanViewSchema, workoutTemplatePageSchema, workoutTemplateSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card } from '@/components/ui';
import { WorkoutPlanBuilder } from '@/components/coaching/workout-plan-builder';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';

export default async function NewWorkoutPlanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ memberId?: string; copyFrom?: string; templateId?: string; templatePage?: string }> }) {
  const { slug } = await params;
  const { memberId, copyFrom, templateId, templatePage } = await searchParams;
  const idPattern = /^[A-Za-z0-9_:-]{1,128}$/;
  if (!memberId || !idPattern.test(memberId) || (copyFrom !== undefined && !idPattern.test(copyFrom))
    || (templateId !== undefined && !idPattern.test(templateId)) || (copyFrom && templateId)) notFound();
  const listQuery = memberWorkoutPlansQuerySchema.safeParse({ page: templatePage ?? '1', pageSize: 12 });
  if (!listQuery.success) notFound();
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const clientPath = `/gyms/${encodeURIComponent(slug)}/me/clients/${encodeURIComponent(memberId)}`;
  const read = (path: string) => fetch(apiUrl(path), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }).catch(() => new Response(null, { status: 503 }));
  const templatesPath = `/gyms/${encodeURIComponent(slug)}/me/workout-templates`;
  const [response, source, templateResponse, templatesResponse] = await Promise.all([
    read(clientPath),
    copyFrom ? read(`${clientPath}/workout-plans/${encodeURIComponent(copyFrom)}`) : null,
    templateId ? read(`${templatesPath}/${encodeURIComponent(templateId)}`) : null,
    !copyFrom && !templateId ? read(`${templatesPath}?page=${listQuery.data.page}&pageSize=${listQuery.data.pageSize}`) : null,
  ]);
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  if (source?.status === 401) redirect('/login?error=expired');
  if (source?.status === 403 || source?.status === 404) notFound();
  if (templateResponse?.status === 401 || templatesResponse?.status === 401) redirect('/login?error=expired');
  if (templateResponse?.status === 403 || templateResponse?.status === 404) notFound();
  const profile = response.ok ? trainerClientProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  const copied = source?.ok ? workoutPlanViewSchema.safeParse(await source.json().catch(() => null)) : null;
  const template = templateResponse?.ok ? workoutTemplateSchema.safeParse(await templateResponse.json().catch(() => null)) : null;
  const templates = templatesResponse?.ok ? workoutTemplatePageSchema.safeParse(await templatesResponse.json().catch(() => null)) : null;
  const queryFor = (query: Record<string, string> = {}) => `?${new URLSearchParams({ memberId, ...query })}`;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">WORKOUT PLAN</span><h1>{profile?.success ? `Plan for ${profile.data.client.fullName}` : 'Create workout plan'}</h1>
      <p>Build a personalised plan and assign it to your confirmed client.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(memberId)}`}>Back to client</a></div>
    {profile?.success && templatesResponse ? <Card>
      <h2>Workout templates</h2>
      {!templates?.success ? <p role="alert">Templates are temporarily unavailable.</p> : templates.data.items.length ? <>
        <ul>{templates.data.items.map(item => <li key={item.id}><a className="platform-text-link" href={queryFor({ templateId: item.id })}>{item.name}</a></li>)}</ul>
        <nav aria-label="Template pages" className="trainer-plan-pagination">
          {listQuery.data.page > 1 ? <a href={queryFor({ templatePage: String(listQuery.data.page - 1) })}>Previous templates</a> : null}
          {templates.data.hasMore ? <a href={queryFor({ templatePage: String(listQuery.data.page + 1) })}>More templates</a> : null}
        </nav>
      </> : <p>Save a template from a client’s workout history to reuse it here.</p>}
    </Card> : null}
    {template?.success ? <Card><h2>Using {template.data.name}</h2><p>Review the exercise notes and choose a schedule for this client before assigning.</p>
      <a className="platform-text-link" href={queryFor()}>Choose another template</a></Card> : null}
    {!profile?.success ? <Card><p role="alert">The client profile could not be loaded. Refresh to retry.</p></Card> :
      (copyFrom && !copied?.success) || (templateId && !template?.success) ? <Card><p role="alert">The selected workout could not be loaded. Refresh to retry.</p></Card> : <Card>
      <WorkoutPlanBuilder key={templateId ?? copyFrom ?? memberId} slug={slug} memberId={profile.data.client.id} memberName={profile.data.client.fullName} initialKey={randomUUID()}
        initialPlan={copied?.success ? copied.data : undefined} initialTemplate={template?.success ? template.data : undefined} copy={Boolean(copyFrom)}/>
    </Card>}
  </DashboardChrome>;
}
