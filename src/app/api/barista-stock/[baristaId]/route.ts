// ============================================================
// API: /api/barista-stock/[baristaId]
// GET → detail stock 1 barista
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getBaristaStockDetail } from "@/modules/barista-stock/barista-stock.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { baristaId } = await ctx.params;
  const result = await getBaristaStockDetail(baristaId);
  return ok(result);
});