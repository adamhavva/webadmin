import { z } from "zod";

// ============================================================
// List — riwayat pencatatan HPP
// ============================================================

export const listCostHistoryQuerySchema = z.object({
  productId: z.string().optional(),
  search: z.string().trim().optional(),
  dateFrom: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || !isNaN(Date.parse(v)),
      "Format tanggal tidak valid"
    )
    .transform((v) => (v ? new Date(v) : undefined)),
  dateTo: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || !isNaN(Date.parse(v)),
      "Format tanggal tidak valid"
    )
    .transform((v) => (v ? new Date(v) : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Types
// ============================================================

export type ListCostHistoryQuery = z.infer<
  typeof listCostHistoryQuerySchema
>;