// ============================================================
// API: /api/inventory/batches/[id]
// GET → detail inventory batch
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getInventoryBatchById } from "@/modules/inventory-batch/inventory-batch.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const batch = await getInventoryBatchById(id);
  return ok(batch);
});