import { redirect } from 'next/navigation';

export default async function MemberWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/gyms/${encodeURIComponent(slug)}/member/trainers`);
}
