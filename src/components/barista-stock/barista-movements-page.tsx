"use client";

import * as React from "react";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  History,
  Minus,
  RefreshCw,
  Search,
  Settings2,
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

type MovementType =
  | "RESTOCK"
  | "SOLD"
  | "ADJUSTMENT"
  | "RETURN"
  | "WASTE";

type Movement = {
  id: string;
  baristaId: string;
  baristaName: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  orderId: string | null;
  baristaRestockId: string | null;
  note: string | null;
  createdAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Movement[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: { message?: string };
};

type TypeFilter =
  | "all"
  | "RESTOCK"
  | "SOLD"
  | "ADJUSTMENT"
  | "RETURN"
  | "WASTE";

// ============================================================
// Helpers
// ============================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
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

function typeLabel(type: MovementType): string {
  switch (type) {
    case "RESTOCK":
      return "Restock";
    case "SOLD":
      return "Terjual";
    case "ADJUSTMENT":
      return "Koreksi";
    case "RETURN":
      return "Dikembalikan";
    case "WASTE":
      return "Rusak";
  }
}

function typeBadge(type: MovementType) {
  if (type === "RESTOCK") {
    return (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400">
        Restock
      </Badge>
    );
  }
  if (type === "SOLD") {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
        Terjual
      </Badge>
    );
  }
  if (type === "ADJUSTMENT") {
    return (
      <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400">
        Koreksi
      </Badge>
    );
  }
  if (type === "RETURN") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Dikembalikan
      </Badge>
    );
  }
  return <Badge variant="destructive">Rusak</Badge>;
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function MovementsSkeleton() {
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

function MovementsErrorState({
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

function MovementsEmptyState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <History className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">Belum ada pergerakan</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        Log pergerakan stok barista akan muncul setelah ada aktivitas.
      </p>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function BaristaMovementsPage() {
  const [items, setItems] = React.useState<Movement[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
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
        params.set("page", String(page));
        params.set("limit", "20");

        if (debouncedSearch) params.set("search", debouncedSearch);
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(
          `/api/barista-stock/movements?${params.toString()}`,
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
        setPagination(json.data.pagination);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data"
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [page, debouncedSearch, typeFilter, dateFrom, dateTo]
  );

  React.useEffect(() => {
    void fetchData({ showLoading: true });
  }, [fetchData]);

  function handleRefresh() {
    void fetchData({ showRefreshing: true });
  }

  const hasSearch =
    search.trim().length > 0 ||
    typeFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const totalPages = pagination?.totalPages ?? 0;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Riwayat Pergerakan Stok
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log semua perubahan stok barista — restock, jual, koreksi, return.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/barista-stock"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Kembali
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

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-base">Log Pergerakan</CardTitle>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama barista atau produk..."
                  className="pl-9"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Semua Tipe</option>
                <option value="RESTOCK">Restock</option>
                <option value="SOLD">Terjual</option>
                <option value="ADJUSTMENT">Koreksi</option>
                <option value="RETURN">Dikembalikan</option>
                <option value="WASTE">Rusak</option>
              </select>

              <div className="grid grid-cols-2 gap-1 sm:grid-cols-1 lg:grid-cols-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {hasSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
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
            <MovementsSkeleton />
          ) : error ? (
            <MovementsErrorState
              message={error}
              onRetry={() => void fetchData({ showRefreshing: true })}
            />
          ) : items.length === 0 ? (
            <MovementsEmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Barista
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Tipe
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Perubahan
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Saldo Akhir
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-6 py-3 text-muted-foreground">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {m.baristaName}
                        </td>
                        <td className="px-4 py-3">{m.productName}</td>
                        <td className="px-4 py-3">{typeBadge(m.type)}</td>
                        <td className="px-4 py-3 text-right">
                          {m.quantity > 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                              <ArrowUpRight className="size-3.5" />+
                              {formatNumber(m.quantity)}
                            </span>
                          ) : m.quantity < 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                              <ArrowDownRight className="size-3.5" />
                              {formatNumber(m.quantity)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Minus className="size-3.5" />0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatNumber(m.balanceAfter)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {m.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  {pagination?.total ?? 0} pergerakan
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