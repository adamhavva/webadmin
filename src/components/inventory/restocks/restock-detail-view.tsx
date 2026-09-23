"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Loader2,
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
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type RestockStatus = "ACTIVE" | "VOIDED";

type RestockDetail = {
  id: string;
  inventoryItemId: string;
  batchId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  supplierName: string | null;
  status: RestockStatus;
  voidedAt: string | null;
  createdAt: string;
  canVoid: boolean;
  consumptionCount: number;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    isActive: boolean;
  };
  batch: {
    id: string;
    batchCode: string;
    quantity: string;
    remainingQuantity: string;
    unitCost: string;
    totalCost: string;
    sourceType: string;
    createdAt: string;
  };
};

type DetailResponse = {
  success: boolean;
  data?: RestockDetail;
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
  }).format(d);
}

// ============================================================
// Skeleton / Error
// ============================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-40 animate-pulse rounded-lg border bg-muted/30" />
      </div>
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
          href="/inventory/restocks"
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

export function RestockDetailView({ restockId }: { restockId: string }) {
  const router = useRouter();

  const [data, setData] = React.useState<RestockDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [voidOpen, setVoidOpen] = React.useState(false);
  const [isVoiding, setIsVoiding] = React.useState(false);
  const [voidError, setVoidError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/inventory/restocks/${encodeURIComponent(restockId)}`,
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
  }, [restockId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleVoid() {
    if (!data || isVoiding) return;

    try {
      setIsVoiding(true);
      setVoidError(null);

      const res = await fetch(
        `/api/inventory/restocks/${encodeURIComponent(data.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal void restock.");
      }

      setVoidOpen(false);
      router.push("/inventory/restocks");
      router.refresh();
    } catch (err) {
      setVoidError(
        err instanceof Error ? err.message : "Gagal void restock."
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
          message={error ?? "Data tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const remaining = Number(data.batch.remainingQuantity);
  const initialQty = Number(data.batch.quantity);
  const consumedPct =
    initialQty > 0 ? ((initialQty - remaining) / initialQty) * 100 : 0;
  const isVoided = data.status === "VOIDED";

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/restocks"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Detail Pengadaan
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.inventoryItem.name} ·{" "}
                {formatDateTime(data.createdAt)}
              </p>
            </div>
          </div>

          {!isVoided && data.canVoid && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setVoidError(null);
                setVoidOpen(true);
              }}
            >
              <Ban className="mr-2 size-4" />
              Void Restock
            </Button>
          )}
        </div>

        {/* Info Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="font-mono">
                {data.batch.batchCode}
              </Badge>
              <Badge variant="outline">
                {data.batch.sourceType.toLowerCase()}
              </Badge>
              {data.supplierName && (
                <Badge variant="secondary">{data.supplierName}</Badge>
              )}
              {isVoided ? (
                <Badge variant="destructive">VOIDED</Badge>
              ) : data.canVoid ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  Dapat di-void
                </Badge>
              ) : (
                <Badge variant="secondary">Sudah dikonsumsi</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Voided */}
        {isVoided && data.voidedAt && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-start gap-2">
              <Ban className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Restock telah di-void</p>
                <p className="mt-1 text-xs">
                  Di-void pada {formatDateTime(data.voidedAt)}. Stok
                  batch sudah dikosongkan dan tidak akan dipakai FIFO.
                  Riwayat tetap tersimpan untuk audit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Bahan</CardTitle>
              <CardDescription>
                Detail bahan yang diterima.
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
              <CardTitle className="text-base">Detail Transaksi</CardTitle>
              <CardDescription>
                Nilai dan kuantitas penerimaan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">
                    Quantity
                  </dt>
                  <dd className="text-sm font-medium">
                    {formatNumber(data.quantity)}{" "}
                    {data.inventoryItem.unit}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">
                    Unit Cost
                  </dt>
                  <dd className="text-sm">
                    {formatRupiah(data.unitCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <dt className="text-sm font-medium">Total</dt>
                  <dd className="text-lg font-bold">
                    {formatRupiah(data.totalCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">
                    Supplier
                  </dt>
                  <dd className="text-sm">
                    {data.supplierName ?? "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">
                    Tanggal
                  </dt>
                  <dd className="text-sm">
                    {formatDateTime(data.createdAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Batch status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Batch</CardTitle>
            <CardDescription>
              Sisa stok dari batch yang dibuat oleh restock ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  Quantity Awal
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(data.batch.quantity)}{" "}
                  {data.inventoryItem.unit}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Sisa Stok</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(data.batch.remainingQuantity)}{" "}
                  {data.inventoryItem.unit}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Terpakai</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(initialQty - remaining)}{" "}
                  {data.inventoryItem.unit}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Progress pemakaian
                </span>
                <span className="font-medium">
                  {consumedPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(consumedPct, 100)}%` }}
                />
              </div>
            </div>

            {!isVoided && !data.canVoid && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                Batch ini sudah dikonsumsi di produksi. Restock tidak
                dapat di-void untuk menjaga konsistensi HPP historis.
                Kalau ada kesalahan input, buat restock koreksi.
              </div>
            )}

            <div className="border-t pt-4">
              <Link
                href={`/inventory/batches/${data.batch.id}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                Lihat Detail Batch
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================= VOID DIALOG ================= */}
      <Dialog
        open={voidOpen}
        onOpenChange={(open) => {
          if (!open && !isVoiding) {
            setVoidOpen(false);
            setVoidError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Restock?</DialogTitle>
            <DialogDescription>
              Restock <strong>{data.inventoryItem.name}</strong> batch{" "}
              <strong>{data.batch.batchCode}</strong> akan di-void. Stok
              batch akan dikosongkan, tapi riwayat restock tetap
              tersimpan di tab Void.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">
                {formatNumber(data.quantity)} {data.inventoryItem.unit}
              </span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Total Biaya</span>
              <span className="font-medium">
                {formatRupiah(data.totalCost)}
              </span>
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
              onClick={() => setVoidOpen(false)}
              disabled={isVoiding}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleVoid()}
              disabled={isVoiding}
            >
              {isVoiding ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Ban className="mr-2 size-4" />
                  Void Restock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}