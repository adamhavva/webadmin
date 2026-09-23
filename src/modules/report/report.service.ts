import { prisma } from "@/lib/db";
import type { Prisma } from "../../../prisma/generated/client";
import type { ReportFilter } from "./report.validator";

// ============================================================
// Helper — build product where clause
// ============================================================

function buildProductWhere(filter: ReportFilter): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (filter.productId) where.id = filter.productId;
  if (filter.isActive === "true") where.isActive = true;
  else if (filter.isActive === "false") where.isActive = false;
  return where;
}

function buildDateWhere(
  filter: ReportFilter
): { gte?: Date; lte?: Date } | undefined {
  if (!filter.dateFrom && !filter.dateTo) return undefined;
  const w: { gte?: Date; lte?: Date } = {};
  if (filter.dateFrom) w.gte = filter.dateFrom;
  if (filter.dateTo) w.lte = filter.dateTo;
  return w;
}

// ============================================================
// Types
// ============================================================

export type MasterProductRow = {
  id: string;
  name: string;
  isActive: boolean;
  sellingPrice: number;
  hppLatest: number | null;
  hppAvg: number | null;
  hppMin: number | null;
  hppMax: number | null;
  marginLatest: number | null;
  marginAvg: number | null;
  stockFinished: number;
  batchActive: number;
  batchTotal: number;
  productionCount: number;
  productionTotalOutput: number;
  productionTotalCost: number;
  totalValueStock: number;
  totalValueProduction: number;
  lastProductionAt: string | null;
};

export type FinishedBatchRow = {
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

export type ProductionRow = {
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

export type CostHistoryRow = {
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

export type MarginAnalysisRow = {
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

// ============================================================
// 1. Master Produk
// ============================================================

export async function getMasterProductsReport(filter: ReportFilter) {
  const where = buildProductWhere(filter);

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      sellingPrice: true,
      costHistories: {
        select: { hpp: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      productions: {
        select: {
          id: true,
          outputQuantity: true,
          totalCost: true,
          createdAt: true,
        },
      },
      finishedProductBatches: {
        select: { remainingQuantity: true, unitCost: true },
      },
    },
  });

  const items: MasterProductRow[] = products.map((p) => {
    const selling = Number(p.sellingPrice);
    const hpps = p.costHistories.map((c) => Number(c.hpp));
    const hppLatest = hpps[0] ?? null;
    const hppAvg =
      hpps.length > 0 ? hpps.reduce((s, h) => s + h, 0) / hpps.length : null;
    const hppMin = hpps.length > 0 ? Math.min(...hpps) : null;
    const hppMax = hpps.length > 0 ? Math.max(...hpps) : null;

    const marginLatest =
      hppLatest !== null && selling > 0
        ? ((selling - hppLatest) / selling) * 100
        : null;
    const marginAvg =
      hppAvg !== null && selling > 0
        ? ((selling - hppAvg) / selling) * 100
        : null;

    const batchActive = p.finishedProductBatches.filter(
      (b) => Number(b.remainingQuantity) > 0
    ).length;
    const batchTotal = p.finishedProductBatches.length;
    const stockFinished = p.finishedProductBatches.reduce(
      (s, b) => s + Number(b.remainingQuantity),
      0
    );
    const totalValueStock = p.finishedProductBatches.reduce(
      (s, b) => s + Number(b.remainingQuantity) * Number(b.unitCost),
      0
    );

    const productionCount = p.productions.length;
    const productionTotalOutput = p.productions.reduce(
      (s, pr) => s + Number(pr.outputQuantity),
      0
    );
    const productionTotalCost = p.productions.reduce(
      (s, pr) => s + Number(pr.totalCost),
      0
    );
    const lastProductionAt =
      p.productions.length > 0
        ? p.productions
            .map((pr) => pr.createdAt)
            .reduce((max, d) => (d > max ? d : max))
            .toISOString()
        : null;

    return {
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      sellingPrice: selling,
      hppLatest,
      hppAvg,
      hppMin,
      hppMax,
      marginLatest,
      marginAvg,
      stockFinished,
      batchActive,
      batchTotal,
      productionCount,
      productionTotalOutput,
      productionTotalCost,
      totalValueStock,
      totalValueProduction: productionTotalCost,
      lastProductionAt,
    };
  });

  const summary = {
    totalProducts: items.length,
    activeProducts: items.filter((i) => i.isActive).length,
    totalStockValue: items.reduce((s, i) => s + i.totalValueStock, 0),
    totalProductionValue: items.reduce(
      (s, i) => s + i.totalValueProduction,
      0
    ),
    rugiCount: items.filter(
      (i) => i.marginLatest !== null && i.marginLatest < 0
    ).length,
  };

  return { items, summary };
}

// ============================================================
// 2. Batch Produk Jadi
// ============================================================

export async function getFinishedBatchesReport(filter: ReportFilter) {
  const productWhere = buildProductWhere(filter);
  const dateWhere = buildDateWhere(filter);

  const where: Prisma.FinishedProductBatchWhereInput = {};
  if (Object.keys(productWhere).length > 0) where.product = productWhere;
  if (dateWhere) where.createdAt = dateWhere;

  const batches = await prisma.finishedProductBatch.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      batchCode: true,
      productId: true,
      productionId: true,
      quantity: true,
      remainingQuantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
      product: { select: { name: true } },
      production: { select: { createdAt: true } },
    },
  });

  const items: FinishedBatchRow[] = batches.map((b) => {
    const quantity = Number(b.quantity);
    const remaining = Number(b.remainingQuantity);
    const consumed = quantity - remaining;
    const consumedPct = quantity > 0 ? (consumed / quantity) * 100 : 0;
    const unitCost = Number(b.unitCost);
    const remainingValue = remaining * unitCost;

    let status: FinishedBatchRow["status"] = "available";
    if (remaining === 0) status = "empty";
    else if (consumedPct >= 75) status = "low";

    return {
      id: b.id,
      batchCode: b.batchCode,
      productId: b.productId,
      productName: b.product.name,
      productionId: b.productionId,
      productionAt: (b.production?.createdAt ?? b.createdAt).toISOString(),
      quantity,
      remainingQuantity: remaining,
      consumed,
      consumedPct,
      unitCost,
      totalCost: Number(b.totalCost),
      remainingValue,
      status,
    };
  });

  const summary = {
    totalBatches: items.length,
    availableBatches: items.filter((i) => i.status !== "empty").length,
    totalRemaining: items.reduce((s, i) => s + i.remainingQuantity, 0),
    totalValue: items.reduce((s, i) => s + i.remainingValue, 0),
  };

  return { items, summary };
}

