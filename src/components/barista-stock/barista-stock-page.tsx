"use client";

import * as React from "react";
import Link from "next/link";

import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Undo2,
  Users,
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
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type BaristaStockProduct = {
  productId: string;
  productName: string;
  productIsActive: boolean;
  sellingPrice: number;
  quantity: number;
  minThreshold: number;
  isLow: boolean;
  lastRestockAt: string | null;
};

type BaristaStockItem = {
  baristaId: string;
  baristaName: string;
  baristaPhone: string | null;
  baristaStatus: "ACTIVE" | "INACTIVE";
  totalItems: number;
  productCount: number;
  lowStockCount: number;
  products: BaristaStockProduct[];
};

type ListResponse = {
  success: boolean;
  data?: {
    items: BaristaStockItem[];
    summary: {
      totalBaristas: number;
      baristasWithStock: number;
      baristasWithLowStock: number;
      totalStockAll: number;
    };
  };
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

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function StockSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
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

function StockEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Boxes className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Tidak ditemukan" : "Belum ada barista"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada barista yang cocok dengan filter."
          : "Tambahkan user dengan role barista terlebih dahulu."}
      </p>
      {!hasSearch && (
        <Link
          href="/users/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Users className="mr-2 size-4" />
          Tambah Barista
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function BaristaStockPage() {
  const [items, setItems] = React.useState<BaristaStockItem[]>([]);
  const [summary, setSummary] = React.useState({
    totalBaristas: 0,
    baristasWithStock: 0,
    baristasWithLowStock: 0,
    totalStockAll: 0,
  });
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchData = React.useCallback(
    async (options?: { showLoading?: boolean; showRefreshing?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (lowStockOnly) params.set("lowStockOnly", "true");

        const res = await fetch(
          `/api/barista-stock?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat data");
        }

        setItems(json.data.items);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data"
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [debouncedSearch, lowStockOnly]
  );

  React.useEffect(() => {
    void fetchData({ showLoading: true });
  }, [fetchData]);

  function handleRefresh() {
    void fetchData({ showRefreshing: true });
  }

  const hasSearch = search.trim().length > 0 || lowStockOnly;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Stok Barista
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor stok produk yang dibawa barista keliling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/barista-stock/restock"
            className={cn(buttonVariants())}
          >
            <Package className="mr-2 size-4" />
            Restock Barista
          </Link>
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
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Barista
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBaristas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Punya Stok
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.baristasWithStock}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              dari {summary.totalBaristas}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Stok Menipis
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                summary.baristasWithLowStock > 0 &&
                  "text-amber-600 dark:text-amber-400"
              )}
            >
              {summary.baristasWithLowStock}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Item
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary.totalStockAll)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              unit di semua barista
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-base">Daftar Stok Barista</CardTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama barista..."
                  className="pl-9"
                />
              </div>

              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="size-4 cursor-pointer accent-primary"
                />
                <span>Hanya stok menipis</span>
              </label>
            </div>

            {hasSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setSearch("");
                  setLowStockOnly(false);
                }}
              >
                Reset Filter
              </Button>
            )}
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
          ) : items.length === 0 ? (
            <StockEmptyState hasSearch={hasSearch} />
          ) : (
            <div className="divide-y">
              {items.map((b) => (
                <div key={b.baristaId} className="p-6">
                  {/* Barista header */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {b.baristaName}
                        </h3>
                        {b.baristaStatus === "ACTIVE" ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                        {b.lowStockCount > 0 && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="mr-1 size-3" />
                            {b.lowStockCount} menipis
                          </Badge>
                        )}
                      </div>
                      {b.baristaPhone && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {b.baristaPhone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Total Item
                        </p>
                        <p className="text-lg font-bold">
                          {formatNumber(b.totalItems)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Produk
                        </p>
                        <p className="text-lg font-bold">
                          {b.productCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Products grid */}
                  {b.products.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                      Belum ada stok. Barista perlu restock dari pusat.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {b.products.map((p) => (
                        <div
                          key={p.productId}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3 text-sm",
                            p.isLow &&
                              "border-amber-500/30 bg-amber-500/5"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {p.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRupiah(p.sellingPrice)}
                            </p>
                          </div>
                          <div className="ml-2 text-right">
                            <p
                              className={cn(
                                "text-base font-bold",
                                p.isLow && "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {formatNumber(p.quantity)}
                            </p>
                            {p.isLow && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                min {p.minThreshold}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/barista-stock/movements?baristaId=${b.baristaId}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" })
                      )}
                    >
                      <History className="mr-1.5 size-3.5" />
                      Riwayat
                    </Link>
                    <Link
                      href={`/barista-stock/${b.baristaId}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" })
                      )}
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}