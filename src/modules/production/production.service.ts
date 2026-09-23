// ============================================================
// PRODUCTION SERVICE
//
// Flow:
//   Product
//     ↓
//   Active Recipe
//     ↓
//   Required Material (RecipeItem.quantity × outputQuantity)
//     ↓
//   FIFO InventoryBatch
//     ↓
//   ProductionComponent
//     ↓
//   HPP
//     ↓
//   FinishedProductBatch + ProductCostHistory
//
// Semua mutation di dalam SATU transaction Serializable.
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type {
  CreateProductionInput,
  ListProductionQuery,
} from "./production.validator";
import { planFifoConsumption, type FifoPlanItem } from "./production.fifo";

/**
 * Bikin prefix batchCode dari nama product.
 */
function makeBatchPrefix(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return cleaned.length > 0 ? cleaned : "PROD";
}

/**
 * ============================================================
 * PREVIEW PRODUCTION
 * ============================================================
 */
export async function previewProduction(input: CreateProductionInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Product
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, isActive: true, sellingPrice: true },
    });

    if (!product) throw ApiError.notFound("Product tidak ditemukan");
    if (!product.isActive) {
      throw ApiError.unprocessable(
        `Product "${product.name}" sedang tidak aktif`
      );
    }

    // 2. Active recipe
    const recipe = await tx.productRecipe.findFirst({
      where: { productId: product.id, isActive: true },
      select: {
        id: true,
        version: true,
        items: {
          select: {
            id: true,
            quantity: true,
            inventoryItem: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw ApiError.unprocessable(
        `Product "${product.name}" belum punya recipe aktif`
      );
    }

    if (recipe.items.length === 0) {
      throw ApiError.unprocessable(
        `Recipe aktif Product "${product.name}" tidak punya item`
      );
    }

    // 3. Hitung kebutuhan + plan FIFO per material
    const materialPlans: {
      inventoryItemId: string;
      inventoryItemName: string;
      unit: string;
      requiredQuantity: number;
      fifo: FifoPlanItem[];
    }[] = [];

    let totalCost = 0;

    for (const item of recipe.items) {
      const required = Number(item.quantity) * input.outputQuantity;

      const fifo = await planFifoConsumption(
        tx,
        item.inventoryItem.id,
        required
      );

      const materialCost = fifo.reduce((sum, f) => sum + f.totalCost, 0);
      totalCost += materialCost;

      materialPlans.push({
        inventoryItemId: item.inventoryItem.id,
        inventoryItemName: item.inventoryItem.name,
        unit: item.inventoryItem.unit,
        requiredQuantity: required,
        fifo,
      });
    }

    const unitCost = totalCost / input.outputQuantity;

    return {
      product: {
        id: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice,
      },
      recipe: { id: recipe.id, version: recipe.version },
      outputQuantity: input.outputQuantity,
      materials: materialPlans,
      totalCost,
      unitCost,
    };
  });
}

/**
 * ============================================================
 * CREATE PRODUCTION
 * ============================================================
 */
export async function createProduction(input: CreateProductionInput) {
  const MAX_RETRY = 3;

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // -------- 1. Product --------
          const product = await tx.product.findUnique({
            where: { id: input.productId },
            select: { id: true, name: true, isActive: true },
          });

          if (!product) throw ApiError.notFound("Product tidak ditemukan");
          if (!product.isActive) {
            throw ApiError.unprocessable(
              `Product "${product.name}" sedang tidak aktif`
            );
          }

          // -------- 2. Active recipe --------
          const recipe = await tx.productRecipe.findFirst({
            where: { productId: product.id, isActive: true },
            select: {
              id: true,
              version: true,
              items: {
                select: {
                  quantity: true,
                  inventoryItem: {
                    select: { id: true, name: true, unit: true },
                  },
                },
              },
            },
          });

          if (!recipe) {
            throw ApiError.unprocessable(
              `Product "${product.name}" belum punya recipe aktif`
            );
          }

          if (recipe.items.length === 0) {
            throw ApiError.unprocessable(
              `Recipe aktif Product "${product.name}" tidak punya item`
            );
          }

          // -------- 3. Plan FIFO untuk semua material --------
          const allPlans: FifoPlanItem[] = [];
          let totalCost = 0;

          for (const item of recipe.items) {
            const required = Number(item.quantity) * input.outputQuantity;

            const fifo = await planFifoConsumption(
              tx,
              item.inventoryItem.id,
              required
            );

            for (const f of fifo) {
              totalCost += f.totalCost;
            }
            allPlans.push(...fifo);
          }

          const unitCost = totalCost / input.outputQuantity;

          // -------- 4. Create Production --------
          const production = await tx.production.create({
            data: {
              productId: product.id,
              outputQuantity: input.outputQuantity,
              totalCost,
              unitCost,
            },
            select: { id: true, createdAt: true },
          });

          // -------- 5. Update InventoryBatch + create ProductionComponent --------
          for (const plan of allPlans) {
            const updated = await tx.inventoryBatch.updateMany({
              where: {
                id: plan.inventoryBatchId,
                remainingQuantity: { gte: plan.quantity },
              },
              data: {
                remainingQuantity: { decrement: plan.quantity },
              },
            });

            if (updated.count === 0) {
              throw ApiError.unprocessable(
                `Batch "${plan.batchCode}" untuk material ` +
                  `"${plan.inventoryItemName}" tidak lagi mencukupi. ` +
                  `Silakan coba lagi.`
              );
            }

            const invItem = await tx.inventoryItem.findUnique({
              where: { id: plan.inventoryItemId },
              select: { name: true, unit: true },
            });

            await tx.productionComponent.create({
              data: {
                productionId: production.id,
                inventoryItemId: plan.inventoryItemId,
                inventoryBatchId: plan.inventoryBatchId,
                name: invItem?.name ?? plan.inventoryItemName,
                quantity: plan.quantity,
                unit: invItem?.unit ?? "PCS",
                unitCost: plan.unitCost,
                totalCost: plan.totalCost,
              },
            });
          }

          // -------- 6. FinishedProductBatch --------
          const prefix = makeBatchPrefix(product.name);
          const count = await tx.finishedProductBatch.count({
            where: { productId: product.id },
          });
          const batchCode = `${prefix}-${String(count + 1).padStart(4, "0")}`;

          const finishedBatch = await tx.finishedProductBatch.create({
            data: {
              productId: product.id,
              productionId: production.id,
              batchCode,
              quantity: input.outputQuantity,
              remainingQuantity: input.outputQuantity,
              unitCost,
              totalCost,
            },
            select: {
              id: true,
              batchCode: true,
              quantity: true,
              remainingQuantity: true,
              unitCost: true,
              totalCost: true,
              createdAt: true,
            },
          });

          // -------- 7. ProductCostHistory --------
          await tx.productCostHistory.create({
            data: {
              productId: product.id,
              hpp: unitCost,
            },
          });

          return {
            id: production.id,
            productId: product.id,
            outputQuantity: input.outputQuantity,
            totalCost,
            unitCost,
            createdAt: production.createdAt,
            finishedProductBatch: finishedBatch,
          };
        },
        {
          isolationLevel: "Serializable",
          timeout: 15000,
        }
      );
    } catch (err) {
      const isSerialization =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2034";

      if (isSerialization && attempt < MAX_RETRY - 1) {
        continue;
      }
      throw err;
    }
  }

  throw ApiError.internal("Production gagal setelah beberapa kali percobaan");
}

