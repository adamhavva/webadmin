import { z } from "zod";

// ============================================================
// Query schema
// ============================================================

export const orderReportQuerySchema = z.object({
  status: z
    .enum([
      "all",
      "PENDING",
      "SEARCHING",
      "ASSIGNED",
      "ACCEPTED",
      "DELIVERING",
      "ARRIVED",
      "COMPLETED",
      "CANCELLED",
      "FAILED",
    ])
    .default("all"),
  channel: z.enum(["all", "ONLINE", "OFFLINE"]).default("all"),
  paymentMethodCode: z.string().optional(),
  baristaId: z.string().optional(),
  customerId: z.string().optional(),
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
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type OrderReportQuery = z.infer<typeof orderReportQuerySchema>;