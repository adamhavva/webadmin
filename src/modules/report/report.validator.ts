import { z } from "zod";

// ============================================================
// Filter contract — dipakai di semua endpoint report
// ============================================================

export const reportFilterSchema = z.object({
  productId: z.string().optional(),
  isActive: z.enum(["all", "true", "false"]).default("all"),
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
});

export type ReportFilter = z.infer<typeof reportFilterSchema>;