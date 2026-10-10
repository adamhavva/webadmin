"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bike,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  User,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type OrderStatus =
  | "PENDING"
  | "SEARCHING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "DELIVERING"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

type OrderDetail = {
  id: string;
  orderNumber: string;
  channel: "ONLINE" | "OFFLINE";
  status: OrderStatus;
  customer: { id: string | null; name: string; phone: string | null };
  barista: { id: string; name: string; phone: string | null } | null;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryNote: string | null;
  distanceKm: number | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes: string | null;
  }>;
  charges: Array<{
    id: string;
    settingKey: string;
    settingName: string;
    type: string;
    rateValue: number;
    amount: number;
  }>;
  subtotal: number;
  chargesTotal: number;
  paymentFeeAmount: number;
  deliveryFee: number;
  total: number;
  payment: {
    status: string;
    provider: string;
    channel: string;
    methodCode: string | null;
    methodName: string | null;
    methodGroup: string | null;
    feeAmount: number;
    paidAt: string | null;
  };
  statusHistory: Array<{
    id: string;
    status: string;
    note: string | null;
    actorRole: string | null;
    createdAt: string;
  }>;
  timing: {
    createdAt: string;
    assignedAt: string | null;
    acceptedAt: string | null;
    deliveringAt: string | null;
    arrivedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
  };
};

