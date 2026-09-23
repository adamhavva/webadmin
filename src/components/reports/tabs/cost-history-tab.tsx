"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronsDown,
  ChevronsUp,
  Minus,
  RefreshCw,
  TrendingDown,
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

type CostRow = {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  hpp: number;
  delta: number | null;
  deltaPct: number | null;
  sellingPrice: number;
  profitPerUnit: number;
  margin: number | null;
  status: "first" | "up" | "down" | "same";
};

type ReportData = {
  items: CostRow[];
  summary: {
    totalEntries: number;
    uniqueProducts: number;
    avgHpp: number;
    upCount: number;
    downCount: number;
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

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDateTime(iso: string): string {
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

export function CostHistoryTab({
  data,
  isLoading,
  error,
  onRetry,
}: TabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Gagal memuat data</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{error}</p>
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
        <TrendingUp className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Belum ada riwayat HPP</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Riwayat HPP muncul setelah produksi dijalankan.
        </p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pencatatan
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.totalEntries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Produk Terpantau
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.uniqueProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Rata-rata HPP
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtRupiah(s.avgHpp)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              HPP Naik / Turun
            </CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-red-600 dark:text-red-400">
                {s.upCount}
              </span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-green-600 dark:text-green-400">
                {s.downCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-3 text-left font-medium">No</th>
              <th className="px-3 py-3 text-left font-medium">Tanggal</th>
              <th className="px-3 py-3 text-left font-medium">Produk</th>
              <th className="px-3 py-3 text-right font-medium">HPP</th>
              <th className="px-3 py-3 text-right font-medium">Delta</th>
              <th className="px-3 py-3 text-right font-medium">Delta %</th>
              <th className="px-3 py-3 text-right font-medium">Harga Jual</th>
              <th className="px-3 py-3 text-right font-medium">Profit/Unit</th>
              <th className="px-3 py-3 text-right font-medium">Margin</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r, i) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {fmtDateTime(r.createdAt)}
                </td>
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/inventory/products/${r.productId}`}
                    className="hover:underline"
                  >
                    {r.productName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {fmtRupiah(r.hpp)}
                </td>
                <td className="px-3 py-3 text-right">
                  {r.delta === null ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Minus className="size-3" /> —
                    </span>
                  ) : r.delta > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                      <ChevronsUp className="size-3" />+
                      {fmtRupiah(Math.abs(r.delta))}
                    </span>
                  ) : r.delta < 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <ChevronsDown className="size-3" />
                      {fmtRupiah(Math.abs(r.delta))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Minus className="size-3" /> Sama
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.deltaPct !== null ? `${r.deltaPct.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {fmtRupiah(r.sellingPrice)}
                </td>
                <td className="px-3 py-3 text-right">
                  {fmtRupiah(r.profitPerUnit)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right font-medium",
                    marginClass(r.margin)
                  )}
                >
                  {r.margin !== null ? `${r.margin.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-3">
                  {r.status === "first" ? (
                    <Badge variant="outline">Pertama</Badge>
                  ) : r.status === "up" ? (
                    <Badge className="bg-red-500/15 text-red-700 dark:text-red-400">
                      Naik
                    </Badge>
                  ) : r.status === "down" ? (
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                      Turun
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Sama</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}