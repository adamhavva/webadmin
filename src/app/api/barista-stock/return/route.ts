// ============================================================
// API: /api/barista-stock/return
// POST → barista kembalikan stok ke pusat
// ============================================================

import { handleAuth, created } from "@/lib/api-response";
import { returnBaristaStockSchema } from "@/modules/barista-stock/barista-stock.validator";
import { returnBaristaStock } from "@/modules/barista-stock/barista-stock.service";

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = returnBaristaStockSchema.parse(body);
  const result = await returnBaristaStock(input);
  return created(result);
});