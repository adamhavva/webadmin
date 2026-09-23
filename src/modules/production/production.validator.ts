// ============================================================
// PRODUCTION VALIDATOR
// ============================================================

import { z } from "zod";

export const createProductionSchema = z.object({
  productId: z.string().min(1, "Product wajib dipilih"),
  outputQuantity: z
    .number()
    .positive("Output quantity harus lebih dari 0")
    .int("Output quantity harus bilangan bulat"),
});

export const previewProductionSchema = createProductionSchema;

export const listProductionQuerySchema = z
  .object({
    productId: z.string().optional(),
    search: z.string().trim().optional(),
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
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (v) => {
      if (v.dateFrom && v.dateTo) {
        return v.dateFrom <= v.dateTo;
      }
      return true;
    },
    { message: "dateFrom tidak boleh lebih besar dari dateTo" }
  );

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type ListProductionQuery = z.infer<typeof listProductionQuerySchema>;