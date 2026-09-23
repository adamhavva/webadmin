import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type {
  CreateRestockInput,
  ListRestockQuery,
  VoidRestockInput,
} from "./restock.validator";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function makeBatchPrefix(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned.length > 0 ? cleaned : "ITEM";
}

async function generateBatchCode(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  prefix: string
): Promise<string> {
  const count = await tx.inventoryBatch.count({
    where: { inventoryItemId },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

export async function createRestock(input: CreateRestockInput) {
  if (input.items.length === 0) {
    throw ApiError.unprocessable("Minimal 1 baris");
  }

  const itemIds = input.items.map((i) => i.inventoryItemId);
  const uniqueIds = new Set(itemIds);

  if (uniqueIds.size !== itemIds.length) {
    throw ApiError.unprocessable(
      "Bahan tidak boleh duplikat dalam satu transaksi. " +
        "Gabungkan jadi satu baris."
    );
  }

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, unit: true, isActive: true },
  });

  const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

  for (let i = 0; i < input.items.length; i++) {
    const row = input.items[i];
    const inv = itemMap.get(row.inventoryItemId);

    if (!inv) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: bahan tidak ditemukan`
      );
    }
    if (!inv.isActive) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: bahan "${inv.name}" sedang tidak aktif`
      );
    }
    if (row.quantity <= 0) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: quantity harus lebih dari 0`
      );
    }
    if (row.totalCost < 0) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: total cost tidak boleh negatif`
      );
    }
  }

  const created = await prisma.$transaction(
    async (tx) => {
      const results: Array<{
        restockId: string;
        batchId: string;
        batchCode: string;
        inventoryItemId: string;
        inventoryItemName: string;
        unit: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
      }> = [];

      for (const row of input.items) {
        const inv = itemMap.get(row.inventoryItemId)!;
        const prefix = makeBatchPrefix(inv.name);
        const unitCost = row.totalCost / row.quantity;

        const batchCode = await generateBatchCode(tx, inv.id, prefix);

        const batch = await tx.inventoryBatch.create({
          data: {
            inventoryItemId: inv.id,
            batchCode,
            sourceType: "RESTOCK",
            quantity: row.quantity,
            remainingQuantity: row.quantity,
            unitCost,
            totalCost: row.totalCost,
          },
        });

        const restock = await tx.restock.create({
          data: {
            inventoryItemId: inv.id,
            batchId: batch.id,
            quantity: row.quantity,
            totalCost: row.totalCost,
            unitCost,
            supplierName: input.supplierName ?? null,
            status: "ACTIVE",
          },
        });

        results.push({
          restockId: restock.id,
          batchId: batch.id,
          batchCode: batch.batchCode,
          inventoryItemId: inv.id,
          inventoryItemName: inv.name,
          unit: inv.unit,
          quantity: Number(row.quantity),
          unitCost,
          totalCost: Number(row.totalCost),
        });
      }

      return results;
    },
    { timeout: 30000 }
  );

  return {
    success: true,
    count: created.length,
    items: created,
  };
}

// ------------------------------------------------------------
// List
// ------------------------------------------------------------

