import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  ListFinishedBatchQuery,
  UpdateFinishedBatchInput,
  VoidFinishedBatchInput,
} from "./finished-product.validator";

// ============================================================
// List
// ============================================================

export async function listFinishedBatches(
  query: ListFinishedBatchQuery
) {
  const where: Prisma.FinishedProductBatchWhereInput = {};

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.status === "available") {
    where.remainingQuantity = { gt: 0 };
  } else if (query.status === "empty") {
    where.remainingQuantity = { lte: 0 };
  }

  if (query.search) {
    where.OR = [
      { batchCode: { contains: query.search, mode: "insensitive" } },
      {
        product: {
          name: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total, agg] = await Promise.all([
    prisma.finishedProductBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      include: {
        product: {
          select: { id: true, name: true, sellingPrice: true },
        },
        production: {
          select: { id: true, outputQuantity: true },
        },
      },
    }),
    prisma.finishedProductBatch.count({ where }),
    prisma.finishedProductBatch.aggregate({
      where,
      _sum: { remainingQuantity: true, quantity: true },
      _count: { _all: true },
    }),
  ]);

  // Hitung total nilai stock (remaining) berdasarkan unitCost
  const allBatches = await prisma.finishedProductBatch.findMany({
    where,
    select: { remainingQuantity: true, unitCost: true },
  });
  const totalValue = allBatches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity) * Number(b.unitCost),
    0
  );

  const availableCount = await prisma.finishedProductBatch.count({
    where: { ...where, remainingQuantity: { gt: 0 } },
  });

  return {
    items: items.map((b) => {
      const quantity = Number(b.quantity);
      const remaining = Number(b.remainingQuantity);
      const consumed = quantity - remaining;
      const consumedPct =
        quantity > 0 ? (consumed / quantity) * 100 : 0;

      return {
        id: b.id,
        batchCode: b.batchCode,
        productId: b.productId,
        productName: b.product.name,
        productSellingPrice: Number(b.product.sellingPrice),
        productionId: b.productionId,
        quantity,
        remainingQuantity: remaining,
        consumed,
        consumedPct,
        unitCost: Number(b.unitCost),
        totalCost: Number(b.totalCost),
        remainingValue: remaining * Number(b.unitCost),
        canEdit: true,
        canVoid: remaining === quantity,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    summary: {
      count: agg._count._all,
      availableCount,
      totalQuantity: Number(agg._sum.quantity ?? 0),
      totalRemaining: Number(agg._sum.remainingQuantity ?? 0),
      totalValue,
    },
  };
}

// ============================================================
// Detail
// ============================================================

export async function getFinishedBatchById(id: string) {
  const batch = await prisma.finishedProductBatch.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sellingPrice: true,
          isActive: true,
        },
      },
      production: {
        select: {
          id: true,
          outputQuantity: true,
          totalCost: true,
          unitCost: true,
          createdAt: true,
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
        },
      },
    },
  });

  if (!batch) throw ApiError.notFound("Batch produk jadi tidak ditemukan");

  const quantity = Number(batch.quantity);
  const remaining = Number(batch.remainingQuantity);
  const consumed = quantity - remaining;
  const consumedPct = quantity > 0 ? (consumed / quantity) * 100 : 0;

  return {
    id: batch.id,
    batchCode: batch.batchCode,
    productId: batch.productId,
    product: {
      id: batch.product.id,
      name: batch.product.name,
      sellingPrice: Number(batch.product.sellingPrice),
      isActive: batch.product.isActive,
    },
    productionId: batch.productionId,
    production: batch.production
      ? {
          id: batch.production.id,
          outputQuantity: Number(batch.production.outputQuantity),
          totalCost: Number(batch.production.totalCost),
          unitCost: Number(batch.production.unitCost),
          createdAt: batch.production.createdAt.toISOString(),
          components: batch.production.components.map((c) => ({
            id: c.id,
            inventoryItemId: c.inventoryItemId,
            inventoryItemName: c.inventoryItem.name,
            inventoryBatchId: c.inventoryBatchId,
            batchCode: c.inventoryBatch.batchCode,
            quantity: Number(c.quantity),
            unit: c.unit,
            unitCost: Number(c.unitCost),
            totalCost: Number(c.totalCost),
          })),
        }
      : null,
    quantity,
    remainingQuantity: remaining,
    consumed,
    consumedPct,
    unitCost: Number(batch.unitCost),
    totalCost: Number(batch.totalCost),
    remainingValue: remaining * Number(batch.unitCost),
    canEdit: true,
    canVoid: remaining === quantity,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

// ============================================================
// Update remainingQuantity (stock opname)
// ============================================================

export async function updateFinishedBatch(
  id: string,
  input: UpdateFinishedBatchInput
) {
  const batch = await prisma.finishedProductBatch.findUnique({
    where: { id },
    select: {
      id: true,
      batchCode: true,
      quantity: true,
      remainingQuantity: true,
    },
  });

  if (!batch) throw ApiError.notFound("Batch tidak ditemukan");

  const maxQuantity = Number(batch.quantity);

  if (input.remainingQuantity > maxQuantity) {
    throw ApiError.unprocessable(
      `Sisa tidak boleh melebihi quantity awal (${maxQuantity}).`
    );
  }

  const previousRemaining = Number(batch.remainingQuantity);

  if (previousRemaining === input.remainingQuantity) {
    return {
      success: true,
      message: "Tidak ada perubahan",
      batchId: batch.id,
      batchCode: batch.batchCode,
      previousRemaining,
      newRemaining: input.remainingQuantity,
    };
  }

  await prisma.finishedProductBatch.update({
    where: { id },
    data: { remainingQuantity: input.remainingQuantity },
  });

  return {
    success: true,
    batchId: batch.id,
    batchCode: batch.batchCode,
    previousRemaining,
    newRemaining: input.remainingQuantity,
    delta: input.remainingQuantity - previousRemaining,
  };
}

// ============================================================
// Void (un-restock) — batalkan produksi, kembalikan material
// ============================================================

export async function voidFinishedBatch(
  id: string,
  input: VoidFinishedBatchInput
) {
  const batch = await prisma.finishedProductBatch.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true } },
      production: {
        include: {
          components: {
            select: {
              id: true,
              inventoryBatchId: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!batch) throw ApiError.notFound("Batch tidak ditemukan");

  // Konfirmasi batchCode
  if (input.batchCode !== batch.batchCode) {
    throw ApiError.unprocessable(
      `Batch code tidak cocok. Harus: "${batch.batchCode}"`
    );
  }

  // Harus belum pernah terpakai
  if (Number(batch.remainingQuantity) !== Number(batch.quantity)) {
    throw ApiError.unprocessable(
      `Batch "${batch.batchCode}" sudah terpakai sebagian. ` +
        `Un-restock hanya bisa dilakukan jika batch belum pernah dipakai.`
    );
  }

  const production = batch.production;
  if (!production) {
    throw ApiError.unprocessable(
      "Production terkait tidak ditemukan. Tidak bisa un-restock."
    );
  }

  // Heuristic window untuk hapus ProductCostHistory yang terkait
  const windowMs = 5000;
  const from = new Date(production.createdAt.getTime() - windowMs);
  const to = new Date(production.createdAt.getTime() + windowMs);

  const componentCount = production.components.length;

  await prisma.$transaction(
    async (tx) => {
      // 1. Restore material ke InventoryBatch asal
      for (const comp of production.components) {
        await tx.inventoryBatch.update({
          where: { id: comp.inventoryBatchId },
          data: {
            remainingQuantity: { increment: Number(comp.quantity) },
          },
        });
      }

      // 2. Hapus ProductCostHistory terkait (heuristic: hpp + waktu)
      await tx.productCostHistory.deleteMany({
        where: {
          productId: production.productId,
          hpp: production.unitCost,
          createdAt: { gte: from, lte: to },
        },
      });

      // 3. Hapus Production → cascade hapus ProductionComponent + FinishedProductBatch
      await tx.production.delete({ where: { id: production.id } });
    },
    { timeout: 60000 }
  );

  return {
    success: true,
    voidedBatchId: id,
    batchCode: batch.batchCode,
    productName: batch.product.name,
    productionId: production.id,
    restoredComponents: componentCount,
    voidNote: input.voidNote ?? null,
  };
}