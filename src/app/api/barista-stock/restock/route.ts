// ============================================================
// API: /api/barista-stock/restock
// POST → barista ambil stok dari pusat
// ============================================================

import { handleAuth, created } from "@/lib/api-response";
import { restockBaristaSchema } from "@/modules/barista-stock/barista-stock.validator";
import { restockBarista } from "@/modules/barista-stock/barista-stock.service";

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = restockBaristaSchema.parse(body);
  const result = await restockBarista(input);
  return created(result);
});