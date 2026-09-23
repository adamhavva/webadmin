// ============================================================
// API: /api/inventory/cost-history
// GET → riwayat pencatatan HPP (dengan filter & pagination)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { listCostHistoryQuerySchema } from "@/modules/cost-history/cost-history.validator";
import { listCostHistories } from "@/modules/cost-history/cost-history.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listCostHistoryQuerySchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listCostHistories(query);
  return ok(result);
});