"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Factory, Package, RefreshCw, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================
// Types
// ============================================================

type ProductionRow = {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  batchCode: string | null;
  outputQuantity: number;
  componentCount: number;
  totalCost: number;
  unitCost: number;
  componentSummary: string;
};

type ReportData = {
  items: ProductionRow[];
  summary: {
    totalProductions: number;
    totalOutput: number;
    totalCost: number;
    avgHpp: number;
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

// ============================================================
// Main
// ============================================================

export function ProductionsTab({
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
        <Factory className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Belum ada produksi</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Mulai produksi untuk melihat laporan.
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
              Total Produksi
            </CardTitle>
            <Factory className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.totalProductions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Output
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNum(s.totalOutput)}</div>
            <p className="mt-1 text-xs text-muted-foreground">unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Biaya
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtRupiah(s.totalCost)}</div>
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
            <p className="mt-1 text-xs text-muted-foreground">per unit</p>
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
              <th className="px-3 py-3 text-left font-medium">Batch Code</th>
              <th className="px-3 py-3 text-right font-medium">Output</th>
              <th className="px-3 py-3 text-right font-medium">Komponen</th>
              <th className="px-3 py-3 text-right font-medium">Total Biaya</th>
              <th className="px-3 py-3 text-right font-medium">HPP/Unit</th>
              <th className="px-3 py-3 text-left font-medium">Komponen Detail</th>
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
                <td className="px-3 py-3">
                  <Link
                    href={`/inventory/productions/${r.id}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {r.batchCode ?? "—"}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  {fmtNum(r.outputQuantity)}
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.componentCount}
                </td>
                <td className="px-3 py-3 text-right">
                  {fmtRupiah(r.totalCost)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {fmtRupiah(r.unitCost)}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {r.componentSummary || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}