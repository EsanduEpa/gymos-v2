import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { randomUUID } from 'node:crypto';
import { ProvisioningForm } from '@/components/platform/provisioning-form';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { Card, CardHeader, EmptyState, Feedback, LoadingState, PageHeader, StatCard, StatusBadge } from '@/components/ui';

import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { resolveCurrentSession } from '@/lib/navigation';
import { currentSessionSchema, existingEndpointContracts } from '@gymos/contracts/legacy';

type GymRow = { id: string; name: string; slug: string; status: string };

const messages: Record<string, string> = {
  'gym-input': 'Check the gym details, currency and timezone.',
  duplicate: 'That gym slug or owner email is already in use.',
  forbidden: 'Your account does not have Super Admin access.',
  unavailable: 'Gym creation could not finish. Check the API and try again.',
};

async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  let response: Response;
  try {
    response = await fetch(apiUrl('/admin/gyms'), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return <LoadingState label="The API is unavailable. Please try again shortly." page />;
  }
  if (response.status === 401) redirect('/login');
  if (response.status === 403) {
    return <main className="page-loading">This account cannot open Super Admin. <Link href="/login">Use another account</Link>.</main>;
  }
  if (!response.ok) return <main className="page-loading">Could not load gyms right now.</main>;

  const gyms: GymRow[] = existingEndpointContracts.E02.response.parse(await response.json());
  const current = await resolveCurrentSession(token);
  if (current.status === 401) redirect('/login');
  if (current.status === 403) redirect('/change-password');
  if (!current.ok) throw new Error('Account unavailable');
  const session = currentSessionSchema.parse(await current.json());
  const { error, created } = await searchParams;

  return (
    <DashboardChrome identityId={session.identityId} key={session.identityId} gyms={[]} displayName={session.displayName ?? 'Platform administrator'}>
        <PageHeader eyebrow="PLATFORM CONTROL" title="Gym workspaces" description="Create an isolated space for each gym and its owner." action={<StatCard label="Total gyms" value={gyms.length} />} />
        {created ? <Feedback tone="success">{created} is ready. Its owner can sign in now.</Feedback> : null}
        {error && messages[error] ? <Feedback tone="error">{messages[error]}</Feedback> : null}
        <div className="dashboard-grid">
          <Card>
            <CardHeader eyebrow="NEW WORKSPACE" title="Create a gym" action={<span className="panel-icon">＋</span>} />
            <ProvisioningForm requestKey={randomUUID()} />
          </Card>
          <Card>
            <CardHeader eyebrow="WORKSPACES" title="Existing gyms" />
            {gyms.length === 0 ? <EmptyState title="No gyms yet." hint="Create the first one using the form." /> : (
              <div className="gym-list">
                {gyms.map((gym) => <div className="gym-list-row" key={gym.id}>
                  <span className="gym-avatar">{gym.name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{gym.name}</strong><small>{gym.slug}</small></div>
                  <StatusBadge status={gym.status} />
                </div>)}
              </div>
            )}
          </Card>
        </div>
    </DashboardChrome>
  );
}

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  return <Suspense fallback={<LoadingState label="Loading gyms…" page />}><AdminContent searchParams={searchParams} /></Suspense>;
}
