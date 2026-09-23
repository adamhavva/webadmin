import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import {
  computeFifoForRequests,
  getTotalStockMap,
  type FifoAllocation,
} from "@/modules/inventory-batch/inventory-batch.fifo";
import type { Prisma } from "../../../prisma/generated/client";
import type { InventoryUnit } from "../../../prisma/generated/enums";
import type {
  CreateProductionInput,
  ListProductionQuery,
  PreviewProductionInput,
} from "./production.validator";

// ============================================================
// Batch code helpers
// ============================================================

function makeBatchPrefix(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned.length > 0 ? cleaned : "FPB";
}

async function generateFinishedBatchCode(
  tx: Prisma.TransactionClient,
  productId: string,
  prefix: string
): Promise<string> {
  const count = await tx.finishedProductBatch.count({
    where: { productId },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

// ============================================================
// Preview types
// ============================================================

export type ProductionPreviewItem = {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  requiredQuantity: number;
  availableStock: number;
  unitCost: number | null;
  subtotal: number | null;
  fulfilled: boolean;
  shortage: number;
  allocations: FifoAllocation[];
};

export type ProductionPreviewData = {
  product: {
    id: string;
    name: string;
    sellingPrice: number;
  };
  recipe: {
    id: string;
    version: number;
  };
  outputQuantity: number;
  items: ProductionPreviewItem[];
  totalCost: number;
  unitCost: number;
  canProduce: boolean;
  shortages: Array<{
    inventoryItemName: string;
    unit: string;
    needed: number;
    available: number;
    shortage: number;
  }>;
};

// ============================================================
// Build Preview (shared by preview & create)
// ============================================================

async function buildProductionPreview(
  input: PreviewProductionInput
): Promise<ProductionPreviewData> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      isActive: true,
      sellingPrice: true,
      recipes: {
        where: { isActive: true },
        take: 1,
        include: {
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) throw ApiError.notFound("Produk tidak ditemukan");
  if (!product.isActive) {
    throw ApiError.unprocessable(
      `Produk "${product.name}" sedang tidak aktif`
    );
  }

  const recipe = product.recipes[0];
  if (!recipe) {
    throw ApiError.unprocessable(
      `Produk "${product.name}" belum punya resep aktif. Buat resep dulu.`
    );
  }
  if (recipe.items.length === 0) {
    throw ApiError.unprocessable("Resep aktif tidak punya bahan.");
  }

  const requests = recipe.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    quantity: Number(item.quantity) * input.outputQuantity,
  }));

  const itemIds = [...new Set(requests.map((r) => r.inventoryItemId))];

  const [fifoMap, stockMap] = await Promise.all([
    computeFifoForRequests(requests),
    getTotalStockMap(itemIds),
  ]);

  const items: ProductionPreviewItem[] = recipe.items.map((item, idx) => {
    const requiredQuantity = Number(item.quantity) * input.outputQuantity;
    const fifo = fifoMap.get(idx);
    const unitCost = fifo?.effectiveUnitCost ?? null;
    const subtotal =
      fifo && fifo.totalQuantity > 0 ? fifo.totalCost : null;
    const availableStock = stockMap.get(item.inventoryItemId) ?? 0;
    const shortage = fifo?.shortage ?? requiredQuantity;

    return {
      inventoryItemId: item.inventoryItemId,
      inventoryItemName: item.inventoryItem.name,
      unit: item.inventoryItem.unit,
      requiredQuantity,
      availableStock,
      unitCost,
      subtotal,
      fulfilled: fifo?.fulfilled ?? false,
      shortage,
      allocations: fifo?.allocations ?? [],
    };
  });

  const totalCost = items.reduce(
    (sum, it) => sum + (it.subtotal ?? 0),
    0
  );
  const unitCost =
    input.outputQuantity > 0 ? totalCost / input.outputQuantity : 0;
  const canProduce = items.every((it) => it.fulfilled);

  const shortages = items
    .filter((it) => !it.fulfilled)
    .map((it) => ({
      inventoryItemName: it.inventoryItemName,
      unit: it.unit,
      needed: it.requiredQuantity,
      available: it.availableStock,
      shortage: it.shortage,
    }));

  return {
    product: {
      id: product.id,
      name: product.name,
      sellingPrice: Number(product.sellingPrice),
    },
    recipe: {
      id: recipe.id,
      version: recipe.version,
    },
    outputQuantity: input.outputQuantity,
    items,
    totalCost,
    unitCost,
    canProduce,
    shortages,
  };
}

// ============================================================
// Preview
// ============================================================

export async function previewProduction(input: PreviewProductionInput) {
  return buildProductionPreview(input);
}

// ============================================================
// Create
// ============================================================

