// ============================================================
// STOCK SERVICE
//
// Endpoint agregat untuk dashboard.
//
// - getStockSummary  → total stok material & product + nilai inventory
// - getLowStockItems → material yang stoknya di bawah threshold
// ============================================================

import { prisma } from "@/lib/db";

export type StockSummary = {
  inventory: {
    totalItems: number;
    activeItems: number;
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
  };
  products: {
    totalProducts: number;
    activeProducts: number;
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
  };
  restocks: {
    totalRestocks: number;
    lastRestockAt: string | null;
  };
  productions: {
    totalProductions: number;
    lastProductionAt: string | null;
  };
};

/**
 * Ringkasan agregat seluruh stock.
 */
export async function getStockSummary(): Promise<StockSummary> {
  const [
    totalItems,
    activeItems,
    inventoryBatches,
    inventoryAvailableBatches,
    totalProducts,
    activeProducts,
    finishedBatches,
    finishedAvailableBatches,
    totalRestocks,
    lastRestock,
    totalProductions,
    lastProduction,
  ] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { isActive: true } }),

    // Semua batch (untuk hitung total value)
    prisma.inventoryBatch.findMany({
      select: {
        quantity: true,
        remainingQuantity: true,
        totalCost: true,
        unitCost: true,
      },
    }),

    prisma.inventoryBatch.count({
      where: { remainingQuantity: { gt: 0 } },
    }),

    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),

    prisma.finishedProductBatch.findMany({
      select: {
        quantity: true,
        remainingQuantity: true,
        totalCost: true,
        unitCost: true,
      },
    }),

    prisma.finishedProductBatch.count({
      where: { remainingQuantity: { gt: 0 } },
    }),

    prisma.restock.count(),
    prisma.restock.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),

    prisma.production.count(),
    prisma.production.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // Nilai inventory = sum dari (remainingQuantity × unitCost)
  const inventoryValue = inventoryBatches.reduce((sum, b) => {
    return sum + Number(b.remainingQuantity) * Number(b.unitCost);
  }, 0);

  // Nilai finished product = sum dari (remainingQuantity × unitCost)
  const finishedValue = finishedBatches.reduce((sum, b) => {
    return sum + Number(b.remainingQuantity) * Number(b.unitCost);
  }, 0);

  return {
    inventory: {
      totalItems,
      activeItems,
      totalBatches: inventoryBatches.length,
      availableBatches: inventoryAvailableBatches,
      totalValue: inventoryValue,
    },
    products: {
      totalProducts,
      activeProducts,
      totalBatches: finishedBatches.length,
      availableBatches: finishedAvailableBatches,
      totalValue: finishedValue,
    },
    restocks: {
      totalRestocks,
      lastRestockAt: lastRestock?.createdAt.toISOString() ?? null,
    },
    productions: {
      totalProductions,
      lastProductionAt: lastProduction?.createdAt.toISOString() ?? null,
    },
  };
}

/**
 * Daftar material yang total remainingQuantity-nya di bawah threshold.
 *
 * Total stock dihitung dari sum remainingQuantity semua batch
 * milik material tersebut.
 */
export async function getLowStockItems(threshold: number) {
  // Group inventoryBatch by inventoryItemId, sum remainingQuantity
  const grouped = await prisma.inventoryBatch.groupBy({
    by: ["inventoryItemId"],
    _sum: { remainingQuantity: true },
  });

  // Item yang total stok di bawah threshold
  const lowItemIds = grouped
    .filter((g) => Number(g._sum.remainingQuantity ?? 0) < threshold)
    .map((g) => g.inventoryItemId);

  if (lowItemIds.length === 0) {
    return {
      threshold,
      items: [],
    };
  }

  const items = await prisma.inventoryItem.findMany({
    where: {
      id: { in: lowItemIds },
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
    },
  });

  // Map dari hasil groupBy
  const totalMap = new Map(
    grouped.map((g) => [
      g.inventoryItemId,
      Number(g._sum.remainingQuantity ?? 0),
    ])
  );

  return {
    threshold,
    items: items.map((item) => ({
      ...item,
      totalStock: totalMap.get(item.id) ?? 0,
    })),
  };
}