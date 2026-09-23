// ============================================================
// API: /api/inventory/finished-products
// GET → list finished product batches
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listFinishedBatchQuerySchema } from "@/modules/finished-products/finished-product.validator";
import { listFinishedBatches } from "@/modules/finished-products/finished-product.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listFinishedBatchQuerySchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listFinishedBatches(query);
  return ok(result);
});