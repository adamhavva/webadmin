"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Factory,
  Package,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type ProductionComponent = {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryBatchId: string;
  batchCode: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

type ProductionDetail = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sellingPrice: number;
  };
  outputQuantity: number;
  totalCost: number;
  unitCost: number;
  components: ProductionComponent[];
  finishedBatch: {
    id: string;
    batchCode: string;
    quantity: number;
    remainingQuantity: number;
    unitCost: number;
    totalCost: number;
  } | null;
  createdAt: string;
};

type DetailResponse = {
  success: boolean;
  data?: ProductionDetail;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatUnitCost(n: number): string {
  if (Math.abs(n) >= 1) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(n);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

// ============================================================
// Skeleton / Error
// ============================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
      </div>
      <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
    </div>
  );
}

function DetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat produksi</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/inventory/productions"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function ProductionDetailView({
  productionId,
}: {
  productionId: string;
}) {
  const [data, setData] = React.useState<ProductionDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/inventory/productions/${encodeURIComponent(productionId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat produksi.");
      }
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat produksi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [productionId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailError
          message={error ?? "Produksi tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const margin =
    data.product.sellingPrice > 0 && data.unitCost > 0
      ? ((data.product.sellingPrice - data.unitCost) /
          data.product.sellingPrice) *
        100
      : null;

  const marginClass =
    margin === null
      ? "text-muted-foreground"
      : margin >= 0
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/productions"
            aria-label="Kembali"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" })
            )}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {data.product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.outputQuantity} unit ·{" "}
              {formatDateTime(data.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/inventory/products/${data.productId}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Lihat Produk
          </Link>
        </div>
      </div>

      {/* Info Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="font-mono">
              <Factory className="mr-1 size-3" />
              {data.finishedBatch?.batchCode ?? "—"}
            </Badge>
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
              Selesai
            </Badge>
            <Link
              href={`/inventory/products/${data.productId}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {data.product.name}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Package className="size-3.5" />
              Output Produksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.outputQuantity)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              unit produk jadi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-3.5" />
              HPP / Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatRupiah(data.unitCost)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total biaya: {formatRupiah(data.totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            {margin !== null ? (
              <>
                <div className={cn("text-2xl font-bold", marginClass)}>
                  Margin ~ {margin.toFixed(1)}%
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Harga jual: {formatRupiah(data.product.sellingPrice)}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="size-4" />
            Komponen Bahan yang Dikonsumsi
          </CardTitle>
          <CardDescription>
            Bahan dan batch yang benar-benar dipakai (via FIFO).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-6 py-3 text-left font-medium">Bahan</th>
                  <th className="px-4 py-3 text-left font-medium">Batch</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    HPP / Unit
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.components.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="px-6 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/batches/${c.inventoryBatchId}`}
                        className="font-mono text-xs text-muted-foreground hover:underline"
                      >
                        {c.batchCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(c.quantity)}{" "}
                      <span className="text-xs text-muted-foreground">
                        {c.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatUnitCost(c.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatRupiah(c.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td
                    colSpan={4}
                    className="px-6 py-3 text-right font-medium"
                  >
                    Total Biaya Produksi
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold">
                    {formatRupiah(data.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Finished Batch Info */}
      {data.finishedBatch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4" />
              Batch Produk Jadi
            </CardTitle>
            <CardDescription>
              Stock produk yang dihasilkan dari produksi ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Batch Code</p>
                <p className="mt-1 font-mono text-sm font-medium">
                  {data.finishedBatch.batchCode}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  Quantity Awal
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(data.finishedBatch.quantity)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  Sisa Stok
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(data.finishedBatch.remainingQuantity)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  HPP / Unit
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {formatRupiah(data.finishedBatch.unitCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}