// ============================================================
// DASHBOARD SERVICE
//
// Ringkasan data untuk halaman utama dashboard.
//
// Berbeda dari Stock Summary:
// - Stock Summary  → angka agregat stok
// - Dashboard      → aktivitas hari ini + trend + recent items
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
  };
  totals: {
    inventoryItems: number;
    activeInventoryItems: number;
    products: number;
    activeProducts: number;
    recipes: number;
    activeRecipes: number;
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
  recentProductions: Array<{
    id: string;
    productId: string;
    productName: string;
    outputQuantity: string;
    unitCost: string;
    totalCost: string;
    createdAt: string;
  }>;
  recentRestocks: Array<{
    id: string;
    inventoryItemId: string;
    inventoryItemName: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
    supplierName: string | null;
    createdAt: string;
  }>;
  productionTrend: Array<{
    date: string;
    count: number;
    output: number;
    value: number;
  }>;
};

// ---------- Main service ----------

export async function getDashboardStats(
  query: DashboardStatsQuery
): Promise<DashboardStats> {
  const todayStart = startOfDay(new Date());
  const trendStart = startOfDaysAgo(query.trendDays - 1);

  // ---------- 1. Today's activity ----------

  const [
    todayProductions,
    todayRestocks,
  ] = await Promise.all([
    prisma.production.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { outputQuantity: true, totalCost: true },
    }),
    prisma.restock.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { totalCost: true },
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

  // ---------- 2. Totals ----------

  const [
    inventoryItems,
    activeInventoryItems,
    products,
    activeProducts,
    recipes,
    activeRecipes,
  ] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { isActive: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productRecipe.count(),
    prisma.productRecipe.count({ where: { isActive: true } }),
  ]);

  // ---------- 3. Low stock ----------

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

  // Ambil semua item aktif, lalu filter di memori
  // (biar material yang belum punya batch pun terhitung sebagai stok 0)
  const activeItemList = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, unit: true },
    orderBy: { name: "asc" },
  });

  const lowStockItems = activeItemList
    .map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      totalStock: totalStockMap.get(item.id) ?? 0,
    }))
    .filter((item) => item.totalStock < query.lowStockThreshold);

  // ---------- 4. Recent productions ----------

  const recentProductions = await prisma.production.findMany({
    orderBy: { createdAt: "desc" },
    take: query.recentLimit,
    select: {
      id: true,
      productId: true,
      outputQuantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
      product: {
        select: { name: true },
      },
    },
  });

  // ---------- 5. Recent restocks ----------

  const recentRestocks = await prisma.restock.findMany({
    orderBy: { createdAt: "desc" },
    take: query.recentLimit,
    select: {
      id: true,
      inventoryItemId: true,
      quantity: true,
      unitCost: true,
      totalCost: true,
      supplierName: true,
      createdAt: true,
      inventoryItem: {
        select: { name: true },
      },
    },
  });

  // ---------- 6. Production trend ----------

  const trendProductions = await prisma.production.findMany({
    where: { createdAt: { gte: trendStart } },
    select: {
      outputQuantity: true,
      totalCost: true,
      createdAt: true,
    },
  });

  // Group per hari
  const trendMap = new Map<
    string,
    { count: number; output: number; value: number }
  >();

  // Inisialisasi semua tanggal (biar tanggal kosong tetap muncul)
  for (let i = 0; i < query.trendDays; i++) {
    const d = startOfDaysAgo(query.trendDays - 1 - i);
    trendMap.set(formatDateOnly(d), { count: 0, output: 0, value: 0 });
  }

  for (const p of trendProductions) {
    const key = formatDateOnly(p.createdAt);
    const entry = trendMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.output += Number(p.outputQuantity);
      entry.value += Number(p.totalCost);
    }
  }

  const productionTrend = Array.from(trendMap.entries()).map(
    ([date, data]) => ({
      date,
      count: data.count,
      output: data.output,
      value: data.value,
    })
  );

  // ---------- Return ----------

  return {
    today: {
      productionCount: todayProductions.length,
      productionOutput: todayProductionOutput,
      productionValue: todayProductionValue,
      restockCount: todayRestocks.length,
      restockValue: todayRestockValue,
    },
    totals: {
      inventoryItems,
      activeInventoryItems,
      products,
      activeProducts,
      recipes,
      activeRecipes,
    },
    lowStock: {
      threshold: query.lowStockThreshold,
      count: lowStockItems.length,
      items: lowStockItems,
    },
    recentProductions: recentProductions.map((p) => ({
      id: p.id,
      productId: p.productId,
      productName: p.product.name,
      outputQuantity: String(p.outputQuantity),
      unitCost: String(p.unitCost),
      totalCost: String(p.totalCost),
      createdAt: p.createdAt.toISOString(),
    })),
    recentRestocks: recentRestocks.map((r) => ({
      id: r.id,
      inventoryItemId: r.inventoryItemId,
      inventoryItemName: r.inventoryItem.name,
      quantity: String(r.quantity),
      unitCost: String(r.unitCost),
      totalCost: String(r.totalCost),
      supplierName: r.supplierName,
      createdAt: r.createdAt.toISOString(),
    })),
    productionTrend,
  };
}