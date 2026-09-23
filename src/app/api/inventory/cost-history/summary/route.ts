// ============================================================
// API: /api/inventory/cost-history/summary
// GET → agregat HPP per produk (latest, min, max, avg)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getCostHistorySummary } from "@/modules/cost-history/cost-history.service";

export const GET = handleAuth(async () => {
  const result = await getCostHistorySummary();
  return ok(result);
});