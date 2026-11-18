import { PaymentReceiptScreen } from '@/components/billing/payment-screens';

export default async function MemberPaymentReceiptPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params;
  return <PaymentReceiptScreen slug={slug} role="MEMBER" orderId={orderId}/>;
}
