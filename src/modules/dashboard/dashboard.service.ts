// ============================================================
// DASHBOARD SERVICE
// ============================================================

import { prisma } from "@/lib/db";
import type { DashboardStatsQuery } from "./dashboard.validator";

// ---------- Helpers ----------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDaysAgo(days: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - days);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- Types ----------

export type DashboardStats = {
  today: {
    productionCount: number;
    productionOutput: number;
    productionValue: number;
    restockCount: number;
    restockValue: number;
    // ORDER — NEW
    orderCount: number;
    orderCompletedCount: number;
    orderCompletedRevenue: number;
    orderActiveCount: number;
    orderCancelledCount: number;
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
    type: "RESTOCK" | "PRODUCTION" | "ORDER";
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
  // ORDER — NEW
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    qtySold: number;
    revenue: number;
    orderCount: number;
  }>;
  topBaristas: Array<{
    baristaId: string;
    baristaName: string;
    orderCount: number;
    revenue: number;
    avgDurasiMinutes: number | null;
    avgJarakKm: number | null;
  }>;
  orderStatusCounts: {
    PENDING: number;
    SEARCHING: number;
    ASSIGNED: number;
    ACCEPTED: number;
    DELIVERING: number;
    ARRIVED: number;
    COMPLETED: number;
    CANCELLED: number;
    FAILED: number;
  };
  monthly: {
    restockCount: number;
    restockValue: number;
    productionCount: number;
    productionValue: number;
  };
};

// ---------- Main service ----------

