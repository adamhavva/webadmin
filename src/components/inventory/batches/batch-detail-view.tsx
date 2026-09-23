"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
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

type SourceType = "RESTOCK";

type ProductionComponent = {
  id: string;
  productionId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: string;
  production: {
    id: string;
    productId: string;
    outputQuantity: string;
    unitCost: string;
    createdAt: string;
    product: {
      id: string;
      name: string;
    };
  };
};

type RestockInfo = {
  id: string;
  quantity: string;
  totalCost: string;
  unitCost: string;
  supplierName: string | null;
  status: "ACTIVE" | "VOIDED";
  voidedAt: string | null;
  createdAt: string;
};

type BatchDetail = {
  id: string;
  inventoryItemId: string;
  batchCode: string;
  sourceType: SourceType;
  quantity: string;
  remainingQuantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: string;
  updatedAt: string;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    isActive: boolean;
  };
  restock: RestockInfo | null;
  productionComponents: ProductionComponent[];
  stats: {
    initial: number;
    remaining: number;
    consumed: number;
    consumedPct: number;
    unitCost: number;
    initialValue: number;
    consumedValue: number;
    remainingValue: number;
  };
};

type DetailResponse = {
  success: boolean;
  data?: BatchDetail;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID").format(n);
}

function formatRupiah(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-muted/30" />
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
          href="/inventory/batches"
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

export function BatchDetailView({ batchId }: { batchId: string }) {
  const [data, setData] = React.useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/inventory/batches/${encodeURIComponent(batchId)}`,
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

      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat detail."
      );
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

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
          message={error ?? "Data tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const isEmpty = data.stats.remaining === 0;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/batches"
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Detail Batch
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.inventoryItem.name} ·{" "}
            {formatDateTime(data.createdAt)}
          </p>
        </div>
      </div>

      {/* Info Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {data.batchCode}
            </Badge>
            <Badge variant="outline">
              {data.sourceType.toLowerCase()}
            </Badge>
            {data.restock?.supplierName && (
              <Badge variant="secondary">
                {data.restock.supplierName}
              </Badge>
            )}
            {isEmpty ? (
              <Badge variant="secondary">Habis</Badge>
            ) : (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                Tersedia
              </Badge>
            )}
            {data.restock?.status === "VOIDED" && (
              <Badge variant="destructive">Restock VOIDED</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Quantity Awal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.stats.initial)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.inventoryItem.unit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sisa Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.stats.remaining)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.inventoryItem.unit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Terpakai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.stats.consumed)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.stats.consumedPct.toFixed(1)}% dari awal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Unit Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(data.stats.unitCost)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              per {data.inventoryItem.unit}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress Pemakaian</CardTitle>
          <CardDescription>
            Seberapa banyak batch ini sudah dikonsumsi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.stats.consumedPct.toFixed(1)}% terpakai
              </span>
              <span className="text-muted-foreground">
                {formatNumber(data.stats.remaining)} /{" "}
                {formatNumber(data.stats.initial)}{" "}
                {data.inventoryItem.unit}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(data.stats.consumedPct, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Nilai Awal
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatRupiah(data.stats.initialValue)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Nilai Terpakai
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatRupiah(data.stats.consumedValue)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Nilai Sisa
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatRupiah(data.stats.remainingValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Bahan + Sumber */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Bahan</CardTitle>
            <CardDescription>
              Bahan yang dimiliki oleh batch ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Nama Bahan
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  <Link
                    href={`/inventory/items/${data.inventoryItem.id}`}
                    className="hover:underline"
                  >
                    {data.inventoryItem.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Satuan</dt>
                <dd className="mt-1 text-sm">
                  {data.inventoryItem.unit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Status Bahan
                </dt>
                <dd className="mt-1">
                  {data.inventoryItem.isActive ? (
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sumber Batch</CardTitle>
            <CardDescription>
              {data.sourceType === "RESTOCK"
                ? "Batch ini berasal dari restock."
                : "Batch ini berasal dari produksi."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.restock ? (
              <dl className="grid gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Supplier
                  </dt>
                  <dd className="mt-1 text-sm">
                    {data.restock.supplierName ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Status Restock
                  </dt>
                  <dd className="mt-1">
                    {data.restock.status === "VOIDED" ? (
                      <Badge variant="destructive">VOIDED</Badge>
                    ) : (
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                        Aktif
                      </Badge>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Total Restock
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatRupiah(data.restock.totalCost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Tanggal Restock
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDateTime(data.restock.createdAt)}
                  </dd>
                </div>
                <div className="border-t pt-4">
                  <Link
                    href={`/inventory/restocks/${data.restock.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    Lihat Detail Restock
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Info sumber tidak tersedia.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Konsumsi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pemakaian di Produksi
          </CardTitle>
          <CardDescription>
            {data.productionComponents.length === 0
              ? "Batch ini belum pernah dipakai di produksi."
              : `${data.productionComponents.length} kali pemakaian di produksi.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.productionComponents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Belum ada pemakaian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-6 py-3 text-left font-medium">
                      Produk
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Output
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Quantity Dipakai
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Tanggal
                    </th>
                    <th className="w-16 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.productionComponents.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/inventory/products/${c.production.product.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.production.product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(c.production.outputQuantity)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatNumber(c.quantity)}{" "}
                        {data.inventoryItem.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(c.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/inventory/production/${c.production.id}`}
                          className={cn(
                            buttonVariants({
                              variant: "ghost",
                              size: "sm",
                            })
                          )}
                        >
                          Lihat
                        </Link>
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