type DetailResponse = {
  success: boolean;
  data?: OrderDetail;
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Pending",
      className: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
    },
    SEARCHING: {
      label: "Cari Barista",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    ASSIGNED: {
      label: "Ditugaskan",
      className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    },
    ACCEPTED: {
      label: "Diterima",
      className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    },
    DELIVERING: {
      label: "Diantar",
      className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    },
    ARRIVED: {
      label: "Sampai",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    COMPLETED: {
      label: "Selesai",
      className: "bg-green-500/15 text-green-700 dark:text-green-400",
    },
    CANCELLED: {
      label: "Dibatalkan",
      className: "bg-red-500/15 text-red-700 dark:text-red-400",
    },
    FAILED: {
      label: "Gagal",
      className: "bg-destructive/15 text-destructive",
    },
  };
  const cfg = map[status] ?? { label: status, className: "" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

function canCancel(status: OrderStatus): boolean {
  return ["PENDING", "SEARCHING", "ASSIGNED", "ACCEPTED"].includes(status);
}

// ============================================================
// Skeleton / Error
// ============================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-lg border bg-muted/30 lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-lg border bg-muted/30" />
      </div>
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat order</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/orders"
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

export function OrderDetailView({ orderId }: { orderId: string }) {
  const router = useRouter();

  const [data, setData] = React.useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(
    null
  );

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat order.");
      }
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat order."
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCancelDialog() {
    setCancelReason("");
    setCancelError(null);
    setCancelOpen(true);
  }

  function closeCancelDialog() {
    if (isCancelling) return;
    setCancelOpen(false);
    setCancelReason("");
    setCancelError(null);
  }

  async function handleCancel() {
    if (!data || isCancelling) return;

    if (!cancelReason.trim()) {
      setCancelError("Alasan wajib diisi.");
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError(null);

      const res = await fetch(
        `/api/orders/${encodeURIComponent(data.id)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason.trim() }),
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal membatalkan order.");
      }

      setCancelOpen(false);
      await load();
      router.refresh();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Gagal membatalkan order."
      );
    } finally {
      setIsCancelling(false);
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
          message={error ?? "Order tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="font-mono text-xl font-semibold tracking-tight">
                {data.orderNumber}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.channel === "ONLINE"
                  ? "Order Online"
                  : "Order Offline"}{" "}
                · {fmtDateTime(data.timing.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(data.status)}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Refresh
            </Button>
            {canCancel(data.status) && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={openCancelDialog}
              >
                <Ban className="mr-2 size-3.5" />
                Batalkan
              </Button>
            )}
          </div>
        </div>

        {/* Cancel reason banner (kalau cancelled) */}
        {data.status === "CANCELLED" && data.timing.cancelReason && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <Ban className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Order dibatalkan</p>
              <p className="mt-1 text-xs">
                {data.timing.cancelReason} ·{" "}
                {fmtDateTime(data.timing.cancelledAt)}
              </p>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Nama</p>
                <p className="font-medium">{data.customer.name}</p>
              </div>
              {data.customer.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Telepon</p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" />
                    {data.customer.phone}
                  </p>
                </div>
              )}
              {data.deliveryAddress && (
                <div>
                  <p className="text-xs text-muted-foreground">Alamat</p>
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>{data.deliveryAddress}</span>
                  </p>
                </div>
              )}
              {data.deliveryNote && (
                <div>
                  <p className="text-xs text-muted-foreground">Catatan</p>
                  <p className="italic">{data.deliveryNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Barista */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bike className="size-4" />
                Barista
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.barista ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Nama</p>
                    <p className="font-medium">{data.barista.name}</p>
                  </div>
                  {data.barista.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Telepon
                      </p>
                      <p>{data.barista.phone}</p>
                    </div>
                  )}
                  {data.distanceKm !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Jarak ke customer
                      </p>
                      <p className="font-medium">
                        {data.distanceKm.toFixed(2)} km
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Belum ada barista yang ditugaskan.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="size-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  className={cn(
                    data.payment.status === "PAID"
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : ""
                  )}
                  variant={
                    data.payment.status === "PAID" ? "default" : "secondary"
                  }
                >
                  {data.payment.status === "PAID" ? (
                    <>
                      <CheckCircle2 className="mr-1 size-3" />
                      Lunas
                    </>
                  ) : (
                    "Belum Bayar"
                  )}
                </Badge>
              </div>
              {data.payment.methodName && (
                <div>
                  <p className="text-xs text-muted-foreground">Metode</p>
                  <p>{data.payment.methodName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Channel</p>
                <Badge variant="outline">
                  {data.payment.channel === "COD" ? "COD" : "Prepaid"}
                </Badge>
              </div>
              {data.payment.paidAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Dibayar</p>
                  <p className="text-xs">
                    {fmtDateTime(data.payment.paidAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item & Harga</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-6 py-3 text-left font-medium">
                      Produk
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Harga
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id} className="border-b last:border-b-0">
                      <td className="px-6 py-3">
                        <div className="font-medium">{it.productName}</div>
                        {it.notes && (
                          <div className="mt-0.5 text-xs italic text-muted-foreground">
                            {it.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {it.quantity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtRupiah(it.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {fmtRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Breakdown */}
            <div className="border-t p-6">
              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmtRupiah(data.subtotal)}</span>
                </div>

                {data.charges.map((c) => (
                  <div key={c.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {c.settingName}
                      {c.type === "PERCENTAGE" && ` (${c.rateValue}%)`}
                    </span>
                    <span>{fmtRupiah(c.amount)}</span>
                  </div>
                ))}

                {data.paymentFeeAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Biaya Payment
                    </span>
                    <span>{fmtRupiah(data.paymentFeeAmount)}</span>
                  </div>
                )}

                {data.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ongkir</span>
                    <span>{fmtRupiah(data.deliveryFee)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{fmtRupiah(data.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4" />
              Riwayat Status
            </CardTitle>
            <CardDescription>
              Timeline perubahan status order ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.statusHistory.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <div className="size-2 rounded-full bg-primary" />
                    </div>
                    {i < data.statusHistory.length - 1 && (
                      <div className="h-full w-px bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      {statusBadge(h.status)}
                      {h.actorRole && (
                        <Badge variant="outline" className="text-[10px]">
                          {h.actorRole}
                        </Badge>
                      )}
                    </div>
                    {h.note && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {h.note}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtDateTime(h.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================= CANCEL DIALOG ================= */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Order?</DialogTitle>
            <DialogDescription>
              Order{" "}
              <strong className="font-mono">{data.orderNumber}</strong> akan
              dibatalkan. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Order akan dihapus dari pool barista (kalau sudah
                  ditugaskan). Customer perlu order ulang.
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cancel-reason-detail">
                Alasan Pembatalan{" "}
                <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="cancel-reason-detail"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Customer minta batalkan, stok habis, dsb."
                disabled={isCancelling}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {cancelReason.length}/500 karakter
              </p>
            </div>
          </div>

          {cancelError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {cancelError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCancelDialog}
              disabled={isCancelling}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Membatalkan...
                </>
              ) : (
                <>
                  <Ban className="mr-2 size-4" />
                  Batalkan Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}