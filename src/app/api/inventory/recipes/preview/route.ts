// ============================================================
// API: /api/inventory/recipes/preview
// POST → simulasi FIFO untuk daftar bahan + quantity
//
// Body:
//   { items: [{ inventoryItemId, quantity }, ...] }
//
// Response:
//   {
//     success: true,
//     data: {
//       items: [{ inventoryItemId, ..., unitCost, subtotal, fulfilled, ... }],
//       totalHpp,
//       totalFulfilled,
//       unavailableItems
//     }
//   }
// ============================================================

import { z } from "zod";
import { handleAuth, ok } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  computeFifoForRequests,
  getTotalStockMap,
} from "@/modules/inventory-batch/inventory-batch.fifo";

const previewSchema = z.object({
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      })
    )
    .max(50),
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = previewSchema.parse(body);

  if (input.items.length === 0) {
    return ok({
      items: [],
      totalHpp: 0,
      totalFulfilled: true,
      unavailableItems: [],
    });
  }

  // Ambil nama + unit tiap item
  const itemIds = [...new Set(input.items.map((i) => i.inventoryItemId))];
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, unit: true },
  });
  const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

  // Pastikan semua item ada
  for (const it of input.items) {
    if (!itemMap.has(it.inventoryItemId)) {
      throw ApiError.unprocessable("Bahan tidak ditemukan");
    }
  }

  const [fifoMap, stockMap] = await Promise.all([
    computeFifoForRequests(input.items),
    getTotalStockMap(itemIds),
  ]);

  const items = input.items.map((req, idx) => {
    const inv = itemMap.get(req.inventoryItemId)!;
    const fifo = fifoMap.get(idx);
    const unitCost = fifo?.effectiveUnitCost ?? null;
    const subtotal = fifo && fifo.totalQuantity > 0 ? fifo.totalCost : null;
    const availableStock = stockMap.get(req.inventoryItemId) ?? 0;

    return {
      inventoryItemId: req.inventoryItemId,
      inventoryItemName: inv.name,
      unit: inv.unit,
      quantity: req.quantity,
      unitCost,
      subtotal,
      availableStock,
      fulfilled: fifo?.fulfilled ?? false,
      shortage: fifo?.shortage ?? req.quantity,
      allocations: fifo?.allocations ?? [],
    };
  });

  const totalHpp = items.reduce(
    (sum, it) => sum + (it.subtotal ?? 0),
    0
  );

  const totalFulfilled = items.every((it) => it.fulfilled);
  const unavailableItems = items
    .filter((it) => !it.fulfilled)
    .map((it) => it.inventoryItemName);

  return ok({
    items,
    totalHpp,
    totalFulfilled,
    unavailableItems,
  });
});