// ============================================================
// 3. Riwayat Produksi
// ============================================================

export async function getProductionsReport(filter: ReportFilter) {
  const productWhere = buildProductWhere(filter);
  const dateWhere = buildDateWhere(filter);

  const where: Prisma.ProductionWhereInput = {};
  if (Object.keys(productWhere).length > 0) where.product = productWhere;
  if (dateWhere) where.createdAt = dateWhere;

  const productions = await prisma.production.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      productId: true,
      outputQuantity: true,
      totalCost: true,
      unitCost: true,
      product: { select: { name: true } },
      finishedProductBatch: { select: { batchCode: true } },
      components: {
        select: {
          name: true,
          quantity: true,
          unit: true,
        },
      },
    },
  });

  const items: ProductionRow[] = productions.map((p) => {
    // Aggregate component per nama
    const nameCount = new Map<string, number>();
    for (const c of p.components) {
      nameCount.set(c.name, (nameCount.get(c.name) ?? 0) + 1);
    }
    const componentSummary = Array.from(nameCount.entries())
      .map(([name, count]) => `${name} ×${count}`)
      .join(" · ");

    return {
      id: p.id,
      createdAt: p.createdAt.toISOString(),
      productId: p.productId,
      productName: p.product.name,
      batchCode: p.finishedProductBatch?.batchCode ?? null,
      outputQuantity: Number(p.outputQuantity),
      componentCount: p.components.length,
      totalCost: Number(p.totalCost),
      unitCost: Number(p.unitCost),
      componentSummary,
    };
  });

  const totalOutput = items.reduce((s, i) => s + i.outputQuantity, 0);
  const totalCost = items.reduce((s, i) => s + i.totalCost, 0);

  const summary = {
    totalProductions: items.length,
    totalOutput,
    totalCost,
    avgHpp: totalOutput > 0 ? totalCost / totalOutput : 0,
  };

  return { items, summary };
}

