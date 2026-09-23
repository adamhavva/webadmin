// ============================================================
// API: /api/inventory/finished-batches
// GET → list stok Product jadi (finished product stock)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listFinishedBatchQuerySchema } from "@/modules/finished-batch/finished-batch.validator";
import { listFinishedBatches } from "@/modules/finished-batch/finished-batch.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listFinishedBatchQuerySchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    onlyAvailable: url.searchParams.get("onlyAvailable") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listFinishedBatches(query);
  return ok(result);
});