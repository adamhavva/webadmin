"use client";

import { useParams } from "next/navigation";
import { BatchDetailView } from "@/components/inventory/batches/batch-detail-view";

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;

  return <BatchDetailView batchId={batchId} />;
}