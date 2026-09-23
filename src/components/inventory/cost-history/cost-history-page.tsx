"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Coffee,
  Minus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
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

type CostEntry = {
  id: string;
  productId: string;
  productName: string;
  productIsActive: boolean;
  productSellingPrice: number;
  hpp: number;
  margin: number | null;
  delta: number | null;
  createdAt: string;
};

type SummaryProduct = {
  productId: string;
  productName: string;
  productIsActive: boolean;
  sellingPrice: number;
  latestHpp: number | null;
  latestHppAt: string | null;
  minHpp: number;
  maxHpp: number;
  avgHpp: number;
  entryCount: number;
  margin: number | null;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: CostEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalEntries: number;
      uniqueProducts: number;
      avgHpp: number;
    };
  };
  error?: { message?: string };
};

type SummaryResponse = {
  success: boolean;
  data?: {
    items: SummaryProduct[];
  };
  error?: { message?: string };
};

type TabKey = "entries" | "products";

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function marginTextClass(margin: number | null): string {
  if (margin === null) return "text-muted-foreground";
  return margin >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function CostHistorySkeleton() {
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

function CostHistoryErrorState({
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

function CostHistoryEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <TrendingUp className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Tidak ditemukan" : "Belum ada riwayat HPP"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada pencatatan HPP yang cocok dengan filter."
          : "Riwayat HPP akan muncul setelah produksi pertama dijalankan."}
      </p>
      {!hasSearch && (
        <Link
          href="/inventory/productions/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Coffee className="mr-2 size-4" />
          Mulai Produksi
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function CostHistoryPage() {
  const router = useRouter();

  const [tab, setTab] = React.useState<TabKey>("entries");

  // Entries tab
  const [entries, setEntries] = React.useState<CostEntry[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [summary, setSummary] = React.useState({
    totalEntries: 0,
    uniqueProducts: 0,
    avgHpp: 0,
  });
  const [isLoadingEntries, setIsLoadingEntries] = React.useState(true);
  const [entriesError, setEntriesError] = React.useState<string | null>(null);

  // Products tab
  const [products, setProducts] = React.useState<SummaryProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(false);
  const [productsError, setProductsError] = React.useState<string | null>(
    null
  );

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  // ---------- Fetch entries ----------
  const fetchEntries = React.useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      currentDateFrom: string,
      currentDateTo: string,
      options?: { showLoading?: boolean; showRefreshing?: boolean }
    ) => {
      try {
        if (options?.showLoading) setIsLoadingEntries(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setEntriesError(null);

        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", "10");

        if (currentSearch) params.set("search", currentSearch);
        if (currentDateFrom) params.set("dateFrom", currentDateFrom);
        if (currentDateTo) params.set("dateTo", currentDateTo);

        const res = await fetch(
          `/api/inventory/cost-history?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat data.");
        }

        setEntries(json.data.items);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      } catch (err) {
        setEntriesError(
          err instanceof Error ? err.message : "Gagal memuat data."
        );
      } finally {
        if (options?.showLoading) setIsLoadingEntries(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchEntries(page, debouncedSearch, dateFrom, dateTo, {
      showLoading: true,
    });
  }, [page, debouncedSearch, dateFrom, dateTo, fetchEntries]);

  // ---------- Fetch products summary ----------
  const fetchProducts = React.useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      setProductsError(null);

      const res = await fetch(
        "/api/inventory/cost-history/summary",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const json = (await res.json()) as SummaryResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat ringkasan.");
      }

      setProducts(json.data.items);
    } catch (err) {
      setProductsError(
        err instanceof Error ? err.message : "Gagal memuat ringkasan."
      );
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === "products" && products.length === 0) {
      void fetchProducts();
    }
  }, [tab, products.length, fetchProducts]);

  // ---------- Refresh ----------
  function handleRefresh() {
    if (tab === "entries") {
      void fetchEntries(page, debouncedSearch, dateFrom, dateTo, {
        showRefreshing: true,
      });
    } else {
      void fetchProducts();
    }
  }

  function handleResetFilter() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasSearch =
    search.trim().length > 0 || dateFrom !== "" || dateTo !== "";
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Riwayat HPP
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Histori HPP produk dari setiap produksi.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleRefresh}
          disabled={
            (tab === "entries" && isLoadingEntries) ||
            (tab === "products" && isLoadingProducts) ||
            isRefreshing
          }
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

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pencatatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary.totalEntries)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              dari seluruh produksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Produk Terpantau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary.uniqueProducts)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              produk punya riwayat HPP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Rata-rata HPP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(summary.avgHpp)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              semua pencatatan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setTab("entries")}
            className={cn(
              "relative flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors",
              tab === "entries"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="size-4" />
            Pencatatan
          </button>

          <button
            type="button"
            onClick={() => setTab("products")}
            className={cn(
              "relative flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors",
              tab === "products"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Coffee className="size-4" />
            Per Produk
          </button>
        </div>

        <CardHeader>
          <CardTitle className="text-base">
            {tab === "entries" ? "Riwayat HPP" : "Ringkasan per Produk"}
          </CardTitle>

          {tab === "entries" && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama produk..."
                  className="pl-9"
                />
              </div>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}

          {tab === "entries" && hasSearch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={handleResetFilter}
            >
              Reset Filter
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* ============ TAB ENTRIES ============ */}
          {tab === "entries" && (
            <>
              {isLoadingEntries ? (
                <CostHistorySkeleton />
              ) : entriesError ? (
                <CostHistoryErrorState
                  message={entriesError}
                  onRetry={() => {
                    void fetchEntries(
                      page,
                      debouncedSearch,
                      dateFrom,
                      dateTo,
                      { showRefreshing: true }
                    );
                  }}
                />
              ) : entries.length === 0 ? (
                <CostHistoryEmptyState hasSearch={hasSearch} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-6 py-3 text-left font-medium">
                            Produk
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            HPP
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Perubahan
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Harga Jual
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Margin
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            Tanggal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr
                            key={e.id}
                            className="border-b last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-6 py-4">
                              <Link
                                href={`/inventory/products/${e.productId}`}
                                className="font-medium hover:underline"
                              >
                                {e.productName}
                              </Link>
                              {!e.productIsActive && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  Produk nonaktif
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatRupiah(e.hpp)}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {e.delta === null ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Minus className="size-3" />
                                  Pertama
                                </span>
                              ) : e.delta === 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Minus className="size-3" />
                                  Sama
                                </span>
                              ) : e.delta > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                                  <ChevronsUp className="size-3" />+
                                  {formatRupiah(Math.abs(e.delta))}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                  <ChevronsDown className="size-3" />
                                  {formatRupiah(Math.abs(e.delta))}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right text-muted-foreground">
                              {formatRupiah(e.productSellingPrice)}
                            </td>

                            <td
                              className={cn(
                                "px-4 py-4 text-right font-semibold",
                                marginTextClass(e.margin)
                              )}
                            >
                              {e.margin !== null
                                ? `${e.margin.toFixed(1)}%`
                                : "—"}
                            </td>

                            <td className="px-4 py-4 text-muted-foreground">
                              {formatDateTime(e.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t px-6 py-4">
                    <p className="text-sm text-muted-foreground">
                      {pagination?.total ?? 0} pencatatan
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                      >
                        <ChevronLeft className="mr-1 size-4" />
                        Sebelumnya
                      </Button>

                      <span className="min-w-20 text-center text-sm">
                        Halaman {page} dari {totalPages || 1}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={totalPages === 0 || page >= totalPages}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Berikutnya
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ============ TAB PRODUCTS ============ */}
          {tab === "products" && (
            <>
              {isLoadingProducts ? (
                <CostHistorySkeleton />
              ) : productsError ? (
                <CostHistoryErrorState
                  message={productsError}
                  onRetry={() => void fetchProducts()}
                />
              ) : products.length === 0 ? (
                <CostHistoryEmptyState hasSearch={false} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          HPP Terakhir
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Margin
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Min / Avg / Max
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Entries
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Terakhir
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr
                          key={p.productId}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/inventory/products/${p.productId}`}
                              className="font-medium hover:underline"
                            >
                              {p.productName}
                            </Link>
                            {!p.productIsActive && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Produk nonaktif
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold">
                            {p.latestHpp !== null
                              ? formatRupiah(p.latestHpp)
                              : "—"}
                          </td>

                          <td
                            className={cn(
                              "px-4 py-4 text-right font-semibold",
                              marginTextClass(p.margin)
                            )}
                          >
                            {p.margin !== null
                              ? `${p.margin.toFixed(1)}%`
                              : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-xs text-muted-foreground">
                            {formatRupiah(p.minHpp)} /{" "}
                            {formatRupiah(p.avgHpp)} /{" "}
                            {formatRupiah(p.maxHpp)}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <Badge variant="outline">
                              {formatNumber(p.entryCount)}
                            </Badge>
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {p.latestHppAt
                              ? formatDateTime(p.latestHppAt)
                              : "—"}
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