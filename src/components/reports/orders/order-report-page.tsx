"use client";

import * as React from "react";
import {
  AlertTriangle,
  Banknote,
  Bike,
  Clock,
  Download,
  Loader2,
  MapPin,
  Package,
  Percent,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderReportFilter, type OrderReportFilterValue } from "./order-report-filter";
import { exportOrderReport } from "./order-report-export";
import { cn } from "@/lib/utils";

import type {
  OrderReportRow,
  OrderReportSummary,
  BreakdownPayment,
  BreakdownProduct,
  BreakdownBarista,
  BreakdownChannel,
} from "@/modules/report/order-report.service";

// ============================================================
// Types
// ============================================================

type ReportResponse = {
  success: boolean;
  data?: {
    items: OrderReportRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    summary: OrderReportSummary;
    breakdown: {
      byPayment: BreakdownPayment[];
      byProduct: BreakdownProduct[];
      byBarista: BreakdownBarista[];
      byChannel: BreakdownChannel[];
    };
  };
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

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "bg-green-500/15 text-green-700 dark:text-green-400",
    CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-400",
    PENDING: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
    SEARCHING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    ASSIGNED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    ACCEPTED: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    DELIVERING: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    ARRIVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    FAILED: "bg-destructive/15 text-destructive",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}

function marginClass(n: number | null): string {
  if (n === null) return "text-muted-foreground";
  return n >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

// ============================================================
// Main
// ============================================================

export function OrderReportPage() {
  const [filter, setFilter] = React.useState<OrderReportFilterValue>({
    status: "all",
    channel: "all",
    paymentMethodCode: "",
    baristaId: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filter.search), 400);
    return () => window.clearTimeout(t);
  }, [filter.search]);

  const [data, setData] = React.useState<ReportResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [baristas, setBaristas] = React.useState<
    Array<{ value: string; label: string }>
  >([]);

  // Load filter options
  React.useEffect(() => {
    Promise.all([
      fetch("/api/settings/payment-methods?isActive=true", {
        headers: { Accept: "application/json" },
      }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/users?role=BARISTA&limit=100", {
        headers: { Accept: "application/json" },
      }).then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([pm, us]) => {
      if (pm.success && pm.data) {
        setPaymentMethods(
          (pm.data.items ?? []).map((p: any) => ({
            value: p.code,
            label: p.name,
          }))
        );
      }
      if (us.success && us.data) {
        setBaristas(
          (us.data.items ?? []).map((u: any) => ({
            value: u.id,
            label: u.name,
          }))
        );
      }
    });
  }, []);

  const fetchData = React.useCallback(
    async (options?: { showLoading?: boolean; showRefreshing?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        if (filter.status !== "all") params.set("status", filter.status);
        if (filter.channel !== "all") params.set("channel", filter.channel);
        if (filter.paymentMethodCode)
          params.set("paymentMethodCode", filter.paymentMethodCode);
        if (filter.baristaId) params.set("baristaId", filter.baristaId);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
        if (filter.dateTo) params.set("dateTo", filter.dateTo);
        params.set("limit", "50");

        const res = await fetch(`/api/reports/orders?${params}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const json = (await res.json()) as ReportResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat laporan.");
        }

        setData(json.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat laporan."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [filter, debouncedSearch]
  );

  React.useEffect(() => {
    if (!filter.dateFrom && !filter.dateTo) return;
    void fetchData({ showLoading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  React.useEffect(() => {
    if (!filter.dateFrom && !filter.dateTo) return;
    void fetchData({ showLoading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter.status,
    filter.channel,
    filter.paymentMethodCode,
    filter.baristaId,
    filter.dateFrom,
    filter.dateTo,
  ]);

  async function handleExport() {
    if (!data) return;
    try {
      await exportOrderReport(data.items, data.summary, data.breakdown, {
        filterLabel: {
          status:
            filter.status === "all"
              ? "Semua Status"
              : filter.status,
          channel:
            filter.channel === "all"
              ? "Semua Channel"
              : filter.channel,
          payment:
            filter.paymentMethodCode || "Semua Method",
          period:
            filter.dateFrom && filter.dateTo
              ? `${filter.dateFrom} — ${filter.dateTo}`
              : "Semua Periode",
        },
      });
    } catch (err) {
      console.error("Export gagal:", err);
    }
  }

  const s = data?.summary;
  const b = data?.breakdown;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Laporan Order
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Laporan lengkap transaksi order — revenue, modal, profit, dan
            breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchData({ showRefreshing: true })}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              className={cn("mr-2 size-4", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={!data || isLoading}
          >
            <Download className="mr-2 size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter */}
      <OrderReportFilter
        value={filter}
        onChange={setFilter}
        paymentMethods={paymentMethods}
        baristas={baristas}
        disabled={isLoading}
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : s && b ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmtRupiah(s.totalRevenue)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  dari {fmtNumber(s.totalTrx)} transaksi paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Modal
                </CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {fmtRupiah(s.totalModal)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  HPP × qty terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Gross Profit
                </CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {fmtRupiah(s.grossProfit)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Revenue − Modal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-500">
                  {fmtRupiah(s.netProfit)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gross − Fee Barista
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Qty Terjual
                </CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmtNumber(s.totalQty)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Avg Order Value
                </CardTitle>
                <Banknote className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmtRupiah(s.avgOrderValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Avg Margin
                </CardTitle>
                <Percent className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    marginClass(s.avgMargin)
                  )}
                >
                  {s.avgMargin !== null
                    ? `${s.avgMargin.toFixed(1)}%`
                    : "—"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Cancelled
                </CardTitle>
                <TrendingDown className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    s.totalCancelled > 0 && "text-red-600 dark:text-red-400"
                  )}
                >
                  {fmtNumber(s.totalCancelled)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Jarak Pengantaran
                </CardTitle>
                <MapPin className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {s.totalJarakKm.toFixed(2)} km
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Avg Durasi Pengantaran
                </CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {s.avgDurasiMinutes.toFixed(1)} menit
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* By Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="size-4" />
                  By Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left font-medium">Method</th>
                      <th className="px-4 py-2 text-right font-medium">Trx</th>
                      <th className="px-4 py-2 text-right font-medium">Revenue</th>
                      <th className="px-4 py-2 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.byPayment.map((p) => (
                      <tr key={p.methodCode} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-medium">{p.methodName}</td>
                        <td className="px-4 py-2 text-right">{p.count}</td>
                        <td className="px-4 py-2 text-right">{fmtRupiah(p.revenue)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                          {fmtRupiah(p.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* By Channel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4" />
                  By Channel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {b.byChannel.map((c) => (
                  <div key={c.channel}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {c.channel === "ONLINE" ? "🌐 Online" : "🏪 Offline"}
                      </span>
                      <span>{c.count} trx</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {fmtRupiah(c.revenue)}
                      </span>
                      <span className="text-xs font-medium">
                        {c.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(c.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Barista */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bike className="size-4" />
                  Top Barista
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Barista</th>
                        <th className="px-4 py-2 text-right font-medium">Trx</th>
                        <th className="px-4 py-2 text-right font-medium">Revenue</th>
                        <th className="px-4 py-2 text-right font-medium">Profit</th>
                        <th className="px-4 py-2 text-right font-medium">Avg Jarak</th>
                        <th className="px-4 py-2 text-right font-medium">Avg Durasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.byBarista.map((x, i) => (
                        <tr key={x.baristaId} className="border-b last:border-b-0">
                          <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2 font-medium">{x.baristaName}</td>
                          <td className="px-4 py-2 text-right">{x.trx}</td>
                          <td className="px-4 py-2 text-right">{fmtRupiah(x.revenue)}</td>
                          <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                            {fmtRupiah(x.profit)}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {x.avgJarakKm !== null
                              ? `${x.avgJarakKm.toFixed(2)} km`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {x.avgDurasiMinutes !== null
                              ? `${x.avgDurasiMinutes.toFixed(1)} mnt`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* By Product */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="size-4" />
                  By Product (Top 20)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Produk</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 text-right font-medium">Revenue</th>
                        <th className="px-4 py-2 text-right font-medium">Modal</th>
                        <th className="px-4 py-2 text-right font-medium">Profit</th>
                        <th className="px-4 py-2 text-right font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.byProduct.map((p, i) => (
                        <tr key={p.productId} className="border-b last:border-b-0">
                          <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2 font-medium">{p.productName}</td>
                          <td className="px-4 py-2 text-right">{p.qty}</td>
                          <td className="px-4 py-2 text-right">{fmtRupiah(p.revenue)}</td>
                          <td className="px-4 py-2 text-right text-amber-600 dark:text-amber-400">
                            {fmtRupiah(p.modal)}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                            {fmtRupiah(p.profit)}
                          </td>
                          <td className={cn("px-4 py-2 text-right font-medium", marginClass(p.margin))}>
                            {p.margin !== null ? `${p.margin.toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detail Transaksi</CardTitle>
              <CardDescription>
                {data.pagination.total} order total · {data.pagination.totalPages} halaman
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1800px] text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium">Order #</th>
                      <th className="px-3 py-2 text-left font-medium">Tanggal</th>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      <th className="px-3 py-2 text-left font-medium">Barista</th>
                      <th className="px-3 py-2 text-left font-medium">Produk</th>
                      <th className="px-3 py-2 text-right font-medium">Jarak</th>
                      <th className="px-3 py-2 text-right font-medium">Durasi</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-3 py-2 text-right font-medium">Tax</th>
                      <th className="px-3 py-2 text-right font-medium">Fee B.</th>
                      <th className="px-3 py-2 text-right font-medium">Fee P.</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Modal</th>
                      <th className="px-3 py-2 text-right font-medium">Profit</th>
                      <th className="px-3 py-2 text-right font-medium">Margin</th>
                      <th className="px-3 py-2 text-left font-medium">Method</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono">{r.orderNumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{fmtDateTime(r.createdAt)}</td>
                        <td className="px-3 py-2 font-medium">{r.customerName}</td>
                        <td className="px-3 py-2">{r.baristaName ?? "—"}</td>
                        <td className="px-3 py-2 max-w-xs truncate" title={r.productDetail}>
                          {r.productDetail}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.distanceKm !== null ? `${r.distanceKm.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.durationMinutes !== null ? `${r.durationMinutes}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">{fmtRupiah(r.subtotal)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{fmtRupiah(r.taxAmount)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{fmtRupiah(r.feeBaristaAmount)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{fmtRupiah(r.feePaymentAmount)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtRupiah(r.total)}</td>
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                          {fmtRupiah(r.modal)}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-semibold", marginClass(r.grossProfit))}>
                          {fmtRupiah(r.grossProfit)}
                        </td>
                        <td className={cn("px-3 py-2 text-right", marginClass(r.margin))}>
                          {r.margin !== null ? `${r.margin.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.paymentMethodName ?? "—"}
                        </td>
                        <td className="px-3 py-2">{statusBadge(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}