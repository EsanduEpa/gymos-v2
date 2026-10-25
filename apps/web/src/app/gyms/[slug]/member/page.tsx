import { GymRolePage } from '../role-page';

export default function MemberWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  return <GymRolePage params={params} expectedRole="MEMBER" />;
}
