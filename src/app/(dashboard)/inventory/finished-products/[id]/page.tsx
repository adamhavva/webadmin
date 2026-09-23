"use client";

import { useParams } from "next/navigation";
import { FinishedBatchDetailView } from "@/components/inventory/finished-products/finished-product-detail-view";

export default function FinishedBatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;

  return <FinishedBatchDetailView batchId={batchId} />;
}