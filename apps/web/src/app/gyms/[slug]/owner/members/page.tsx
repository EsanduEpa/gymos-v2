import { Suspense } from 'react';
import { OwnerGymPage } from '@/components/navigation/owner-gym-page';
import { SupportOwnerPage } from '@/components/platform/support-owner-page';
import { currentSupportCookie } from '@/lib/support-context';
import { LoadingState } from '@/components/ui';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; created?: string; q?: string; status?: string; page?: string }> };
async function Content(props: Props) {
  const support = await currentSupportCookie();
  if (support) { const { slug } = await props.params; return <SupportOwnerPage slug={slug}/>; }
  return <OwnerGymPage {...props}/>;
}
export default function OwnerMembersPage(props: Props) { return <Suspense fallback={<LoadingState label="Loading members…" page/>}><Content {...props}/></Suspense>; }
