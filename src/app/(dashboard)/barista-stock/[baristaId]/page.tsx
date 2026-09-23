import { BaristaStockDetailView } from "@/components/barista-stock/barista-stock-detail-view";

type PageProps = {
  params: Promise<{ baristaId: string }>;
};

export default async function BaristaStockDetailPage({
  params,
}: PageProps) {
  const { baristaId } = await params;

  return <BaristaStockDetailView baristaId={baristaId} />;
}