export async function getDashboardStats(
  query: DashboardStatsQuery
): Promise<DashboardStats> {
  const todayStart = startOfDay(new Date());
  const monthStart = startOfMonth();
  const trendStart = startOfDaysAgo(query.trendDays - 1);

  // ---------- 1. Today's activity ----------

  const [
    todayProductions,
    todayRestocks,
    todayOrders,
    todayCompletedOrders,
    todayActiveOrders,
    todayCancelledOrders,
  ] = await Promise.all([
    prisma.production.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { outputQuantity: true, totalCost: true },
    }),
    prisma.restock.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { totalCost: true },
    }),
    // ORDER — NEW
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { id: true },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: "COMPLETED",
        paymentStatus: "PAID",
      },
      select: { total: true },
    }),
    prisma.order.count({
      where: {
        status: {
          in: ["SEARCHING", "ASSIGNED", "ACCEPTED", "DELIVERING", "ARRIVED"],
        },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: todayStart },
        status: "CANCELLED",
      },
    }),
  ]);

  const todayProductionOutput = todayProductions.reduce(
    (sum, p) => sum + Number(p.outputQuantity),
    0
  );
  const todayProductionValue = todayProductions.reduce(
    (sum, p) => sum + Number(p.totalCost),
    0
  );
  const todayRestockValue = todayRestocks.reduce(
    (sum, r) => sum + Number(r.totalCost),
    0
  );
  // ORDER — NEW
  const todayCompletedRevenue = todayCompletedOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );

  // ---------- 2. Totals ----------

  const [
    inventoryItems,
    activeInventoryItems,
    products,
    activeProducts,
    recipes,
    activeRecipes,
    baristas,
    activeBaristas,
    customers,
    activeCustomers,
    admins,
    activeAdmins,
  ] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { isActive: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productRecipe.count(),
    prisma.productRecipe.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "BARISTA" } }),
    prisma.user.count({ where: { role: "BARISTA", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }),
  ]);

  // ---------- 3. Inventory aggregates ----------

  const [
    inventoryBatches,
    finishedBatches,
    monthlyRestocks,
    monthlyProductions,
  ] = await Promise.all([
    prisma.inventoryBatch.findMany({
      select: { remainingQuantity: true, unitCost: true },
    }),
    prisma.finishedProductBatch.findMany({
      select: { remainingQuantity: true, unitCost: true },
    }),
    prisma.restock.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { totalCost: true },
    }),
    prisma.production.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { totalCost: true },
    }),
  ]);

  const inventoryValue = inventoryBatches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity) * Number(b.unitCost),
    0
  );
  const finishedValue = finishedBatches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity) * Number(b.unitCost),
    0
  );
  const finishedRemaining = finishedBatches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity),
    0
  );

  const inventoryAvailableBatches = inventoryBatches.filter(
    (b) => Number(b.remainingQuantity) > 0
  ).length;
  const finishedAvailableBatches = finishedBatches.filter(
    (b) => Number(b.remainingQuantity) > 0
  ).length;

  // ---------- 4. Stock status + low stock ----------

  const groupedBatches = await prisma.inventoryBatch.groupBy({
    by: ["inventoryItemId"],
    _sum: { remainingQuantity: true },
  });

  const totalStockMap = new Map(
    groupedBatches.map((g) => [
      g.inventoryItemId,
      Number(g._sum.remainingQuantity ?? 0),
    ])
  );

  const activeItemList = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, unit: true },
    orderBy: { name: "asc" },
  });

  const itemStatuses = activeItemList.map((item) => {
    const totalStock = totalStockMap.get(item.id) ?? 0;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      totalStock,
    };
  });

  const lowStockItems = itemStatuses.filter(
    (item) => item.totalStock < query.lowStockThreshold
  );

  const stockStatus = {
    inStock: itemStatuses.filter(
      (i) => i.totalStock >= query.lowStockThreshold
    ).length,
    lowStock: itemStatuses.filter(
      (i) => i.totalStock > 0 && i.totalStock < query.lowStockThreshold
    ).length,
    outOfStock: itemStatuses.filter((i) => i.totalStock === 0).length,
  };

  // ---------- 5. Recent activities (restock + production + order) ----------

  const [recentProductions, recentRestocks, recentOrders] = await Promise.all([
    prisma.production.findMany({
      orderBy: { createdAt: "desc" },
      take: query.recentLimit * 2,
      select: {
        id: true,
        productId: true,
        outputQuantity: true,
        totalCost: true,
        unitCost: true,
        createdAt: true,
        product: { select: { name: true } },
        finishedProductBatch: { select: { batchCode: true } },
      },
    }),
    prisma.restock.findMany({
      orderBy: { createdAt: "desc" },
      take: query.recentLimit * 2,
      select: {
        id: true,
        inventoryItemId: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        supplierName: true,
        createdAt: true,
        inventoryItem: { select: { name: true, unit: true } },
        batch: { select: { batchCode: true } },
      },
    }),
    // ORDER — NEW
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: query.recentLimit * 2,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  type Activity = {
    id: string;
    type: "RESTOCK" | "PRODUCTION" | "ORDER";
    title: string;
    detail: string;
    value: number;
    createdAt: Date;
  };

  const activities: Activity[] = [
    ...recentProductions.map((p) => ({
      id: `prod-${p.id}`,
      type: "PRODUCTION" as const,
      title: `Produksi ${p.product.name}`,
      detail: `${Number(p.outputQuantity)} unit${
        p.finishedProductBatch?.batchCode
          ? ` · ${p.finishedProductBatch.batchCode}`
          : ""
      }`,
      value: Number(p.totalCost),
      createdAt: p.createdAt,
    })),
    ...recentRestocks.map((r) => ({
      id: `rest-${r.id}`,
      type: "RESTOCK" as const,
      title: `Restock ${r.inventoryItem.name}`,
      detail: `${Number(r.quantity)} ${r.inventoryItem.unit}${
        r.supplierName ? ` · ${r.supplierName}` : ""
      }`,
      value: Number(r.totalCost),
      createdAt: r.createdAt,
    })),
    // ORDER — NEW
    ...recentOrders.map((o) => ({
      id: `ord-${o.id}`,
      type: "ORDER" as const,
      title: `Order ${o.orderNumber}`,
      detail: `${o.customerName} · ${o.status}`,
      value: Number(o.total),
      createdAt: o.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, query.recentLimit);

  const recentActivities = activities.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    detail: a.detail,
    value: a.value,
    createdAt: a.createdAt.toISOString(),
  }));

  // ---------- 6. Activity trend ----------

  const [trendProductions, trendRestocks] = await Promise.all([
    prisma.production.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { outputQuantity: true, totalCost: true, createdAt: true },
    }),
    prisma.restock.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { totalCost: true, createdAt: true },
    }),
  ]);

  type TrendRow = {
    productionCount: number;
    productionOutput: number;
    productionValue: number;
    restockCount: number;
    restockValue: number;
  };

  const trendMap = new Map<string, TrendRow>();

  for (let i = 0; i < query.trendDays; i++) {
    const d = startOfDaysAgo(query.trendDays - 1 - i);
    trendMap.set(formatDateOnly(d), {
      productionCount: 0,
      productionOutput: 0,
      productionValue: 0,
      restockCount: 0,
      restockValue: 0,
    });
  }

  for (const p of trendProductions) {
    const key = formatDateOnly(p.createdAt);
    const entry = trendMap.get(key);
    if (entry) {
      entry.productionCount += 1;
      entry.productionOutput += Number(p.outputQuantity);
      entry.productionValue += Number(p.totalCost);
    }
  }

  for (const r of trendRestocks) {
    const key = formatDateOnly(r.createdAt);
    const entry = trendMap.get(key);
    if (entry) {
      entry.restockCount += 1;
      entry.restockValue += Number(r.totalCost);
    }
  }

  const activityTrend = Array.from(trendMap.entries()).map(
    ([date, data]) => ({ date, ...data })
  );

  // ---------- 7. Top produced products ----------

  const topGrouped = await prisma.production.groupBy({
    by: ["productId"],
    _sum: { outputQuantity: true, totalCost: true },
    _count: { _all: true },
    orderBy: { _sum: { outputQuantity: "desc" } },
    take: query.topProductsLimit,
  });

  const topProductIds = topGrouped.map((g) => g.productId);
  const topProductsData = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true },
      })
    : [];

  const topProductMap = new Map(topProductsData.map((p) => [p.id, p.name]));

  const topProducedProducts = topGrouped.map((g) => {
    const totalOutput = Number(g._sum.outputQuantity ?? 0);
    const totalCost = Number(g._sum.totalCost ?? 0);
    return {
      productId: g.productId,
      productName: topProductMap.get(g.productId) ?? "Unknown",
      totalOutput,
      productionEvents: g._count._all,
      avgHpp: totalOutput > 0 ? totalCost / totalOutput : 0,
    };
  });

  // ---------- 8. ORDER — Top selling products + Top baristas + Status ----------

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        status: "COMPLETED",
        paymentStatus: "PAID",
      },
    },
    select: {
      productId: true,
      productName: true,
      quantity: true,
      subtotal: true,
      orderId: true,
    },
  });

  const productSalesMap = new Map<
    string,
    {
      productName: string;
      qtySold: number;
      revenue: number;
      orders: Set<string>;
    }
  >();

  for (const it of orderItems) {
    const cur = productSalesMap.get(it.productId) ?? {
      productName: it.productName,
      qtySold: 0,
      revenue: 0,
      orders: new Set<string>(),
    };
    cur.qtySold += it.quantity;
    cur.revenue += Number(it.subtotal);
    cur.orders.add(it.orderId);
    productSalesMap.set(it.productId, cur);
  }

  const topSellingProducts = [...productSalesMap.entries()]
    .map(([productId, v]) => ({
      productId,
      productName: v.productName,
      qtySold: v.qtySold,
      revenue: v.revenue,
      orderCount: v.orders.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const baristaOrders = await prisma.order.findMany({
    where: {
      status: "COMPLETED",
      paymentStatus: "PAID",
      baristaId: { not: null },
    },
    select: {
      baristaId: true,
      total: true,
      acceptedAt: true,
      completedAt: true,
      distanceKm: true,
      barista: { select: { name: true } },
    },
  });

  const baristaMap = new Map<
    string,
    {
      name: string;
      orderCount: number;
      revenue: number;
      durasiArr: number[];
      jarakArr: number[];
    }
  >();

  for (const o of baristaOrders) {
    if (!o.baristaId) continue;
    const cur = baristaMap.get(o.baristaId) ?? {
      name: o.barista?.name ?? "Unknown",
      orderCount: 0,
      revenue: 0,
      durasiArr: [],
      jarakArr: [],
    };
    cur.orderCount += 1;
    cur.revenue += Number(o.total);
    if (o.acceptedAt && o.completedAt) {
      cur.durasiArr.push(
        (o.completedAt.getTime() - o.acceptedAt.getTime()) / 60000
      );
    }
    if (o.distanceKm !== null) cur.jarakArr.push(o.distanceKm);
    baristaMap.set(o.baristaId, cur);
  }

  const topBaristas = [...baristaMap.entries()]
    .map(([baristaId, v]) => ({
      baristaId,
      baristaName: v.name,
      orderCount: v.orderCount,
      revenue: v.revenue,
      avgDurasiMinutes:
        v.durasiArr.length > 0
          ? v.durasiArr.reduce((s, x) => s + x, 0) / v.durasiArr.length
          : null,
      avgJarakKm:
        v.jarakArr.length > 0
          ? v.jarakArr.reduce((s, x) => s + x, 0) / v.jarakArr.length
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const statusGroups = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const orderStatusCounts: DashboardStats["orderStatusCounts"] = {
    PENDING: 0,
    SEARCHING: 0,
    ASSIGNED: 0,
    ACCEPTED: 0,
    DELIVERING: 0,
    ARRIVED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    FAILED: 0,
  };

  for (const g of statusGroups) {
    orderStatusCounts[g.status as keyof typeof orderStatusCounts] =
      g._count._all;
  }

  // ---------- 9. Monthly totals ----------

  const monthlyRestockValue = monthlyRestocks.reduce(
    (sum, r) => sum + Number(r.totalCost),
    0
  );
  const monthlyProductionValue = monthlyProductions.reduce(
    (sum, p) => sum + Number(p.totalCost),
    0
  );

  // ---------- 10. Inventory composition ----------

  const materialCount = inventoryItems;
  const finishedCount = finishedAvailableBatches;

  const totalCount = materialCount + finishedCount;
  const inventoryComposition = [
    {
      name: "Bahan Baku",
      value: totalCount > 0 ? Math.round((materialCount / totalCount) * 100) : 0,
      count: materialCount,
    },
    {
      name: "Produk Jadi",
      value:
        totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0,
      count: finishedCount,
    },
  ];

  // ---------- Return ----------

  return {
    today: {
      productionCount: todayProductions.length,
      productionOutput: todayProductionOutput,
      productionValue: todayProductionValue,
      restockCount: todayRestocks.length,
      restockValue: todayRestockValue,
      // ORDER — NEW
      orderCount: todayOrders.length,
      orderCompletedCount: todayCompletedOrders.length,
      orderCompletedRevenue: todayCompletedRevenue,
      orderActiveCount: todayActiveOrders,
      orderCancelledCount: todayCancelledOrders,
    },
    totals: {
      inventoryItems,
      activeInventoryItems,
      products,
      activeProducts,
      recipes,
      activeRecipes,
      baristas,
      activeBaristas,
      customers,
      activeCustomers,
      admins,
      activeAdmins,
    },
    inventory: {
      totalBatches: inventoryBatches.length,
      availableBatches: inventoryAvailableBatches,
      totalValue: inventoryValue,
    },
    finishedProducts: {
      totalBatches: finishedBatches.length,
      availableBatches: finishedAvailableBatches,
      totalValue: finishedValue,
      totalRemainingQuantity: finishedRemaining,
    },
    inventoryComposition,
    stockStatus,
    lowStock: {
      threshold: query.lowStockThreshold,
      count: lowStockItems.length,
      items: lowStockItems,
    },
    recentActivities,
    activityTrend,
    topProducedProducts,
    // ORDER — NEW
    topSellingProducts,
    topBaristas,
    orderStatusCounts,
    monthly: {
      restockCount: monthlyRestocks.length,
      restockValue: monthlyRestockValue,
      productionCount: monthlyProductions.length,
      productionValue: monthlyProductionValue,
    },
  };
}