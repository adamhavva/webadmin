// ============================================================
// API: /api/inventory/stock/summary
// GET → ringkasan agregat stok material & product
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getStockSummary } from "@/modules/stock/stock.service";

export const GET = handleAuth(async () => {
  const summary = await getStockSummary();
  return ok(summary);
});