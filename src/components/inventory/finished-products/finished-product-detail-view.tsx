"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Factory,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Undo2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type ProductionComponent = {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryBatchId: string;
  batchCode: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

type FinishedBatchDetail = {
  id: string;
  batchCode: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sellingPrice: number;
    isActive: boolean;
  };
  productionId: string;
  production: {
    id: string;
    outputQuantity: number;
    totalCost: number;
    unitCost: number;
    createdAt: string;
    components: ProductionComponent[];
  } | null;
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

type DetailResponse = {
  success: boolean;
  data?: FinishedBatchDetail;
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
      </div>
      <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat batch</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/inventory/finished-products"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function FinishedBatchDetailView({
  batchId,
}: {
  batchId: string;
}) {
  const router = useRouter();

  const [data, setData] = React.useState<FinishedBatchDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRemaining, setEditRemaining] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Void dialog
  const [voidOpen, setVoidOpen] = React.useState(false);
  const [voidBatchInput, setVoidBatchInput] = React.useState("");
  const [voidNote, setVoidNote] = React.useState("");
  const [isVoiding, setIsVoiding] = React.useState(false);
  const [voidError, setVoidError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/inventory/finished-products/${encodeURIComponent(batchId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat batch.");
      }
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat batch."
      );
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openEditDialog() {
    if (!data) return;
    setEditRemaining(String(data.remainingQuantity));
    setEditError(null);
    setEditOpen(true);
  }

  function closeEditDialog() {
    if (isEditing) return;
    setEditOpen(false);
    setEditError(null);
  }

  async function handleEdit() {
    if (!data || isEditing) return;

    const digits = editRemaining.replace(/\D/g, "");
    const newValue = Number(digits);

    if (digits === "" || isNaN(newValue)) {
      setEditError("Sisa wajib diisi.");
      return;
    }
    if (newValue > data.quantity) {
      setEditError(
        `Sisa tidak boleh melebihi quantity awal (${data.quantity}).`
      );
      return;
    }

    try {
      setIsEditing(true);
      setEditError(null);
      const res = await fetch(
        `/api/inventory/finished-products/${encodeURIComponent(data.id)}`,
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
      setEditOpen(false);
      await load();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Gagal menyimpan."
      );
    } finally {
      setIsEditing(false);
    }
  }

  function openVoidDialog() {
    setVoidBatchInput("");
    setVoidNote("");
    setVoidError(null);
    setVoidOpen(true);
  }

  function closeVoidDialog() {
    if (isVoiding) return;
    setVoidOpen(false);
    setVoidBatchInput("");
    setVoidNote("");
    setVoidError(null);
  }

  async function handleVoid() {
    if (!data || isVoiding) return;

    try {
      setIsVoiding(true);
      setVoidError(null);
      const res = await fetch(
        `/api/inventory/finished-products/${encodeURIComponent(data.id)}`,
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
      router.push("/inventory/finished-products");
      router.refresh();
    } catch (err) {
      setVoidError(
        err instanceof Error ? err.message : "Gagal un-restock."
      );
    } finally {
      setIsVoiding(false);
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
          message={error ?? "Batch tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const isEmpty = data.remainingQuantity === 0;
  const batchMatch =
    voidBatchInput.trim() === data.batchCode;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/finished-products"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {data.product.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Batch{" "}
                <span className="font-mono">{data.batchCode}</span> ·{" "}
                {formatDateTime(data.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.canEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={openEditDialog}
              >
                <Pencil className="mr-2 size-4" />
                Koreksi Sisa
              </Button>
            )}

            {data.canVoid && (
              <Button
                type="button"
                variant="destructive"
                onClick={openVoidDialog}
              >
                <Undo2 className="mr-2 size-4" />
                Un-restock
              </Button>
            )}
          </div>
        </div>

        {/* Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="font-mono">
                {data.batchCode}
              </Badge>

              {isEmpty ? (
                <Badge variant="secondary">Habis</Badge>
              ) : data.consumedPct >= 75 ? (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  Stock Rendah
                </Badge>
              ) : (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  Tersedia
                </Badge>
              )}

              {data.canVoid && (
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400">
                  Dapat di-un-restock
                </Badge>
              )}

              <Link
                href={`/inventory/products/${data.productId}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                {data.product.name}
              </Link>
            </div>

            {!data.canVoid && !isEmpty && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Batch ini sudah dipakai sebagian. Un-restock hanya bisa
                  dilakukan pada batch yang belum pernah dikonsumsi.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Quantity Awal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.quantity)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                unit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Sisa Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  isEmpty
                    ? "text-muted-foreground"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {formatNumber(data.remainingQuantity)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                unit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Terpakai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.consumed)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.consumedPct.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nilai Sisa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(data.remainingValue)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                HPP {formatUnitCost(data.unitCost)} / unit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress Pemakaian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatNumber(data.consumed)} dari{" "}
                {formatNumber(data.quantity)} terpakai
              </span>
              <span className="font-medium">
                {data.consumedPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(data.consumedPct, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Production Components */}
        {data.production && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="size-4" />
                    Komponen Produksi
                  </CardTitle>
                  <CardDescription>
                    Bahan yang dikonsumsi saat batch ini dibuat.
                  </CardDescription>
                </div>
                <Link
                  href={`/inventory/productions/${data.production.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  <Factory className="mr-2 size-3.5" />
                  Lihat Produksi
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Bahan
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Batch
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        HPP / Unit
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.production.components.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <td className="px-6 py-3 font-medium">
                          {c.inventoryItemName}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/inventory/batches/${c.inventoryBatchId}`}
                            className="font-mono text-xs text-muted-foreground hover:underline"
                          >
                            {c.batchCode}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(c.quantity)}{" "}
                          <span className="text-xs text-muted-foreground">
                            {c.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatUnitCost(c.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatRupiah(c.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td
                        colSpan={4}
                        className="px-6 py-3 text-right font-medium"
                      >
                        Total Biaya Produksi
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold">
                        {formatRupiah(data.production.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Batch Code
              </span>
              <span className="font-mono text-sm">{data.batchCode}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                HPP per Unit
              </span>
              <span className="text-sm font-medium">
                {formatRupiah(data.unitCost)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Total Biaya Produksi
              </span>
              <span className="text-sm font-medium">
                {formatRupiah(data.totalCost)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Harga Jual / Unit
              </span>
              <span className="text-sm font-medium">
                {formatRupiah(data.product.sellingPrice)}
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

      {/* ================= EDIT DIALOG ================= */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koreksi Sisa Stock?</DialogTitle>
            <DialogDescription>
              Ubah sisa stock batch{" "}
              <strong className="font-mono">{data.batchCode}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Quantity Awal
                </span>
                <span className="font-medium">
                  {formatNumber(data.quantity)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Sisa Saat Ini</span>
                <span className="font-medium">
                  {formatNumber(data.remainingQuantity)}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fb-remaining">
                Sisa Baru <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-fb-remaining"
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
        open={voidOpen}
        onOpenChange={(open) => {
          if (!open) closeVoidDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Un-restock Batch?</DialogTitle>
            <DialogDescription>
              Batch{" "}
              <strong className="font-mono">{data.batchCode}</strong> akan
              dibatalkan. Material yang terpakai akan dikembalikan ke
              batch asalnya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">
                  {formatNumber(data.quantity)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Total Biaya</span>
                <span className="font-medium">
                  {formatRupiah(data.totalCost)}
                </span>
              </div>
            </div>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Semua komponen bahan yang terpakai akan dikembalikan ke
                  batch inventory. Production + HPP terkait akan dihapus.
                  Tidak dapat dibatalkan.
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="void-fb-batch-detail">
                Konfirmasi Batch Code{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="void-fb-batch-detail"
                value={voidBatchInput}
                onChange={(e) => setVoidBatchInput(e.target.value)}
                placeholder={`Ketik: ${data.batchCode}`}
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

            <div className="grid gap-2">
              <Label htmlFor="void-fb-note-detail">
                Alasan{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <textarea
                id="void-fb-note-detail"
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