// ============================================================
// API: /api/dashboard/stats
// GET → ringkasan dashboard
//
// Query params (opsional):
//   - trendDays         (default 7, max 30)
//   - recentLimit       (default 5, max 20)
//   - lowStockThreshold (default 100)
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
  });

  const stats = await getDashboardStats(query);
  return ok(stats);
});