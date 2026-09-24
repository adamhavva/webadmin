import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  ListInventoryBatchQuery,
  UpdateInventoryBatchInput,
} from "./inventory-batch.validator";

// ============================================================
// List
// ============================================================

export async function listInventoryBatches(query: ListInventoryBatchQuery) {
  const where: Prisma.InventoryBatchWhereInput = {};

  if (query.inventoryItemId) {
    where.inventoryItemId = query.inventoryItemId;
  }

  if (query.onlyAvailable) {
    where.remainingQuantity = { gt: 0 };
  }

  if (query.search) {
    where.OR = [
      { batchCode: { contains: query.search, mode: "insensitive" } },
      {
        inventoryItem: {
          name: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.inventoryBatch.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: query.limit,
      select: {
        id: true,
        inventoryItemId: true,
        batchCode: true,
        sourceType: true,
        quantity: true,
        remainingQuantity: true,
        unitCost: true,
        totalCost: true,
        createdAt: true,
        inventoryItem: {
          select: { id: true, name: true, unit: true, isActive: true },
        },
        restock: {
          select: { id: true, status: true },
        },
      },
    }),
    prisma.inventoryBatch.count({ where }),
  ]);

  // Summary agregat
  const allBatches = await prisma.inventoryBatch.findMany({
    where,
    select: { remainingQuantity: true, unitCost: true },
  });

  const totalValue = allBatches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity) * Number(b.unitCost),
    0
  );
  const totalRemaining = allBatches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity),
    0
  );
  const availableCount = allBatches.filter(
    (b) => Number(b.remainingQuantity) > 0
  ).length;

  return {
    items: items.map((b) => ({
      ...b,
      canEdit: b.restock?.status !== "VOIDED",
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    summary: {
      totalValue,
      totalRemaining,
      count: total,
      availableCount,
    },
  };
}

// ============================================================
// Detail
// ============================================================

export async function getInventoryBatchById(id: string) {
  const batch = await prisma.inventoryBatch.findUnique({
    where: { id },
    select: {
      id: true,
      inventoryItemId: true,
      batchCode: true,
      sourceType: true,
      quantity: true,
      remainingQuantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
      updatedAt: true,
      inventoryItem: {
        select: {
          id: true,
          name: true,
          unit: true,
          isActive: true,
        },
      },
      restock: {
        select: {
          id: true,
          quantity: true,
          totalCost: true,
          unitCost: true,
          supplierName: true,
          status: true,
          voidedAt: true,
          createdAt: true,
        },
      },
      productionComponents: {
        select: {
          id: true,
          productionId: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          createdAt: true,
          production: {
            select: {
              id: true,
              productId: true,
              outputQuantity: true,
              unitCost: true,
              createdAt: true,
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!batch) {
    throw ApiError.notFound("Batch tidak ditemukan");
  }

  const consumed = Number(batch.quantity) - Number(batch.remainingQuantity);
  const remaining = Number(batch.remainingQuantity);
  const initial = Number(batch.quantity);

  const consumedValue = batch.productionComponents.reduce(
    (sum, c) => sum + Number(c.totalCost),
    0
  );

  const remainingValue = remaining * Number(batch.unitCost);

  const canEdit = batch.restock?.status !== "VOIDED";

  return {
    ...batch,
    canEdit,
    stats: {
      initial,
      remaining,
      consumed,
      consumedPct: initial > 0 ? (consumed / initial) * 100 : 0,
      unitCost: Number(batch.unitCost),
      initialValue: Number(batch.totalCost),
      consumedValue,
      remainingValue,
    },
  };
}

// ============================================================
// Update remainingQuantity (stock opname)
// ============================================================

export async function updateInventoryBatch(
  id: string,
  input: UpdateInventoryBatchInput
) {
  const batch = await prisma.inventoryBatch.findUnique({
    where: { id },
    select: {
      id: true,
      batchCode: true,
      quantity: true,
      remainingQuantity: true,
      restock: { select: { status: true } },
    },
  });

  if (!batch) throw ApiError.notFound("Batch tidak ditemukan");

  if (batch.restock?.status === "VOIDED") {
    throw ApiError.unprocessable(
      "Batch ini sudah di-void. Tidak bisa dikoreksi."
    );
  }

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

  await prisma.inventoryBatch.update({
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