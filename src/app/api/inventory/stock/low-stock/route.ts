// ============================================================
// API: /api/inventory/stock/low-stock
// GET → material yang stoknya di bawah threshold
// Query: ?threshold=100 (default 100)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { lowStockQuerySchema } from "@/modules/stock/stock.validator";
import { getLowStockItems } from "@/modules/stock/stock.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = lowStockQuerySchema.parse({
    threshold: url.searchParams.get("threshold") ?? undefined,
  });

  const result = await getLowStockItems(query.threshold);
  return ok(result);
});