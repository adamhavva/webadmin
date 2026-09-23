// ============================================================
// FINISHED BATCH VALIDATOR
//
// FinishedProductBatch = stok Product jadi.
// Read-only, hanya dari Production.
// ============================================================

import { z } from "zod";

export const listFinishedBatchQuerySchema = z.object({
  productId: z.string().optional(),
  search: z.string().trim().optional(),
  onlyAvailable: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFinishedBatchQuery = z.infer<
  typeof listFinishedBatchQuerySchema
>;