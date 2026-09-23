import { z } from "zod";

// ============================================================
// Create
// ============================================================

export const createProductionSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  outputQuantity: z.coerce
    .number({ error: "Output quantity harus berupa angka" })
    .positive("Output quantity harus lebih dari 0"),
});

// ============================================================
// Preview
// ============================================================

export const previewProductionSchema = createProductionSchema;

// ============================================================
// List
// ============================================================

export const listProductionQuerySchema = z.object({
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

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type PreviewProductionInput = z.infer<
  typeof previewProductionSchema
>;
export type ListProductionQuery = z.infer<typeof listProductionQuerySchema>;