export async function createProduction(input: CreateProductionInput) {
  // Pre-validate (fail fast + friendly error)
  const preview = await buildProductionPreview(input);

  if (!preview.canProduce) {
    const detail = preview.shortages
      .map(
        (s) =>
          `- ${s.inventoryItemName}: butuh ${s.needed} ${s.unit}, tersedia ${s.available} ${s.unit} (kurang ${s.shortage} ${s.unit})`
      )
      .join("\n");
    throw ApiError.unprocessable(
      `Stok tidak cukup untuk produksi:\n${detail}`
    );
  }

  const prefix = makeBatchPrefix(preview.product.name);

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Kurangi remainingQuantity tiap batch (optimistic lock)
      for (const item of preview.items) {
        for (const alloc of item.allocations) {
          const updated = await tx.inventoryBatch.updateMany({
            where: {
              id: alloc.batchId,
              remainingQuantity: { gte: alloc.quantity },
            },
            data: {
              remainingQuantity: { decrement: alloc.quantity },
            },
          });

          if (updated.count === 0) {
            throw ApiError.unprocessable(
              `Stok batch ${alloc.batchCode} berubah saat memproses. ` +
                `Silakan coba lagi.`
            );
          }
        }
      }

      // 2. Create Production
      const production = await tx.production.create({
        data: {
          productId: preview.product.id,
          outputQuantity: preview.outputQuantity,
          totalCost: preview.totalCost,
          unitCost: preview.unitCost,
        },
      });

      // 3. Create ProductionComponent per allocation
      const componentData: Prisma.ProductionComponentCreateManyInput[] =
        [];
      for (const item of preview.items) {
        for (const alloc of item.allocations) {
          componentData.push({
            productionId: production.id,
            inventoryItemId: item.inventoryItemId,
            inventoryBatchId: alloc.batchId,
            name: item.inventoryItemName,
            quantity: alloc.quantity,
            unit: item.unit as InventoryUnit,
            unitCost: alloc.unitCost,
            totalCost: alloc.subtotal,
          });
        }
      }
      await tx.productionComponent.createMany({ data: componentData });

      // 4. Generate batch code
      const batchCode = await generateFinishedBatchCode(
        tx,
        preview.product.id,
        prefix
      );

      // 5. Create FinishedProductBatch
      const finishedBatch = await tx.finishedProductBatch.create({
        data: {
          productId: preview.product.id,
          productionId: production.id,
          batchCode,
          quantity: preview.outputQuantity,
          remainingQuantity: preview.outputQuantity,
          unitCost: preview.unitCost,
          totalCost: preview.totalCost,
        },
      });

      // 6. Create ProductCostHistory
      await tx.productCostHistory.create({
        data: {
          productId: preview.product.id,
          hpp: preview.unitCost,
        },
      });

      return { production, finishedBatch };
    },
    { timeout: 60000 }
  );

  return {
    success: true,
    productionId: result.production.id,
    batchCode: result.finishedBatch.batchCode,
    outputQuantity: preview.outputQuantity,
    totalCost: preview.totalCost,
    unitCost: preview.unitCost,
  };
}

// ============================================================
// List
// ============================================================

export async function listProductions(query: ListProductionQuery) {
  const where: Prisma.ProductionWhereInput = {};

  if (query.productId) where.productId = query.productId;

  if (query.search) {
    where.OR = [
      {
        product: {
          name: { contains: query.search, mode: "insensitive" },
        },
      },
      {
        finishedProductBatch: {
          batchCode: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;

  const [productions, total, summary] = await Promise.all([
    prisma.production.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      include: {
        product: { select: { id: true, name: true } },
        finishedProductBatch: {
          select: {
            id: true,
            batchCode: true,
            quantity: true,
            remainingQuantity: true,
          },
        },
        _count: { select: { components: true } },
      },
    }),
    prisma.production.count({ where }),
    prisma.production.aggregate({
      where,
      _sum: { outputQuantity: true, totalCost: true },
      _count: { _all: true },
    }),
  ]);

  return {
    items: productions.map((p) => ({
      id: p.id,
      productId: p.productId,
      productName: p.product.name,
      outputQuantity: Number(p.outputQuantity),
      totalCost: Number(p.totalCost),
      unitCost: Number(p.unitCost),
      componentCount: p._count.components,
      finishedBatch: p.finishedProductBatch
        ? {
            id: p.finishedProductBatch.id,
            batchCode: p.finishedProductBatch.batchCode,
            quantity: Number(p.finishedProductBatch.quantity),
            remainingQuantity: Number(
              p.finishedProductBatch.remainingQuantity
            ),
          }
        : null,
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    summary: {
      count: summary._count._all,
      totalOutput: Number(summary._sum.outputQuantity ?? 0),
      totalCost: Number(summary._sum.totalCost ?? 0),
    },
  };
}

// ============================================================
// Detail
// ============================================================

export async function getProductionById(id: string) {
  const production = await prisma.production.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, sellingPrice: true },
      },
      components: {
        orderBy: [{ inventoryItemId: "asc" }, { createdAt: "asc" }],
        include: {
          inventoryItem: {
            select: { id: true, name: true, unit: true },
          },
          inventoryBatch: {
            select: { id: true, batchCode: true },
          },
        },
      },
      finishedProductBatch: {
        select: {
          id: true,
          batchCode: true,
          quantity: true,
          remainingQuantity: true,
          unitCost: true,
          totalCost: true,
        },
      },
    },
  });

  if (!production) throw ApiError.notFound("Produksi tidak ditemukan");

  return {
    id: production.id,
    productId: production.productId,
    product: {
      id: production.product.id,
      name: production.product.name,
      sellingPrice: Number(production.product.sellingPrice),
    },
    outputQuantity: Number(production.outputQuantity),
    totalCost: Number(production.totalCost),
    unitCost: Number(production.unitCost),
    components: production.components.map((c) => ({
      id: c.id,
      inventoryItemId: c.inventoryItemId,
      inventoryItemName: c.inventoryItem.name,
      inventoryBatchId: c.inventoryBatchId,
      batchCode: c.inventoryBatch.batchCode,
      name: c.name,
      quantity: Number(c.quantity),
      unit: c.unit,
      unitCost: Number(c.unitCost),
      totalCost: Number(c.totalCost),
    })),
    finishedBatch: production.finishedProductBatch
      ? {
          id: production.finishedProductBatch.id,
          batchCode: production.finishedProductBatch.batchCode,
          quantity: Number(production.finishedProductBatch.quantity),
          remainingQuantity: Number(
            production.finishedProductBatch.remainingQuantity
          ),
          unitCost: Number(production.finishedProductBatch.unitCost),
          totalCost: Number(production.finishedProductBatch.totalCost),
        }
      : null,
    createdAt: production.createdAt.toISOString(),
  };
}