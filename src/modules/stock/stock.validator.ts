// ============================================================
// STOCK VALIDATOR
// ============================================================

import { z } from "zod";

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().nonnegative().default(100),
});

export type LowStockQuery = z.infer<typeof lowStockQuerySchema>;