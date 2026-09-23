// ============================================================
// API: /api/barista-stock
// GET → list stock semua barista (admin monitor)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listBaristaStockQuerySchema } from "@/modules/barista-stock/barista-stock.validator";
import { listBaristaStocks } from "@/modules/barista-stock/barista-stock.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listBaristaStockQuerySchema.parse({
    baristaId: url.searchParams.get("baristaId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    lowStockOnly: url.searchParams.get("lowStockOnly") ?? undefined,
  });

  const result = await listBaristaStocks(query);
  return ok(result);
});