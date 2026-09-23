"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Pencil,
  RefreshCw,
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

type SourceType = "RESTOCK";

type ProductionComponent = {
  id: string;
  productionId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: string;
  production: {
    id: string;
    productId: string;
    outputQuantity: string;
    unitCost: string;
    createdAt: string;
    product: {
      id: string;
      name: string;
    };
  };
};

type RestockInfo = {
  id: string;
  quantity: string;
  totalCost: string;
  unitCost: string;
  supplierName: string | null;
  status: "ACTIVE" | "VOIDED";
  voidedAt: string | null;
  createdAt: string;
};

type BatchDetail = {
  id: string;
  inventoryItemId: string;
  batchCode: string;
  sourceType: SourceType;
  quantity: string;
  remainingQuantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    isActive: boolean;
  };
  restock: RestockInfo | null;
  productionComponents: ProductionComponent[];
  stats: {
    initial: number;
    remaining: number;
    consumed: number;
    consumedPct: number;
    unitCost: number;
    initialValue: number;
    consumedValue: number;
    remainingValue: number;
  };
};

type DetailResponse = {
  success: boolean;
  data?: BatchDetail;
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID").format(n);
}

function formatRupiah(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
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
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

// ============================================================
// Skeleton / Error
// ============================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-muted/30" />
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat detail</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/inventory/batches"
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

export function BatchDetailView({ batchId }: { batchId: string }) {
  const [data, setData] = React.useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRemaining, setEditRemaining] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/inventory/batches/${encodeURIComponent(batchId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const json = (await res.json()) as DetailResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat detail.");
      }

      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat detail."
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
    setEditRemaining(String(data.stats.remaining));
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
    if (newValue < 0) {
      setEditError("Sisa tidak boleh negatif.");
      return;
    }
    if (newValue > data.stats.initial) {
      setEditError(
        `Sisa tidak boleh melebihi quantity awal (${formatNumber(
          data.stats.initial
        )}).`
      );
      return;
    }

    try {
      setIsEditing(true);
      setEditError(null);

      const res = await fetch(
        `/api/inventory/batches/${encodeURIComponent(data.id)}`,
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
          message={error ?? "Data tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const isEmpty = data.stats.remaining === 0;
  const isVoided = data.restock?.status === "VOIDED";

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/batches"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Detail Batch
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.inventoryItem.name} ·{" "}
                {formatDateTime(data.createdAt)}
              </p>
            </div>
          </div>

          {data.canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={openEditDialog}
              >
                <Pencil className="mr-2 size-4" />
                Koreksi Sisa
              </Button>
            </div>
          )}
        </div>

        {/* Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="font-mono">
                {data.batchCode}
              </Badge>
              <Badge variant="outline">
                {data.sourceType.toLowerCase()}
              </Badge>
              {data.restock?.supplierName && (
                <Badge variant="secondary">
                  {data.restock.supplierName}
                </Badge>
              )}
              {isVoided ? (
                <Badge variant="destructive">Restock VOIDED</Badge>
              ) : isEmpty ? (
                <Badge variant="secondary">Habis</Badge>
              ) : (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  Tersedia
                </Badge>
              )}
            </div>

            {isVoided && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Batch ini berasal dari restock yang sudah di-void. Tidak
                  dapat dikoreksi.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Quantity Awal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.initial)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.inventoryItem.unit}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Sisa Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.remaining)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.inventoryItem.unit}
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
                {formatNumber(data.stats.consumed)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.stats.consumedPct.toFixed(1)}% dari awal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Unit Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(data.stats.unitCost)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                per {data.inventoryItem.unit}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress Pemakaian</CardTitle>
            <CardDescription>
              Seberapa banyak batch ini sudah dikonsumsi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.stats.consumedPct.toFixed(1)}% terpakai
                </span>
                <span className="text-muted-foreground">
                  {formatNumber(data.stats.remaining)} /{" "}
                  {formatNumber(data.stats.initial)}{" "}
                  {data.inventoryItem.unit}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(data.stats.consumedPct, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Nilai Awal
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {formatRupiah(data.stats.initialValue)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Nilai Terpakai
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {formatRupiah(data.stats.consumedValue)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Nilai Sisa
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {formatRupiah(data.stats.remainingValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Bahan + Sumber */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Bahan</CardTitle>
              <CardDescription>
                Bahan yang dimiliki oleh batch ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Nama Bahan
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    <Link
                      href={`/inventory/items/${data.inventoryItem.id}`}
                      className="hover:underline"
                    >
                      {data.inventoryItem.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Satuan</dt>
                  <dd className="mt-1 text-sm">
                    {data.inventoryItem.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Status Bahan
                  </dt>
                  <dd className="mt-1">
                    {data.inventoryItem.isActive ? (
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sumber Batch</CardTitle>
              <CardDescription>
                {data.sourceType === "RESTOCK"
                  ? "Batch ini berasal dari restock."
                  : "Batch ini berasal dari produksi."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.restock ? (
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Supplier
                    </dt>
                    <dd className="mt-1 text-sm">
                      {data.restock.supplierName ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Status Restock
                    </dt>
                    <dd className="mt-1">
                      {data.restock.status === "VOIDED" ? (
                        <Badge variant="destructive">VOIDED</Badge>
                      ) : (
                        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                          Aktif
                        </Badge>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Total Restock
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatRupiah(data.restock.totalCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Tanggal Restock
                    </dt>
                    <dd className="mt-1 text-sm">
                      {formatDateTime(data.restock.createdAt)}
                    </dd>
                  </div>
                  <div className="border-t pt-4">
                    <Link
                      href={`/inventory/restocks/${data.restock.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" })
                      )}
                    >
                      Lihat Detail Restock
                    </Link>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Info sumber tidak tersedia.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Konsumsi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pemakaian di Produksi
            </CardTitle>
            <CardDescription>
              {data.productionComponents.length === 0
                ? "Batch ini belum pernah dipakai di produksi."
                : `${data.productionComponents.length} kali pemakaian di produksi.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.productionComponents.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Belum ada pemakaian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Output
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Quantity Dipakai
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Total Cost
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Tanggal
                      </th>
                      <th className="w-16 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.productionComponents.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/inventory/products/${c.production.product.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.production.product.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(c.production.outputQuantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatNumber(c.quantity)}{" "}
                          {data.inventoryItem.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(c.totalCost)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(c.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/inventory/productions/${c.production.id}`}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              })
                            )}
                          >
                            Lihat
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            <DialogTitle>Koreksi Sisa Stok?</DialogTitle>
            <DialogDescription>
              Ubah sisa stok batch{" "}
              <strong className="font-mono">{data.batchCode}</strong> (
              {data.inventoryItem.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Quantity Awal
                </span>
                <span className="font-medium">
                  {formatNumber(data.stats.initial)}{" "}
                  {data.inventoryItem.unit}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Sisa Saat Ini</span>
                <span className="font-medium">
                  {formatNumber(data.stats.remaining)}{" "}
                  {data.inventoryItem.unit}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-batch-remaining-detail">
                Sisa Baru <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-batch-remaining-detail"
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
                  Pastikan nilai sesuai dengan stok fisik di gudang.
                  Perubahan ini memengaruhi ketersediaan bahan untuk
                  produksi berikutnya.
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