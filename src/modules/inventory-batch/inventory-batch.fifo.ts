import { prisma } from "@/lib/db";

// ============================================================
// Types
// ============================================================

/** Batch yang sudah dinormalisasi — siap dipakai simulasi FIFO. */
export type FifoBatch = {
  id: string;
  batchCode: string;
  remainingQuantity: number;
  unitCost: number;
};

/** Satu alokasi = 1 batch × quantity yang diambil. */
export type FifoAllocation = {
  batchId: string;
  batchCode: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

/** Hasil simulasi FIFO untuk 1 kebutuhan material. */
export type FifoResult = {
  allocations: FifoAllocation[];
  /** Total quantity yang berhasil dialokasikan */
  totalQuantity: number;
  /** Total cost dari alokasi */
  totalCost: number;
  /** Rata-rata tertimbang dari alokasi; null kalau tidak ada alokasi */
  effectiveUnitCost: number | null;
  /** true kalau totalQuantity >= neededQuantity */
  fulfilled: boolean;
  /** Kalau fulfilled=false, berapa yang kurang */
  shortage: number;
};

/** Request FIFO — pasangan item + quantity yang dibutuhkan. */
export type FifoRequest = {
  inventoryItemId: string;
  quantity: number;
};

// ============================================================
// Pure Logic — simulasi FIFO tanpa DB
// ============================================================

/**
 * Simulasi alokasi FIFO.
 *
 * `batches` HARUS terurut ASC by createdAt (batch tertua duluan).
 *
 * Contoh:
 *   batches = [
 *     { remaining: 10,   unitCost: 15 },   // BATCH-A (lebih tua)
 *     { remaining: 1000, unitCost: 18 },   // BATCH-B
 *   ]
 *   needed = 100
 *
 *   → BATCH-A: 10 × 15  = 150
 *   → BATCH-B: 90 × 18  = 1620
 *   → totalQuantity = 100, totalCost = 1770
 *   → effectiveUnitCost = 17.7
 *   → fulfilled = true
 */
export function simulateFifo(
  batches: FifoBatch[],
  neededQuantity: number
): FifoResult {
  // Guard: kebutuhan invalid
  if (neededQuantity <= 0) {
    return {
      allocations: [],
      totalQuantity: 0,
      totalCost: 0,
      effectiveUnitCost: null,
      fulfilled: true,
      shortage: 0,
    };
  }

  const allocations: FifoAllocation[] = [];
  let remaining = neededQuantity;
  let totalQuantity = 0;
  let totalCost = 0;

  for (const batch of batches) {
    if (remaining <= 0) break;
    if (batch.remainingQuantity <= 0) continue;

    const take = Math.min(batch.remainingQuantity, remaining);
    const subtotal = take * batch.unitCost;

    allocations.push({
      batchId: batch.id,
      batchCode: batch.batchCode,
      quantity: take,
      unitCost: batch.unitCost,
      subtotal,
    });

    totalQuantity += take;
    totalCost += subtotal;
    remaining -= take;
  }

  const fulfilled = remaining <= 0;
  const shortage = fulfilled ? 0 : remaining;
  const effectiveUnitCost =
    totalQuantity > 0 ? totalCost / totalQuantity : null;

  return {
    allocations,
    totalQuantity,
    totalCost,
    effectiveUnitCost,
    fulfilled,
    shortage,
  };
}

// ============================================================
// Query Helpers — fetch dari DB
// ============================================================

/**
 * Ambil semua batch MILIK SATU item yang masih ada stok, terurut FIFO.
 */
async function fetchFifoBatches(
  inventoryItemId: string
): Promise<FifoBatch[]> {
  const rows = await prisma.inventoryBatch.findMany({
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

  return rows.map((row) => ({
    id: row.id,
    batchCode: row.batchCode,
    remainingQuantity: Number(row.remainingQuantity),
    unitCost: Number(row.unitCost),
  }));
}

/**
 * Simulasi FIFO untuk SATU item.
 */
export async function computeFifoForItem(
  inventoryItemId: string,
  quantity: number
): Promise<FifoResult> {
  const batches = await fetchFifoBatches(inventoryItemId);
  return simulateFifo(batches, quantity);
}

/**
 * Simulasi FIFO untuk BANYAK item sekaligus.
 *
 * Query batch di-batch jadi satu round-trip, lalu simulasi per request.
 * Return Map dengan key = index request (0-based).
 *
 * Cocok dipakai untuk recipe: tiap RecipeItem punya inventoryItemId + qty.
 */
export async function computeFifoForRequests(
  requests: FifoRequest[]
): Promise<Map<number, FifoResult>> {
  const result = new Map<number, FifoResult>();
  if (requests.length === 0) return result;

  const uniqueItemIds = [...new Set(requests.map((r) => r.inventoryItemId))];

  // Single query untuk semua item
  const rows = await prisma.inventoryBatch.findMany({
    where: {
      inventoryItemId: { in: uniqueItemIds },
      remainingQuantity: { gt: 0 },
    },
    orderBy: [{ inventoryItemId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      inventoryItemId: true,
      batchCode: true,
      remainingQuantity: true,
      unitCost: true,
    },
  });

  // Group per item
  const batchesByItem = new Map<string, FifoBatch[]>();
  for (const row of rows) {
    const list = batchesByItem.get(row.inventoryItemId) ?? [];
    list.push({
      id: row.id,
      batchCode: row.batchCode,
      remainingQuantity: Number(row.remainingQuantity),
      unitCost: Number(row.unitCost),
    });
    batchesByItem.set(row.inventoryItemId, list);
  }

  // Simulasi per request
  requests.forEach((req, idx) => {
    const batches = batchesByItem.get(req.inventoryItemId) ?? [];
    result.set(idx, simulateFifo(batches, req.quantity));
  });

  return result;
}

// ============================================================
// Aggregates — total stock per item
// ============================================================

/**
 * Total stok tersedia (Σ remainingQuantity) untuk beberapa item sekaligus.
 *
 * Item yang tidak punya batch akan di-set 0.
 */
export async function getTotalStockMap(
  inventoryItemIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (inventoryItemIds.length === 0) return result;

  const rows = await prisma.inventoryBatch.groupBy({
    by: ["inventoryItemId"],
    where: {
      inventoryItemId: { in: inventoryItemIds },
      remainingQuantity: { gt: 0 },
    },
    _sum: { remainingQuantity: true },
  });

  for (const row of rows) {
    result.set(row.inventoryItemId, Number(row._sum.remainingQuantity ?? 0));
  }

  // Default 0 untuk item yang tidak punya batch
  for (const id of inventoryItemIds) {
    if (!result.has(id)) result.set(id, 0);
  }

  return result;
}