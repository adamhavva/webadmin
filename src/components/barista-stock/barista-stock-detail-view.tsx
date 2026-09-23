"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  History,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Undo2,
  User,
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

type BaristaStockProduct = {
  productId: string;
  productName: string;
  productIsActive: boolean;
  sellingPrice: number;
  quantity: number;
  minThreshold: number;
  isLow: boolean;
  lastRestockAt: string | null;
};

type BaristaStockDetail = {
  baristaId: string;
  baristaName: string;
  baristaPhone: string | null;
  baristaStatus: "ACTIVE" | "INACTIVE";
  totalItems: number;
  productCount: number;
  lowStockCount: number;
  products: BaristaStockProduct[];
};

type DetailResponse = {
  success: boolean;
  data?: BaristaStockDetail;
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

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
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
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
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
          href="/barista-stock"
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

export function BaristaStockDetailView({
  baristaId,
}: {
  baristaId: string;
}) {
  const router = useRouter();

  const [data, setData] = React.useState<BaristaStockDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Adjust dialog
  const [adjustTarget, setAdjustTarget] =
    React.useState<BaristaStockProduct | null>(null);
  const [adjustQty, setAdjustQty] = React.useState("");
  const [adjustNote, setAdjustNote] = React.useState("");
  const [isAdjusting, setIsAdjusting] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);

  // Return dialog
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [returnRows, setReturnRows] = React.useState<
    Array<{ productId: string; productName: string; maxQty: number; qty: string }>
  >([]);
  const [returnNote, setReturnNote] = React.useState("");
  const [isReturning, setIsReturning] = React.useState(false);
  const [returnError, setReturnError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/barista-stock/${encodeURIComponent(baristaId)}`,
        {
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
  }, [baristaId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ---------- Adjust ----------
  function openAdjustDialog(p: BaristaStockProduct) {
    setAdjustTarget(p);
    setAdjustQty(String(p.quantity));
    setAdjustNote("");
    setAdjustError(null);
  }

  function closeAdjustDialog() {
    if (isAdjusting) return;
    setAdjustTarget(null);
    setAdjustQty("");
    setAdjustNote("");
    setAdjustError(null);
  }

  async function handleAdjust() {
    if (!adjustTarget || !data || isAdjusting) return;

    const digits = adjustQty.replace(/\D/g, "");
    const newQty = Number(digits);

    if (digits === "" || isNaN(newQty)) {
      setAdjustError("Quantity wajib diisi.");
      return;
    }
    if (newQty < 0) {
      setAdjustError("Quantity tidak boleh negatif.");
      return;
    }

    try {
      setIsAdjusting(true);
      setAdjustError(null);
      const res = await fetch("/api/barista-stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baristaId: data.baristaId,
          productId: adjustTarget.productId,
          newQuantity: newQty,
          note: adjustNote.trim() || undefined,
        }),
      });
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal adjust.");
      }
      setAdjustTarget(null);
      await load();
      router.refresh();
    } catch (err) {
      setAdjustError(
        err instanceof Error ? err.message : "Gagal adjust."
      );
    } finally {
      setIsAdjusting(false);
    }
  }

  // ---------- Return ----------
  function openReturnDialog() {
    if (!data) return;
    const rows = data.products
      .filter((p) => p.quantity > 0)
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        maxQty: p.quantity,
        qty: "",
      }));
    if (rows.length === 0) return;
    setReturnRows(rows);
    setReturnNote("");
    setReturnError(null);
    setReturnOpen(true);
  }

  function closeReturnDialog() {
    if (isReturning) return;
    setReturnOpen(false);
    setReturnRows([]);
    setReturnNote("");
    setReturnError(null);
  }

  async function handleReturn() {
    if (!data || isReturning) return;

    const items = returnRows
      .map((r) => ({
        productId: r.productId,
        quantity: Number(r.qty.replace(/\D/g, "")),
      }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      setReturnError("Isi minimal 1 quantity.");
      return;
    }

    for (let i = 0; i < returnRows.length; i++) {
      const r = returnRows[i];
      const q = Number(r.qty.replace(/\D/g, ""));
      if (q > r.maxQty) {
        setReturnError(
          `${r.productName}: quantity melebihi yang dimiliki (${r.maxQty}).`
        );
        return;
      }
    }

    try {
      setIsReturning(true);
      setReturnError(null);
      const res = await fetch("/api/barista-stock/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baristaId: data.baristaId,
          items,
          note: returnNote.trim() || undefined,
        }),
      });
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal return.");
      }
      setReturnOpen(false);
      await load();
      router.refresh();
    } catch (err) {
      setReturnError(
        err instanceof Error ? err.message : "Gagal return."
      );
    } finally {
      setIsReturning(false);
    }
  }

  // ---------- Render ----------
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
          message={error ?? "Barista tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const hasStock = data.products.some((p) => p.quantity > 0);

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/barista-stock"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {data.baristaName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Detail stok yang dibawa barista.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/barista-stock/restock"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 size-4" />
              Restock
            </Link>
            {hasStock && (
              <Button
                type="button"
                variant="outline"
                onClick={openReturnDialog}
              >
                <Undo2 className="mr-2 size-4" />
                Return ke Pusat
              </Button>
            )}
          </div>
        </div>

        {/* Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">
                <User className="mr-1 size-3" />
                {data.baristaName}
              </Badge>
              {data.baristaPhone && (
                <Badge variant="secondary">{data.baristaPhone}</Badge>
              )}
              {data.baristaStatus === "ACTIVE" ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary">Nonaktif</Badge>
              )}
              {data.lowStockCount > 0 && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mr-1 size-3" />
                  {data.lowStockCount} produk menipis
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Item
              </CardTitle>
              <Package className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.totalItems)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                unit di gerobak
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Jenis Produk
              </CardTitle>
              <Package className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.productCount)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                produk
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Stok Menipis
              </CardTitle>
              <AlertTriangle className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  data.lowStockCount > 0 &&
                    "text-amber-600 dark:text-amber-400"
                )}
              >
                {formatNumber(data.lowStockCount)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                produk di bawah minimum
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="size-4" />
                  Daftar Produk
                </CardTitle>
                <CardDescription>
                  Stok yang dibawa barista saat ini.
                </CardDescription>
              </div>
              <Link
                href={`/barista-stock/movements?baristaId=${data.baristaId}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                <History className="mr-2 size-3.5" />
                Riwayat
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Package className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  Belum ada stok
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Barista perlu restock dari pusat.
                </p>
                <Link
                  href="/barista-stock/restock"
                  className={cn(buttonVariants(), "mt-4")}
                >
                  <Plus className="mr-2 size-4" />
                  Restock Sekarang
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Harga Jual
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Min. Threshold
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Restock Terakhir
                      </th>
                      <th className="w-16 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p) => (
                      <tr
                        key={p.productId}
                        className={cn(
                          "border-b last:border-b-0 hover:bg-muted/30",
                          p.isLow && "bg-amber-500/5"
                        )}
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/inventory/products/${p.productId}`}
                            className="font-medium hover:underline"
                          >
                            {p.productName}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">
                          {formatRupiah(p.sellingPrice)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-4 text-right font-semibold",
                            p.isLow && "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {formatNumber(p.quantity)}
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">
                          {formatNumber(p.minThreshold)}
                        </td>
                        <td className="px-4 py-4">
                          {p.isLow ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="mr-1 size-3" />
                              Menipis
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                              Normal
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {formatDateTime(p.lastRestockAt)}
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustDialog(p)}
                          >
                            <Pencil className="mr-1.5 size-3.5" />
                            Koreksi
                          </Button>
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

      {/* ================= ADJUST DIALOG ================= */}
      <Dialog
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeAdjustDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koreksi Stok?</DialogTitle>
            <DialogDescription>
              Ubah quantity stok{" "}
              <strong>{adjustTarget?.productName}</strong> untuk{" "}
              <strong>{data.baristaName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity Saat Ini</span>
                <span className="font-medium">
                  {adjustTarget ? formatNumber(adjustTarget.quantity) : "-"}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adjust-qty">
                Quantity Baru <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adjust-qty"
                type="text"
                inputMode="numeric"
                value={adjustQty}
                onChange={(e) =>
                  setAdjustQty(e.target.value.replace(/\D/g, "").slice(0, 8))
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
                disabled={isAdjusting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adjust-note">
                Catatan{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <textarea
                id="adjust-note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Contoh: Stock opname, koreksi tumpah, dsb."
                disabled={isAdjusting}
                maxLength={500}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Koreksi manual akan tercatat di log pergerakan. Gunakan
                  dengan hati-hati.
                </span>
              </div>
            </div>
          </div>

          {adjustError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {adjustError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeAdjustDialog}
              disabled={isAdjusting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleAdjust()}
              disabled={isAdjusting}
            >
              {isAdjusting ? (
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

      {/* ================= RETURN DIALOG ================= */}
      <Dialog
        open={returnOpen}
        onOpenChange={(open) => {
          if (!open) closeReturnDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Stok ke Pusat</DialogTitle>
            <DialogDescription>
              Kembalikan stok yang tidak terjual ke pusat. Stok akan
              dikembalikan ke FinishedProductBatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
              {returnRows.map((r, index) => (
                <div
                  key={r.productId}
                  className="flex items-center gap-3 rounded-md bg-muted/40 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dimiliki: {formatNumber(r.maxQty)}
                    </p>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={r.qty}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setReturnRows((prev) =>
                        prev.map((x, i) =>
                          i === index ? { ...x, qty: v } : x
                        )
                      );
                    }}
                    placeholder="0"
                    disabled={isReturning}
                    className="w-24"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="return-note">
                Catatan{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <textarea
                id="return-note"
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="Contoh: Sisa sore, tidak terjual"
                disabled={isReturning}
                maxLength={500}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {returnError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {returnError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeReturnDialog}
              disabled={isReturning}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleReturn()}
              disabled={isReturning}
            >
              {isReturning ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Undo2 className="mr-2 size-4" />
                  Return
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}