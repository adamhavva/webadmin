"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  TrendingUp,
  XCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type FifoAllocation = {
  batchId: string;
  batchCode: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

type RecipeItem = {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  isActive: boolean;
  quantity: number;
  unitCost: number | null;
  subtotal: number | null;
  availableStock: number;
  fulfilled: boolean;
  shortage: number;
  allocations: FifoAllocation[];
};

type RecipeDetail = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    isActive: boolean;
    sellingPrice: number;
  };
  version: number;
  isActive: boolean;
  items: RecipeItem[];
  totalHpp: number;
  totalFulfilled: boolean;
  unavailableItems: string[];
  estimatedMargin: number | null;
  latestHpp: { hpp: number; createdAt: string } | null;
  canEdit: boolean;
  canDelete: boolean;
  usedInProduction: boolean;
  createdAt: string;
  updatedAt: string;
};

type DetailResponse = {
  success: boolean;
  data?: RecipeDetail;
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
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
      <div className="h-48 animate-pulse rounded-lg border bg-muted/30" />
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat resep</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/inventory/recipes"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Item Row (expandable)
// ============================================================

function ItemRow({ item }: { item: RecipeItem }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasBreakdown = item.allocations.length > 1;

  return (
    <>
      <tr className="border-b last:border-b-0">
        <td className="px-6 py-3 font-medium">
          <div className="flex items-center gap-2">
            {hasBreakdown && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={expanded ? "Tutup rincian" : "Buka rincian"}
              >
                {expanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            )}
            <span>{item.inventoryItemName}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          {formatNumber(item.quantity)}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
        <td className="px-4 py-3 text-right text-muted-foreground">
          {item.unitCost !== null ? formatUnitCost(item.unitCost) : "—"}
        </td>
        <td className="px-4 py-3 text-right font-semibold">
          {item.subtotal !== null ? formatRupiah(item.subtotal) : "—"}
        </td>
        <td className="px-4 py-3">
          {item.fulfilled ? (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
              <CheckCircle2 className="mr-1 size-3" />
              Cukup
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 size-3" />
              Kurang {formatNumber(item.shortage)}
            </Badge>
          )}
        </td>
      </tr>

      {expanded && hasBreakdown && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-6 py-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Rincian FIFO ({item.allocations.length} batch)
              </p>
              {item.allocations.map((a) => (
                <div
                  key={a.batchId}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px]"
                  >
                    {a.batchCode}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatNumber(a.quantity)} {item.unit}
                  </span>
                  <span className="text-muted-foreground">×</span>
                  <span className="text-muted-foreground">
                    {formatUnitCost(a.unitCost)}
                  </span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-medium">
                    {formatRupiah(a.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================
// Main
// ============================================================

export function RecipeDetailView({ recipeId }: { recipeId: string }) {
  const router = useRouter();

  const [data, setData] = React.useState<RecipeDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activateOpen, setActivateOpen] = React.useState(false);
  const [isActivating, setIsActivating] = React.useState(false);
  const [activateError, setActivateError] = React.useState<string | null>(
    null
  );

  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [deactivateError, setDeactivateError] = React.useState<string | null>(
    null
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(recipeId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat resep.");
      }
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat resep."
      );
    } finally {
      setIsLoading(false);
    }
  }, [recipeId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleActivate() {
    if (!data || isActivating) return;
    try {
      setIsActivating(true);
      setActivateError(null);
      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(data.id)}/activate`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal mengaktifkan.");
      }
      setActivateOpen(false);
      await load();
    } catch (err) {
      setActivateError(
        err instanceof Error ? err.message : "Gagal mengaktifkan."
      );
    } finally {
      setIsActivating(false);
    }
  }

  async function handleDeactivate() {
    if (!data || isDeactivating) return;
    try {
      setIsDeactivating(true);
      setDeactivateError(null);
      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(data.id)}/deactivate`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menonaktifkan.");
      }
      setDeactivateOpen(false);
      await load();
    } catch (err) {
      setDeactivateError(
        err instanceof Error ? err.message : "Gagal menonaktifkan."
      );
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleDelete() {
    if (!data || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await fetch(
        `/api/inventory/recipes/${encodeURIComponent(data.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menghapus.");
      }
      router.push("/inventory/recipes");
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus."
      );
    } finally {
      setIsDeleting(false);
    }
  }

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
          message={error ?? "Resep tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const selling = data.product.sellingPrice;
  const margin = data.estimatedMargin;

  // Warna margin: hijau kalau profit (≥ 0), merah kalau rugi (< 0)
  const marginTextClass =
    margin === null
      ? "text-muted-foreground"
      : margin >= 0
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/recipes"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {data.product.name}{" "}
                <span className="font-mono text-base text-muted-foreground">
                  v{data.version}
                </span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Resep produk · {data.items.length} bahan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.canEdit && (
              <Link
                href={`/inventory/recipes/${data.id}/edit`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            )}

            {!data.isActive && (
              <Button
                type="button"
                onClick={() => {
                  setActivateError(null);
                  setActivateOpen(true);
                }}
              >
                <Power className="mr-2 size-4" />
                Aktifkan
              </Button>
            )}

            {data.isActive && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeactivateError(null);
                  setDeactivateOpen(true);
                }}
              >
                <PowerOff className="mr-2 size-4" />
                Nonaktifkan
              </Button>
            )}

            {data.canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Hapus
              </Button>
            )}
          </div>
        </div>

        {/* Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              {data.isActive ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mr-1 size-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary">Nonaktif</Badge>
              )}

              <Badge variant="outline" className="font-mono">
                v{data.version}
              </Badge>

              {data.totalFulfilled ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mr-1 size-3" />
                  Stok cukup
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 size-3" />
                  Stok kurang
                </Badge>
              )}

              <Link
                href={`/inventory/products/${data.productId}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                {data.product.name}
              </Link>
            </div>

            {!data.totalFulfilled && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Stok tidak cukup untuk:{" "}
                  <strong>{data.unavailableItems.join(", ")}</strong>.
                  Produksi akan gagal sampai stok ditambah.
                </span>
              </div>
            )}

            {data.usedInProduction && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Resep ini sudah pernah dipakai di produksi. Tidak dapat
                  diedit/dihapus untuk menjaga HPP historis.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* HPP Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="size-3.5" />
                Estimasi HPP (FIFO)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(data.totalHpp)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Simulasi batch tersedia sekarang
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Harga Jual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(selling)}
              </div>
              {data.latestHpp && (
                <p className="mt-1 text-xs text-muted-foreground">
                  HPP terakhir: {formatRupiah(data.latestHpp.hpp)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              {margin !== null ? (
                <div className={cn("text-2xl font-bold", marginTextClass)}>
                  Margin ~ {margin.toFixed(1)}%
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
              {margin !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {margin >= 0 ? "Profit" : "Rugi"} · dari estimasi HPP
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4" />
              Komposisi Bahan
            </CardTitle>
            <CardDescription>
              HPP dihitung FIFO dari batch yang tersedia. Klik panah untuk
              lihat rincian batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-6 py-3 text-left font-medium">
                      Bahan
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Satuan
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      HPP / Unit
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-right font-medium"
                    >
                      Total Estimasi HPP
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold">
                      {formatRupiah(data.totalHpp)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Harga Jual Produk
              </span>
              <span className="text-sm font-medium">
                {formatRupiah(selling)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Dibuat pada
              </span>
              <span className="text-sm">
                {formatDateTime(data.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Terakhir diperbarui
              </span>
              <span className="text-sm">
                {formatDateTime(data.updatedAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACTIVATE DIALOG */}
      <Dialog
        open={activateOpen}
        onOpenChange={(open) => {
          if (!isActivating) setActivateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktifkan Resep Ini?</DialogTitle>
            <DialogDescription>
              Resep <strong>{data.product.name}</strong> versi{" "}
              <strong className="font-mono">v{data.version}</strong> akan
              dijadikan resep aktif. Versi lain produk ini akan otomatis
              dinonaktifkan.
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
              disabled={isActivating}
              onClick={() => setActivateOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isActivating}
              onClick={() => void handleActivate()}
            >
              {isActivating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Mengaktifkan...
                </>
              ) : (
                <>
                  <Power className="mr-2 size-4" />
                  Aktifkan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEACTIVATE DIALOG */}
      <Dialog
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (!isDeactivating) setDeactivateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Resep Ini?</DialogTitle>
            <DialogDescription>
              Resep <strong>{data.product.name}</strong> versi{" "}
              <strong className="font-mono">v{data.version}</strong> akan
              dinonaktifkan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Kalau ini satu-satunya resep aktif, produk{" "}
                <strong>tidak bisa diproduksi</strong> sampai ada resep
                aktif lain diaktifkan.
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
              disabled={isDeactivating}
              onClick={() => setDeactivateOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeactivating}
              onClick={() => void handleDeactivate()}
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menonaktifkan...
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 size-4" />
                  Nonaktifkan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Resep?</DialogTitle>
            <DialogDescription>
              Resep <strong>{data.product.name}</strong> versi{" "}
              <strong className="font-mono">v{data.version}</strong> akan
              dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Hapus Resep
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}