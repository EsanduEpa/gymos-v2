import { GymRolePage } from '../role-page';

export default function TrainerWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  return <GymRolePage params={params} expectedRole="TRAINER" />;
}
