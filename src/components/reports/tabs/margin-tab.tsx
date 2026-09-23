"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Coffee,
  RefreshCw,
  TrendingDown,
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

type MarginRow = {
  productId: string;
  productName: string;
  isActive: boolean;
  sellingPrice: number;
  hppLatest: number | null;
  profitPerUnit: number | null;
  margin: number | null;
  category: "sehat" | "sedang" | "rendah" | "rugi" | "unknown";
  recommendedPrice: number | null;
};

type ReportData = {
  items: MarginRow[];
  summary: {
    totalProducts: number;
    sehat: number;
    sedang: number;
    rendah: number;
    rugi: number;
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

function categoryBadge(cat: MarginRow["category"]) {
  if (cat === "sehat")
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
        Sehat
      </Badge>
    );
  if (cat === "sedang")
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Sedang
      </Badge>
    );
  if (cat === "rendah")
    return (
      <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400">
        Rendah
      </Badge>
    );
  if (cat === "rugi") return <Badge variant="destructive">Rugi</Badge>;
  return <Badge variant="secondary">—</Badge>;
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

export function MarginTab({ data, isLoading, error, onRetry }: TabProps) {
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
        <Coffee className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Belum ada produk</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Produk Sehat (≥ 50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {s.sehat}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sedang (25–50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {s.sedang}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Rendah (0–25%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {s.rendah}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Rugi (&lt; 0%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {s.rugi}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-3 text-left font-medium">No</th>
              <th className="px-3 py-3 text-left font-medium">Produk</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Harga Jual</th>
              <th className="px-3 py-3 text-right font-medium">HPP Terakhir</th>
              <th className="px-3 py-3 text-right font-medium">Profit/Unit</th>
              <th className="px-3 py-3 text-right font-medium">Margin</th>
              <th className="px-3 py-3 text-left font-medium">Kategori</th>
              <th className="px-3 py-3 text-right font-medium">
                Rekomendasi Harga
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r, i) => (
              <tr key={r.productId} className="border-b last:border-b-0">
                <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/inventory/products/${r.productId}`}
                    className="hover:underline"
                  >
                    {r.productName}
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
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {r.hppLatest !== null ? fmtRupiah(r.hppLatest) : "—"}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right",
                    marginClass(r.profitPerUnit)
                  )}
                >
                  {r.profitPerUnit !== null
                    ? fmtRupiah(r.profitPerUnit)
                    : "—"}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right font-medium",
                    marginClass(r.margin)
                  )}
                >
                  {r.margin !== null ? `${r.margin.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-3">{categoryBadge(r.category)}</td>
                <td className="px-3 py-3 text-right font-medium">
                  {r.recommendedPrice !== null ? (
                    fmtRupiah(r.recommendedPrice)
                  ) : (
                    <span className="text-muted-foreground">—</span>
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