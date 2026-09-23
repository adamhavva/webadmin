// ============================================================
// API: /api/inventory/batches/[id]
// GET    → detail inventory batch
// PATCH  → update remainingQuantity (stock opname)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateInventoryBatchSchema } from "@/modules/inventory-batch/inventory-batch.validator";
import {
  getInventoryBatchById,
  updateInventoryBatch,
} from "@/modules/inventory-batch/inventory-batch.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const batch = await getInventoryBatchById(id);
  return ok(batch);
});

export const PATCH = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateInventoryBatchSchema.parse(body);
  const result = await updateInventoryBatch(id, input);
  return ok(result);
});