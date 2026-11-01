import { OwnerGymPage } from '@/components/navigation/owner-gym-page';
export default function OwnerWorkspace(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; created?: string }> }) {
  return <OwnerGymPage {...props} />;
}
