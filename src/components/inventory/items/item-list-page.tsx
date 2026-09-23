"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Unit = "ML" | "PCS";

type Item = {
  id: string;
  name: string;
  unit: Unit;
  isActive: boolean;
  totalStock: number;
  batchCount: number;
  availableBatchCount: number;
  createdAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Item[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    lowStockThreshold: number;
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

// ============================================================
// Helpers
// ============================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function ItemSkeleton() {
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

function ItemErrorState({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat bahan</h3>
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

function ItemEmptyState({
  hasSearch,
  onClearSearch,
}: {
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Package className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Bahan tidak ditemukan" : "Belum ada bahan"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada bahan yang cocok dengan pencarian."
          : "Tambahkan bahan baku untuk memulai."}
      </p>
      {hasSearch ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onClearSearch}
        >
          Hapus Pencarian
        </Button>
      ) : (
        <Link
          href="/inventory/items/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Plus className="mr-2 size-4" />
          Tambah Bahan
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function ItemListPage() {
  const router = useRouter();

  const [items, setItems] = React.useState<Item[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [lowStockThreshold, setLowStockThreshold] = React.useState(100);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Disable dialog
  const [disableItem, setDisableItem] = React.useState<Item | null>(null);
  const [isDisabling, setIsDisabling] = React.useState(false);

  // Debounce
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchItems = React.useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      currentStatus: StatusFilter,
      currentStock: StockFilter,
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
        if (currentStatus !== "ALL") {
          params.set(
            "isActive",
            currentStatus === "ACTIVE" ? "true" : "false"
          );
        }
        if (currentStock !== "all") {
          params.set("stockStatus", currentStock);
        }

        const res = await fetch(
          `/api/inventory/items?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat bahan.");
        }

        setItems(json.data.items);
        setPagination(json.data.pagination);
        setLowStockThreshold(json.data.lowStockThreshold);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat bahan."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchItems(page, debouncedSearch, statusFilter, stockFilter, {
      showLoading: true,
    });
  }, [page, debouncedSearch, statusFilter, stockFilter, fetchItems]);

  function handleRefresh() {
    void fetchItems(page, debouncedSearch, statusFilter, stockFilter, {
      showRefreshing: true,
    });
  }

  async function handleDisable() {
    if (!disableItem || isDisabling) return;

    try {
      setIsDisabling(true);
      const res = await fetch(
        `/api/inventory/items/${encodeURIComponent(disableItem.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menonaktifkan bahan.");
      }

      setDisableItem(null);
      await fetchItems(page, debouncedSearch, statusFilter, stockFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menonaktifkan bahan."
      );
    } finally {
      setIsDisabling(false);
    }
  }

  function getStockBadge(item: Item) {
    if (item.totalStock === 0) {
      return <Badge variant="destructive">Habis</Badge>;
    }
    if (item.totalStock < lowStockThreshold) {
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

  const hasSearch = search.trim().length > 0;
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Bahan Baku
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola bahan yang digunakan untuk produksi.
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
              href="/inventory/items/new"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 size-4" />
              Tambah Bahan
            </Link>
          </div>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Daftar Bahan</CardTitle>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama bahan..."
                    className="pl-9"
                  />
                </div>

                <select
                  value={stockFilter}
                  onChange={(e) => {
                    setStockFilter(e.target.value as StockFilter);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Semua Stok</option>
                  <option value="in-stock">Stok Cukup</option>
                  <option value="low-stock">Stok Rendah</option>
                  <option value="out-of-stock">Stok Habis</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <ItemSkeleton />
            ) : error ? (
              <ItemErrorState
                message={error}
                onRetry={() => {
                  void fetchItems(
                    page,
                    debouncedSearch,
                    statusFilter,
                    stockFilter,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : items.length === 0 ? (
              <ItemEmptyState
                hasSearch={hasSearch}
                onClearSearch={() => setSearch("")}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Nama Bahan
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Satuan
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Stok
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status Stok
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Batch
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium">{item.name}</div>
                            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {item.id}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <Badge variant="outline">{item.unit}</Badge>
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatNumber(item.totalStock)}
                          </td>

                          <td className="px-4 py-4">
                            {getStockBadge(item)}
                          </td>

                          <td className="px-4 py-4">
                            {item.isActive ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-muted-foreground">
                            {item.availableBatchCount}/{item.batchCount}
                          </td>

                          <td className="px-4 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Aksi ${item.name}`}
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
                                      `/inventory/items/${item.id}`
                                    )
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  Lihat Detail
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/inventory/items/${item.id}/edit`
                                    )
                                  }
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>

                                {item.isActive && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setError(null);
                                      setDisableItem(item);
                                    }}
                                  >
                                    <PowerOff className="mr-2 size-4" />
                                    Nonaktifkan
                                  </DropdownMenuItem>
                                )}
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
                    {pagination?.total ?? 0} bahan
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

      {/* Disable dialog */}
      <Dialog
        open={disableItem !== null}
        onOpenChange={(open) => {
          if (!open && !isDisabling) setDisableItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Bahan?</DialogTitle>
            <DialogDescription>
              Bahan <strong>{disableItem?.name}</strong> akan dinonaktifkan.
              Bahan ini tidak dapat dipakai di resep baru, tetapi riwayat
              batch dan produksi tetap tersimpan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDisabling}
              onClick={() => setDisableItem(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDisabling}
              onClick={() => void handleDisable()}
            >
              {isDisabling ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}