/**
 * ============================================================
 * LIST PRODUCTIONS
 *
 * Filter:
 *   - productId   (exact match)
 *   - search      (nama product, case-insensitive)
 *   - dateFrom    (createdAt >= dateFrom)
 *   - dateTo      (createdAt <= dateTo)
 *   - page        (default 1)
 *   - limit       (default 20, max 100)
 * ============================================================
 */
export async function listProductions(query: ListProductionQuery) {
  const where: Prisma.ProductionWhereInput = {};

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.search) {
    where.product = {
      name: { contains: query.search, mode: "insensitive" },
    };
  }

  // Filter tanggal
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.production.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        productId: true,
        outputQuantity: true,
        totalCost: true,
        unitCost: true,
        createdAt: true,
        product: {
          select: { id: true, name: true, sellingPrice: true },
        },
        finishedProductBatch: {
          select: {
            id: true,
            batchCode: true,
            remainingQuantity: true,
          },
        },
        _count: { select: { components: true } },
      },
    }),
    prisma.production.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

/**
 * ============================================================
 * GET PRODUCTION BY ID
 * ============================================================
 */
export async function getProductionById(id: string) {
  const production = await prisma.production.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      outputQuantity: true,
      totalCost: true,
      unitCost: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          sellingPrice: true,
        },
      },
      components: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          unitCost: true,
          totalCost: true,
          inventoryItem: {
            select: { id: true, name: true, unit: true },
          },
          inventoryBatch: {
            select: { id: true, batchCode: true, createdAt: true },
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
          createdAt: true,
        },
      },
    },
  });

  if (!production) {
    throw ApiError.notFound("Production tidak ditemukan");
  }

  return production;
}

/**
 * ============================================================
 * PRODUCTION OPTIONS
 * ============================================================
 */
export async function getProductionOptions() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      recipes: { some: { isActive: true } },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      recipes: {
        where: { isActive: true },
        take: 1,
        select: {
          id: true,
          version: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  const stockAgg = await prisma.finishedProductBatch.groupBy({
    by: ["productId"],
    _sum: { remainingQuantity: true },
  });

  const stockMap = new Map(
    stockAgg.map((s) => [s.productId, Number(s._sum.remainingQuantity ?? 0)])
  );

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sellingPrice: p.sellingPrice,
    activeRecipe: p.recipes[0] ?? null,
    finishedStock: stockMap.get(p.id) ?? 0,
  }));
}