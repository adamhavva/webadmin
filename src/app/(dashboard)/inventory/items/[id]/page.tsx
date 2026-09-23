"use client";

import { useParams } from "next/navigation";
import { ItemDetailView } from "@/components/inventory/items/item-detail-view";

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;

  return <ItemDetailView itemId={itemId} />;
}