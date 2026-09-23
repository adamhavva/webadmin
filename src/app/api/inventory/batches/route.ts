// ============================================================
// API: /api/inventory/batches
// GET → list inventory batches (stock material per batch)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listInventoryBatchQuerySchema } from "@/modules/inventory-batch/inventory-batch.validator";
import { listInventoryBatches } from "@/modules/inventory-batch/inventory-batch.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listInventoryBatchQuerySchema.parse({
    inventoryItemId: url.searchParams.get("inventoryItemId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    onlyAvailable: url.searchParams.get("onlyAvailable") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listInventoryBatches(query);
  return ok(result);
});