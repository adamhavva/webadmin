"use client";

import { useParams } from "next/navigation";
import { ProductDetailView } from "@/components/inventory/products/product-detail-view";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  return <ProductDetailView productId={productId} />;
}