"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Coffee,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type MasterRow = {
  id: string;
  name: string;
  isActive: boolean;
  sellingPrice: number;
  hppLatest: number | null;
  hppAvg: number | null;
  hppMin: number | null;
  hppMax: number | null;
  marginLatest: number | null;
  marginAvg: number | null;
  stockFinished: number;
  batchActive: number;
  batchTotal: number;
  productionCount: number;
  productionTotalOutput: number;
  productionTotalCost: number;
  totalValueStock: number;
  totalValueProduction: number;
  lastProductionAt: string | null;
};

type ReportData = {
  items: MasterRow[];
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalStockValue: number;
    totalProductionValue: number;
    rugiCount: number;
  };
};

type TabProps = {
  data: ReportData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

// ============================================================
// Helpers
// ============================================================

function fmtNum(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
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

function marginClass(n: number | null): string {
  if (n === null) return "text-muted-foreground";
  return n >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

// ============================================================
// Main
// ============================================================

export function MasterProductsTab({
  data,
  isLoading,
  error,
  onRetry,
}: TabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded bg-muted"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Gagal memuat data</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {error}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="mr-2 size-3.5" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <Coffee className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Belum ada produk</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Tambahkan produk terlebih dahulu untuk melihat laporan.
        </p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Produk
            </CardTitle>
            <Coffee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.totalProducts}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.activeProducts} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Nilai Stok
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtRupiah(s.totalStockValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Nilai Produksi
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtRupiah(s.totalProductionValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Produk Rugi
            </CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                s.rugiCount > 0 && "text-red-600 dark:text-red-400"
              )}
            >
              {s.rugiCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              margin &lt; 0%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1500px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-3 text-left font-medium">No</th>
              <th className="px-3 py-3 text-left font-medium">Produk</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Harga Jual</th>
              <th className="px-3 py-3 text-right font-medium">HPP Terakhir</th>
              <th className="px-3 py-3 text-right font-medium">HPP Avg</th>
              <th className="px-3 py-3 text-right font-medium">HPP Min</th>
              <th className="px-3 py-3 text-right font-medium">HPP Max</th>
              <th className="px-3 py-3 text-right font-medium">Margin Terakhir</th>
              <th className="px-3 py-3 text-right font-medium">Margin Avg</th>
              <th className="px-3 py-3 text-right font-medium">Stok Jadi</th>
              <th className="px-3 py-3 text-right font-medium">Batch</th>
              <th className="px-3 py-3 text-right font-medium">Total Produksi</th>
              <th className="px-3 py-3 text-right font-medium">Total Output</th>
              <th className="px-3 py-3 text-right font-medium">Nilai Stok</th>
              <th className="px-3 py-3 text-right font-medium">Nilai Produksi</th>
              <th className="px-3 py-3 text-left font-medium">Produksi Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r, i) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/inventory/products/${r.id}`}
                    className="hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  {r.isActive ? (
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {fmtRupiah(r.sellingPrice)}
                </td>
                <td className="px-3 py-3 text-right">
                  {r.hppLatest !== null ? fmtRupiah(r.hppLatest) : "—"}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.hppAvg !== null ? fmtRupiah(r.hppAvg) : "—"}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.hppMin !== null ? fmtRupiah(r.hppMin) : "—"}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.hppMax !== null ? fmtRupiah(r.hppMax) : "—"}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right font-medium",
                    marginClass(r.marginLatest)
                  )}
                >
                  {fmtPct(r.marginLatest)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right",
                    marginClass(r.marginAvg)
                  )}
                >
                  {fmtPct(r.marginAvg)}
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  {fmtNum(r.stockFinished)}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.batchActive} / {r.batchTotal}
                </td>
                <td className="px-3 py-3 text-right">{r.productionCount}</td>
                <td className="px-3 py-3 text-right font-medium">
                  {fmtNum(r.productionTotalOutput)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {fmtRupiah(r.totalValueStock)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {fmtRupiah(r.totalValueProduction)}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {fmtDateTime(r.lastProductionAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}