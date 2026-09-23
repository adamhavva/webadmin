"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Factory,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type Production = {
  id: string;
  productId: string;
  productName: string;
  outputQuantity: number;
  totalCost: number;
  unitCost: number;
  componentCount: number;
  finishedBatch: {
    id: string;
    batchCode: string;
    quantity: number;
    remainingQuantity: number;
  } | null;
  createdAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Production[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      count: number;
      totalOutput: number;
      totalCost: number;
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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function ProductionSkeleton() {
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
          <div className="size-8 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ProductionErrorState({
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

function ProductionEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Factory className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Tidak ditemukan" : "Belum ada produksi"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada produksi yang cocok dengan filter."
          : "Mulai produksi pertama untuk membuat stock produk jadi."}
      </p>
      {!hasSearch && (
        <Link
          href="/inventory/productions/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Plus className="mr-2 size-4" />
          Produksi Baru
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function ProductionListPage() {
  const router = useRouter();

  const [productions, setProductions] = React.useState<Production[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [summary, setSummary] = React.useState({
    count: 0,
    totalOutput: 0,
    totalCost: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchProductions = React.useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      currentDateFrom: string,
      currentDateTo: string,
      options?: { showLoading?: boolean; showRefreshing?: boolean }
    ) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", "10");

        if (currentSearch) params.set("search", currentSearch);
        if (currentDateFrom) params.set("dateFrom", currentDateFrom);
        if (currentDateTo) params.set("dateTo", currentDateTo);

        const res = await fetch(
          `/api/inventory/productions?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat produksi.");
        }

        setProductions(json.data.items);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat produksi."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchProductions(page, debouncedSearch, dateFrom, dateTo, {
      showLoading: true,
    });
  }, [page, debouncedSearch, dateFrom, dateTo, fetchProductions]);

  function handleRefresh() {
    void fetchProductions(page, debouncedSearch, dateFrom, dateTo, {
      showRefreshing: true,
    });
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
            Produksi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Riwayat produksi dan HPP produk jadi.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <Link
            href="/inventory/productions/new"
            className={cn(buttonVariants())}
          >
            <Plus className="mr-2 size-4" />
            Produksi Baru
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Produksi
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary.count)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Output
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary.totalOutput)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              unit produk jadi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Biaya Produksi
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(summary.totalCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-base">Riwayat Produksi</CardTitle>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk atau batch..."
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

            {hasSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setSearch("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <ProductionSkeleton />
          ) : error ? (
            <ProductionErrorState
              message={error}
              onRetry={() => {
                void fetchProductions(
                  page,
                  debouncedSearch,
                  dateFrom,
                  dateTo,
                  { showRefreshing: true }
                );
              }}
            />
          ) : productions.length === 0 ? (
            <ProductionEmptyState hasSearch={hasSearch} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Batch
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Output
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Total Biaya
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        HPP / Unit
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Sisa Stok
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Tanggal
                      </th>
                      <th className="w-16 px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody>
                    {productions.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">
                            {p.productName}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {p.componentCount} komponen
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {p.finishedBatch ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {p.finishedBatch.batchCode}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-medium">
                          {formatNumber(p.outputQuantity)}
                        </td>

                        <td className="px-4 py-4 text-right font-medium">
                          {formatRupiah(p.totalCost)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-primary">
                          {formatRupiah(p.unitCost)}
                        </td>

                        <td className="px-4 py-4 text-right text-muted-foreground">
                          {p.finishedBatch
                            ? formatNumber(
                                p.finishedBatch.remainingQuantity
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {formatDateTime(p.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Aksi ${p.productName}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="min-w-48"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/inventory/productions/${p.id}`
                                  )
                                }
                              >
                                <Eye className="mr-2 size-4" />
                                Lihat Detail
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  {pagination?.total ?? 0} produksi
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
        </CardContent>
      </Card>
    </div>
  );
}