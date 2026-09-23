// ============================================================
// API: /api/inventory/finished-batches/[id]
// GET → detail finished product batch
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getFinishedBatchById } from "@/modules/finished-batch/finished-batch.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const batch = await getFinishedBatchById(id);
  return ok(batch);
});