// ============================================================
// PRODUCT VALIDATOR
// ============================================================

import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  sellingPrice: z
    .number()
    .nonnegative("Harga jual tidak boleh negatif"),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    sellingPrice: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada field yang diubah",
  });

export const listProductQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductQuery = z.infer<typeof listProductQuerySchema>;