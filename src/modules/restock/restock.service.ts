// ============================================================
// RESTOCK SERVICE
//
// Restock selalu menghasilkan SATU InventoryBatch baru.
// Keduanya dibuat dalam satu transaction.
//
// Aturan:
// - quantity > 0
// - totalCost >= 0
// - unitCost = totalCost / quantity (dihitung backend)
// - batchCode digenerate backend
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  CreateRestockInput,
  ListRestockQuery,
} from "./restock.validator";

/**
 * Bikin prefix batchCode dari nama inventory item.
 *
 * Contoh:
 *   "Milk"         → "MILK"
 *   "Coffee Bean"  → "COFFEE"
 *   "Ice Cube"     → "ICECUB"
 *   "@#$%"         → "ITEM"   (fallback)
 */
function makeBatchPrefix(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned.length > 0 ? cleaned : "ITEM";
}

/**
 * Generate batchCode unik per InventoryItem.
 * Format: {PREFIX}-{NNNN}
 *
 * Counter dihitung dari jumlah batch yang sudah ada untuk item tersebut.
 * Kalau terjadi race condition, unique constraint akan menolak dan
 * kita retry di layer createRestock.
 */
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

export async function createRestock(input: CreateRestockInput) {
  // Pastikan InventoryItem ada dan aktif
  const inventoryItem = await prisma.inventoryItem.findUnique({
    where: { id: input.inventoryItemId },
    select: { id: true, name: true, unit: true, isActive: true },
  });

  if (!inventoryItem) {
    throw ApiError.notFound("Inventory item tidak ditemukan");
  }

  if (!inventoryItem.isActive) {
    throw ApiError.unprocessable(
      `Inventory item "${inventoryItem.name}" sedang tidak aktif`
    );
  }

  if (input.quantity <= 0) {
    throw ApiError.unprocessable("Quantity harus lebih dari 0");
  }

  const unitCost = input.totalCost / input.quantity;
  const prefix = makeBatchPrefix(inventoryItem.name);

  // Retry 3x kalau kena unique violation pada batchCode
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const batchCode = await generateBatchCode(
          tx,
          inventoryItem.id,
          prefix
        );

        const batch = await tx.inventoryBatch.create({
          data: {
            inventoryItemId: inventoryItem.id,
            batchCode,
            sourceType: "RESTOCK",
            quantity: input.quantity,
            remainingQuantity: input.quantity,
            unitCost,
            totalCost: input.totalCost,
          },
        });

        const restock = await tx.restock.create({
          data: {
            inventoryItemId: inventoryItem.id,
            batchId: batch.id,
            quantity: input.quantity,
            totalCost: input.totalCost,
            unitCost,
            supplierName: input.supplierName ?? null,
          },
        });

        return {
          ...restock,
          batch,
        };
      });
    } catch (err) {
      const isUnique =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002";

      if (isUnique && attempt < 2) {
        continue; // retry
      }
      throw err;
    }
  }

  throw ApiError.internal("Gagal membuat batchCode unik");
}

export async function listRestocks(query: ListRestockQuery) {
  const where: Prisma.RestockWhereInput = {};

  if (query.inventoryItemId) {
    where.inventoryItemId = query.inventoryItemId;
  }

  if (query.search) {
    where.inventoryItem = {
      name: { contains: query.search, mode: "insensitive" },
    };
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
        createdAt: true,
        inventoryItem: {
          select: { id: true, name: true, unit: true },
        },
        batch: {
          select: { id: true, batchCode: true, remainingQuantity: true },
        },
      },
    }),
    prisma.restock.count({ where }),
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
      createdAt: true,
      inventoryItem: {
        select: { id: true, name: true, unit: true },
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

  if (!restock) {
    throw ApiError.notFound("Restock tidak ditemukan");
  }

  return restock;
}