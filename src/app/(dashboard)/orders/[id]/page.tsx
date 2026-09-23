import { OrderDetailView } from "@/components/orders/order-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}