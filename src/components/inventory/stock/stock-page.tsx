"use client";

import * as React from "react";
import Link from "next/link";

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Coffee,
  Layers,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type MaterialStockItem = {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
  totalStock: number;
  batchCount: number;
  availableBatchCount: number;
  totalValue: number;
  status: "in_stock" | "low" | "out";
};

type FinishedStockItem = {
  productId: string;
  productName: string;
  productIsActive: boolean;
  totalStock: number;
  batchCount: number;
  availableBatchCount: number;
  totalValue: number;
  status: "available" | "empty";
};

type StockSummary = {
  material: {
    totalItems: number;
    activeItems: number;
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
    items: MaterialStockItem[];
  };
  finished: {
    totalProducts: number;
    activeProducts: number;
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
    totalStock: number;
    items: FinishedStockItem[];
  };
  stockStatus: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  lowStockThreshold: number;
};

type SummaryResponse = {
  success: boolean;
  data?: StockSummary;
  error?: { message?: string };
};

type TabKey = "material" | "finished";

type MaterialStatusFilter = "all" | "in_stock" | "low" | "out";
type FinishedStatusFilter = "all" | "available" | "empty";

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

function materialStatusBadge(status: MaterialStockItem["status"]) {
  if (status === "out") {
    return <Badge variant="destructive">Habis</Badge>;
  }
  if (status === "low") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Rendah
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
      Cukup
    </Badge>
  );
}

function finishedStatusBadge(status: FinishedStockItem["status"]) {
  if (status === "empty") {
    return <Badge variant="secondary">Habis</Badge>;
  }
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
      Tersedia
    </Badge>
  );
}

// ============================================================
// Skeleton / Error
// ============================================================

function StockSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <div className="size-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function StockErrorState({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat data</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 size-4" />
        Coba Lagi
      </Button>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function StockPage() {
  const [data, setData] = React.useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [tab, setTab] = React.useState<TabKey>("material");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [materialStatus, setMaterialStatus] =
    React.useState<MaterialStatusFilter>("all");
  const [finishedStatus, setFinishedStatus] =
    React.useState<FinishedStatusFilter>("all");
  const [threshold, setThreshold] = React.useState(100);
  const [debouncedThreshold, setDebouncedThreshold] = React.useState(100);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  // Debounce threshold
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedThreshold(threshold);
    }, 400);
    return () => window.clearTimeout(t);
  }, [threshold]);

  const fetchData = React.useCallback(
    async (options?: { showLoading?: boolean; showRefreshing?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("lowStockThreshold", String(debouncedThreshold));
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("materialStatus", materialStatus);
        params.set("finishedStatus", finishedStatus);

        const res = await fetch(
          `/api/stock/summary?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as SummaryResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat data.");
        }

        setData(json.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [debouncedSearch, debouncedThreshold, materialStatus, finishedStatus]
  );

  React.useEffect(() => {
    void fetchData({ showLoading: true });
  }, [fetchData]);

  function handleRefresh() {
    void fetchData({ showRefreshing: true });
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Ringkasan Stok
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview stok bahan baku dan produk jadi.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw
            className={cn(
              "mr-2 size-4",
              isRefreshing && "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      {/* Main Summary Cards */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nilai Stok Bahan
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(data.material.totalValue)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.material.activeItems} bahan aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nilai Stok Produk
              </CardTitle>
              <Coffee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(data.finished.totalValue)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.finished.activeProducts} produk aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Nilai Stok
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(
                  data.material.totalValue + data.finished.totalValue
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                bahan + produk jadi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Stok Rendah / Habis
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stockStatus.lowStock + data.stockStatus.outOfStock}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.stockStatus.lowStock} rendah ·{" "}
                {data.stockStatus.outOfStock} habis
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs + Filters */}
      <Card>
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setTab("material")}
            className={cn(
              "relative flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors",
              tab === "material"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Package className="size-4" />
            Bahan Baku
          </button>

          <button
            type="button"
            onClick={() => setTab("finished")}
            className={cn(
              "relative flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors",
              tab === "finished"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Coffee className="size-4" />
            Produk Jadi
          </button>
        </div>

        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-base">
              {tab === "material" ? "Stok Bahan Baku" : "Stok Produk Jadi"}
            </CardTitle>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === "material"
                      ? "Cari nama bahan..."
                      : "Cari nama produk..."
                  }
                  className="pl-9"
                />
              </div>

              {tab === "material" ? (
                <select
                  value={materialStatus}
                  onChange={(e) =>
                    setMaterialStatus(e.target.value as MaterialStatusFilter)
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Semua Status</option>
                  <option value="in_stock">Cukup</option>
                  <option value="low">Rendah</option>
                  <option value="out">Habis</option>
                </select>
              ) : (
                <select
                  value={finishedStatus}
                  onChange={(e) =>
                    setFinishedStatus(
                      e.target.value as FinishedStatusFilter
                    )
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Semua Status</option>
                  <option value="available">Tersedia</option>
                  <option value="empty">Habis</option>
                </select>
              )}

              <div className="grid gap-1">
                <Label
                  htmlFor="threshold"
                  className="text-xs text-muted-foreground"
                >
                  Threshold stok rendah
                </Label>
                <Input
                  id="threshold"
                  type="text"
                  inputMode="numeric"
                  value={threshold}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setThreshold(digits === "" ? 0 : Number(digits));
                  }}
                  placeholder="100"
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <StockSkeleton />
          ) : error ? (
            <StockErrorState
              message={error}
              onRetry={() => void fetchData({ showRefreshing: true })}
            />
          ) : !data ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Data tidak tersedia.
            </div>
          ) : tab === "material" ? (
            /* ============ TAB MATERIAL ============ */
            <>
              {/* Sub-cards status */}
              <div className="grid gap-3 border-b px-6 py-4 sm:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span className="text-muted-foreground">Cukup:</span>
                  <span className="font-semibold">
                    {data.stockStatus.inStock}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span className="text-muted-foreground">Rendah:</span>
                  <span className="font-semibold">
                    {data.stockStatus.lowStock}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="size-4 text-red-600" />
                  <span className="text-muted-foreground">Habis:</span>
                  <span className="font-semibold">
                    {data.stockStatus.outOfStock}
                  </span>
                </div>
              </div>

              {data.material.items.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center">
                  <Layers className="size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    Tidak ada bahan ditemukan
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Bahan
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Stok
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Nilai Stok
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.material.items.map((m) => (
                        <tr
                          key={m.id}
                          className={cn(
                            "border-b last:border-b-0 hover:bg-muted/30",
                            !m.isActive && "opacity-60"
                          )}
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/inventory/items/${m.id}`}
                              className="font-medium hover:underline"
                            >
                              {m.name}
                            </Link>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {m.unit}
                              {!m.isActive && " · Nonaktif"}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatNumber(m.totalStock)}
                          </td>

                          <td className="px-4 py-4 text-right text-muted-foreground">
                            {m.availableBatchCount} / {m.batchCount}
                          </td>

                          <td className="px-4 py-4">
                            {materialStatusBadge(m.status)}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold">
                            {formatRupiah(m.totalValue)}
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/inventory/items/${m.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "sm",
                                })
                              )}
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* ============ TAB FINISHED ============ */
            <>
              {data.finished.items.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center">
                  <Boxes className="size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    Tidak ada produk ditemukan
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Stok
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Nilai Stok
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.finished.items.map((f) => (
                        <tr
                          key={f.productId}
                          className={cn(
                            "border-b last:border-b-0 hover:bg-muted/30",
                            !f.productIsActive && "opacity-60"
                          )}
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/inventory/products/${f.productId}`}
                              className="font-medium hover:underline"
                            >
                              {f.productName}
                            </Link>
                            {!f.productIsActive && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Produk nonaktif
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatNumber(f.totalStock)}
                          </td>

                          <td className="px-4 py-4 text-right text-muted-foreground">
                            {f.availableBatchCount} / {f.batchCount}
                          </td>

                          <td className="px-4 py-4">
                            {finishedStatusBadge(f.status)}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold">
                            {formatRupiah(f.totalValue)}
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/inventory/products/${f.productId}`}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "sm",
                                })
                              )}
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}