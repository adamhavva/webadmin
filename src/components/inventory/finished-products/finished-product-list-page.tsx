"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  RefreshCw,
  Search,
  TrendingUp,
  Undo2,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type FinishedBatch = {
  id: string;
  batchCode: string;
  productId: string;
  productName: string;
  productSellingPrice: number;
  productionId: string;
  quantity: number;
  remainingQuantity: number;
  consumed: number;
  consumedPct: number;
  unitCost: number;
  totalCost: number;
  remainingValue: number;
  canEdit: boolean;
  canVoid: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: FinishedBatch[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      count: number;
      availableCount: number;
      totalQuantity: number;
      totalRemaining: number;
      totalValue: number;
    };
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type StatusFilter = "all" | "available" | "empty";

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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function BatchSkeleton() {
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

function BatchErrorState({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat batch</h3>
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

function BatchEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Archive className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Batch tidak ditemukan" : "Belum ada batch produk jadi"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada batch yang cocok dengan filter."
          : "Batch produk jadi terbentuk otomatis saat produksi dijalankan."}
      </p>
      {!hasSearch && (
        <Link
          href="/inventory/productions/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Package className="mr-2 size-4" />
          Mulai Produksi
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function FinishedBatchListPage() {
  const router = useRouter();

  const [batches, setBatches] = React.useState<FinishedBatch[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [summary, setSummary] = React.useState({
    count: 0,
    availableCount: 0,
    totalQuantity: 0,
    totalRemaining: 0,
    totalValue: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit remaining dialog
  const [editTarget, setEditTarget] = React.useState<FinishedBatch | null>(
    null
  );
  const [editRemaining, setEditRemaining] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Void dialog
  const [voidTarget, setVoidTarget] = React.useState<FinishedBatch | null>(
    null
  );
  const [voidBatchInput, setVoidBatchInput] = React.useState("");
  const [voidNote, setVoidNote] = React.useState("");
  const [isVoiding, setIsVoiding] = React.useState(false);
  const [voidError, setVoidError] = React.useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchBatches = React.useCallback(
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
        if (currentStatus !== "all") params.set("status", currentStatus);

        const res = await fetch(
          `/api/inventory/finished-products?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat batch.");
        }

        setBatches(json.data.items);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat batch."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchBatches(page, debouncedSearch, statusFilter, {
      showLoading: true,
    });
  }, [page, debouncedSearch, statusFilter, fetchBatches]);

  function handleRefresh() {
    void fetchBatches(page, debouncedSearch, statusFilter, {
      showRefreshing: true,
    });
  }

  // ---------- Edit ----------
  function openEditDialog(b: FinishedBatch) {
    setEditTarget(b);
    setEditRemaining(String(b.remainingQuantity));
    setEditError(null);
  }

  function closeEditDialog() {
    if (isEditing) return;
    setEditTarget(null);
    setEditRemaining("");
    setEditError(null);
  }

  async function handleEdit() {
    if (!editTarget || isEditing) return;

    const digits = editRemaining.replace(/\D/g, "");
    const newValue = Number(digits);

    if (digits === "" || isNaN(newValue)) {
      setEditError("Sisa wajib diisi.");
      return;
    }
    if (newValue < 0) {
      setEditError("Sisa tidak boleh negatif.");
      return;
    }
    if (newValue > editTarget.quantity) {
      setEditError(
        `Sisa tidak boleh melebihi quantity awal (${editTarget.quantity}).`
      );
      return;
    }

    try {
      setIsEditing(true);
      setEditError(null);

      const res = await fetch(
        `/api/inventory/finished-products/${encodeURIComponent(
          editTarget.id
        )}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remainingQuantity: newValue }),
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menyimpan.");
      }

      setEditTarget(null);
      await fetchBatches(page, debouncedSearch, statusFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Gagal menyimpan."
      );
    } finally {
      setIsEditing(false);
    }
  }

  // ---------- Void ----------
  function openVoidDialog(b: FinishedBatch) {
    setVoidTarget(b);
    setVoidBatchInput("");
    setVoidNote("");
    setVoidError(null);
  }

  function closeVoidDialog() {
    if (isVoiding) return;
    setVoidTarget(null);
    setVoidBatchInput("");
    setVoidNote("");
    setVoidError(null);
  }

  async function handleVoid() {
    if (!voidTarget || isVoiding) return;

    try {
      setIsVoiding(true);
      setVoidError(null);

      const res = await fetch(
        `/api/inventory/finished-products/${encodeURIComponent(
          voidTarget.id
        )}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            batchCode: voidBatchInput.trim(),
            voidNote: voidNote.trim() || undefined,
          }),
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal un-restock.");
      }

      setVoidTarget(null);
      await fetchBatches(page, debouncedSearch, statusFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setVoidError(
        err instanceof Error ? err.message : "Gagal un-restock."
      );
    } finally {
      setIsVoiding(false);
    }
  }

  const hasSearch = search.trim().length > 0 || statusFilter !== "all";
  const totalPages = pagination?.totalPages ?? 0;
  const batchMatch =
    voidTarget !== null && voidBatchInput.trim() === voidTarget.batchCode;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Stock Produk Jadi
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Batch produk jadi yang dihasilkan dari produksi.
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Batch
              </CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.count)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNumber(summary.availableCount)} tersedia
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Sisa Stock
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.totalRemaining)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                unit produk jadi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Nilai Stock
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(summary.totalValue)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                berdasarkan HPP
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Daftar Batch</CardTitle>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari batch atau produk..."
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
                  <option value="available">Tersedia</option>
                  <option value="empty">Habis</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <BatchSkeleton />
            ) : error ? (
              <BatchErrorState
                message={error}
                onRetry={() => {
                  void fetchBatches(
                    page,
                    debouncedSearch,
                    statusFilter,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : batches.length === 0 ? (
              <BatchEmptyState hasSearch={hasSearch} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Sisa
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          HPP / Unit
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Nilai Sisa
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Tanggal
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {batches.map((b) => {
                        const isEmpty = b.remainingQuantity === 0;
                        return (
                          <tr
                            key={b.id}
                            className="border-b last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-6 py-4">
                              <Link
                                href={`/inventory/products/${b.productId}`}
                                className="font-medium hover:underline"
                              >
                                {b.productName}
                              </Link>
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {b.batchCode}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 text-right">
                              {formatNumber(b.quantity)}
                            </td>

                            <td className="px-4 py-4 text-right font-medium">
                              {formatNumber(b.remainingQuantity)}
                            </td>

                            <td className="px-4 py-4 text-right text-muted-foreground">
                              {formatUnitCost(b.unitCost)}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatRupiah(b.remainingValue)}
                            </td>

                            <td className="px-4 py-4">
                              {isEmpty ? (
                                <Badge variant="secondary">Habis</Badge>
                              ) : b.consumedPct >= 75 ? (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                  Rendah
                                </Badge>
                              ) : (
                                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                  Tersedia
                                </Badge>
                              )}
                            </td>

                            <td className="px-4 py-4 text-muted-foreground">
                              {formatDateTime(b.createdAt)}
                            </td>

                            <td className="px-4 py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label={`Aksi ${b.batchCode}`}
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
                                        `/inventory/finished-products/${b.id}`
                                      )
                                    }
                                  >
                                    <Eye className="mr-2 size-4" />
                                    Lihat Detail
                                  </DropdownMenuItem>

                                  {b.canEdit && (
                                    <DropdownMenuItem
                                      onClick={() => openEditDialog(b)}
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Koreksi Sisa
                                    </DropdownMenuItem>
                                  )}

                                  {b.canVoid && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => openVoidDialog(b)}
                                    >
                                      <Undo2 className="mr-2 size-4" />
                                      Un-restock
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination?.total ?? 0} batch
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

      {/* ================= EDIT DIALOG ================= */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koreksi Sisa Stock?</DialogTitle>
            <DialogDescription>
              Ubah sisa stock batch{" "}
              <strong className="font-mono">
                {editTarget?.batchCode}
              </strong>{" "}
              ({editTarget?.productName}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Quantity Awal
                </span>
                <span className="font-medium">
                  {editTarget ? formatNumber(editTarget.quantity) : "-"}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Sisa Saat Ini</span>
                <span className="font-medium">
                  {editTarget
                    ? formatNumber(editTarget.remainingQuantity)
                    : "-"}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-remaining">
                Sisa Baru <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-remaining"
                type="text"
                inputMode="numeric"
                value={editRemaining}
                onChange={(e) =>
                  setEditRemaining(
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "-" ||
                    e.key === "+" ||
                    e.key === "e" ||
                    e.key === "E" ||
                    e.key === "," ||
                    e.key === "."
                  ) {
                    e.preventDefault();
                  }
                }}
                placeholder="0"
                disabled={isEditing}
              />
              <p className="text-xs text-muted-foreground">
                Koreksi manual untuk stock opname. HPP tidak berubah.
              </p>
            </div>
          </div>

          {editError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {editError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditDialog}
              disabled={isEditing}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleEdit()}
              disabled={isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= VOID DIALOG ================= */}
      <Dialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeVoidDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Un-restock Batch?</DialogTitle>
            <DialogDescription>
              Batch{" "}
              <strong className="font-mono">
                {voidTarget?.batchCode}
              </strong>{" "}
              ({voidTarget?.productName}) akan dibatalkan. Material yang
              terpakai akan dikembalikan ke batch asalnya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">
                  {voidTarget ? formatNumber(voidTarget.quantity) : "-"}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Total Biaya</span>
                <span className="font-medium">
                  {voidTarget ? formatRupiah(voidTarget.totalCost) : "-"}
                </span>
              </div>
            </div>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Semua komponen bahan yang terpakai akan dikembalikan ke
                  batch inventory. Production + HPP yang terkait akan
                  dihapus. Tindakan ini tidak dapat dibatalkan.
                </span>
              </div>
            </div>

            {/* Konfirmasi batch code */}
            <div className="grid gap-2">
              <Label htmlFor="void-fb-batch">
                Konfirmasi Batch Code{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="void-fb-batch"
                value={voidBatchInput}
                onChange={(e) => setVoidBatchInput(e.target.value)}
                placeholder={`Ketik: ${voidTarget?.batchCode ?? ""}`}
                autoComplete="off"
                disabled={isVoiding}
                className={cn(
                  voidBatchInput.length > 0 &&
                    (batchMatch
                      ? "border-green-500 focus-visible:ring-green-500/30"
                      : "border-red-500 focus-visible:ring-red-500/30")
                )}
              />
              <p className="text-xs text-muted-foreground">
                Ketik batch code persis sama untuk mengaktifkan tombol.
              </p>
            </div>

            {/* Catatan */}
            <div className="grid gap-2">
              <Label htmlFor="void-fb-note">
                Alasan{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <textarea
                id="void-fb-note"
                value={voidNote}
                onChange={(e) => setVoidNote(e.target.value)}
                placeholder="Contoh: Produk reject, salah input, dsb."
                disabled={isVoiding}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {voidNote.length}/500 karakter
              </p>
            </div>
          </div>

          {voidError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {voidError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeVoidDialog}
              disabled={isVoiding}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleVoid()}
              disabled={isVoiding || !batchMatch}
            >
              {isVoiding ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Undo2 className="mr-2 size-4" />
                  Un-restock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}