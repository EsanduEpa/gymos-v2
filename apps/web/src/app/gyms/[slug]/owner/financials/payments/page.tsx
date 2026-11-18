import { PaymentHistoryScreen } from '@/components/billing/payment-screens';

export default async function OwnerMemberPaymentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PaymentHistoryScreen slug={slug} role="OWNER"/>;
}