export async function listRestocks(query: ListRestockQuery) {
  const where: Prisma.RestockWhereInput = {};

  if (query.status === "ACTIVE") {
    where.status = "ACTIVE";
  } else if (query.status === "VOIDED") {
    where.status = "VOIDED";
  }

  if (query.inventoryItemId) {
    where.inventoryItemId = query.inventoryItemId;
  }

  if (query.search) {
    where.OR = [
      {
        inventoryItem: {
          name: { contains: query.search, mode: "insensitive" },
        },
      },
      {
        supplierName: { contains: query.search, mode: "insensitive" },
      },
      {
        batch: {
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

  const [items, total] = await Promise.all([
    prisma.restock.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        inventoryItemId: true,
        batchId: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        supplierName: true,
        status: true,
        voidedAt: true,
        voidNote: true,
        createdAt: true,
        inventoryItem: {
          select: { id: true, name: true, unit: true },
        },
        batch: {
          select: {
            id: true,
            batchCode: true,
            remainingQuantity: true,
            quantity: true,
          },
        },
      },
    }),
    prisma.restock.count({ where }),
  ]);

  const activeBatchIds = items
    .filter((i) => i.status === "ACTIVE")
    .map((i) => i.batchId);

  const consumedBatchIds = new Set<string>();
  if (activeBatchIds.length > 0) {
    const consumed = await prisma.productionComponent.findMany({
      where: { inventoryBatchId: { in: activeBatchIds } },
      select: { inventoryBatchId: true },
      distinct: ["inventoryBatchId"],
    });
    for (const c of consumed) consumedBatchIds.add(c.inventoryBatchId);
  }

  const summary = await prisma.restock.aggregate({
    where,
    _sum: { totalCost: true, quantity: true },
    _count: { _all: true },
  });

  return {
    items: items.map((item) => {
      const batchUtuh =
        Number(item.batch.remainingQuantity) ===
        Number(item.batch.quantity);
      return {
        ...item,
        canVoid:
          item.status === "ACTIVE" &&
          batchUtuh &&
          !consumedBatchIds.has(item.batchId),
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    summary: {
      totalValue: Number(summary._sum.totalCost ?? 0),
      totalQuantity: Number(summary._sum.quantity ?? 0),
      count: summary._count._all,
    },
  };
}

// ------------------------------------------------------------
// Detail
// ------------------------------------------------------------

export async function getRestockById(id: string) {
  const restock = await prisma.restock.findUnique({
    where: { id },
    select: {
      id: true,
      inventoryItemId: true,
      batchId: true,
      quantity: true,
      unitCost: true,
      totalCost: true,
      supplierName: true,
      status: true,
      voidedAt: true,
      voidNote: true,
      createdAt: true,
      inventoryItem: {
        select: { id: true, name: true, unit: true, isActive: true },
      },
      batch: {
        select: {
          id: true,
          batchCode: true,
          quantity: true,
          remainingQuantity: true,
          unitCost: true,
          totalCost: true,
          sourceType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!restock) throw ApiError.notFound("Restock tidak ditemukan");

  const consumptionCount = await prisma.productionComponent.count({
    where: { inventoryBatchId: restock.batchId },
  });

  const canVoid =
    restock.status === "ACTIVE" &&
    Number(restock.batch.remainingQuantity) ===
      Number(restock.batch.quantity) &&
    consumptionCount === 0;

  return { ...restock, canVoid, consumptionCount };
}

// ------------------------------------------------------------
// Void
// ------------------------------------------------------------

export async function voidRestock(id: string, input: VoidRestockInput) {
  const restock = await prisma.restock.findUnique({
    where: { id },
    select: {
      id: true,
      batchId: true,
      status: true,
      voidedAt: true,
      inventoryItem: { select: { name: true } },
      batch: {
        select: {
          id: true,
          batchCode: true,
          quantity: true,
          remainingQuantity: true,
        },
      },
    },
  });

  if (!restock) throw ApiError.notFound("Restock tidak ditemukan");

  if (restock.status === "VOIDED") {
    throw ApiError.unprocessable("Restock ini sudah di-void sebelumnya.");
  }

  // ---------- Konfirmasi batchCode ----------
  if (input.batchCode !== restock.batch.batchCode) {
    throw ApiError.unprocessable(
      `Batch code tidak cocok. Harus: "${restock.batch.batchCode}"`
    );
  }

  if (
    Number(restock.batch.remainingQuantity) !==
    Number(restock.batch.quantity)
  ) {
    throw ApiError.unprocessable(
      `Batch "${restock.batch.batchCode}" sudah terpakai sebagian. ` +
        `Void hanya bisa dilakukan jika batch belum pernah dikonsumsi.`
    );
  }

  const consumptionCount = await prisma.productionComponent.count({
    where: { inventoryBatchId: restock.batchId },
  });

  if (consumptionCount > 0) {
    throw ApiError.unprocessable(
      `Batch "${restock.batch.batchCode}" sudah pernah dipakai di produksi. ` +
        `Void tidak diizinkan untuk menjaga konsistensi HPP historis.`
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.inventoryBatch.update({
      where: { id: restock.batchId },
      data: { remainingQuantity: 0 },
    });

    await tx.restock.update({
      where: { id: restock.id },
      data: {
        status: "VOIDED",
        voidedAt: now,
        voidNote: input.voidNote ?? null,
      },
    });
  });

  return {
    success: true,
    voidedRestockId: restock.id,
    batchCode: restock.batch.batchCode,
    voidedAt: now.toISOString(),
  };
}