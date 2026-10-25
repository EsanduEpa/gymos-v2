import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/components/ui';
import { gymRolePath, SESSION_COOKIE, type GymAccessSummary } from '@/lib/gymos';
import { resolveCurrentSession } from '@/lib/navigation';

async function HomeContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  let response: Response;
  try {
    response = await resolveCurrentSession(token);
  } catch {
    return <main className="page-loading">GymOS is temporarily unavailable. Please try again shortly.</main>;
  }
  if (response.status === 401) redirect('/login');
  if (response.status === 403) redirect('/change-password');
  if (!response.ok) return <main className="page-loading">Could not load your account right now.</main>;
  const session = await response.json() as { globalRole: string; mustChangePassword: boolean; gyms: GymAccessSummary[] };
  if (session.mustChangePassword) redirect('/change-password');
  if (session.globalRole === 'SUPER_ADMIN') redirect('/admin');
  if (session.gyms.length === 0) redirect('/no-access');
  const firstGym = session.gyms[0];
  if (session.gyms.length === 1 && firstGym) redirect(`/gyms/${encodeURIComponent(firstGym.slug)}/${firstGym.role === 'OWNER' ? 'owner' : gymRolePath(firstGym.role)}`);
  redirect('/gyms/select');
}

export default function Home() {
  return <Suspense fallback={<LoadingState label="Loading your workspace…" page />}><HomeContent /></Suspense>;
}
