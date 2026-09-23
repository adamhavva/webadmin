// ============================================================
// FIFO ENGINE
//
// Tugas:
// - Membaca batch material yang masih tersedia (remainingQuantity > 0)
// - Mengurutkan dari yang paling lama (createdAt ASC)
// - Mengambil batch satu per satu sampai kebutuhan terpenuhi
//
// TIDAK memodifikasi database. Hanya membuat plan.
// Eksekusi (update remainingQuantity + create ProductionComponent)
// dilakukan oleh production.service.ts.
// ============================================================

import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";

export type FifoPlanItem = {
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryBatchId: string;
  batchCode: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

/**
 * Bikin plan FIFO untuk SATU material.
 *
 * @param tx - Prisma transaction client
 * @param inventoryItemId - material yang akan dikonsumsi
 * @param requiredQuantity - total quantity yang dibutuhkan
 *
 * @returns daftar batch yang akan dikonsumsi, urut dari yang paling lama
 *
 * @throws ApiError.unprocessable kalau total stock tidak cukup
 */
export async function planFifoConsumption(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  requiredQuantity: number
): Promise<FifoPlanItem[]> {
  if (requiredQuantity <= 0) {
    return [];
  }

  // Ambil material untuk snapshot nama
  const inventoryItem = await tx.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    select: { id: true, name: true, unit: true },
  });

  if (!inventoryItem) {
    throw ApiError.unprocessable(
      `Inventory item ${inventoryItemId} tidak ditemukan`
    );
  }

  // FIFO: batch terlama dulu, hanya yang masih ada stock
  const batches = await tx.inventoryBatch.findMany({
    where: {
      inventoryItemId,
      remainingQuantity: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      batchCode: true,
      remainingQuantity: true,
      unitCost: true,
    },
  });

  const totalAvailable = batches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity),
    0
  );

  if (totalAvailable < requiredQuantity) {
    throw ApiError.unprocessable(
      `Stock tidak cukup untuk "${inventoryItem.name}". ` +
        `Dibutuhkan ${requiredQuantity} ${inventoryItem.unit}, ` +
        `tersedia ${totalAvailable} ${inventoryItem.unit}.`
    );
  }

  const plan: FifoPlanItem[] = [];
  let remainingNeed = requiredQuantity;

  for (const batch of batches) {
    if (remainingNeed <= 0) break;

    const available = Number(batch.remainingQuantity);
    const take = Math.min(available, remainingNeed);
    const unitCost = Number(batch.unitCost);

    plan.push({
      inventoryItemId: inventoryItem.id,
      inventoryItemName: inventoryItem.name,
      inventoryBatchId: batch.id,
      batchCode: batch.batchCode,
      quantity: take,
      unitCost,
      totalCost: take * unitCost,
    });

    remainingNeed -= take;
  }

  return plan;
}