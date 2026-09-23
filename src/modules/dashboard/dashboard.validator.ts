// ============================================================
// DASHBOARD VALIDATOR
// ============================================================

import { z } from "zod";

export const dashboardStatsQuerySchema = z.object({
  trendDays: z.coerce.number().int().min(1).max(30).default(7),
  recentLimit: z.coerce.number().int().min(1).max(20).default(5),
  lowStockThreshold: z.coerce.number().nonnegative().default(100),
});

export type DashboardStatsQuery = z.infer<
  typeof dashboardStatsQuerySchema
>;