// ============================================================
// 4. Riwayat HPP
// ============================================================

export async function getCostHistoryReport(filter: ReportFilter) {
  const productWhere = buildProductWhere(filter);
  const dateWhere = buildDateWhere(filter);

  const where: Prisma.ProductCostHistoryWhereInput = {};
  if (Object.keys(productWhere).length > 0) where.product = productWhere;
  if (dateWhere) where.createdAt = dateWhere;

  const entries = await prisma.productCostHistory.findMany({
    where,
    orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      createdAt: true,
      productId: true,
      hpp: true,
      product: { select: { name: true, sellingPrice: true } },
    },
  });

  // Hitung delta per produk (walk ascending)
  const runningPrev = new Map<string, number>();
  const rows: CostHistoryRow[] = entries.map((e) => {
    const hpp = Number(e.hpp);
    const selling = Number(e.product.sellingPrice);
    const prev = runningPrev.get(e.productId);
    const delta = prev !== undefined ? hpp - prev : null;
    const deltaPct =
      prev !== undefined && prev > 0
        ? ((hpp - prev) / prev) * 100
        : null;

    let status: CostHistoryRow["status"] = "first";
    if (delta !== null) {
      if (delta > 0) status = "up";
      else if (delta < 0) status = "down";
      else status = "same";
    }

    runningPrev.set(e.productId, hpp);

    const profit = selling - hpp;
    const margin = selling > 0 ? (profit / selling) * 100 : null;

    return {
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      productId: e.productId,
      productName: e.product.name,
      hpp,
      delta,
      deltaPct,
      sellingPrice: selling,
      profitPerUnit: profit,
      margin,
      status,
    };
  });

  // Sort desc untuk display
  rows.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const uniqueProducts = new Set(rows.map((r) => r.productId)).size;
  const totalHpp = rows.reduce((s, r) => s + r.hpp, 0);

  const summary = {
    totalEntries: rows.length,
    uniqueProducts,
    avgHpp: rows.length > 0 ? totalHpp / rows.length : 0,
    upCount: rows.filter((r) => r.status === "up").length,
    downCount: rows.filter((r) => r.status === "down").length,
  };

  return { items: rows, summary };
}

// ============================================================
// 5. Analisis Margin
// ============================================================

export async function getMarginAnalysisReport(filter: ReportFilter) {
  const where = buildProductWhere(filter);

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      sellingPrice: true,
      costHistories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { hpp: true },
      },
    },
  });

  const items: MarginAnalysisRow[] = products.map((p) => {
    const selling = Number(p.sellingPrice);
    const hppLatest = p.costHistories[0]
      ? Number(p.costHistories[0].hpp)
      : null;

    const profit = hppLatest !== null ? selling - hppLatest : null;
    const margin =
      profit !== null && selling > 0 ? (profit / selling) * 100 : null;

    let category: MarginAnalysisRow["category"] = "unknown";
    if (margin !== null) {
      if (margin < 0) category = "rugi";
      else if (margin < 25) category = "rendah";
      else if (margin < 50) category = "sedang";
      else category = "sehat";
    }

    // Rekomendasi harga jual untuk margin 50%: price = hpp / (1 - 0.5) = 2 * hpp
    const recommendedPrice =
      margin !== null && margin < 25 && hppLatest !== null
        ? Math.ceil(hppLatest * 2)
        : null;

    return {
      productId: p.id,
      productName: p.name,
      isActive: p.isActive,
      sellingPrice: selling,
      hppLatest,
      profitPerUnit: profit,
      margin,
      category,
      recommendedPrice,
    };
  });

  const summary = {
    totalProducts: items.length,
    sehat: items.filter((i) => i.category === "sehat").length,
    sedang: items.filter((i) => i.category === "sedang").length,
    rendah: items.filter((i) => i.category === "rendah").length,
    rugi: items.filter((i) => i.category === "rugi").length,
  };

  return { items, summary };
}