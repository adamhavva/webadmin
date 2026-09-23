import { z } from "zod";

// ============================================================
// Metadata schema
// ============================================================

export const productMetadataInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Nama metadata wajib diisi")
    .max(50, "Nama metadata maksimal 50 karakter"),
  value: z
    .string()
    .trim()
    .min(1, "Nilai metadata wajib diisi")
    .max(500, "Nilai metadata maksimal 500 karakter"),
});

export type ProductMetadataInput = z.infer<
  typeof productMetadataInputSchema
>;

// ============================================================
// Product create
// ============================================================

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(100),
    description: z
      .string()
      .trim()
      .max(2000, "Deskripsi maksimal 2000 karakter")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    sellingPrice: z.coerce
      .number({ error: "Harga jual harus berupa angka" })
      .nonnegative("Harga jual tidak boleh negatif"),
    isActive: z.boolean().optional().default(true),
    metadata: z
      .array(productMetadataInputSchema)
      .max(30, "Maksimal 30 metadata")
      .optional()
      .default([]),
  })
  .refine(
    (v) => {
      // Cek duplikat key (case-insensitive)
      const keys = v.metadata.map((m) => m.key.toLowerCase());
      return new Set(keys).size === keys.length;
    },
    { message: "Nama metadata tidak boleh duplikat", path: ["metadata"] }
  );

// ============================================================
// Product update
// ============================================================

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional(),
    sellingPrice: z.coerce
      .number({ error: "Harga jual harus berupa angka" })
      .nonnegative("Harga jual tidak boleh negatif")
      .optional(),
    isActive: z.boolean().optional(),
    metadata: z
      .array(productMetadataInputSchema)
      .max(30)
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada field yang diubah",
  })
  .refine(
    (v) => {
      if (!v.metadata) return true;
      const keys = v.metadata.map((m) => m.key.toLowerCase());
      return new Set(keys).size === keys.length;
    },
    { message: "Nama metadata tidak boleh duplikat", path: ["metadata"] }
  );

// ============================================================
// List query
// ============================================================

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