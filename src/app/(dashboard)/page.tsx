"use client";

import * as React from "react";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Coffee,
  Factory,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  UserRoundCheck,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type DashboardStats = {
  today: {
    productionCount: number;
    productionOutput: number;
    productionValue: number;
    restockCount: number;
    restockValue: number;
  };
  totals: {
    inventoryItems: number;
    activeInventoryItems: number;
    products: number;
    activeProducts: number;
    recipes: number;
    activeRecipes: number;
    baristas: number;
    activeBaristas: number;
    customers: number;
    activeCustomers: number;
    admins: number;
    activeAdmins: number;
  };
  inventory: {
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
  };
  finishedProducts: {
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
    totalRemainingQuantity: number;
  };
  inventoryComposition: Array<{
    name: string;
    value: number;
    count: number;
  }>;
  stockStatus: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  lowStock: {
    threshold: number;
    count: number;
    items: Array<{
      id: string;
      name: string;
      unit: string;
      totalStock: number;
    }>;
  };
  recentActivities: Array<{
    id: string;
    type: "RESTOCK" | "PRODUCTION";
    title: string;
    detail: string;
    value: number;
    createdAt: string;
  }>;
  activityTrend: Array<{
    date: string;
    productionCount: number;
    productionOutput: number;
    productionValue: number;
    restockCount: number;
    restockValue: number;
  }>;
  topProducedProducts: Array<{
    productId: string;
    productName: string;
    totalOutput: number;
    productionEvents: number;
    avgHpp: number;
  }>;
  monthly: {
    restockCount: number;
    restockValue: number;
    productionCount: number;
    productionValue: number;
  };
};

type StatsResponse = {
  success: boolean;
  data?: DashboardStats;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactRupiah(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(value) >= 1_000)
    return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(d);
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  title,
  value,
  hint,
  icon,
  href,
  trend,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
}) {
  const content = (
    <Card className="transition-colors hover:bg-muted/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend ? (
          <p
            className={cn(
              "mt-1 flex items-center text-xs",
              trend.direction === "up" && "text-green-600",
              trend.direction === "down" && "text-red-600",
              trend.direction === "flat" && "text-muted-foreground"
            )}
          >
            {trend.direction === "up" && (
              <ArrowUpRight className="mr-1 h-3 w-3" />
            )}
            {trend.direction === "down" && (
              <ArrowDownRight className="mr-1 h-3 w-3" />
            )}
            {trend.label}
          </p>
        ) : hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-7">
        <div className="h-96 animate-pulse rounded-lg border bg-muted/30 xl:col-span-5" />
        <div className="h-96 animate-pulse rounded-lg border bg-muted/30 xl:col-span-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
      </div>
    </div>
  );
}

