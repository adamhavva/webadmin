"use client";

import { useParams } from "next/navigation";
import { RestockDetailView } from "@/components/inventory/restocks/restock-detail-view";

export default function RestockDetailPage() {
  const params = useParams();
  const restockId = params.id as string;

  return <RestockDetailView restockId={restockId} />;
}