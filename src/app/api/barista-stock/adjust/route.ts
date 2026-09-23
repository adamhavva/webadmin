// ============================================================
// API: /api/barista-stock/adjust
// POST → koreksi manual stock barista (stock opname)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { adjustBaristaStockSchema } from "@/modules/barista-stock/barista-stock.validator";
import { adjustBaristaStock } from "@/modules/barista-stock/barista-stock.service";

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = adjustBaristaStockSchema.parse(body);
  const result = await adjustBaristaStock(input);
  return ok(result);
});