import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, gymRoleLandingPath, SESSION_COOKIE } from '@/lib/gymos';

import { LoadingState } from '@/components/ui';

async function GymPageContent({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${slug}/access`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
  } catch {
    return <main className="page-loading">The API is unavailable. Please try again shortly.</main>;
  }
  if (response.status === 401) redirect('/login');
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="page-loading">Could not load this gym right now.</main>;
  const access = await response.json() as { role: string; slug: string };
  if (access.slug !== slug) notFound();
  if (access.role !== 'OWNER') {
    if (access.role !== 'TRAINER' && access.role !== 'MEMBER') notFound();
    redirect(`/gyms/${encodeURIComponent(slug)}/${gymRoleLandingPath(access.role as 'TRAINER' | 'MEMBER')}`);
  }
  const query = await searchParams;
  const suffix = new URLSearchParams();
  if (query.error) suffix.set('error', query.error);
  if (query.created) suffix.set('created', query.created);
  redirect(`/gyms/${encodeURIComponent(slug)}/owner${suffix.size ? `?${suffix}` : ''}`);
}

export default function GymPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  return <Suspense fallback={<LoadingState label="Loading gym…" page />}><GymPageContent params={params} searchParams={searchParams} /></Suspense>;
}
