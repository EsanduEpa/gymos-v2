import { redirect } from 'next/navigation';

export default async function TrainerWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/gyms/${encodeURIComponent(slug)}/trainer/earnings`);
}
