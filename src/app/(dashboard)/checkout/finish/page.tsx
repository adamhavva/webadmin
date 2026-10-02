"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  Package,
  RefreshCw,
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

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethodName: string | null;
  total: number;
  customerName: string;
  paidAt: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
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

// ============================================================
// Result States
// ============================================================

function LoadingState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">Memuat...</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mengambil status pembayaran Anda
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">Terjadi Kesalahan</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {message}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link href="/">
          <Button>
            <Home className="mr-2 size-4" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface SuccessContentProps {
  order: OrderSummary;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function SuccessContent({ order, onRefresh, isRefreshing }: SuccessContentProps) {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
          Pembayaran Berhasil!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Terima kasih! Pesanan Anda sedang diproses.
        </p>
      </div>

      {/* Order Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-5" />
            Detail Pesanan
          </CardTitle>
          <CardDescription>
            Simpan nomor pesanan ini untuk referensi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nomor Pesanan</p>
              <p className="font-mono font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nama Customer</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Metode Pembayaran</p>
              <p className="font-medium">{order.paymentMethodName || "Midtrans Snap"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status Pembayaran</p>
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 mt-1">
                <CheckCircle2 className="mr-1 size-3" />
                Lunas
              </Badge>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pembayaran</span>
              <span className="text-xl font-bold">{fmtRupiah(order.total)}</span>
            </div>
          </div>

          {order.paidAt && (
            <p className="text-xs text-muted-foreground text-center">
              Dibayar pada {fmtDateTime(order.paidAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Order Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-5" />
            Status Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status Saat Ini</p>
              <div className="mt-1">
                <StatusBadge status={order.status} />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Refresh
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Pesanan Anda sedang dalam antrean dan akan segera diproses oleh barista.
            Anda bisa melihat detail pesanan di halaman{" "}
            <Link href="/orders" className="text-primary hover:underline">
              Daftar Order
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline" className="w-full sm:w-auto">
            Lihat Detail Pesanan
          </Button>
        </Link>
        <Link href="/">
          <Button className="w-full sm:w-auto">
            <Home className="mr-2 size-4" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface PendingContentProps {
  order: OrderSummary;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function PendingContent({ order, onRefresh, isRefreshing }: PendingContentProps) {
  return (
    <div className="space-y-6">
      {/* Pending Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="size-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          Pembayaran Sedang Diproses
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mohon tunggu beberapa saat dan refresh untuk mengecek status pembayaran.
        </p>
      </div>

      {/* Order Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-5" />
            Detail Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nomor Pesanan</p>
              <p className="font-mono font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pembayaran</p>
              <p className="font-bold">{fmtRupiah(order.total)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Status Pembayaran
            </span>
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Clock className="mr-1 size-3" />
              {order.paymentStatus === "PENDING" ? "Menunggu" : order.paymentStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Memuat...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              Refresh Status
            </>
          )}
        </Button>
        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">
            <Home className="mr-2 size-4" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Jika pembayaran sudah selesai, tekan tombol Refresh Status di atas.
      </p>
    </div>
  );
}

interface FailedContentProps {
  order: OrderSummary;
  message?: string;
}

function FailedContent({ order, message }: FailedContentProps) {
  return (
    <div className="space-y-6">
      {/* Failed Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-destructive">
          Pembayaran Gagal
        </h1>
        <p className="mt-2 text-muted-foreground">
          {message || "Pembayaran tidak berhasil. Silakan coba lagi."}
        </p>
      </div>

      {/* Order Info Card */}
      {order && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-5" />
              Detail Pesanan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Nomor Pesanan</p>
                <p className="font-mono font-semibold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pembayaran</p>
                <p className="font-bold">{fmtRupiah(order.total)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3">
              <span className="text-sm text-destructive">
                Status Pembayaran
              </span>
              <Badge className="bg-destructive/15 text-destructive">
                <XCircle className="mr-1 size-3" />
                {order.paymentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Button>
        </Link>
        <Link href="/">
          <Button className="w-full sm:w-auto">
            <RefreshCw className="mr-2 size-4" />
            Coba Lagi
          </Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pesanan yang gagal akan secara otomatis dibatalkan setelah batas waktu habis.
      </p>
    </div>
  );
}

// ============================================================
// Status Badge Component
// ============================================================

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Menunggu Pembayaran",
      className: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
    },
    SEARCHING: {
      label: "Mencari Barista",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    ASSIGNED: {
      label: "Barista Ditugaskan",
      className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    },
    ACCEPTED: {
      label: "Barista Menerima",
      className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    },
    DELIVERING: {
      label: "Sedang Diantar",
      className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    },
    ARRIVED: {
      label: "Sudah Sampai",
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
  return <Badge className={cn(cfg.className, "text-sm")}>{cfg.label}</Badge>;
}

// ============================================================
// Main Component
// ============================================================

function CheckoutFinishContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("order_id");
  const statusParam = searchParams.get("status");
  const orderStatusParam = searchParams.get("order_status");

  const [order, setOrder] = React.useState<OrderSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Fetch order from API
  const fetchOrder = React.useCallback(async () => {
    if (!orderId) {
      setError("Parameter order_id tidak ditemukan di URL.");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/payment?orderId=${encodeURIComponent(orderId)}`, {
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as ApiResponse<OrderSummary>;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal mengambil data pesanan.");
      }

      setOrder(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  // Initial fetch
  React.useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  // Refresh handler
  function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    void fetchOrder().finally(() => setIsRefreshing(false));
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <LoadingState />
      </div>
    );
  }

  // Handle error state
  if (error && !order) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <ErrorState message={error} onRetry={handleRefresh} />
      </div>
    );
  }

  // Handle no order_id
  if (!orderId) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <ErrorState
          message="Parameter order_id tidak ditemukan di URL. Pastikan Anda mengakses halaman ini dari Midtrans."
          onRetry={() => router.push("/")}
        />
      </div>
    );
  }

  // Determine result based on Midtrans status param or payment status
  const paymentStatus = order?.paymentStatus ?? (statusParam as PaymentStatus | null);
  const orderStatus = order?.status ?? (orderStatusParam as OrderStatus | null);

  // Check for explicit failure status from Midtrans
  const isFailed =
    statusParam === "fail" ||
    statusParam === "deny" ||
    statusParam === "expire" ||
    paymentStatus === "FAILED" ||
    paymentStatus === "EXPIRED";

  const isPending =
    statusParam === "pending" ||
    paymentStatus === "PENDING" ||
    (!order?.paymentStatus && statusParam === null);

  const isSuccess =
    statusParam === "success" ||
    paymentStatus === "PAID" ||
    (orderStatus && ["SEARCHING", "ASSIGNED", "ACCEPTED", "DELIVERING", "ARRIVED", "COMPLETED"].includes(orderStatus));

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Konfirmasi Pembayaran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hasil pembayaran dari Midtrans Snap
        </p>
      </div>

      <div className="space-y-6">
        {isSuccess && order && (
          <SuccessContent
            order={order}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}

        {isPending && order && (
          <PendingContent
            order={order}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}

        {isFailed && (
          <FailedContent
            order={order!}
            message={
              statusParam === "expire"
                ? "Waktu pembayaran telah habis."
                : statusParam === "deny"
                  ? "Pembayaran ditolak."
                  : "Pembayaran tidak berhasil."
            }
          />
        )}

        {/* Fallback if no clear status */}
        {!isSuccess && !isPending && !isFailed && order && (
          <SuccessContent
            order={order}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Suspense Wrapper
// ============================================================

export default function CheckoutFinishPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Memuat...</p>
          </div>
        </div>
      }
    >
      <CheckoutFinishContent />
    </Suspense>
  );
}
