"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
  RefreshCw,
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

type Unit = "ML" | "PCS";

type Batch = {
  id: string;
  batchCode: string;
  sourceType: "RESTOCK" | "PRODUCTION";
  quantity: string;
  remainingQuantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: string;
};

type Restock = {
  id: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  supplierName: string | null;
  createdAt: string;
};

type RecipeUsage = {
  id: string;
  quantity: number;
  recipeId: string;
  version: number;
  isActive: boolean;
  productId: string;
  productName: string;
};

type ItemDetail = {
  id: string;
  name: string;
  unit: Unit;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stock: {
    totalStock: number;
    totalQuantity: number;
    totalValue: number;
    batchCount: number;
    availableBatchCount: number;
  };
  batches: Batch[];
  recentRestocks: Restock[];
  recipesUsing: RecipeUsage[];
};

type DetailResponse = {
  success: boolean;
  data?: ItemDetail;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(n: number | string): string {
  const num = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID").format(num);
}

function formatRupiah(n: number | string): string {
  const num = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg border bg-muted/30" />
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat detail</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/inventory/items"
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

export function ItemDetailView({ itemId }: { itemId: string }) {
  const [item, setItem] = React.useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/inventory/items/${encodeURIComponent(itemId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const json = (await res.json()) as DetailResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat detail.");
      }

      setItem(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat detail."
      );
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

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

  if (error || !item) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailError
          message={error ?? "Bahan tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/items"
            aria-label="Kembali"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" })
            )}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {item.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Detail bahan baku
            </p>
          </div>
        </div>

        <Link
          href={`/inventory/items/${item.id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Pencil className="mr-2 size-4" />
          Edit
        </Link>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {item.unit}
            </Badge>

            {item.isActive ? (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                Aktif
              </Badge>
            ) : (
              <Badge variant="secondary">Nonaktif</Badge>
            )}

            <span className="text-xs text-muted-foreground">
              Dibuat {formatDateTime(item.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(item.stock.totalStock)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.unit} tersedia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Batch Tersedia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.stock.availableBatchCount}
              <span className="text-base font-normal text-muted-foreground">
                /{item.stock.batchCount}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              batch aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Nilai Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(item.stock.totalValue)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              nilai inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Dipakai di Resep
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.recipesUsing.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              produk menggunakan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Bahan</CardTitle>
          <CardDescription>
            Daftar batch beserta sisa stok dan harga per unit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {item.batches.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Belum ada batch untuk bahan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-6 py-3 text-left font-medium">
                      Batch Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Sumber
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Sisa
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Unit Cost
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Dibuat
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.batches.map((b) => {
                    const remaining = Number(b.remainingQuantity);
                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          "border-b last:border-b-0",
                          remaining === 0 && "opacity-50"
                        )}
                      >
                        <td className="px-6 py-3 font-mono text-xs">
                          {b.batchCode}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {b.sourceType.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(b.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatNumber(b.remainingQuantity)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(b.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(b.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent restocks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restock Terbaru</CardTitle>
          <CardDescription>
            Lima transaksi restock terakhir untuk bahan ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {item.recentRestocks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Belum ada restock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-6 py-3 text-left font-medium">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Unit Cost
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.recentRestocks.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-6 py-3">
                        {r.supplierName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(r.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(r.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatRupiah(r.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipes using */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dipakai di Resep</CardTitle>
          <CardDescription>
            Produk yang memakai bahan ini di resepnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {item.recipesUsing.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Bahan ini belum dipakai di resep manapun.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-6 py-3 text-left font-medium">
                      Produk
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Versi Resep
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.recipesUsing.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-6 py-3">
                        <Link
                          href={`/inventory/products/${r.productId}`}
                          className="font-medium hover:underline"
                        >
                          {r.productName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">v{r.version}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(r.quantity)} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        {r.isActive ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}