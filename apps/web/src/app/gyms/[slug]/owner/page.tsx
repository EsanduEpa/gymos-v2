import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoadingState } from '@/components/ui';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveCurrentSession } from '@/lib/navigation';
import { SESSION_COOKIE } from '@/lib/gymos';
import { OwnerGymPage } from '@/components/navigation/owner-gym-page';

async function OwnerWorkspaceContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const response = await resolveCurrentSession(token);
  if (response.status === 401) redirect('/login');
  if (response.status === 403) redirect('/change-password');
  if (!response.ok) return <main className="page-loading">Could not load your account right now.</main>;
  const session = await response.json() as { globalRole: string; gyms: { slug: string; role: string }[] };
  if (session.globalRole === 'SUPER_ADMIN') redirect('/admin');
  const gym = session.gyms.find((candidate) => candidate.slug === slug);
  if (!gym) notFound();
  if (gym.role !== 'OWNER') redirect(`/gyms/${encodeURIComponent(slug)}/${gym.role === 'TRAINER' ? 'trainer' : 'member'}`);
  return <OwnerGymPage params={Promise.resolve({ slug })} searchParams={Promise.resolve({})} />;
}

export default function OwnerWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<LoadingState label="Loading gym workspace…" page />}>
    <OwnerWorkspaceContent params={params} />
  </Suspense>;
}