function DashboardError({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat dashboard</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 size-4" />
        Coba Lagi
      </Button>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(
    async (options?: { showLoading?: boolean; showRefreshing?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const res = await fetch(
          "/api/dashboard/stats?trendDays=7&recentLimit=5&lowStockThreshold=100",
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as StatsResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat dashboard.");
        }

        setStats(json.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat dashboard."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchStats({ showLoading: true });
  }, [fetchStats]);

  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview operasional ASCEND
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchStats({ showRefreshing: true })}
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw
            className={cn(
              "mr-2 size-4",
              isRefreshing && "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error || !stats ? (
        <DashboardError
          message={error ?? "Data tidak tersedia."}
          onRetry={() => void fetchStats({ showRefreshing: true })}
        />
      ) : (
        <>
          {/* ============ STAT CARDS ============ */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard
              title="Produksi Hari Ini"
              value={stats.today.productionOutput}
              hint={`${stats.today.productionCount} event · ${formatRupiah(
                stats.today.productionValue
              )}`}
              icon={<Factory className="h-4 w-4" />}
            />

            <StatCard
              title="Restock Hari Ini"
              value={stats.today.restockCount}
              hint={formatRupiah(stats.today.restockValue)}
              icon={<ShoppingCart className="h-4 w-4" />}
            />

            <StatCard
              title="Produk"
              value={stats.totals.products}
              hint={`${stats.totals.activeProducts} aktif`}
              icon={<Coffee className="h-4 w-4" />}
              href="/inventory/products"
            />

            <StatCard
              title="Barista"
              value={stats.totals.baristas}
              hint={`${stats.totals.activeBaristas} aktif`}
              icon={<UserRoundCheck className="h-4 w-4" />}
              href="/users"
            />

            <StatCard
              title="Customer"
              value={stats.totals.customers}
              hint={`${stats.totals.activeCustomers} aktif`}
              icon={<Users className="h-4 w-4" />}
              href="/users"
            />

            <StatCard
              title="Bahan Baku"
              value={stats.totals.inventoryItems}
              hint={`${stats.lowStock.count} low stock`}
              icon={<Boxes className="h-4 w-4" />}
              href="/inventory/items"
            />
          </section>

          {/* ============ CHART + COMPOSITION ============ */}
          <section className="grid gap-6 xl:grid-cols-7">
            {/* Line chart: produksi & restock */}
            <Card className="xl:col-span-5">
              <CardHeader>
                <CardTitle>Produksi & Restock</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    productionOutput: {
                      label: "Produksi (unit)",
                      color: "var(--chart-1)",
                    },
                    restockCount: {
                      label: "Restock (event)",
                      color: "var(--chart-2)",
                    },
                  }}
                  className="h-[320px] w-full"
                >
                  <LineChart
                    data={stats.activityTrend}
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value: string) =>
                        formatDateShort(value)
                      }
                    />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => String(value)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="productionOutput"
                      stroke="var(--color-productionOutput)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="restockCount"
                      stroke="var(--color-restockCount)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pie: inventory composition */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Komposisi Inventori</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: "Jumlah",
                      color: "var(--chart-1)",
                    },
                  }}
                  className="mx-auto h-[300px] w-full"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={stats.inventoryComposition}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {stats.inventoryComposition.map((_, index) => (
                        <Cell
                          key={index}
                          fill={`var(--chart-${index + 1})`}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="mt-2 space-y-2">
                  {stats.inventoryComposition.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: `var(--chart-${index + 1})`,
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ============ 3 KARTU ============ */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Stock status */}
            <Card>
              <CardHeader>
                <CardTitle>Status Stok Bahan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stok Cukup</span>
                    <span className="font-medium">
                      {stats.stockStatus.inStock}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${
                          stats.totals.activeInventoryItems > 0
                            ? (stats.stockStatus.inStock /
                                stats.totals.activeInventoryItems) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stok Rendah</span>
                    <span className="font-medium">
                      {stats.stockStatus.lowStock}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width: `${
                          stats.totals.activeInventoryItems > 0
                            ? (stats.stockStatus.lowStock /
                                stats.totals.activeInventoryItems) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stok Habis</span>
                    <span className="font-medium">
                      {stats.stockStatus.outOfStock}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{
                        width: `${
                          stats.totals.activeInventoryItems > 0
                            ? (stats.stockStatus.outOfStock /
                                stats.totals.activeInventoryItems) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly summary */}
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Bulan Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-sm">Restock</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRupiah(stats.monthly.restockValue)}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold">
                      {stats.monthly.restockCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Factory className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-sm">Produksi</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRupiah(stats.monthly.productionValue)}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold">
                      {stats.monthly.productionCount}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Nilai stok bahan</span>
                      <span>{formatRupiah(stats.inventory.totalValue)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>Nilai stok produk jadi</span>
                      <span>
                        {formatRupiah(stats.finishedProducts.totalValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent activities */}
            <Card>
              <CardHeader>
                <CardTitle>Aktivitas Terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada aktivitas.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.recentActivities.map((a) => (
                      <div key={a.id} className="flex gap-3">
                        <div
                          className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            a.type === "RESTOCK"
                              ? "bg-blue-500"
                              : "bg-purple-500"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {a.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.detail}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatRelativeTime(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ============ TOP PRODUCTS + LOW STOCK ============ */}
          <section className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produk Paling Sering Diproduksi</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topProducedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada data produksi.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.topProducedProducts.map((p, index) => (
                      <div
                        key={p.productId}
                        className="flex items-center gap-4"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/inventory/products/${p.productId}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {p.productName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {p.productionEvents} kali produksi
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {p.totalOutput} unit
                          </p>
                          <p className="text-xs text-muted-foreground">
                            HPP {formatCompactRupiah(p.avgHpp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Stok Bahan Menipis</CardTitle>
                <Badge variant="outline">
                  Threshold &lt; {stats.lowStock.threshold}
                </Badge>
              </CardHeader>
              <CardContent>
                {stats.lowStock.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Semua bahan memiliki stok cukup.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.lowStock.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <Link
                          href={`/inventory/items/${item.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {item.name}
                        </Link>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {item.totalStock}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.unit}
                          </span>
                          {item.totalStock === 0 ? (
                            <Badge variant="destructive">Habis</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              Rendah
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t pt-4">
                  <Link
                    href="/inventory/items"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-full"
                    )}
                  >
                    Kelola Bahan Baku
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}