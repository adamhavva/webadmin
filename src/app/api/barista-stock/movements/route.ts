// ============================================================
// API: /api/barista-stock/movements
// GET → log pergerakan stock barista
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listMovementsQuerySchema } from "@/modules/barista-stock/barista-stock.validator";
import { listMovements } from "@/modules/barista-stock/barista-stock.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listMovementsQuerySchema.parse({
    baristaId: url.searchParams.get("baristaId") ?? undefined,
    productId: url.searchParams.get("productId") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listMovements(query);
  return ok(result);
});