"use client";

import { useParams } from "next/navigation";
import { ProductionDetailView } from "@/components/inventory/productions/production-detail-view";

export default function ProductionDetailPage() {
  const params = useParams();
  const productionId = params.id as string;

  return <ProductionDetailView productionId={productionId} />;
}