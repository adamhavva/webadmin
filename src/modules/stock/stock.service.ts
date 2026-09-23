import { prisma } from "@/lib/db";
import type {
  LowStockQuery,
  StockSummaryQuery,
} from "./stock.validator";

// ============================================================
// Types
// ============================================================

export type MaterialStockStatus = "in_stock" | "low" | "out";

export type MaterialStockItem = {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
  totalStock: number;
  batchCount: number;
  availableBatchCount: number;
  totalValue: number;
  status: MaterialStockStatus;
};

export type FinishedStockItem = {
  productId: string;
  productName: string;
  productIsActive: boolean;
  totalStock: number;
  batchCount: number;
  availableBatchCount: number;
  totalValue: number;
  status: "available" | "empty";
};

export type StockSummary = {
  material: {
    totalItems: number;
    activeItems: number;
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
    items: MaterialStockItem[];
  };
  finished: {
    totalProducts: number;
    activeProducts: number;
    totalBatches: number;
    availableBatches: number;
    totalValue: number;
    totalStock: number;
    items: FinishedStockItem[];
  };
  stockStatus: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  lowStockThreshold: number;
};

// ============================================================
// Summary — material + finished + status
// ============================================================

export async function getStockSummary(
  query: StockSummaryQuery
): Promise<StockSummary> {
  // ---------- Material ----------
  const inventoryItems = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      batches: {
        select: {
          id: true,
          quantity: true,
          remainingQuantity: true,
          unitCost: true,
        },
      },
    },
  });

  const materialItems: MaterialStockItem[] = inventoryItems.map((item) => {
    const batchCount = item.batches.length;
    const availableBatches = item.batches.filter(
      (b) => Number(b.remainingQuantity) > 0
    );

    const totalStock = item.batches.reduce(
      (sum, b) => sum + Number(b.remainingQuantity),
      0
    );
    const totalValue = item.batches.reduce(
      (sum, b) =>
        sum + Number(b.remainingQuantity) * Number(b.unitCost),
      0
    );

    let status: MaterialStockStatus = "in_stock";
    if (totalStock === 0) status = "out";
    else if (totalStock < query.lowStockThreshold) status = "low";

    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      isActive: item.isActive,
      totalStock,
      batchCount,
      availableBatchCount: availableBatches.length,
      totalValue,
      status,
    };
  });

  // Filter berdasarkan query
  let filteredMaterial = materialItems;
  if (query.search) {
    const q = query.search.toLowerCase();
    filteredMaterial = filteredMaterial.filter((m) =>
      m.name.toLowerCase().includes(q)
    );
  }
  if (query.materialStatus !== "all") {
    filteredMaterial = filteredMaterial.filter(
      (m) => m.status === query.materialStatus
    );
  }

  // ---------- Finished ----------
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      finishedProductBatches: {
        select: {
          id: true,
          remainingQuantity: true,
          unitCost: true,
        },
      },
    },
  });

  const finishedItems: FinishedStockItem[] = products.map((p) => {
    const batchCount = p.finishedProductBatches.length;
    const availableBatches = p.finishedProductBatches.filter(
      (b) => Number(b.remainingQuantity) > 0
    );

    const totalStock = p.finishedProductBatches.reduce(
      (sum, b) => sum + Number(b.remainingQuantity),
      0
    );
    const totalValue = p.finishedProductBatches.reduce(
      (sum, b) =>
        sum + Number(b.remainingQuantity) * Number(b.unitCost),
      0
    );

    return {
      productId: p.id,
      productName: p.name,
      productIsActive: p.isActive,
      totalStock,
      batchCount,
      availableBatchCount: availableBatches.length,
      totalValue,
      status: totalStock > 0 ? "available" : "empty",
    };
  });

  // Filter
  let filteredFinished = finishedItems;
  if (query.search) {
    const q = query.search.toLowerCase();
    filteredFinished = filteredFinished.filter((f) =>
      f.productName.toLowerCase().includes(q)
    );
  }
  if (query.finishedStatus !== "all") {
    filteredFinished = filteredFinished.filter(
      (f) => f.status === query.finishedStatus
    );
  }

  // ---------- Summary aggregates (dari semua, bukan filtered) ----------
  const activeMaterial = materialItems.filter((m) => m.isActive);
  const materialValue = materialItems.reduce(
    (sum, m) => sum + m.totalValue,
    0
  );
  const totalMaterialBatches = materialItems.reduce(
    (sum, m) => sum + m.batchCount,
    0
  );
  const availableMaterialBatches = materialItems.reduce(
    (sum, m) => sum + m.availableBatchCount,
    0
  );

  const activeProducts = finishedItems.filter((f) => f.productIsActive);
  const finishedValue = finishedItems.reduce(
    (sum, f) => sum + f.totalValue,
    0
  );
  const totalFinishedBatches = finishedItems.reduce(
    (sum, f) => sum + f.batchCount,
    0
  );
  const availableFinishedBatches = finishedItems.reduce(
    (sum, f) => sum + f.availableBatchCount,
    0
  );
  const totalFinishedStock = finishedItems.reduce(
    (sum, f) => sum + f.totalStock,
    0
  );

  // ---------- Stock status ----------
  const stockStatus = {
    inStock: activeMaterial.filter((m) => m.status === "in_stock").length,
    lowStock: activeMaterial.filter((m) => m.status === "low").length,
    outOfStock: activeMaterial.filter((m) => m.status === "out").length,
  };

  return {
    material: {
      totalItems: materialItems.length,
      activeItems: activeMaterial.length,
      totalBatches: totalMaterialBatches,
      availableBatches: availableMaterialBatches,
      totalValue: materialValue,
      items: filteredMaterial,
    },
    finished: {
      totalProducts: finishedItems.length,
      activeProducts: activeProducts.length,
      totalBatches: totalFinishedBatches,
      availableBatches: availableFinishedBatches,
      totalValue: finishedValue,
      totalStock: totalFinishedStock,
      items: filteredFinished,
    },
    stockStatus,
    lowStockThreshold: query.lowStockThreshold,
  };
}

// ============================================================
// Low stock items
// ============================================================

export async function getLowStockItems(query: LowStockQuery) {
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      batches: {
        select: { remainingQuantity: true },
      },
    },
  });

  const items = inventoryItems
    .map((item) => {
      const totalStock = item.batches.reduce(
        (sum, b) => sum + Number(b.remainingQuantity),
        0
      );
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        totalStock,
        threshold: query.threshold,
        shortage: Math.max(query.threshold - totalStock, 0),
        isOut: totalStock === 0,
      };
    })
    .filter((item) => item.totalStock < query.threshold);

  let filtered = items;
  if (query.search) {
    const q = query.search.toLowerCase();
    filtered = filtered.filter((i) => i.name.toLowerCase().includes(q));
  }

  return {
    threshold: query.threshold,
    count: filtered.length,
    outOfStockCount: filtered.filter((i) => i.isOut).length,
    lowStockCount: filtered.filter((i) => !i.isOut).length,
    items: filtered,
  };
}