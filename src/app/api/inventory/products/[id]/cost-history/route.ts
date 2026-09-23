// ============================================================
// API: /api/inventory/products/[id]/cost-history
// GET → histori HPP Product (paginated)
//
// Query params:
//   - page       (default 1)
//   - limit      (default 20, max 100)
//   - dateFrom   (optional, ISO date)
//   - dateTo     (optional, ISO date)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listCostHistoryQuerySchema } from "@/modules/cost-history/cost-history.validator";
import { listProductCostHistories } from "@/modules/cost-history/cost-history.service";

export const GET = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const url = new URL(req.url);

  const query = listCostHistoryQuerySchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });

  const result = await listProductCostHistories(id, query);
  return ok(result);
});