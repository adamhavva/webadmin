"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  ProductForm,
  type ProductFormData,
} from "@/components/inventory/products/product-form";
import { cn } from "@/lib/utils";

type DetailResponse = {
  success: boolean;
  data?: {
    id: string;
    name: string;
    description: string | null;
    sellingPrice: string;
    isActive: boolean;
    metadata: Array<{ key: string; value: string }>;
    images: Array<{
      id: string;
      url: string;
      key: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      isPrimary: boolean;
    }>;
  };
  error?: { message?: string };
};

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = React.useState<ProductFormData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/inventory/products/${encodeURIComponent(productId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const json = (await res.json()) as DetailResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat produk.");
      }

      const d = json.data;
      setProduct({
        id: d.id,
        name: d.name,
        description: d.description,
        sellingPrice: String(Number(d.sellingPrice)),
        isActive: d.isActive,
        metadata: d.metadata ?? [],
        images: d.images ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat produk.");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/inventory/products/${productId}`}
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Edit Produk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product?.name ?? "Memuat..."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">
            Gagal memuat produk
          </h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {error}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-2 size-4" />
              Coba Lagi
            </Button>
            <Link
              href="/inventory/products"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Kembali
            </Link>
          </div>
        </div>
      ) : product ? (
        <ProductForm
          mode="edit"
          productId={product.id}
          initial={product}
        />
      ) : null}
    </div>
  );
}