"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Package,
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

type BatchRow = {
  id: string;
  batchCode: string;
  productId: string;
  productName: string;
  productionId: string;
  productionAt: string;
  quantity: number;
  remainingQuantity: number;
  consumed: number;
  consumedPct: number;
  unitCost: number;
  totalCost: number;
  remainingValue: number;
  status: "available" | "low" | "empty";
};

type ReportData = {
  items: BatchRow[];
  summary: {
    totalBatches: number;
    availableBatches: number;
    totalRemaining: number;
    totalValue: number;
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

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function statusBadge(status: BatchRow["status"]) {
  if (status === "empty") return <Badge variant="secondary">Habis</Badge>;
  if (status === "low") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Rendah
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
      Tersedia
    </Badge>
  );
}

// ============================================================
// Main
// ============================================================

export function BatchesTab({ data, isLoading, error, onRetry }: TabProps) {
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
        <Boxes className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Belum ada batch produk jadi</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Batch terbentuk otomatis saat produksi dijalankan.
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
              Total Batch
            </CardTitle>
            <Boxes className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.totalBatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Batch Tersedia
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.availableBatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Sisa Stok
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNum(s.totalRemaining)}</div>
            <p className="mt-1 text-xs text-muted-foreground">unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Nilai Sisa
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtRupiah(s.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-3 text-left font-medium">No</th>
              <th className="px-3 py-3 text-left font-medium">Batch Code</th>
              <th className="px-3 py-3 text-left font-medium">Produk</th>
              <th className="px-3 py-3 text-left font-medium">Tgl Produksi</th>
              <th className="px-3 py-3 text-right font-medium">Qty Awal</th>
              <th className="px-3 py-3 text-right font-medium">Sisa</th>
              <th className="px-3 py-3 text-right font-medium">Terpakai</th>
              <th className="px-3 py-3 text-right font-medium">% Terpakai</th>
              <th className="px-3 py-3 text-right font-medium">HPP/Unit</th>
              <th className="px-3 py-3 text-right font-medium">Total Cost</th>
              <th className="px-3 py-3 text-right font-medium">Nilai Sisa</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r, i) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3">
                  <Link
                    href={`/inventory/finished-products/${r.id}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {r.batchCode}
                  </Link>
                </td>
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/inventory/products/${r.productId}`}
                    className="hover:underline"
                  >
                    {r.productName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {fmtDateTime(r.productionAt)}
                </td>
                <td className="px-3 py-3 text-right">
                  {fmtNum(r.quantity)}
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  {fmtNum(r.remainingQuantity)}
                </td>
                <td className="px-3 py-3 text-right">
                  {fmtNum(r.consumed)}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.consumedPct.toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {fmtRupiah(r.unitCost)}
                </td>
                <td className="px-3 py-3 text-right">
                  {fmtRupiah(r.totalCost)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {fmtRupiah(r.remainingValue)}
                </td>
                <td className="px-3 py-3">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}