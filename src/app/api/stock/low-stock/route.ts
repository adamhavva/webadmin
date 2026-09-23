// ============================================================
// API: /api/stock/low-stock
// GET → daftar bahan yang stok di bawah threshold
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { lowStockQuerySchema } from "@/modules/stock/stock.validator";
import { getLowStockItems } from "@/modules/stock/stock.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = lowStockQuerySchema.parse({
    threshold: url.searchParams.get("threshold") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });

  const result = await getLowStockItems(query);
  return ok(result);
});