// ============================================================
// API: /api/dashboard/stats
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { dashboardStatsQuerySchema } from "@/modules/dashboard/dashboard.validator";
import { getDashboardStats } from "@/modules/dashboard/dashboard.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = dashboardStatsQuerySchema.parse({
    trendDays: url.searchParams.get("trendDays") ?? undefined,
    recentLimit: url.searchParams.get("recentLimit") ?? undefined,
    lowStockThreshold:
      url.searchParams.get("lowStockThreshold") ?? undefined,
    topProductsLimit:
      url.searchParams.get("topProductsLimit") ?? undefined,
  });

  const stats = await getDashboardStats(query);
  return ok(stats);
});