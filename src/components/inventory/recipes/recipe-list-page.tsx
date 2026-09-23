"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Trash2,
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

type RecipeItem = {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  quantity: number;
};

type Recipe = {
  id: string;
  productId: string;
  productName: string;
  productIsActive: boolean;
  productSellingPrice: number;
  version: number;
  isActive: boolean;
  itemCount: number;
  items: RecipeItem[];
  totalHpp: number;
  totalFulfilled: boolean;
  unavailableItems: string[];
  estimatedMargin: number | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Recipe[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      activeCount: number;
      productCount: number;
      totalCount: number;
    };
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type StatusFilter = "all" | "active" | "inactive";

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

function marginColorClass(margin: number | null): string {
  if (margin === null) return "text-muted-foreground";
  return margin >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function RecipeSkeleton() {
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

function RecipeErrorState({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat resep</h3>
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

function RecipeEmptyState({
  hasSearch,
  onClearSearch,
}: {
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <BookOpen className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Resep tidak ditemukan" : "Belum ada resep"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada resep yang cocok dengan pencarian."
          : "Resep dibuat dari halaman detail produk."}
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
          href="/inventory/products"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Plus className="mr-2 size-4" />
          Ke Daftar Produk
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function RecipeListPage() {
  const router = useRouter();

  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [summary, setSummary] = React.useState({
    activeCount: 0,
    productCount: 0,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Recipe | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Activate dialog
  const [activateTarget, setActivateTarget] = React.useState<Recipe | null>(
    null
  );
  const [isActivating, setIsActivating] = React.useState(false);
  const [activateError, setActivateError] = React.useState<string | null>(
    null
  );

  // Deactivate dialog
  const [deactivateTarget, setDeactivateTarget] =
    React.useState<Recipe | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [deactivateError, setDeactivateError] = React.useState<string | null>(
    null
  );

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchRecipes = React.useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      currentStatus: StatusFilter,
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
        if (currentStatus === "active") params.set("isActive", "true");
        if (currentStatus === "inactive") params.set("isActive", "false");

        const res = await fetch(
          `/api/inventory/recipes?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat resep.");
        }

        setRecipes(json.data.items);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat resep."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchRecipes(page, debouncedSearch, statusFilter, {
      showLoading: true,
    });
  }, [page, debouncedSearch, statusFilter, fetchRecipes]);

  function handleRefresh() {
    void fetchRecipes(page, debouncedSearch, statusFilter, {
      showRefreshing: true,
    });
  }

  // ---------- Activate ----------
  function openActivateDialog(r: Recipe) {
    setActivateTarget(r);
    setActivateError(null);
  }

  function closeActivateDialog() {
    if (isActivating) return;
    setActivateTarget(null);
    setActivateError(null);
  }

  async function handleActivate() {
    if (!activateTarget || isActivating) return;
    try {
      setIsActivating(true);
      setActivateError(null);

      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(
          activateTarget.id
        )}/activate`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal mengaktifkan resep.");
      }

      setActivateTarget(null);
      await fetchRecipes(page, debouncedSearch, statusFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setActivateError(
        err instanceof Error ? err.message : "Gagal mengaktifkan resep."
      );
    } finally {
      setIsActivating(false);
    }
  }

  // ---------- Deactivate ----------
  function openDeactivateDialog(r: Recipe) {
    setDeactivateTarget(r);
    setDeactivateError(null);
  }

  function closeDeactivateDialog() {
    if (isDeactivating) return;
    setDeactivateTarget(null);
    setDeactivateError(null);
  }

  async function handleDeactivate() {
    if (!deactivateTarget || isDeactivating) return;
    try {
      setIsDeactivating(true);
      setDeactivateError(null);

      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(
          deactivateTarget.id
        )}/deactivate`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ?? "Gagal menonaktifkan resep."
        );
      }

      setDeactivateTarget(null);
      await fetchRecipes(page, debouncedSearch, statusFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setDeactivateError(
        err instanceof Error
          ? err.message
          : "Gagal menonaktifkan resep."
      );
    } finally {
      setIsDeactivating(false);
    }
  }

  // ---------- Delete ----------
  function openDeleteDialog(r: Recipe) {
    setDeleteTarget(r);
    setDeleteError(null);
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);

      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menghapus resep.");
      }

      setDeleteTarget(null);
      await fetchRecipes(page, debouncedSearch, statusFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus resep."
      );
    } finally {
      setIsDeleting(false);
    }
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
              Resep
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola komposisi bahan untuk setiap produk.
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
              href="/inventory/products"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 size-4" />
              Buat Resep
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Resep
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.totalCount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Resep Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.activeCount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Produk Punya Resep
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.productCount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Daftar Resep</CardTitle>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama produk..."
                    className="pl-9"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <RecipeSkeleton />
            ) : error ? (
              <RecipeErrorState
                message={error}
                onRetry={() => {
                  void fetchRecipes(
                    page,
                    debouncedSearch,
                    statusFilter,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : recipes.length === 0 ? (
              <RecipeEmptyState
                hasSearch={hasSearch}
                onClearSearch={() => setSearch("")}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1280px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Versi
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Bahan
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Estimasi HPP
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Harga Jual
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Margin
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Stok
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Dibuat
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {recipes.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium">
                              {r.productName}
                            </div>
                            {!r.productIsActive && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Produk nonaktif
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              v{r.version}
                            </Badge>
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatNumber(r.itemCount)}
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatRupiah(r.totalHpp)}
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatRupiah(r.productSellingPrice)}
                          </td>

                          <td
                            className={cn(
                              "px-4 py-4 text-right font-semibold",
                              marginColorClass(r.estimatedMargin)
                            )}
                          >
                            {r.estimatedMargin !== null
                              ? `${r.estimatedMargin.toFixed(1)}%`
                              : "—"}
                          </td>

                          <td className="px-4 py-4">
                            {r.totalFulfilled ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                <CheckCircle2 className="mr-1 size-3" />
                                Cukup
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                title={`Kurang: ${r.unavailableItems.join(", ")}`}
                              >
                                <XCircle className="mr-1 size-3" />
                                Kurang
                              </Badge>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {r.isActive ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDateTime(r.createdAt)}
                          </td>

                          <td className="px-4 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Aksi ${r.productName}`}
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
                                      `/inventory/recipes/${r.id}`
                                    )
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  Lihat Detail
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/inventory/recipes/${r.id}/edit`
                                    )
                                  }
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>

                                {!r.isActive && (
                                  <DropdownMenuItem
                                    onClick={() => openActivateDialog(r)}
                                  >
                                    <Power className="mr-2 size-4" />
                                    Aktifkan
                                  </DropdownMenuItem>
                                )}

                                {r.isActive && (
                                  <DropdownMenuItem
                                    onClick={() => openDeactivateDialog(r)}
                                  >
                                    <PowerOff className="mr-2 size-4" />
                                    Nonaktifkan
                                  </DropdownMenuItem>
                                )}

                                {!r.isActive && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => openDeleteDialog(r)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Hapus
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
                    {pagination?.total ?? 0} resep
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

      {/* ACTIVATE DIALOG */}
      <Dialog
        open={activateTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeActivateDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktifkan Resep?</DialogTitle>
            <DialogDescription>
              Resep <strong>{activateTarget?.productName}</strong> versi{" "}
              <strong className="font-mono">
                v{activateTarget?.version}
              </strong>{" "}
              akan dijadikan resep aktif. Versi lain untuk produk ini akan
              otomatis dinonaktifkan.
            </DialogDescription>
          </DialogHeader>

          {activateError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {activateError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeActivateDialog}
              disabled={isActivating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleActivate()}
              disabled={isActivating}
            >
              {isActivating ? "Mengaktifkan..." : "Aktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEACTIVATE DIALOG */}
      <Dialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeDeactivateDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Resep?</DialogTitle>
            <DialogDescription>
              Resep <strong>{deactivateTarget?.productName}</strong> versi{" "}
              <strong className="font-mono">
                v{deactivateTarget?.version}
              </strong>{" "}
              akan dinonaktifkan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Kalau ini satu-satunya resep aktif untuk produk ini,
                produk <strong>tidak bisa diproduksi</strong> sampai ada
                resep aktif lain. Pastikan ada versi lain yang siap
                diaktifkan.
              </span>
            </div>
          </div>

          {deactivateError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {deactivateError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDeactivateDialog}
              disabled={isDeactivating}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeactivate()}
              disabled={isDeactivating}
            >
              {isDeactivating ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Resep?</DialogTitle>
            <DialogDescription>
              Resep <strong>{deleteTarget?.productName}</strong> versi{" "}
              <strong className="font-mono">
                v{deleteTarget?.version}
              </strong>{" "}
              akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Hapus Resep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}