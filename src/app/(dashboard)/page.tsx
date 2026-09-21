"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Boxes,
  Coffee,
  Factory,
  MapPin,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  Truck,
  Users,
  UserRoundCheck,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  type ChartConfig,
} from "@/components/ui/chart";


const salesData = [
  {
    date: "Mon",
    sales: 4200000,
    orders: 42,
  },
  {
    date: "Tue",
    sales: 5100000,
    orders: 51,
  },
  {
    date: "Wed",
    sales: 4700000,
    orders: 47,
  },
  {
    date: "Thu",
    sales: 6300000,
    orders: 63,
  },
  {
    date: "Fri",
    sales: 7200000,
    orders: 72,
  },
  {
    date: "Sat",
    sales: 8900000,
    orders: 89,
  },
  {
    date: "Sun",
    sales: 8100000,
    orders: 81,
  },
];

const inventoryData = [
  {
    name: "Raw Material",
    value: 58,
  },
  {
    name: "Semi-Finished",
    value: 27,
  },
  {
    name: "Finished Product",
    value: 15,
  },
];

const inventoryChartConfig = {
  value: {
    label: "Stock",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const topProducts = [
  {
    name: "Iced Americano",
    sold: 482,
    revenue: 14460000,
    rating: 4.8,
  },
  {
    name: "Cafe Latte",
    sold: 421,
    revenue: 14735000,
    rating: 4.7,
  },
  {
    name: "Caramel Macchiato",
    sold: 367,
    revenue: 14680000,
    rating: 4.9,
  },
  {
    name: "Vanilla Latte",
    sold: 298,
    revenue: 11920000,
    rating: 4.6,
  },
  {
    name: "Matcha Latte",
    sold: 241,
    revenue: 10845000,
    rating: 4.7,
  },
];

const inventoryStatus = [
  {
    name: "In Stock",
    value: 72,
  },
  {
    name: "Low Stock",
    value: 18,
  },
  {
    name: "Out of Stock",
    value: 7,
  },
];

const transactionData = [
  {
    type: "Restock",
    value: 84,
  },
  {
    type: "Production",
    value: 63,
  },
  {
    type: "Transfer",
    value: 41,
  },
  {
    type: "Adjustment",
    value: 12,
  },
];

const recentActivity = [
  {
    type: "RESTOCK",
    title: "Arabica Coffee Beans restocked",
    detail: "Batch RB-260917-001",
    time: "10 minutes ago",
  },
  {
    type: "PRODUCTION",
    title: "Iced Americano production completed",
    detail: "50 cups",
    time: "24 minutes ago",
  },
  {
    type: "TRANSFER",
    title: "Milk transferred",
    detail: "Warehouse → Outlet",
    time: "42 minutes ago",
  },
  {
    type: "RESTOCK",
    title: "Fresh Milk restocked",
    detail: "40 liters",
    time: "1 hour ago",
  },
];

const formatRupiah = (
  value: number,
) =>
  new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(value);

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="text-sm text-muted-foreground">
          Overview operasional ASCEND
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Sales Today
            </CardTitle>

            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              Rp 8.900.000
            </div>

            <p className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUp className="mr-1 h-3 w-3" />
              12.5% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Orders Today
            </CardTitle>

            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              89
            </div>

            <p className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUp className="mr-1 h-3 w-3" />
              8.2%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Products
            </CardTitle>

            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              32
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              29 active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Baristas
            </CardTitle>

            <UserRoundCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              18
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              14 active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Customers
            </CardTitle>

            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              2,481
            </div>

            <p className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUp className="mr-1 h-3 w-3" />
              4.8%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory
            </CardTitle>

            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              97
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              18 low stock
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-7">
        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle>
              Sales & Orders
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Sales",
                  color:
                    "var(--chart-1)",
                },
                orders: {
                  label: "Orders",
                  color:
                    "var(--chart-2)",
                },
              }}
              className="h-[320px] w-full"
            >
              <LineChart
                data={salesData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />

                <YAxis
                  yAxisId="sales"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    `${value / 1000000}M`
                  }
                />

                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent />
                  }
                />

                <Line
                  yAxisId="sales"
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-orders)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>
              Inventory Composition
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ChartContainer
              config={inventoryChartConfig}
              className="mx-auto h-[300px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent />
                  }
                />

                <Pie
                  data={inventoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {inventoryData.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        fill={`var(--chart-${
                          index + 1
                        })`}
                      />
                    ),
                  )}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="mt-2 space-y-2">
              {inventoryData.map(
                (item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            `var(--chart-${
                              index + 1
                            })`,
                        }}
                      />

                      <span>
                        {item.name}
                      </span>
                    </div>

                    <span className="font-medium">
                      {item.value}%
                    </span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              Inventory Status
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {inventoryStatus.map(
              (item) => (
                <div
                  key={item.name}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span>
                      {item.name}
                    </span>

                    <span className="font-medium">
                      {item.value}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          item.value,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Inventory Transactions
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {transactionData.map(
                (item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        {item.type ===
                        "Restock" ? (
                          <Package className="h-4 w-4" />
                        ) : item.type ===
                          "Production" ? (
                          <Factory className="h-4 w-4" />
                        ) : (
                          <Truck className="h-4 w-4" />
                        )}
                      </div>

                      <span className="text-sm">
                        {item.type}
                      </span>
                    </div>

                    <span className="font-semibold">
                      {item.value}
                    </span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Recent Activity
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              {recentActivity.map(
                (item) => (
                  <div
                    key={`${item.type}-${item.title}`}
                    className="flex gap-3"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {item.title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {item.detail}
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Top Products
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {topProducts.map(
                (product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-4"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {product.sold} sold
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatRupiah(
                          product.revenue,
                        )}
                      </p>

                      <div className="flex items-center justify-end gap-1 text-xs">
                        <Star className="h-3 w-3 fill-current" />

                        {product.rating}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Operational Summary
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Factory className="h-4 w-4" />

                  <span className="text-sm">
                    Production
                  </span>
                </div>

                <div className="mt-2 text-2xl font-bold">
                  115
                </div>

                <p className="text-xs text-muted-foreground">
                  cups produced today
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />

                  <span className="text-sm">
                    Transfers
                  </span>
                </div>

                <div className="mt-2 text-2xl font-bold">
                  41
                </div>

                <p className="text-xs text-muted-foreground">
                  transactions this week
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />

                  <span className="text-sm">
                    Restock
                  </span>
                </div>

                <div className="mt-2 text-2xl font-bold">
                  84
                </div>

                <p className="text-xs text-muted-foreground">
                  transactions this week
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="h-4 w-4" />

                  <span className="text-sm">
                    Rating
                  </span>
                </div>

                <div className="mt-2 text-2xl font-bold">
                  4.8
                </div>

                <p className="text-xs text-muted-foreground">
                  overall product rating
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

    </main>
  );
}