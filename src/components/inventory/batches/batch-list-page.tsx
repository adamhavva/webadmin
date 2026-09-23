"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
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

type Batch = {
  id: string;
  inventoryItemId: string;
  batchCode: string;
  sourceType: "RESTOCK";
  quantity: string;
  remainingQuantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: string;
  canEdit: boolean;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    isActive: boolean;
  };
  restock: { id: string; status: "ACTIVE" | "VOIDED" } | null;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Batch[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalValue: number;
      totalRemaining: number;
      count: number;
      availableCount: number;
    };
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID").format(num);
}

function formatRupiah(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
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
    timeZone: "Asia/Jakarta",
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

function BatchEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Layers className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Batch tidak ditemukan" : "Belum ada batch"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada batch yang cocok dengan filter."
          : "Batch akan muncul setelah ada restock."}
      </p>
      {!hasSearch && (
        <Link
          href="/inventory/restocks/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Boxes className="mr-2 size-4" />
          Penerimaan Barang
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function BatchListPage() {
  const router = useRouter();

  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [onlyAvailable, setOnlyAvailable] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [summary, setSummary] = React.useState({
    totalValue: 0,
    totalRemaining: 0,
    count: 0,
    availableCount: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit dialog
  const [editTarget, setEditTarget] = React.useState<Batch | null>(null);
  const [editRemaining, setEditRemaining] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

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
      currentOnlyAvailable: boolean,
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
        if (currentOnlyAvailable) params.set("onlyAvailable", "true");

        const res = await fetch(
          `/api/inventory/batches?${params.toString()}`,
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

        setBatches(json.data.items);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchBatches(page, debouncedSearch, onlyAvailable, {
      showLoading: true,
    });
  }, [page, debouncedSearch, onlyAvailable, fetchBatches]);

  function handleRefresh() {
    void fetchBatches(page, debouncedSearch, onlyAvailable, {
      showRefreshing: true,
    });
  }

  function handleResetFilter() {
    setSearch("");
    setOnlyAvailable(false);
    setPage(1);
  }

  // ---------- Edit ----------
  function openEditDialog(b: Batch) {
    setEditTarget(b);
    setEditRemaining(String(Number(b.remainingQuantity)));
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
    if (newValue > Number(editTarget.quantity)) {
      setEditError(
        `Sisa tidak boleh melebihi quantity awal (${formatNumber(
          editTarget.quantity
        )}).`
      );
      return;
    }

    try {
      setIsEditing(true);
      setEditError(null);

      const res = await fetch(
        `/api/inventory/batches/${encodeURIComponent(editTarget.id)}`,
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
      await fetchBatches(page, debouncedSearch, onlyAvailable, {
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

  const hasSearch = search.trim().length > 0 || onlyAvailable;
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Batch Bahan
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stok bahan per batch. Setiap restock menghasilkan satu batch
              baru.
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

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Batch
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.count)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.availableCount} tersedia
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Sisa Stok
              </CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.totalRemaining)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                total remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nilai Stok
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(summary.totalValue)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                nilai sisa batch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Tersedia
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.availableCount}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                batch siap dipakai
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-base">Daftar Batch</CardTitle>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari batch code atau nama bahan..."
                    className="pl-9"
                  />
                </div>

                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => {
                      setOnlyAvailable(e.target.checked);
                      setPage(1);
                    }}
                    className="size-4 cursor-pointer accent-primary"
                  />
                  <span>Hanya tersedia</span>
                </label>
              </div>

              {hasSearch && (
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
                    onlyAvailable,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : batches.length === 0 ? (
              <BatchEmptyState hasSearch={hasSearch} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Batch Code
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Bahan
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
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Dibuat
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {batches.map((b) => {
                        const remaining = Number(b.remainingQuantity);
                        const initial = Number(b.quantity);
                        const isEmpty = remaining === 0;
                        const isVoided = b.restock?.status === "VOIDED";

                        return (
                          <tr
                            key={b.id}
                            className={cn(
                              "border-b last:border-b-0 hover:bg-muted/30",
                              isEmpty && "opacity-60"
                            )}
                          >
                            <td className="px-6 py-4">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {b.batchCode}
                              </Badge>
                            </td>

                            <td className="px-4 py-4">
                              <Link
                                href={`/inventory/items/${b.inventoryItem.id}`}
                                className="font-medium hover:underline"
                              >
                                {b.inventoryItem.name}
                              </Link>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {b.inventoryItem.unit}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right">
                              {formatNumber(b.quantity)}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <span
                                className={cn(
                                  "font-medium",
                                  isEmpty && "text-muted-foreground"
                                )}
                              >
                                {formatNumber(b.remainingQuantity)}
                              </span>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                dari {formatNumber(initial)}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right text-muted-foreground">
                              {formatRupiah(b.unitCost)}
                            </td>

                            <td className="px-4 py-4">
                              {isVoided ? (
                                <Badge variant="destructive">
                                  Voided
                                </Badge>
                              ) : isEmpty ? (
                                <Badge variant="secondary">Habis</Badge>
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
                                        `/inventory/batches/${b.id}`
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
            <DialogTitle>Koreksi Sisa Stok?</DialogTitle>
            <DialogDescription>
              Ubah sisa stok batch{" "}
              <strong className="font-mono">{editTarget?.batchCode}</strong>{" "}
              ({editTarget?.inventoryItem.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Quantity Awal
                </span>
                <span className="font-medium">
                  {editTarget ? formatNumber(editTarget.quantity) : "-"}{" "}
                  {editTarget?.inventoryItem.unit}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Sisa Saat Ini</span>
                <span className="font-medium">
                  {editTarget
                    ? formatNumber(editTarget.remainingQuantity)
                    : "-"}{" "}
                  {editTarget?.inventoryItem.unit}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-batch-remaining">
                Sisa Baru <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-batch-remaining"
                type="text"
                inputMode="numeric"
                value={editRemaining}
                onChange={(e) =>
                  setEditRemaining(
                    e.target.value.replace(/\D/g, "").slice(0, 12)
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
                Koreksi manual untuk stock opname. Unit cost batch tidak
                berubah.
              </p>
            </div>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Pastikan nilai sesuai dengan stok fisik di gudang. Perubahan
                  ini memengaruhi ketersediaan bahan untuk produksi
                  berikutnya.
                </span>
              </div>
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
    </>
  );
}