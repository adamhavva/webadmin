import { z } from "zod";

// ============================================================
// Summary query
// ============================================================

export const stockSummaryQuerySchema = z.object({
  lowStockThreshold: z.coerce.number().nonnegative().default(100),
  search: z.string().trim().optional(),
  materialStatus: z
    .enum(["all", "in_stock", "low", "out"])
    .default("all"),
  finishedStatus: z
    .enum(["all", "available", "empty"])
    .default("all"),
});

// ============================================================
// Low stock query
// ============================================================

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().nonnegative().default(100),
  search: z.string().trim().optional(),
});

// ============================================================
// Types
// ============================================================

export type StockSummaryQuery = z.infer<typeof stockSummaryQuerySchema>;
export type LowStockQuery = z.infer<typeof lowStockQuerySchema>;