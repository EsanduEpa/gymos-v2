import { PaymentHistoryScreen } from '@/components/billing/payment-screens';

export default async function MemberPaymentHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PaymentHistoryScreen slug={slug} role="MEMBER"/>;
}
