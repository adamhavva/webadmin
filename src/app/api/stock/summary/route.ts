// ============================================================
// API: /api/stock/summary
// GET → ringkasan stok material + produk jadi + status
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { stockSummaryQuerySchema } from "@/modules/stock/stock.validator";
import { getStockSummary } from "@/modules/stock/stock.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = stockSummaryQuerySchema.parse({
    lowStockThreshold:
      url.searchParams.get("lowStockThreshold") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    materialStatus: url.searchParams.get("materialStatus") ?? undefined,
    finishedStatus: url.searchParams.get("finishedStatus") ?? undefined,
  });

  const result = await getStockSummary(query);
  return ok(result);
});