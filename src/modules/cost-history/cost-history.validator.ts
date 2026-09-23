// ============================================================
// COST HISTORY VALIDATOR
//
// ProductCostHistory = histori HPP Product.
// HPP lama tidak diubah ketika cost material berubah.
// ============================================================

import { z } from "zod";

export const listCostHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || !isNaN(Date.parse(v)),
      "dateFrom harus format ISO date"
    )
    .transform((v) => (v ? new Date(v) : undefined)),
  dateTo: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || !isNaN(Date.parse(v)),
      "dateTo harus format ISO date"
    )
    .transform((v) => (v ? new Date(v) : undefined)),
});

export type ListCostHistoryQuery = z.infer<
  typeof listCostHistoryQuerySchema
>;